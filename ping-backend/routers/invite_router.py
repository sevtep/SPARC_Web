from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
import random
import string

from database import get_db
from models import InviteCode, InviteRole, User, UserRole, Class, EmailTemplate
from schemas import InviteCreate, InviteResponse
from email_service import send_email, render_template
from routers.auth_router import get_current_user

router = APIRouter(prefix="/api/invites", tags=["invites"])


def generate_invite_code(prefix: str) -> str:
    part1 = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    part2 = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"{prefix}-{part1}-{part2}"


def build_invite_email(invite: InviteCode, role_label: str) -> tuple[str, str]:
    subject = f"Your {role_label} invite code"
    body = (
        f"You have been invited to join PING.\n\n"
        f"Invite code: {invite.code}\n"
        f"Role: {role_label}\n"
        f"Expires: {invite.expires_at or 'No expiry'}\n\n"
        f"Use this code during registration."
    )
    return subject, body


def build_template_email(template: EmailTemplate, context: dict) -> tuple[str, str]:
    subject = render_template(template.subject, context)
    body = render_template(template.body, context)
    return subject, body


def verify_admin_access(current_user: User):
    if current_user.role not in [UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )


def verify_teacher_access(current_user: User):
    if current_user.role not in [UserRole.TEACHER, UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teacher access required"
        )


@router.post("/teachers", response_model=InviteResponse)
async def create_teacher_invite(
    invite_data: InviteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    verify_admin_access(current_user)

    code = generate_invite_code("TCH")
    while db.query(InviteCode).filter(InviteCode.code == code).first():
        code = generate_invite_code("TCH")

    invite = InviteCode(
        code=code,
        role=InviteRole.TEACHER,
        created_by=current_user.id,
        organization_id=current_user.organization_id,
        max_uses=invite_data.max_uses,
        expires_at=invite_data.expires_at,
        notes=invite_data.notes
    )

    db.add(invite)
    db.commit()
    db.refresh(invite)

    if invite_data.recipient_email:
        template = db.query(EmailTemplate).filter(
            EmailTemplate.key == "invite_teacher",
            EmailTemplate.is_active == True
        ).first()
        if template:
            subject, body = build_template_email(template, {
                "invite_code": invite.code,
                "role": "Teacher",
                "expires_at": invite.expires_at or "No expiry"
            })
        else:
            subject, body = build_invite_email(invite, "Teacher")
        send_email(invite_data.recipient_email, subject, body)
    return invite


@router.post("/students", response_model=InviteResponse)
async def create_student_invite(
    invite_data: InviteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    verify_teacher_access(current_user)

    if not invite_data.class_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="class_id is required for student invites"
        )

    class_obj = db.query(Class).filter(Class.id == invite_data.class_id).first()
    if not class_obj or not class_obj.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )

    if class_obj.teacher_id != current_user.id:
        if current_user.role != UserRole.ORG_ADMIN or class_obj.organization_id != current_user.organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this class"
            )

    code = generate_invite_code("STD")
    while db.query(InviteCode).filter(InviteCode.code == code).first():
        code = generate_invite_code("STD")

    invite = InviteCode(
        code=code,
        role=InviteRole.STUDENT,
        created_by=current_user.id,
        organization_id=class_obj.organization_id,
        class_id=class_obj.id,
        max_uses=invite_data.max_uses,
        expires_at=invite_data.expires_at,
        notes=invite_data.notes
    )

    db.add(invite)
    db.commit()
    db.refresh(invite)

    if invite_data.recipient_email:
        template = db.query(EmailTemplate).filter(
            EmailTemplate.key == "invite_student",
            EmailTemplate.is_active == True
        ).first()
        if template:
            subject, body = build_template_email(template, {
                "invite_code": invite.code,
                "role": "Student",
                "expires_at": invite.expires_at or "No expiry"
            })
        else:
            subject, body = build_invite_email(invite, "Student")
        send_email(invite_data.recipient_email, subject, body)
    return invite


@router.get("/mine", response_model=list[InviteResponse])
async def get_my_invites(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role in [UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN]:
        invites = db.query(InviteCode).filter(
            InviteCode.organization_id == current_user.organization_id
        ).order_by(InviteCode.created_at.desc()).all()
    else:
        invites = db.query(InviteCode).filter(
            InviteCode.created_by == current_user.id
        ).order_by(InviteCode.created_at.desc()).all()

    return invites


@router.post("/{invite_id}/toggle", response_model=InviteResponse)
async def toggle_invite(
    invite_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    verify_teacher_access(current_user)

    invite = db.query(InviteCode).filter(InviteCode.id == invite_id).first()
    if not invite:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")

    if current_user.role not in [UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN]:
        if invite.created_by != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No access to this invite")

    invite.is_active = not invite.is_active
    db.commit()
    db.refresh(invite)
    return invite
