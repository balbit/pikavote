from pydantic import BaseModel
from datetime import datetime

class UserBase(BaseModel):
    email: str
    name: str
    following: str
    instagram: str
    tiktok: str
    youtube: str

class UserCreate(UserBase):
    pass

class User(UserBase):
    class Config:
        orm_mode = True

class VideoBase(BaseModel):
    user_email: str
    video_link: str
    submission_time: datetime
    comments: str

class VideoCreate(VideoBase):
    pass

class Video(VideoBase):
    id: int

    class Config:
        orm_mode = True

class VoteBase(BaseModel):
    username: str
    video_id: int
    time: datetime
    score: int
    star: int

class VoteCreate(VoteBase):
    pass

class Vote(VoteBase):
    id: int

    class Config:
        orm_mode = True 