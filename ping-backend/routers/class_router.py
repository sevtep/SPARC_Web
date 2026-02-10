from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta
import random
import string

from database import get_db
from models import User, Class, Module, ModuleWhitelist, BehaviorData, UserRole, ClassStudent, ClassModuleTask
from schemas import (
    ClassCreate, ClassUpdate, ClassResponse, ClassWithStats,
    JoinCodeValidate, JoinClassRequest, StudentProgress, ModuleResponse,
    ClassTeacherTransferRequest,
    ClassModuleTaskUpdate,
    ClassModuleTaskResponse,
    ClassModuleStudentStatus,
    JoinedClassResponse,
    StudentClassTasks,
    StudentTaskModule,
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


def verify_class_access(current_user: User, class_obj: Class):
    if class_obj.teacher_id == current_user.id:
        return
    if current_user.role == UserRole.PLATFORM_ADMIN:
        return
    if current_user.role == UserRole.ORG_ADMIN and class_obj.organization_id == current_user.organization_id:
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You don't have access to this class"
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

@router.get("/", response_model=List[ClassWithStats])
async def get_my_classes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all classes for current teacher
    """
    verify_teacher_access(current_user)
    
    query = db.query(Class).filter(Class.is_active == True)
    if current_user.role == UserRole.TEACHER:
        query = query.filter(Class.teacher_id == current_user.id)
    elif current_user.role == UserRole.ORG_ADMIN:
        query = query.filter(Class.organization_id == current_user.organization_id)
    elif current_user.role == UserRole.PLATFORM_ADMIN:
        pass
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    classes = query.order_by(Class.created_at.desc()).all()
    teacher_ids = list({c.teacher_id for c in classes})
    teachers = {}
    if teacher_ids:
        teachers = {u.id: u for u in db.query(User).filter(User.id.in_(teacher_ids)).all()}

    results = []
    for c in classes:
        teacher = teachers.get(c.teacher_id)
        member_ids = [row[0] for row in db.query(ClassStudent.user_id).filter(ClassStudent.class_id == c.id).all()]
        module_ids = get_class_module_ids(db, c)
        if member_ids and module_ids:
            total_sessions = db.query(func.count(func.distinct(BehaviorData.session_id))).filter(
                BehaviorData.user_id.in_(member_ids),
                BehaviorData.module_id.in_(module_ids)
            ).scalar() or 0
        else:
            total_sessions = 0

        results.append(ClassWithStats(
            id=c.id,
            name=c.name,
            description=c.description,
            join_code=c.join_code,
            teacher_id=c.teacher_id,
            teacher_name=(teacher.full_name or teacher.username) if teacher else None,
            teacher_email=teacher.email if teacher else None,
            organization_id=c.organization_id,
            is_active=c.is_active,
            created_at=c.created_at,
            student_count=len(member_ids),
            guest_count=0,
            total_sessions=int(total_sessions),
            module_count=len(module_ids)
        ))

    return results

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
    
    verify_class_access(current_user, class_obj)
    
    member_ids = [row[0] for row in db.query(ClassStudent.user_id).filter(ClassStudent.class_id == class_obj.id).all()]
    module_ids = get_class_module_ids(db, class_obj)
    if member_ids and module_ids:
        total_sessions = db.query(func.count(func.distinct(BehaviorData.session_id))).filter(
            BehaviorData.user_id.in_(member_ids),
            BehaviorData.module_id.in_(module_ids)
        ).scalar() or 0
    else:
        total_sessions = 0
    
    # Build response with stats
    response = ClassWithStats(
        **class_obj.__dict__,
        teacher_name=(class_obj.teacher.full_name or class_obj.teacher.username) if class_obj.teacher else None,
        teacher_email=class_obj.teacher.email if class_obj.teacher else None,
        student_count=len(member_ids),
        guest_count=0,
        total_sessions=int(total_sessions),
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
    
    verify_class_access(current_user, class_obj)
    
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


@router.get("/joined", response_model=list[JoinedClassResponse])
async def get_joined_classes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only students can access this resource")

    classes = db.query(Class).join(
        ClassStudent, ClassStudent.class_id == Class.id
    ).filter(
        ClassStudent.user_id == current_user.id,
        Class.is_active == True
    ).order_by(Class.created_at.desc()).all()

    teacher_ids = list({c.teacher_id for c in classes})
    teachers = {}
    if teacher_ids:
        teachers = {u.id: u for u in db.query(User).filter(User.id.in_(teacher_ids)).all()}

    results = []
    for c in classes:
        t = teachers.get(c.teacher_id)
        results.append({
            "id": c.id,
            "name": c.name,
            "description": c.description,
            "teacher_name": (t.full_name or t.username) if t else None,
            "teacher_email": t.email if t else None,
            "organization_id": c.organization_id,
        })

    return results


@router.get("/my-tasks", response_model=list[StudentClassTasks])
async def get_my_tasks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only students can access this resource")

    classes = db.query(Class).join(
        ClassStudent, ClassStudent.class_id == Class.id
    ).filter(
        ClassStudent.user_id == current_user.id,
        Class.is_active == True
    ).order_by(Class.created_at.desc()).all()

    if not classes:
        return []

    teacher_ids = list({c.teacher_id for c in classes})
    teachers = {}
    if teacher_ids:
        teachers = {u.id: u for u in db.query(User).filter(User.id.in_(teacher_ids)).all()}

    class_ids = [c.id for c in classes]
    task_rows = db.query(ClassModuleTask.class_id, Module).join(
        Module, Module.id == ClassModuleTask.module_id
    ).filter(
        ClassModuleTask.class_id.in_(class_ids),
        ClassModuleTask.is_active == True,
        Module.is_published == True
    ).all()

    modules_by_class = {}
    for class_id, mod in task_rows:
        modules_by_class.setdefault(class_id, []).append(mod)

    results = []
    for c in classes:
        t = teachers.get(c.teacher_id)
        mods = modules_by_class.get(c.id, [])
        results.append({
            "class_id": c.id,
            "class_name": c.name,
            "teacher_name": (t.full_name or t.username) if t else None,
            "modules": [
                {
                    "module_id": m.module_id,
                    "title": m.title,
                    "subject": m.subject,
                    "build_path": m.build_path,
                }
                for m in sorted(mods, key=lambda x: (x.title or ''))
            ]
        })

    return results

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
    
    verify_class_access(current_user, class_obj)
    
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
    
    verify_class_access(current_user, class_obj)
    
    # Soft delete
    class_obj.is_active = False
    
    db.commit()
    
    return {"success": True, "message": "Class deactivated"}


@router.put("/{class_id}/teacher", response_model=ClassResponse)
async def transfer_class_teacher(
    class_id: int,
    payload: ClassTeacherTransferRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in [UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    class_obj = db.query(Class).filter(Class.id == class_id).first()
    if not class_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")

    if current_user.role == UserRole.ORG_ADMIN and class_obj.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You don't have access to this class")

    teacher = db.query(User).filter(User.id == payload.teacher_id).first()
    if not teacher or teacher.role != UserRole.TEACHER:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Target teacher not found")
    if teacher.organization_id != class_obj.organization_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Teacher must belong to the same organization")

    class_obj.teacher_id = teacher.id
    db.commit()
    db.refresh(class_obj)

    return ClassResponse(
        id=class_obj.id,
        name=class_obj.name,
        description=class_obj.description,
        join_code=class_obj.join_code,
        teacher_id=class_obj.teacher_id,
        teacher_name=teacher.full_name or teacher.username,
        teacher_email=teacher.email,
        organization_id=class_obj.organization_id,
        is_active=class_obj.is_active,
        created_at=class_obj.created_at,
    )


@router.get("/{class_id}/module-tasks", response_model=list[ClassModuleTaskResponse])
async def list_class_module_tasks(
    class_id: int,
    only_active: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    class_obj = db.query(Class).filter(Class.id == class_id, Class.is_active == True).first()
    if not class_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")

    if current_user.role in [UserRole.TEACHER, UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN]:
        verify_teacher_access(current_user)
        verify_class_access(current_user, class_obj)
    elif current_user.role == UserRole.STUDENT:
        membership = db.query(ClassStudent).filter(ClassStudent.class_id == class_id, ClassStudent.user_id == current_user.id).first()
        if not membership:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not enrolled in this class")
        only_active = True
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    modules = db.query(Module).join(
        ModuleWhitelist, ModuleWhitelist.module_id == Module.id
    ).filter(
        ModuleWhitelist.organization_id == class_obj.organization_id,
        ModuleWhitelist.is_enabled == True,
        Module.is_published == True
    ).order_by(Module.title.asc()).all()

    module_ids = [m.id for m in modules]
    tasks = {}
    if module_ids:
        rows = db.query(ClassModuleTask).filter(ClassModuleTask.class_id == class_id, ClassModuleTask.module_id.in_(module_ids)).all()
        tasks = {r.module_id: r for r in rows}

    member_ids = [row[0] for row in db.query(ClassStudent.user_id).filter(ClassStudent.class_id == class_id).all()]
    total_students = len(member_ids)
    played_by_module = {}
    if member_ids and modules:
        rows = db.query(
            BehaviorData.module_id.label('module_id'),
            func.count(func.distinct(BehaviorData.user_id)).label('played_students')
        ).filter(
            BehaviorData.user_id.isnot(None),
            BehaviorData.user_id.in_(member_ids),
            BehaviorData.module_id.in_([m.module_id for m in modules])
        ).group_by(BehaviorData.module_id).all()
        played_by_module = {r.module_id: int(r.played_students) for r in rows}

    results = []
    for m in modules:
        task = tasks.get(m.id)
        is_active = bool(task.is_active) if task else False
        if only_active and not is_active:
            continue
        results.append({
            "module_id": m.module_id,
            "title": m.title,
            "subject": m.subject,
            "build_path": m.build_path,
            "is_active": is_active,
            "played_students": played_by_module.get(m.module_id, 0),
            "total_students": total_students,
        })

    return results


@router.put("/{class_id}/module-tasks/{module_id}")
async def update_class_module_task(
    class_id: int,
    module_id: str,
    payload: ClassModuleTaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    verify_teacher_access(current_user)
    class_obj = db.query(Class).filter(Class.id == class_id).first()
    if not class_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    verify_class_access(current_user, class_obj)

    module = db.query(Module).filter(Module.module_id == module_id, Module.is_published == True).first()
    if not module:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")

    wl = db.query(ModuleWhitelist).filter(
        ModuleWhitelist.organization_id == class_obj.organization_id,
        ModuleWhitelist.module_id == module.id,
        ModuleWhitelist.is_enabled == True
    ).first()
    if not wl:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Module is not enabled for this organization")

    task = db.query(ClassModuleTask).filter(ClassModuleTask.class_id == class_id, ClassModuleTask.module_id == module.id).first()
    if not task:
        task = ClassModuleTask(class_id=class_id, module_id=module.id, is_active=payload.is_active)
        db.add(task)
    else:
        task.is_active = payload.is_active
    db.commit()

    return {"success": True, "module_id": module_id, "is_active": payload.is_active}


@router.get("/{class_id}/module-tasks/{module_id}/students", response_model=list[ClassModuleStudentStatus])
async def get_class_module_students(
    class_id: int,
    module_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    verify_teacher_access(current_user)
    class_obj = db.query(Class).filter(Class.id == class_id).first()
    if not class_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    verify_class_access(current_user, class_obj)

    members = db.query(User).join(ClassStudent, User.id == ClassStudent.user_id).filter(ClassStudent.class_id == class_id).all()
    if not members:
        return []

    member_ids = [m.id for m in members]
    rows = db.query(
        BehaviorData.user_id.label('user_id'),
        func.count(func.distinct(BehaviorData.session_id)).label('total_sessions'),
        func.count(BehaviorData.id).label('total_events'),
        func.max(BehaviorData.timestamp).label('last_active'),
    ).filter(
        BehaviorData.user_id.isnot(None),
        BehaviorData.user_id.in_(member_ids),
        BehaviorData.module_id == module_id
    ).group_by(BehaviorData.user_id).all()

    stats = {r.user_id: r for r in rows}

    results = []
    for m in sorted(members, key=lambda x: (x.full_name or x.username or '')):
        st = stats.get(m.id)
        total_events = int(st.total_events) if st else 0
        results.append({
            "user_id": m.id,
            "name": m.full_name or m.username or "Unknown",
            "email": m.email,
            "played": total_events > 0,
            "total_sessions": int(st.total_sessions) if st else 0,
            "total_events": total_events,
            "last_active": st.last_active if st else None,
        })

    return results
