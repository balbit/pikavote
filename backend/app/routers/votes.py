from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, case, desc
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

@router.get("/top_users", response_model=dict)
def get_top_users(limit: int = 10, db: Session = Depends(get_db)):
    try:
        # Aggregate vote data by username
        results = (
            db.query(
                models.Vote.username,
                func.count(models.Vote.id).label("num_votes"),
                func.avg(models.Vote.score).label("average_score"),
                (
                    func.sum(
                        case((models.Vote.score == 5, 1), else_=0)
                    ) * 100.0 /
                    func.count(models.Vote.id)
                ).label("percent_5s")
            )
            .group_by(models.Vote.username)
            .order_by(desc("num_votes"))
            .limit(limit)
            .all()
        )
        
        if not results:
            raise HTTPException(status_code=404, detail="No vote data found")
        
        # Format the response as a dictionary
        top_users = []
        for row in results:
            top_users.append({
                "username": row.username,
                "num_votes": row.num_votes,
                "average_score": row.average_score,
                "percent_5s": row.percent_5s,
            })
        
        response = {
            "top_users": top_users
        }
        return response

    except Exception as e:
        print(f"Error fetching top users: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {e}")
