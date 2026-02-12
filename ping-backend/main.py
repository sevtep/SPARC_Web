from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
import json

from database import engine, get_db, SessionLocal
from models import (
    Base,
    User,
    UserRole,
    Organization,
    Module,
    EmailTemplate,
    ModuleWhitelist,
    Subject,
)
from routers import auth_router
from routers import telemetry_router
from routers import class_router
from routers import admin_router
from routers import simulation_router
from routers import invite_router
from routers import dashboard_router
from routers import sparc_router, subjects_router
from app_registry import ensure_default_apps
from routers.sparc_router import seed_wordgame_scores
from auth import get_password_hash
from sqlalchemy import text

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="PING API", version="2.0.0")


@app.on_event("startup")
def seed_apps():
    db = SessionLocal()
    try:
        ensure_schema_updates()
        default_org_id = ensure_default_org(db)
        ensure_default_apps(db)
        ensure_default_subjects(db)
        ensure_default_modules(db)
        ensure_default_email_templates(db)
        ensure_admin_user(db, default_org_id)
        ensure_teacher_user(db, default_org_id)
        seed_wordgame_scores(db)
    finally:
        db.close()


def ensure_default_org(db: Session) -> int:
    existing = db.query(Organization).order_by(Organization.id.asc()).first()
    if existing:
        return existing.id

    default_org = Organization(name="Default Organization", domain=None, is_active=True)
    db.add(default_org)
    db.commit()
    db.refresh(default_org)
    return default_org.id


def ensure_admin_user(db: Session, organization_id: int):
    admin_user = db.query(User).filter(User.username == "admin").first()
    if not admin_user:
        admin_user = User(
            email="admin@ping.local",
            username="admin",
            full_name="Admin",
            hashed_password=get_password_hash("admin"),
            role=UserRole.PLATFORM_ADMIN,
            is_active=True,
            is_verified=True,
            organization_id=organization_id,
        )
        db.add(admin_user)
    else:
        admin_user.hashed_password = get_password_hash("admin")
        if not admin_user.organization_id:
            admin_user.organization_id = organization_id
        if admin_user.role != UserRole.PLATFORM_ADMIN:
            admin_user.role = UserRole.PLATFORM_ADMIN
        admin_user.is_active = True

    db.commit()


def ensure_teacher_user(db: Session, organization_id: int):
    teacher_user = db.query(User).filter(User.username == "teacher").first()
    if not teacher_user:
        teacher_user = User(
            email="teacher@ping.local",
            username="teacher",
            full_name="Teacher",
            hashed_password=get_password_hash("teacher"),
            role=UserRole.TEACHER,
            is_active=True,
            is_verified=True,
            organization_id=organization_id,
        )
        db.add(teacher_user)
    else:
        teacher_user.hashed_password = get_password_hash("teacher")
        if not teacher_user.organization_id:
            teacher_user.organization_id = organization_id
        if teacher_user.role != UserRole.TEACHER:
            teacher_user.role = UserRole.TEACHER
        teacher_user.is_active = True

    db.commit()


def ensure_default_subjects(db: Session):
    subjects = [
        ("physics", "Physics", 0),
        ("math", "Math", 10),
        ("chemistry", "Chemistry", 20),
        ("biology", "Biology", 30),
        ("earth-science", "Earth & Space", 40),
    ]
    for key, name, order in subjects:
        existing = db.query(Subject).filter(Subject.key == key).first()
        if existing:
            continue
        db.add(Subject(key=key, name=name, sort_order=order, is_active=True))
    db.commit()


def ensure_default_modules(db: Session):
    subject = db.query(Subject).filter(Subject.key == "physics").first()
    subject_id = subject.id if subject else None

    default_modules = [
        {
            "module_id": "newton1",
            "title": "Newton's First Law",
            "description": "Explore inertia and why objects keep moving unless a force changes them.",
            "build_path": "/games/newton1/Build/newton1",
            "cover_image_url": "/images/newton1-cover.png",
        },
        {
            "module_id": "newton2",
            "title": "Newton's Second Law",
            "description": "Test how force, mass, and acceleration relate in interactive challenges.",
            "build_path": "/games/newton2/Build/newton2",
            "cover_image_url": "/images/newton2-cover.png",
        },
        {
            "module_id": "newton3",
            "title": "Newton's Third Law",
            "description": "Discover action-reaction pairs through hands-on force interactions.",
            "build_path": "/games/newton3/Build/newton3",
            "cover_image_url": "/images/newton3-cover.png",
        },
        {
            "module_id": "race-game",
            "title": "Race Game",
            "description": "Race through physics-driven scenarios and complete objectives.",
            "build_path": "/games/racegame/Build/racegame",
            "cover_image_url": "/images/racegame-cover.png",
        },
        {
            "module_id": "geotech-game",
            "title": "GeoTech Field Lab",
            "description": "Complete integrated geotechnical field tasks across map, lab, and analysis scenes.",
            "build_path": "/games/geotech/Build/geotech",
            "cover_image_url": "/images/geotech-cover.png",
        },
    ]

    for item in default_modules:
        module = db.query(Module).filter(Module.module_id == item["module_id"]).first()
        if not module:
            module = Module(module_id=item["module_id"])
            db.add(module)

        module.title = item["title"]
        module.description = item["description"]
        module.subject = "physics"
        module.subject_id = subject_id
        module.build_path = item["build_path"]
        module.cover_image_url = item.get("cover_image_url")
        module.is_published = True
        module.version = module.version or "1.0.0"

    legacy_module = (
        db.query(Module).filter(Module.module_id == "forces-motion-basics").first()
    )
    if legacy_module:
        legacy_module.is_published = False

    db.commit()

    published_modules = (
        db.query(Module)
        .filter(Module.module_id.in_([item["module_id"] for item in default_modules]))
        .all()
    )
    for module in published_modules:
        ensure_module_whitelist(db, module, 1)


def ensure_module_whitelist(db: Session, module: Module, organization_id: int):
    existing = (
        db.query(ModuleWhitelist)
        .filter(
            ModuleWhitelist.organization_id == organization_id,
            ModuleWhitelist.module_id == module.id,
        )
        .first()
    )
    if existing:
        if not existing.is_enabled:
            existing.is_enabled = True
            db.commit()
        return
    db.add(
        ModuleWhitelist(
            organization_id=organization_id, module_id=module.id, is_enabled=True
        )
    )
    db.commit()


def ensure_default_email_templates(db: Session):
    templates = {
        "invite_teacher": {
            "name": "Teacher Invite",
            "subject": "Your teacher invite code",
            "body": "You have been invited to PING.\nInvite code: {{invite_code}}\nRole: Teacher\nExpires: {{expires_at}}\n",
        },
        "invite_student": {
            "name": "Student Invite",
            "subject": "Your student invite code",
            "body": "You have been invited to PING.\nInvite code: {{invite_code}}\nRole: Student\nExpires: {{expires_at}}\n",
        },
        "welcome_user": {
            "name": "Welcome",
            "subject": "Welcome to PING",
            "body": "Hello {{user_name}},\nWelcome to PING. Your account is ready.",
        },
        "password_reset": {
            "name": "Password Reset",
            "subject": "Your PING password has been reset",
            "body": "Hello {{user_name}},\nYour new password is: {{new_password}}\nPlease log in and change it.",
        },
    }

    for key, data in templates.items():
        existing = db.query(EmailTemplate).filter(EmailTemplate.key == key).first()
        if existing:
            continue
        db.add(
            EmailTemplate(
                key=key,
                name=data["name"],
                subject=data["subject"],
                body=data["body"],
                is_active=True,
            )
        )
    db.commit()


def ensure_schema_updates():
    with engine.connect() as conn:
        conn.execute(
            text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'classes' AND column_name = 'description'
                ) THEN
                    ALTER TABLE classes ADD COLUMN description TEXT;
                END IF;
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'users' AND column_name = 'school'
                ) THEN
                    ALTER TABLE users ADD COLUMN school TEXT;
                END IF;
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'users' AND column_name = 'course'
                ) THEN
                    ALTER TABLE users ADD COLUMN course TEXT;
                END IF;
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'users' AND column_name = 'bio'
                ) THEN
                    ALTER TABLE users ADD COLUMN bio TEXT;
                END IF;
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'users' AND column_name = 'avatar'
                ) THEN
                    ALTER TABLE users ADD COLUMN avatar TEXT;
                END IF;
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_name = 'subjects'
                ) THEN
                    CREATE TABLE subjects (
                        id SERIAL PRIMARY KEY,
                        key TEXT UNIQUE NOT NULL,
                        name TEXT NOT NULL,
                        is_active BOOLEAN DEFAULT TRUE,
                        sort_order INTEGER DEFAULT 0,
                        created_at TIMESTAMPTZ DEFAULT NOW(),
                        updated_at TIMESTAMPTZ
                    );
                END IF;
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'modules' AND column_name = 'subject_id'
                ) THEN
                    ALTER TABLE modules ADD COLUMN subject_id INTEGER;
                END IF;
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'modules' AND column_name = 'cover_image_url'
                ) THEN
                    ALTER TABLE modules ADD COLUMN cover_image_url TEXT;
                END IF;
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_name = 'user_module_completions'
                ) THEN
                    CREATE TABLE user_module_completions (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL REFERENCES users(id),
                        module_id TEXT NOT NULL,
                        completed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
                        last_session_id TEXT,
                        CONSTRAINT uq_user_module_completions UNIQUE (user_id, module_id)
                    );
                    CREATE INDEX idx_user_module_completions_user_id ON user_module_completions(user_id);
                    CREATE INDEX idx_user_module_completions_module_id ON user_module_completions(module_id);
                END IF;
            END $$;
        """)
        )
        conn.commit()


# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://ping.agaii.org",
        "https://game.agaii.org",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router.router)
app.include_router(telemetry_router.router)
app.include_router(class_router.router)
app.include_router(simulation_router.router)
app.include_router(subjects_router.router)
app.include_router(invite_router.router)
app.include_router(dashboard_router.router)
app.include_router(sparc_router.router)
app.include_router(admin_router.router)


@app.get("/")
async def root():
    return {"message": "Welcome to PING API"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
