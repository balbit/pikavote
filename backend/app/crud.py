from sqlalchemy.orm import Session
from . import models, schemas
import re
from datetime import datetime
import csv
from sqlalchemy import func

# CRUD operations for videos
def get_video(db: Session, video_id: int):
    return db.query(models.Video).filter(models.Video.id == video_id).first()

def get_videos(db: Session, skip: int = 0, limit: int = 10):
    return db.query(models.Video).offset(skip).limit(limit).all()

def create_video(db: Session, video: schemas.VideoCreate):
    db_video = models.Video(**video.dict())
    db.add(db_video)
    db.commit()
    db.refresh(db_video)
    return db_video

# CRUD operations for votes
def get_vote(db: Session, vote_id: int):
    return db.query(models.Vote).filter(models.Vote.id == vote_id).first()

def get_votes(db: Session, skip: int = 0, limit: int = 10):
    return db.query(models.Vote).offset(skip).limit(limit).all()

def create_vote(db: Session, vote: schemas.VoteCreate):
    db_vote = models.Vote(**vote.dict())
    db.add(db_vote)
    db.commit()
    db.refresh(db_vote)
    return db_vote

# Function to parse CSV and create video objects
def parse_csv_and_create_videos(db: Session, csv_path: str):
    with open(csv_path, 'r', newline='') as file:
        reader = csv.DictReader(file)

        video_link_pattern = re.compile(r'https://(?:early-access\.)?pika\.art/video/[\w-]+')

        for row in reader:
            email = row['email']
            timestamp = row['timestamp']
            name = row['name']
            links = row['links']
            following = row['following']
            instagram = row['instagram']
            tiktok = row['tiktok']
            youtube = row['youtube']

            # Create or get user
            user = db.query(models.User).filter(models.User.email == email).first()
            if not user:
                user = models.User(
                    email=email,
                    name=name,
                    following=following,
                    instagram=instagram,
                    tiktok=tiktok,
                    youtube=youtube
                )
                db.add(user)
                db.commit()
                db.refresh(user)

            # Extract video links and comments
            extracted_links = re.findall(video_link_pattern, links)
            comments = re.sub(video_link_pattern, '', links).strip().replace('\n', ' ').replace('\r', ' ')

            for link in extracted_links:
                video = models.Video(
                    user_email=email,
                    video_link=link,
                    submission_time=datetime.strptime(timestamp, '%m/%d/%Y %H:%M:%S'),
                    comments=comments
                )
                db.add(video)

        db.commit()

# Add this function to fetch votes by a specific user
def get_votes_by_user(db: Session, username: str):
    return db.query(models.Vote).filter(models.Vote.username == username).all()

# Enhanced Function to get video statistics
def get_video_stats(db: Session):
    total_votes = db.query(models.Vote).count()
    total_videos = db.query(models.Video).count()

    # Number of videos with 0 votes
    videos_with_0_votes = db.query(models.Video).filter(~models.Video.id.in_(db.query(models.Vote.video_id))).count()

    # Number of videos with >=1 vote
    videos_with_1_or_more_votes = total_videos - videos_with_0_votes

    # Number of videos with >=3 votes
    videos_with_3_or_more_votes = db.query(models.Video.id)\
        .join(models.Vote, models.Video.id == models.Vote.video_id)\
        .group_by(models.Video.id)\
        .having(func.count(models.Vote.id) >= 3)\
        .count()

    # Histogram of vote scores
    vote_scores_histogram = db.query(models.Vote.score, func.count(models.Vote.score))\
        .group_by(models.Vote.score)\
        .order_by(models.Vote.score)\
        .all()

    # Process histogram data
    vote_scores = [score for score, count in vote_scores_histogram]
    vote_counts = [count for score, count in vote_scores_histogram]

    return {
        "total_votes": total_votes,
        "total_videos": total_videos,
        "videos_with_0_votes": videos_with_0_votes,
        "videos_with_1_or_more_votes": videos_with_1_or_more_votes,
        "videos_with_3_or_more_votes": videos_with_3_or_more_votes,
        "vote_scores_histogram": {
            "scores": vote_scores,
            "counts": vote_counts
        }
    }

# Function to delete a vote
def delete_vote(db: Session, vote_id: int):
    vote = db.query(models.Vote).filter(models.Vote.id == vote_id).first()
    if vote:
        db.delete(vote)
        db.commit()
    return vote

def get_all_usernames(db: Session):
    return list(set(vote.username for vote in db.query(models.Vote).all()))