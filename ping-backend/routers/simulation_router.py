from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import Module
from schemas import ModuleResponse

router = APIRouter(prefix="/api/simulations", tags=["simulations"])


@router.get("", response_model=list[ModuleResponse])
async def list_simulations(subject: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Module).filter(Module.is_published == True)
    if subject and subject != "all":
        query = query.filter(Module.subject == subject)
    return query.order_by(Module.title.asc()).all()


@router.get("/{module_id}", response_model=ModuleResponse)
async def get_simulation(module_id: str, db: Session = Depends(get_db)):
    module = db.query(Module).filter(Module.module_id == module_id).first()
    if not module:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Simulation not found")
    return module
