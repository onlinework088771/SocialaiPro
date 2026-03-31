from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum

class ContentType(str, Enum):
    TEXT = "text"
    PHOTO = "photo"
    VIDEO = "video"
    REEL = "reel"

class PostStatus(str, Enum):
    SUCCESS = "success"
    FAILED = "failed"
    PENDING = "pending"

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    user_id: str
    email: EmailStr
    full_name: str
    password_hash: str
    created_at: str
    is_active: bool = True
    subscription_plan: str = "free"

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class FacebookAccount(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    user_id: str
    fb_user_id: str
    fb_user_name: str
    access_token: str
    created_at: str

class FacebookPage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    user_id: str
    page_id: str
    page_name: str
    page_access_token: str
    category: Optional[str] = None
    fb_user_id: str

class PostRequest(BaseModel):
    content_type: ContentType
    message: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    selected_page_ids: List[str]
    fb_user_id: str
    auto_generate_title: bool = False
    auto_generate_hashtags: bool = False

class PostHistory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    user_id: str
    fb_user_id: str
    content_type: str
    message: str
    page_ids: List[str]
    page_names: List[str]
    status: PostStatus
    error_message: Optional[str] = None
    created_at: str

class TitleGenerationRequest(BaseModel):
    content_description: str
    content_type: ContentType

class HashtagGenerationRequest(BaseModel):
    content_description: str
    title: Optional[str] = None

class ScheduleType(str, Enum):
    MANUAL = "manual"
    AUTO = "auto"

class ScheduledPost(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    schedule_id: str
    user_id: str
    fb_user_id: str
    content_type: str
    message: str
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    selected_page_ids: List[str]
    scheduled_time: str
    schedule_type: ScheduleType
    status: PostStatus
    created_at: str
    processed_at: Optional[str] = None
    error_message: Optional[str] = None
    uploaded_media_path: Optional[str] = None
    cleanup_media_after_publish: bool = False

class SchedulePostRequest(BaseModel):
    content_type: ContentType
    message: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    selected_page_ids: List[str]
    fb_user_id: str
    schedule_type: ScheduleType
    scheduled_time: Optional[str] = None
    auto_generate_title: bool = False
    auto_generate_hashtags: bool = False

class MediaItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    media_id: str
    user_id: str
    filename: str
    original_filename: str
    file_type: str
    file_size: int
    public_url: str
    file_path: Optional[str] = None
    title: Optional[str] = None
    tags: List[str] = []
    created_at: str