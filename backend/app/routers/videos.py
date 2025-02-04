from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import crud, models, schemas
from ..database import SessionLocal, engine
import requests
from sqlalchemy import func

models.Base.metadata.create_all(bind=engine)

router = APIRouter(
    prefix="/videos",
    tags=["videos"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=schemas.Video)
def create_video(video: schemas.VideoCreate, db: Session = Depends(get_db)):
    return crud.create_video(db=db, video=video)

@router.get("/", response_model=list[schemas.Video])
def read_videos(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    videos = crud.get_videos(db, skip=skip, limit=limit)
    return videos

@router.get("/unseen_videos/{username}", response_model=list[dict])
def get_unseen_videos(username: str, n: int = 1, db: Session = Depends(get_db)):
    try:
        # Get video IDs the user has already voted on
        voted_video_ids = db.query(models.Vote.video_id).filter(models.Vote.username == username).subquery()
        
        # Get video IDs that have been shown to others (have votes)
        voted_by_others = db.query(models.Vote.video_id).distinct().subquery()
        
        # First try to get videos that haven't been shown to anyone
        unseen_videos = db.query(models.Video, models.User)\
            .join(models.User)\
            .filter(~models.Video.id.in_(voted_video_ids))\
            .filter(~models.Video.id.in_(voted_by_others))\
            .order_by(func.random())\
            .limit(n)\
            .all()
            
        # If we don't have enough videos, get some that others have seen
        if len(unseen_videos) < n:
            remaining_needed = n - len(unseen_videos)
            additional_videos = db.query(models.Video, models.User)\
                .join(models.User)\
                .filter(~models.Video.id.in_(voted_video_ids))\
                .filter(models.Video.id.in_(voted_by_others))\
                .order_by(func.random())\
                .limit(remaining_needed)\
                .all()
            
            unseen_videos.extend(additional_videos)

        # Format the response to include user information
        response = [
            {
                "video": {
                    "id": video.id,
                    "video_link": video.video_link,
                    "submission_time": video.submission_time,
                    "comments": video.comments
                },
                "user": {
                    "email": user.email,
                    "name": user.name,
                    "following": user.following,
                    "social": user.social
                }
            }
            for video, user in unseen_videos
        ]

        return response
    except Exception as e:
        print(f"Error fetching unseen videos for user {username}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {e}")

@router.get("/proxy")
def proxy_video(url: str):
    try:
        # Make the request to the target URL
        response = requests.get(url, timeout=10)
        response.raise_for_status()  # Raise exception for HTTP errors
        # Return the response content to the frontend
        return response.text
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error fetching URL: {e}")

@router.get("/stats")
def get_video_stats(
    offset: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    try:
        stats = crud.get_video_stats(db)
        # Get top_videos with pagination and new sorting:
        top_videos = (
            db.query(
                models.Video.id,
                models.Video.video_link,
                models.Video.submission_time,
                models.User.name.label('creator_name'),
                models.User.email.label('creator_email'),
                func.avg(models.Vote.score).label('average_score'),
                func.count(models.Vote.id).label('total_votes')
            )
            .join(models.Vote, models.Video.id == models.Vote.video_id)
            .join(models.User, models.Video.user_email == models.User.email)
            .group_by(
                models.Video.id,
                models.Video.video_link,
                models.Video.submission_time,
                models.User.name,
                models.User.email
            )
            .order_by(
                (func.avg(models.Vote.score).desc()),
                (func.count(models.Vote.id).desc())
            )
            .offset(offset)
            .limit(limit)
            .all()
        )

        top_videos_formatted = [
            {
                "id": video.id,
                "video_link": video.video_link,
                "submission_time": video.submission_time,
                "creator_name": video.creator_name,
                "creator_email": video.creator_email,
                "average_score": video.average_score,
                "total_votes": video.total_votes
            }
            for video in top_videos
        ]

        stats["top_videos"] = top_videos_formatted

        return stats
    except Exception as e:
        print(f"Error fetching video stats: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.get("/video_votes/{video_id}")
def get_video_votes(video_id: int, db: Session = Depends(get_db)):
    try:
        votes = (
            db.query(models.Vote)
            .filter(models.Vote.video_id == video_id)
            .order_by(models.Vote.time)
            .all()
        )
        return [
            {
                "id": vote.id,
                "username": vote.username,
                "score": vote.score,
                "star": vote.star,
                "time": vote.time.isoformat() if vote.time else None,
            }
            for vote in votes
        ]
    except Exception as e:
        print(f"Error fetching votes for video {video_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.get("/video/{video_id}", response_model=dict)
def get_video_by_id(video_id: int, db: Session = Depends(get_db)):
    try:
        # Get video with user information
        video_data = db.query(models.Video, models.User)\
            .join(models.User)\
            .filter(models.Video.id == video_id)\
            .first()
            
        if not video_data:
            raise HTTPException(status_code=404, detail="Video not found")
            
        video, user = video_data
        
        # Format the response to match the structure used in unseen_videos
        response = {
            "video": {
                "id": video.id,
                "video_link": video.video_link,
                "submission_time": video.submission_time,
                "comments": video.comments
            },
            "user": {
                "email": user.email,
                "name": user.name,
                "following": user.following,
                "social": user.social
            }
        }

        return response
    except Exception as e:
        print(f"Error fetching video {video_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {e}")

# Disable the create_video API
# @router.post("/", response_model=schemas.Video)
# def create_video(video: schemas.VideoCreate, db: Session = Depends(get_db)):
#     return crud.create_video(db=db, video=video) 