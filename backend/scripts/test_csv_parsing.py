from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app import models, crud

# Create the database tables
models.Base.metadata.create_all(bind=engine)

def test_csv_parsing():
    # Create a new database session
    db: Session = SessionLocal()

    # Clear existing data
    db.query(models.Video).delete()
    db.query(models.User).delete()
    db.commit()

    # Parse the CSV file
    csv_path = 'data/pika2.csv'
    crud.parse_csv_and_create_videos(db, csv_path)

    # Retrieve and print video objects
    videos = db.query(models.Video).all()
    for video in videos:
        print(f"Video ID: {video.id}, Link: {video.video_link}, Metadata: {video.metadata}")

    # Close the session
    db.close()

if __name__ == "__main__":
    test_csv_parsing() 