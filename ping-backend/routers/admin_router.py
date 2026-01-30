from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import User, UserRole, EmailTemplate, Module, ModuleWhitelist, Subject
from routers.auth_router import get_current_user
from schemas import (
    EmailTemplateResponse,
    EmailTemplateUpdate,
    ModuleCreate,
    ModuleUpdate,
    ModuleResponse,
    SubjectCreate,
    SubjectUpdate,
    SubjectResponse
)

router = APIRouter(prefix="/api/admin", tags=["admin"])


def resolve_subject(db: Session, subject_id: int | None, subject_key: str | None):
    if subject_id is not None:
        subject = db.query(Subject).filter(Subject.id == subject_id).first()
        if not subject:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Subject not found")
        return subject
    if subject_key:
        return db.query(Subject).filter(Subject.key == subject_key).first()
    return None


def require_admin(current_user: User):
    if current_user.role not in [UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )


@router.get("/subjects", response_model=list[SubjectResponse])
async def list_subjects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_admin(current_user)
    return db.query(Subject).order_by(Subject.sort_order.asc(), Subject.name.asc()).all()


@router.post("/subjects", response_model=SubjectResponse)
async def create_subject(
    payload: SubjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_admin(current_user)
    existing = db.query(Subject).filter(Subject.key == payload.key).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Subject key already exists")
    subject = Subject(
        key=payload.key,
        name=payload.name,
        sort_order=payload.sort_order or 0,
        is_active=True if payload.is_active is None else payload.is_active
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
    db: Session = Depends(get_db)
):
    require_admin(current_user)
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    if payload.name is not None:
        subject.name = payload.name
    if payload.sort_order is not None:
        subject.sort_order = payload.sort_order
    if payload.is_active is not None:
        subject.is_active = payload.is_active
    db.commit()
    db.refresh(subject)
    return subject


@router.get("/email-templates", response_model=list[EmailTemplateResponse])
async def list_email_templates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_admin(current_user)
    templates = db.query(EmailTemplate).order_by(EmailTemplate.key.asc()).all()
    return templates


@router.put("/email-templates/{template_key}", response_model=EmailTemplateResponse)
async def update_email_template(
    template_key: str,
    payload: EmailTemplateUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_admin(current_user)
    template = db.query(EmailTemplate).filter(EmailTemplate.key == template_key).first()
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_admin(current_user)
    return db.query(Module).order_by(Module.created_at.desc()).all()


@router.post("/modules", response_model=ModuleResponse)
async def create_module(
    payload: ModuleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_admin(current_user)

    existing = db.query(Module).filter(Module.module_id == payload.module_id).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Module ID already exists")

    subject = resolve_subject(db, payload.subject_id, payload.subject)
    module = Module(
        module_id=payload.module_id,
        title=payload.title,
        description=payload.description,
        subject=subject.key if subject else payload.subject,
        subject_id=subject.id if subject else None,
        build_path=payload.build_path,
        is_published=payload.is_published,
        version=payload.version or "1.0.0"
    )
    db.add(module)
    db.commit()
    db.refresh(module)

    if current_user.organization_id:
        existing = db.query(ModuleWhitelist).filter(
            ModuleWhitelist.organization_id == current_user.organization_id,
            ModuleWhitelist.module_id == module.id
        ).first()
        if not existing:
            db.add(ModuleWhitelist(
                organization_id=current_user.organization_id,
                module_id=module.id,
                is_enabled=True
            ))
            db.commit()
    return module


@router.put("/modules/{module_id}", response_model=ModuleResponse)
async def update_module(
    module_id: str,
    payload: ModuleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_admin(current_user)

    module = db.query(Module).filter(Module.module_id == module_id).first()
    if not module:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")

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
