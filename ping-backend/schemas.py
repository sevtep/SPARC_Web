from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List
from datetime import datetime, date
from models import UserRole

# User Schemas
class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    school: Optional[str] = None
    course: Optional[str] = None
    bio: Optional[str] = None
    avatar: Optional[str] = None

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    username: Optional[str] = None
    invite_code: str
    school: Optional[str] = None
    course: Optional[str] = None
    bio: Optional[str] = None
    avatar: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: Optional[str]
    username: Optional[str]
    full_name: Optional[str]
    school: Optional[str]
    course: Optional[str]
    bio: Optional[str]
    avatar: Optional[str]
    role: UserRole
    is_active: bool
    is_verified: bool
    organization_id: Optional[int]
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[int] = None

# Guest Session
class GuestSessionCreate(BaseModel):
    session_id: str

class GuestSessionResponse(BaseModel):
    guest_id: str
    session_id: str
    access_token: str
    token_type: str

# Consent Schemas
class ConsentCreate(BaseModel):
    terms_accepted: bool
    privacy_accepted: bool
    data_collection_accepted: bool
    cookie_accepted: Optional[bool] = None

class ConsentResponse(BaseModel):
    id: int
    user_id: Optional[int]
    guest_session_id: Optional[str]
    terms_accepted: bool
    privacy_accepted: bool
    data_collection_accepted: bool
    cookie_accepted: Optional[bool]
    consented_at: datetime
    
    class Config:
        from_attributes = True

# Organization Schemas
class OrganizationBase(BaseModel):
    name: str
    domain: Optional[str] = None

class OrganizationCreate(OrganizationBase):
    consent_text: Optional[str] = None
    privacy_policy: Optional[str] = None
    
class OrganizationResponse(BaseModel):
    id: int
    name: str
    domain: Optional[str]
    is_active: bool
    data_collection_enabled: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Class Schemas
class ClassCreate(BaseModel):
    name: str
    description: Optional[str] = None

class ClassUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class ClassResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    join_code: str
    teacher_id: int
    organization_id: Optional[int]
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class ClassWithStats(ClassResponse):
    student_count: int = 0
    guest_count: int = 0
    total_sessions: int = 0
    module_count: int = 0

class JoinCodeValidate(BaseModel):
    join_code: str


class JoinClassRequest(BaseModel):
    join_code: str

class StudentProgress(BaseModel):
    user_id: Optional[int]
    guest_id: Optional[str]
    name: str
    email: Optional[str]
    total_sessions: int
    total_events: int
    last_active: Optional[datetime]


class InviteCreate(BaseModel):
    expires_at: Optional[datetime] = None
    max_uses: Optional[int] = None
    class_id: Optional[int] = None
    recipient_email: Optional[EmailStr] = None
    notes: Optional[str] = None


class InviteResponse(BaseModel):
    id: int
    code: str
    role: str
    created_by: int
    organization_id: Optional[int]
    class_id: Optional[int]
    max_uses: Optional[int]
    uses: int
    expires_at: Optional[datetime]
    is_active: bool
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    school: Optional[str] = None
    course: Optional[str] = None
    bio: Optional[str] = None
    avatar: Optional[str] = None


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str


class EmailTemplateUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    is_active: Optional[bool] = None


class EmailTemplateResponse(BaseModel):
    id: int
    key: str
    name: str
    subject: str
    body: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class ModuleCreate(BaseModel):
    module_id: str
    title: str
    description: Optional[str] = None
    subject: str
    subject_id: Optional[int] = None
    build_path: Optional[str] = None
    is_published: bool = True
    version: Optional[str] = "1.0.0"


class ModuleUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    subject: Optional[str] = None
    subject_id: Optional[int] = None
    build_path: Optional[str] = None
    is_published: Optional[bool] = None
    version: Optional[str] = None



class SubjectCreate(BaseModel):
    key: str
    name: str
    sort_order: Optional[int] = 0
    is_active: Optional[bool] = True


class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class SubjectResponse(BaseModel):
    id: int
    key: str
    name: str
    sort_order: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class ModuleResponse(BaseModel):
    id: int
    module_id: str
    title: str
    description: Optional[str]
    subject: str
    subject_id: Optional[int] = None
    build_path: Optional[str]
    is_published: bool
    version: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

# Telemetry Schemas
class TelemetrySessionCreate(BaseModel):
    module_id: str
    
class TelemetryEventCreate(BaseModel):
    session_id: str
    user_id: Optional[int] = None
    guest_id: Optional[str] = None
    module_id: str
    event_type: str
    payload: dict
    timestamp: str
    client_timestamp: int

class TelemetryEventBatch(BaseModel):
    session_id: str
    events: List[TelemetryEventCreate]

# Behavior Data Schemas (legacy - being replaced by Telemetry)
class BehaviorDataCreate(BaseModel):
    module_id: str
    session_id: str
    event_type: str
    event_data: Optional[str] = None

class BehaviorDataResponse(BaseModel):
    id: int
    user_id: Optional[int]
    guest_session_id: Optional[str]
    module_id: str
    session_id: str
    event_type: str
    event_data: Optional[str]
    timestamp: datetime
    
    class Config:
        from_attributes = True


# Dashboard Schemas
class DashboardTotals(BaseModel):
    apps: int
    users: int
    sessions: int
    events: int


class DashboardTrendPoint(BaseModel):
    date: date
    events: int
    sessions: int


class DashboardAppSummary(BaseModel):
    slug: str
    name: str
    status: str
    base_url: Optional[str] = None
    connected: bool
    users: int
    sessions: int
    events: int
    last_event_at: Optional[datetime] = None


class DashboardOverview(BaseModel):
    totals: DashboardTotals
    apps: List[DashboardAppSummary]
    trend: List[DashboardTrendPoint]
    read_replica: bool
    generated_at: datetime
