from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'

    email = Column(String, primary_key=True, index=True)
    name = Column(String)
    following = Column(String)
    instagram = Column(String)
    tiktok = Column(String)
    youtube = Column(String)

class Video(Base):
    __tablename__ = 'videos'

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, ForeignKey('users.email'))
    video_link = Column(String, index=True)
    submission_time = Column(DateTime)
    comments = Column(String)

    user = relationship("User", back_populates="videos")

User.videos = relationship("Video", order_by=Video.id, back_populates="user")

class Vote(Base):
    __tablename__ = 'votes'

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, index=True)
    video_id = Column(Integer, ForeignKey('videos.id'))
    time = Column(DateTime)
    score = Column(Integer)
    star = Column(Integer)

    video = relationship("Video", back_populates="votes")

Video.votes = relationship("Vote", order_by=Vote.id, back_populates="video") 