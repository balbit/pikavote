from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import crud, models, schemas
from ..database import SessionLocal, engine

models.Base.metadata.create_all(bind=engine)

router = APIRouter(
    prefix="/votes",
    tags=["votes"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=schemas.Vote)
def create_vote(vote: schemas.VoteCreate, db: Session = Depends(get_db)):
    return crud.create_vote(db=db, vote=vote)

@router.get("/", response_model=list[schemas.Vote])
def read_votes(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    votes = crud.get_votes(db, skip=skip, limit=limit)
    return votes

@router.get("/my_votes/{username}", response_model=list[schemas.Vote])
def get_my_votes(username: str, db: Session = Depends(get_db)):
    votes = crud.get_votes_by_user(db, username=username)
    return votes

@router.delete("/{vote_id}", response_model=schemas.Vote)
def delete_vote(vote_id: int, db: Session = Depends(get_db)):
    vote = crud.delete_vote(db, vote_id=vote_id)
    if not vote:
        raise HTTPException(status_code=404, detail="Vote not found")
    return vote 