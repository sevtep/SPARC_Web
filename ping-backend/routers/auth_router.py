from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import os
import uuid

from database import get_db
from models import User, ConsentRecord, UserRole, InviteCode, InviteUse, InviteRole, Class, ClassStudent, EmailTemplate
from schemas import (
    UserCreate, UserLogin, UserResponse, Token,
    GuestSessionCreate, GuestSessionResponse,
    ConsentCreate, ConsentResponse, UserUpdate, PasswordUpdate
)
from auth import (
    verify_password, get_password_hash, 
    create_access_token, verify_token
)
from email_service import send_email, render_template

from sqlalchemy import or_

router = APIRouter(prefix="/api/auth", tags=["authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

# Dependency to get current user
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = verify_token(token)
    if payload is None:
        raise credentials_exception
    
    email: str = payload.get("sub")
    user_id: int = payload.get("user_id")
    
    if email is None and user_id is None:
        raise credentials_exception
    
    if user_id:
        user = db.query(User).filter(User.id == user_id).first()
    else:
        user = db.query(User).filter(User.email == email).first()
    
    if user is None:
        raise credentials_exception
    
    return user


async def get_optional_user(
    token: str | None = Depends(oauth2_scheme_optional),
    db: Session = Depends(get_db)
):
    if not token:
        return None

    payload = verify_token(token)
    if payload is None:
        return None

    email = payload.get("sub")
    user_id = payload.get("user_id")
    if user_id:
        return db.query(User).filter(User.id == user_id).first()
    if email:
        return db.query(User).filter(User.email == email).first()
    return None

# User Registration
@router.post("/register", response_model=UserResponse)
async def register_user(
    user_data: UserCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """Register a new user account"""

    invite = db.query(InviteCode).filter(
        InviteCode.code == user_data.invite_code,
        InviteCode.is_active == True
    ).first()

    if not invite:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid invite code"
        )

    if invite.expires_at and invite.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invite code has expired"
        )

    if invite.max_uses is not None and invite.uses >= invite.max_uses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invite code usage limit reached"
        )
    
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if username exists (if provided)
    if user_data.username:
        existing_username = db.query(User).filter(User.username == user_data.username).first()
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
    
    # Create new user
    role = UserRole.STUDENT
    if invite.role == InviteRole.TEACHER:
        role = UserRole.TEACHER

    organization_id = invite.organization_id
    class_obj = None
    if invite.role == InviteRole.STUDENT and invite.class_id:
        class_obj = db.query(Class).filter(Class.id == invite.class_id).first()
        if not class_obj or not class_obj.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invite class is not available"
            )
        organization_id = class_obj.organization_id

    username = user_data.username or user_data.email.split('@')[0]
    full_name = user_data.full_name or username

    new_user = User(
        email=user_data.email,
        username=username,
        hashed_password=get_password_hash(user_data.password),
        full_name=full_name,
        school=user_data.school,
        course=user_data.course,
        bio=user_data.bio,
        avatar=user_data.avatar,
        role=role,
        is_verified=False,
        organization_id=organization_id
    )
    
    db.add(new_user)
    db.flush()

    if invite.role == InviteRole.STUDENT and class_obj:
        db.add(ClassStudent(
            class_id=class_obj.id,
            user_id=new_user.id,
            invite_id=invite.id,
            invited_by=invite.created_by
        ))

    invite.uses += 1
    db.add(InviteUse(
        invite_id=invite.id,
        user_id=new_user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    ))

    db.commit()
    db.refresh(new_user)

    template = db.query(EmailTemplate).filter(
        EmailTemplate.key == "welcome_user",
        EmailTemplate.is_active == True
    ).first()
    if template and new_user.email:
        try:
            subject = render_template(template.subject, {"user_name": new_user.full_name or new_user.username})
            body = render_template(template.body, {"user_name": new_user.full_name or new_user.username})
            send_email(new_user.email, subject, body)
        except Exception:
            pass
    
    return new_user

# User Login
@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Login with email and password"""
    
    # Find user by email
    user = db.query(User).filter(
        or_(User.email == form_data.username, User.username == form_data.username)
    ).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Create access token
    access_token = create_access_token(
        data={"sub": user.email, "user_id": user.id, "role": user.role.value}
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

# Alternative login endpoint for JSON
@router.post("/login-json", response_model=Token)
async def login_json(user_data: UserLogin, db: Session = Depends(get_db)):
    """Login with JSON body (email and password)"""
    
    user = db.query(User).filter(User.email == user_data.email).first()
    
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Create access token
    access_token = create_access_token(
        data={"sub": user.email, "user_id": user.id, "role": user.role.value}
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

# Get current user info
@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current logged in user information"""
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_me(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == UserRole.GUEST:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Guest accounts cannot be updated")

    if update_data.full_name is not None:
        current_user.full_name = update_data.full_name
    if update_data.school is not None:
        current_user.school = update_data.school
    if update_data.course is not None:
        current_user.course = update_data.course
    if update_data.bio is not None:
        current_user.bio = update_data.bio
    if update_data.avatar is not None:
        current_user.avatar = update_data.avatar

    db.commit()
    db.refresh(current_user)
    return current_user


@router.put("/password")
async def update_password(
    payload: PasswordUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == UserRole.GUEST:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Guest accounts cannot change passwords")
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")

    current_user.hashed_password = get_password_hash(payload.new_password)
    db.commit()
    return {"success": True}


@router.delete("/me")
async def deactivate_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == UserRole.GUEST:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Guest accounts cannot be deleted")
    current_user.is_active = False
    db.commit()
    return {"success": True}

# Guest Session Creation
@router.post("/guest", response_model=GuestSessionResponse)
async def create_guest_session(
    guest_data: GuestSessionCreate,
    db: Session = Depends(get_db)
):
    """Create a guest session for anonymous users"""

    if os.getenv("ALLOW_GUEST", "false").lower() != "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Guest access is disabled"
        )
    
    # Generate unique guest ID
    guest_id = f"guest_{uuid.uuid4().hex[:12]}"
    
    # Create guest user
    guest_user = User(
        guest_id=guest_id,
        role=UserRole.GUEST,
        is_active=True
    )
    
    db.add(guest_user)
    db.commit()
    db.refresh(guest_user)
    
    # Create access token for guest
    access_token = create_access_token(
        data={"guest_id": guest_id, "user_id": guest_user.id, "role": "guest"}
    )
    
    return {
        "guest_id": guest_id,
        "session_id": guest_data.session_id,
        "access_token": access_token,
        "token_type": "bearer"
    }

# Submit Consent
@router.post("/consent", response_model=ConsentResponse)
async def submit_consent(
    consent_data: ConsentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit consent agreement (for both guests and registered users)"""
    
    # Validate required consents
    if not consent_data.terms_accepted or not consent_data.privacy_accepted or not consent_data.data_collection_accepted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Terms, privacy, and data collection consent are required"
        )
    
    # Create consent record
    consent_record = ConsentRecord(
        user_id=current_user.id if current_user.role != UserRole.GUEST else None,
        guest_session_id=current_user.guest_id if current_user.role == UserRole.GUEST else None,
        terms_accepted=consent_data.terms_accepted,
        privacy_accepted=consent_data.privacy_accepted,
        data_collection_accepted=consent_data.data_collection_accepted,
        cookie_accepted=consent_data.cookie_accepted
    )
    
    db.add(consent_record)
    db.commit()
    db.refresh(consent_record)
    
    return consent_record

# Check if user has valid consent
@router.get("/consent/check")
async def check_consent(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if the current user has submitted required consents"""
    
    # Query consent records for the user
    if current_user.role == UserRole.GUEST:
        consent = db.query(ConsentRecord).filter(
            ConsentRecord.guest_session_id == current_user.guest_id
        ).order_by(ConsentRecord.consented_at.desc()).first()
    else:
        consent = db.query(ConsentRecord).filter(
            ConsentRecord.user_id == current_user.id
        ).order_by(ConsentRecord.consented_at.desc()).first()
    
    if not consent:
        return {
            "has_consent": False,
            "message": "No consent record found"
        }
    
    # Check if all required consents are accepted
    has_required_consents = (
        consent.terms_accepted and 
        consent.privacy_accepted and 
        consent.data_collection_accepted
    )
    
    return {
        "has_consent": has_required_consents,
        "consent_date": consent.consented_at,
        "terms_accepted": consent.terms_accepted,
        "privacy_accepted": consent.privacy_accepted,
        "data_collection_accepted": consent.data_collection_accepted,
        "cookie_accepted": consent.cookie_accepted
    }
