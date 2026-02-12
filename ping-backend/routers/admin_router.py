from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from fastapi import BackgroundTasks, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case
import os
import re
from pathlib import Path
import tempfile
import zipfile
from datetime import datetime

from database import get_db
from models import (
    User,
    UserRole,
    EmailTemplate,
    Module,
    ModuleWhitelist,
    Subject,
    BehaviorData,
    Organization,
    Class,
    ClassStudent,
    InviteCode,
    InviteUse,
    ConsentRecord,
    AuditLog,
    SparcWordGameScore,
    SparcGameSession,
    ExternalAccount,
    AppSession,
    AppEvent,
    UserModuleCompletion,
)
from routers.auth_router import get_current_user
from schemas import (
    EmailTemplateResponse,
    EmailTemplateUpdate,
    ModuleCreate,
    ModuleUpdate,
    ModuleResponse,
    SubjectCreate,
    SubjectUpdate,
    SubjectResponse,
    UserResponse,
    UserAdminUpdate,
    OrganizationResponse,
    OrganizationCreate,
    OrganizationUpdate,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])

TELEMETRY_DATA_DIR = os.getenv("TELEMETRY_DATA_DIR", "/mnt/data/pingdata/telemetry")


def sanitize_segment(value: str) -> str:
    safe = re.sub(r"[^A-Za-z0-9._-]+", "_", value or "").strip("_")
    return safe or "unknown"


def get_session_file_path(module_id: str, session_id: str) -> Path:
    safe_module = sanitize_segment(module_id)
    safe_session = sanitize_segment(session_id)
    return Path(TELEMETRY_DATA_DIR) / safe_module / f"{safe_session}.jsonl.zst"


def parse_date(value: str | None, end_of_day: bool = False) -> datetime | None:
    if not value:
        return None
    dt = datetime.fromisoformat(value)
    if end_of_day and len(value) == 10:
        return dt.replace(hour=23, minute=59, second=59, microsecond=999999)
    return dt


def resolve_subject(db: Session, subject_id: int | None, subject_key: str | None):
    if subject_id is not None:
        subject = db.query(Subject).filter(Subject.id == subject_id).first()
        if not subject:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Subject not found"
            )
        return subject
    if subject_key:
        return db.query(Subject).filter(Subject.key == subject_key).first()
    return None


def require_admin(current_user: User):
    if current_user.role not in [UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required"
        )


def require_platform_admin(current_user: User):
    if current_user.role != UserRole.PLATFORM_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform admin access required",
        )


@router.get("/organizations", response_model=list[OrganizationResponse])
async def list_organizations(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    require_platform_admin(current_user)
    return db.query(Organization).order_by(Organization.name.asc()).all()


@router.post("/organizations", response_model=OrganizationResponse)
async def create_organization(
    payload: OrganizationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_platform_admin(current_user)
    existing = (
        db.query(Organization)
        .filter(func.lower(Organization.name) == payload.name.lower())
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Organization name already exists",
        )
    org = Organization(
        name=payload.name,
        domain=payload.domain,
        consent_text=payload.consent_text,
        privacy_policy=payload.privacy_policy,
        is_active=True,
    )
    db.add(org)
    db.commit()
    db.refresh(org)
    return org


@router.put("/organizations/{org_id}", response_model=OrganizationResponse)
async def update_organization(
    org_id: int,
    payload: OrganizationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_platform_admin(current_user)
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found"
        )

    if payload.name is not None:
        org.name = payload.name
    if payload.domain is not None:
        org.domain = payload.domain
    if payload.is_active is not None:
        org.is_active = payload.is_active
    if payload.data_collection_enabled is not None:
        org.data_collection_enabled = payload.data_collection_enabled

    db.commit()
    db.refresh(org)
    return org


@router.get("/subjects", response_model=list[SubjectResponse])
async def list_subjects(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    require_platform_admin(current_user)
    return (
        db.query(Subject).order_by(Subject.sort_order.asc(), Subject.name.asc()).all()
    )


@router.post("/subjects", response_model=SubjectResponse)
async def create_subject(
    payload: SubjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(current_user)
    existing = db.query(Subject).filter(Subject.key == payload.key).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Subject key already exists"
        )
    subject = Subject(
        key=payload.key,
        name=payload.name,
        sort_order=payload.sort_order or 0,
        is_active=True if payload.is_active is None else payload.is_active,
    )
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject


@router.put("/subjects/{subject_id}", response_model=SubjectResponse)
async def update_subject(
    subject_id: int,
    payload: SubjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(current_user)
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found"
        )
    if payload.name is not None:
        subject.name = payload.name
    if payload.sort_order is not None:
        subject.sort_order = payload.sort_order
    if payload.is_active is not None:
        subject.is_active = payload.is_active
    db.commit()
    db.refresh(subject)
    return subject


@router.get("/telemetry/sessions")
async def list_telemetry_sessions(
    module_id: str | None = Query(default=None),
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(current_user)

    start_dt = parse_date(start_date)
    end_dt = parse_date(end_date, end_of_day=True)

    query = db.query(
        BehaviorData.module_id,
        BehaviorData.session_id,
        func.count(BehaviorData.id).label("event_count"),
        func.min(BehaviorData.timestamp).label("started_at"),
        func.max(BehaviorData.timestamp).label("ended_at"),
        func.sum(case((BehaviorData.event_type == "text_input", 1), else_=0)).label(
            "text_input_count"
        ),
    )

    if module_id:
        query = query.filter(BehaviorData.module_id == module_id)
    if start_dt:
        query = query.filter(BehaviorData.timestamp >= start_dt)
    if end_dt:
        query = query.filter(BehaviorData.timestamp <= end_dt)

    query = query.group_by(BehaviorData.module_id, BehaviorData.session_id)
    total = query.count()
    rows = (
        query.order_by(func.max(BehaviorData.timestamp).desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    sessions = []
    for row in rows:
        file_path = get_session_file_path(row.module_id, row.session_id)
        sessions.append(
            {
                "module_id": row.module_id,
                "session_id": row.session_id,
                "event_count": int(row.event_count or 0),
                "text_input_count": int(row.text_input_count or 0),
                "started_at": row.started_at.isoformat() if row.started_at else None,
                "ended_at": row.ended_at.isoformat() if row.ended_at else None,
                "file_exists": file_path.exists(),
            }
        )

    return {"total": total, "limit": limit, "offset": offset, "sessions": sessions}


@router.get("/telemetry/sessions/{session_id}/download")
async def download_session_file(
    session_id: str,
    module_id: str = Query(...),
    current_user: User = Depends(get_current_user),
):
    require_platform_admin(current_user)
    file_path = get_session_file_path(module_id, session_id)
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Telemetry file not found"
        )
    filename = f"{sanitize_segment(module_id)}-{sanitize_segment(session_id)}.jsonl.zst"
    return FileResponse(
        path=str(file_path), filename=filename, media_type="application/zstd"
    )


@router.get("/telemetry/exports")
async def download_all_sessions(
    background_tasks: BackgroundTasks,
    module_id: str = Query(...),
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_platform_admin(current_user)

    start_dt = parse_date(start_date)
    end_dt = parse_date(end_date, end_of_day=True)

    query = db.query(BehaviorData.session_id).filter(
        BehaviorData.module_id == module_id
    )
    if start_dt:
        query = query.filter(BehaviorData.timestamp >= start_dt)
    if end_dt:
        query = query.filter(BehaviorData.timestamp <= end_dt)

    session_ids = [row[0] for row in query.distinct().all()]

    temp = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
    temp.close()
    zip_path = Path(temp.name)

    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for sess_id in session_ids:
            file_path = get_session_file_path(module_id, sess_id)
            if file_path.exists():
                arcname = f"{sanitize_segment(module_id)}/{file_path.name}"
                zf.write(file_path, arcname=arcname)

    background_tasks.add_task(zip_path.unlink, missing_ok=True)
    filename = f"{sanitize_segment(module_id)}-telemetry.zip"
    return FileResponse(
        path=str(zip_path), filename=filename, media_type="application/zip"
    )


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    q: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_platform_admin(current_user)

    query = db.query(User).order_by(User.created_at.desc())
    if current_user.role == UserRole.ORG_ADMIN:
        if not current_user.organization_id:
            return []
        query = query.filter(User.organization_id == current_user.organization_id)

    if q:
        like = f"%{q.lower()}%"
        query = query.filter(
            func.lower(User.email).like(like)
            | func.lower(User.username).like(like)
            | func.lower(User.full_name).like(like)
        )

    users = query.all()
    if not users:
        return []

    user_ids = [u.id for u in users]
    completion_rows = (
        db.query(UserModuleCompletion.user_id, UserModuleCompletion.module_id)
        .filter(UserModuleCompletion.user_id.in_(user_ids))
        .all()
    )

    completion_by_user = {}
    for row in completion_rows:
        completion_by_user.setdefault(row.user_id, []).append(row.module_id)

    return [
        {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "full_name": user.full_name,
            "school": user.school,
            "course": user.course,
            "bio": user.bio,
            "avatar": user.avatar,
            "role": user.role,
            "is_active": user.is_active,
            "is_verified": user.is_verified,
            "organization_id": user.organization_id,
            "created_at": user.created_at,
            "completed_modules_count": len(completion_by_user.get(user.id, [])),
            "completed_module_ids": sorted(completion_by_user.get(user.id, [])),
        }
        for user in users
    ]


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    payload: UserAdminUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_platform_admin(current_user)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    if current_user.role == UserRole.ORG_ADMIN:
        if (
            not current_user.organization_id
            or user.organization_id != current_user.organization_id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot manage users outside your organization",
            )
        if (
            payload.organization_id is not None
            and payload.organization_id != current_user.organization_id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot change organization",
            )
        if payload.role in [UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot assign admin roles",
            )

    if payload.role is not None:
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.is_verified is not None:
        user.is_verified = payload.is_verified
    if payload.organization_id is not None:
        org = (
            db.query(Organization)
            .filter(Organization.id == payload.organization_id)
            .first()
        )
        if not org:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Organization not found"
            )
        user.organization_id = payload.organization_id

    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", response_model=UserResponse)
async def deactivate_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_platform_admin(current_user)
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    if current_user.role == UserRole.ORG_ADMIN:
        if (
            not current_user.organization_id
            or user.organization_id != current_user.organization_id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot manage users outside your organization",
            )

    user.is_active = False
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}/hard")
async def hard_delete_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_platform_admin(current_user)

    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    classes_teaching = db.query(Class.id).filter(Class.teacher_id == user_id).count()
    if classes_teaching:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete a teacher account with active classes. Reassign or delete the classes first.",
        )

    # Null out data where FK is nullable; delete rows where FK is not nullable.
    # Keep BehaviorData by anonymizing (user_id -> NULL) so telemetry remains.
    invite_ids = [
        row[0]
        for row in db.query(InviteCode.id)
        .filter(InviteCode.created_by == user_id)
        .all()
    ]

    # Remove membership links.
    db.query(ClassStudent).filter(ClassStudent.user_id == user_id).delete(
        synchronize_session=False
    )

    # Invite uses by this user (non-null FK).
    db.query(InviteUse).filter(InviteUse.user_id == user_id).delete(
        synchronize_session=False
    )

    # If this user created invite codes, detach invite_id from class_students (nullable),
    # then remove invite_uses and the invites.
    if invite_ids:
        db.query(ClassStudent).filter(ClassStudent.invite_id.in_(invite_ids)).update(
            {ClassStudent.invite_id: None}, synchronize_session=False
        )
        db.query(InviteUse).filter(InviteUse.invite_id.in_(invite_ids)).delete(
            synchronize_session=False
        )
        db.query(InviteCode).filter(InviteCode.id.in_(invite_ids)).delete(
            synchronize_session=False
        )

    # Anonymize / detach nullable user_id references.
    db.query(BehaviorData).filter(BehaviorData.user_id == user_id).update(
        {BehaviorData.user_id: None}, synchronize_session=False
    )
    db.query(ConsentRecord).filter(ConsentRecord.user_id == user_id).update(
        {ConsentRecord.user_id: None}, synchronize_session=False
    )
    db.query(AuditLog).filter(AuditLog.user_id == user_id).update(
        {AuditLog.user_id: None}, synchronize_session=False
    )
    db.query(SparcWordGameScore).filter(SparcWordGameScore.user_id == user_id).update(
        {SparcWordGameScore.user_id: None}, synchronize_session=False
    )
    db.query(AppSession).filter(AppSession.user_id == user_id).update(
        {AppSession.user_id: None}, synchronize_session=False
    )
    db.query(AppEvent).filter(AppEvent.user_id == user_id).update(
        {AppEvent.user_id: None}, synchronize_session=False
    )

    # Delete non-null FK rows.
    db.query(ExternalAccount).filter(ExternalAccount.user_id == user_id).delete(
        synchronize_session=False
    )
    db.query(SparcGameSession).filter(SparcGameSession.user_id == user_id).delete(
        synchronize_session=False
    )

    db.delete(user)
    db.commit()

    return {"success": True, "deleted_user_id": user_id}


@router.get("/email-templates", response_model=list[EmailTemplateResponse])
async def list_email_templates(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    require_platform_admin(current_user)
    templates = db.query(EmailTemplate).order_by(EmailTemplate.key.asc()).all()
    return templates


@router.put("/email-templates/{template_key}", response_model=EmailTemplateResponse)
async def update_email_template(
    template_key: str,
    payload: EmailTemplateUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_platform_admin(current_user)
    template = db.query(EmailTemplate).filter(EmailTemplate.key == template_key).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Template not found"
        )

    if payload.name is not None:
        template.name = payload.name
    if payload.subject is not None:
        template.subject = payload.subject
    if payload.body is not None:
        template.body = payload.body
    if payload.is_active is not None:
        template.is_active = payload.is_active

    db.commit()
    db.refresh(template)
    return template


@router.get("/modules", response_model=list[ModuleResponse])
async def list_modules(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    require_platform_admin(current_user)
    return db.query(Module).order_by(Module.created_at.desc()).all()


@router.post("/modules", response_model=ModuleResponse)
async def create_module(
    payload: ModuleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_platform_admin(current_user)

    existing = db.query(Module).filter(Module.module_id == payload.module_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Module ID already exists"
        )

    subject = resolve_subject(db, payload.subject_id, payload.subject)
    module = Module(
        module_id=payload.module_id,
        title=payload.title,
        description=payload.description,
        subject=subject.key if subject else payload.subject,
        subject_id=subject.id if subject else None,
        build_path=payload.build_path,
        is_published=payload.is_published,
        version=payload.version or "1.0.0",
    )
    db.add(module)
    db.commit()
    db.refresh(module)

    if current_user.organization_id:
        existing = (
            db.query(ModuleWhitelist)
            .filter(
                ModuleWhitelist.organization_id == current_user.organization_id,
                ModuleWhitelist.module_id == module.id,
            )
            .first()
        )
        if not existing:
            db.add(
                ModuleWhitelist(
                    organization_id=current_user.organization_id,
                    module_id=module.id,
                    is_enabled=True,
                )
            )
            db.commit()
    return module


@router.put("/modules/{module_id}", response_model=ModuleResponse)
async def update_module(
    module_id: str,
    payload: ModuleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_platform_admin(current_user)

    module = db.query(Module).filter(Module.module_id == module_id).first()
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Module not found"
        )

    if payload.title is not None:
        module.title = payload.title
    if payload.description is not None:
        module.description = payload.description
    if payload.subject_id is not None or payload.subject is not None:
        subject = resolve_subject(db, payload.subject_id, payload.subject)
        if subject:
            module.subject_id = subject.id
            module.subject = subject.key
        elif payload.subject is not None:
            module.subject = payload.subject
            module.subject_id = None
    if payload.build_path is not None:
        module.build_path = payload.build_path
    if payload.is_published is not None:
        module.is_published = payload.is_published
    if payload.version is not None:
        module.version = payload.version

    db.commit()
    db.refresh(module)
    return module
