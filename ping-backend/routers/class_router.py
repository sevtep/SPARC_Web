from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta
import random
import string

from database import get_db
from models import User, Class, Module, ModuleWhitelist, BehaviorData, UserRole, ClassStudent
from schemas import (
    ClassCreate, ClassUpdate, ClassResponse, ClassWithStats,
    JoinCodeValidate, JoinClassRequest, StudentProgress, ModuleResponse
)
from routers.auth_router import get_current_user

router = APIRouter(prefix="/api/classes", tags=["classes"])

def generate_join_code() -> str:
    """Generate a random join code in format XXXX-YYYY"""
    part1 = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    part2 = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"{part1}-{part2}"

def verify_teacher_access(current_user: User):
    """Verify user has teacher or admin role"""
    if current_user.role not in [UserRole.TEACHER, UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers and admins can access this resource"
        )


def get_class_module_ids(db: Session, class_obj: Class) -> List[str]:
    module_ids = db.query(Module.module_id).join(
        ModuleWhitelist, ModuleWhitelist.module_id == Module.id
    ).filter(
        ModuleWhitelist.organization_id == class_obj.organization_id,
        ModuleWhitelist.is_enabled == True,
        Module.is_published == True
    ).all()
    return [module_id for (module_id,) in module_ids]


@router.get("/{class_id}/modules", response_model=list[ModuleResponse])
async def get_class_modules(
    class_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List published modules available to this class (org whitelist)."""
    verify_teacher_access(current_user)

    class_obj = db.query(Class).filter(Class.id == class_id).first()
    if not class_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")

    if class_obj.teacher_id != current_user.id:
        if current_user.role == UserRole.PLATFORM_ADMIN:
            pass
        elif current_user.role != UserRole.ORG_ADMIN or class_obj.organization_id != current_user.organization_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You don't have access to this class")

    modules = db.query(Module).join(
        ModuleWhitelist, ModuleWhitelist.module_id == Module.id
    ).filter(
        ModuleWhitelist.organization_id == class_obj.organization_id,
        ModuleWhitelist.is_enabled == True,
        Module.is_published == True
    ).order_by(Module.title.asc()).all()

    return modules

@router.post("/", response_model=ClassResponse)
async def create_class(
    class_data: ClassCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new class
    Only teachers and admins can create classes
    """
    verify_teacher_access(current_user)
    
    # Generate unique join code
    join_code = generate_join_code()
    
    # Ensure join code is unique
    while db.query(Class).filter(Class.join_code == join_code).first():
        join_code = generate_join_code()
    
    # Create class
    new_class = Class(
        name=class_data.name,
        description=class_data.description,
        teacher_id=current_user.id,
        organization_id=current_user.organization_id,
        join_code=join_code,
        is_active=True
    )

    db.add(new_class)
    db.commit()
    db.refresh(new_class)

    return new_class

@router.get("/", response_model=List[ClassResponse])
async def get_my_classes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all classes for current teacher
    """
    verify_teacher_access(current_user)
    
    # Get classes where user is teacher
    classes = db.query(Class).filter(
        Class.teacher_id == current_user.id,
        Class.is_active == True
    ).all()
    
    return classes

@router.get("/{class_id}", response_model=ClassWithStats)
async def get_class_details(
    class_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed class information with statistics
    """
    verify_teacher_access(current_user)
    
    # Get class
    class_obj = db.query(Class).filter(Class.id == class_id).first()
    
    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    # Verify teacher owns this class
    if class_obj.teacher_id != current_user.id:
        if current_user.role == UserRole.PLATFORM_ADMIN:
            pass
        elif current_user.role != UserRole.ORG_ADMIN or class_obj.organization_id != current_user.organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this class"
            )
    
    # Calculate statistics
    # Count unique students (both registered and guests)
    module_ids = get_class_module_ids(db, class_obj)
    if module_ids:
        student_count = db.query(BehaviorData.user_id).filter(
            BehaviorData.module_id.in_(module_ids)
        ).distinct().count()

        guest_count = db.query(BehaviorData.guest_session_id).filter(
            BehaviorData.guest_session_id.isnot(None),
            BehaviorData.module_id.in_(module_ids)
        ).distinct().count()

        total_sessions = db.query(BehaviorData.session_id).filter(
            BehaviorData.module_id.in_(module_ids)
        ).distinct().count()
    else:
        student_count = 0
        guest_count = 0
        total_sessions = 0
    
    # Build response with stats
    response = ClassWithStats(
        **class_obj.__dict__,
        student_count=student_count,
        guest_count=guest_count,
        total_sessions=total_sessions,
        module_count=len(module_ids)
    )
    
    return response

@router.put("/{class_id}", response_model=ClassResponse)
async def update_class(
    class_id: int,
    class_data: ClassUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update class information
    """
    verify_teacher_access(current_user)
    
    # Get class
    class_obj = db.query(Class).filter(Class.id == class_id).first()
    
    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    # Verify ownership
    if class_obj.teacher_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this class"
        )
    
    # Update fields
    if class_data.name is not None:
        class_obj.name = class_data.name
    if class_data.description is not None:
        class_obj.description = class_data.description
    if class_data.is_active is not None:
        class_obj.is_active = class_data.is_active
    
    db.commit()
    db.refresh(class_obj)
    
    return class_obj

@router.post("/{class_id}/regenerate-code", response_model=ClassResponse)
async def regenerate_join_code(
    class_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Regenerate join code for a class
    Useful when code is leaked or for security
    """
    verify_teacher_access(current_user)
    
    # Get class
    class_obj = db.query(Class).filter(Class.id == class_id).first()
    
    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    # Verify ownership
    if class_obj.teacher_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this class"
        )
    
    # Generate new join code
    new_join_code = generate_join_code()
    
    while db.query(Class).filter(Class.join_code == new_join_code).first():
        new_join_code = generate_join_code()
    
    class_obj.join_code = new_join_code
    
    db.commit()
    db.refresh(class_obj)
    
    return class_obj

@router.post("/validate-code")
async def validate_join_code(
    code_data: JoinCodeValidate,
    db: Session = Depends(get_db)
):
    """
    Validate a join code and return class information
    Used by students/guests before joining
    """
    # Find class by join code
    class_obj = db.query(Class).filter(
        Class.join_code == code_data.join_code,
        Class.is_active == True
    ).first()
    
    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid join code or class is inactive"
        )
    
    # Get teacher info
    teacher = db.query(User).filter(User.id == class_obj.teacher_id).first()
    
    return {
        "valid": True,
        "class_id": class_obj.id,
        "class_name": class_obj.name,
        "description": class_obj.description,
        "teacher_name": teacher.full_name if teacher else "Unknown",
        "organization_id": class_obj.organization_id
    }


@router.post("/join", response_model=ClassResponse)
async def join_class(
    join_data: JoinClassRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can join classes"
        )

    class_obj = db.query(Class).filter(
        Class.join_code == join_data.join_code,
        Class.is_active == True
    ).first()

    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid join code or class is inactive"
        )

    existing = db.query(ClassStudent).filter(
        ClassStudent.class_id == class_obj.id,
        ClassStudent.user_id == current_user.id
    ).first()

    if not existing:
        db.add(ClassStudent(
            class_id=class_obj.id,
            user_id=current_user.id
        ))
        db.commit()
        db.refresh(class_obj)

    return class_obj

@router.get("/{class_id}/students", response_model=List[StudentProgress])
async def get_class_students(
    class_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get list of students in a class with their progress
    """
    verify_teacher_access(current_user)
    
    # Get class
    class_obj = db.query(Class).filter(Class.id == class_id).first()
    
    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    # Verify ownership
    if class_obj.teacher_id != current_user.id:
        if current_user.role == UserRole.PLATFORM_ADMIN:
            pass
        elif current_user.role != UserRole.ORG_ADMIN or class_obj.organization_id != current_user.organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this class"
            )
    
    # Primary source of truth: ClassStudent membership
    members = db.query(User).join(
        ClassStudent, User.id == ClassStudent.user_id
    ).filter(
        ClassStudent.class_id == class_obj.id
    ).order_by(User.created_at.asc()).all()

    if not members:
        return []

    module_ids = get_class_module_ids(db, class_obj)
    member_ids = [student.id for student in members]

    stats_by_user_id = {}
    if module_ids:
        rows = db.query(
            BehaviorData.user_id.label("user_id"),
            func.count(func.distinct(BehaviorData.session_id)).label("total_sessions"),
            func.count(BehaviorData.id).label("total_events"),
            func.max(BehaviorData.timestamp).label("last_active"),
        ).filter(
            BehaviorData.user_id.isnot(None),
            BehaviorData.user_id.in_(member_ids),
            BehaviorData.module_id.in_(module_ids)
        ).group_by(
            BehaviorData.user_id
        ).all()

        stats_by_user_id = {row.user_id: row for row in rows}

    students_data = []
    for student in members:
        stats = stats_by_user_id.get(student.id)
        students_data.append({
            "user_id": student.id,
            "guest_id": None,
            "name": student.full_name or student.username or "Unknown",
            "email": student.email,
            "total_sessions": int(stats.total_sessions) if stats else 0,
            "total_events": int(stats.total_events) if stats else 0,
            "last_active": stats.last_active if stats else None
        })

    return students_data

@router.delete("/{class_id}")
async def delete_class(
    class_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete (deactivate) a class
    """
    verify_teacher_access(current_user)
    
    # Get class
    class_obj = db.query(Class).filter(Class.id == class_id).first()
    
    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    # Verify ownership
    if class_obj.teacher_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this class"
        )
    
    # Soft delete
    class_obj.is_active = False
    
    db.commit()
    
    return {"success": True, "message": "Class deactivated"}
