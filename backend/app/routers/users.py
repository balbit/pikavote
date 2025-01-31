from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import crud, models
from ..database import SessionLocal

router = APIRouter(
    prefix="/users",
    tags=["users"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/usernames", response_model=list[str])
def get_usernames(db: Session = Depends(get_db)):
    return crud.get_all_usernames(db) 