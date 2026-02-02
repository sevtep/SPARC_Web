from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import Subject
from schemas import SubjectPublic

router = APIRouter(prefix="/api/subjects", tags=["subjects"])


@router.get("", response_model=list[SubjectPublic])
async def list_subjects(db: Session = Depends(get_db)):
    return (
        db.query(Subject)
        .filter(Subject.is_active == True)
        .order_by(Subject.sort_order.asc(), Subject.name.asc())
        .all()
    )
