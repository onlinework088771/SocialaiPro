from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form, Request, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Optional
from urllib.parse import urlparse
import asyncio
import secrets
import uuid
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.staticfiles import StaticFiles

from models import (
    FacebookAccount, FacebookPage, PostRequest, PostHistory, 
    TitleGenerationRequest, HashtagGenerationRequest, PostStatus,
    ScheduledPost, SchedulePostRequest, ScheduleType,
    User, UserCreate, UserLogin, Token, MediaItem
)
from services.facebook_service import FacebookService
from services.ai_service import AIService
from services.encryption import TokenEncryption
from services.scheduler_service import SchedulerService
from services.file_upload_service import FileUploadService
from services.auth_service import AuthService

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Initialize services
fb_service = FacebookService()
ai_service = AIService()
auth_service = AuthService()
encryption_key = os.getenv("ENCRYPTION_KEY")
scheduler_service = SchedulerService(db, encryption_key)
file_upload_service = FileUploadService()

# Security
security = HTTPBearer()
UPLOADS_ROOT = Path("/app/backend/uploads/public")


def resolve_local_upload_path_from_url(media_url: Optional[str], user_id: Optional[str] = None) -> Optional[str]:
    """Resolve local hosted upload path from public media URL"""
    if not media_url:
        return None

    parsed = urlparse(media_url)
    path_value = parsed.path if parsed.scheme else media_url
    if not path_value.startswith("/api/uploads/public/"):
        return None

    relative_path = path_value.replace("/api/uploads/public/", "", 1).lstrip("/")
    if not relative_path:
        return None

    candidate = (UPLOADS_ROOT / relative_path).resolve()
    uploads_root = UPLOADS_ROOT.resolve()

    if uploads_root not in candidate.parents and candidate != uploads_root:
        return None

    if user_id:
        try:
            candidate.relative_to((UPLOADS_ROOT / user_id).resolve())
        except ValueError:
            return None

    return str(candidate)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Get current authenticated user from JWT token"""
    token = credentials.credentials
    payload = auth_service.decode_token(token)
    
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

# Create the main app
app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Mount static files for uploads
app.mount("/api/uploads", StaticFiles(directory="/app/backend/uploads"), name="uploads")

# Create router with /api prefix
api_router = APIRouter(prefix="/api")

# Auth routes (public - no authentication required)
@api_router.post("/auth/signup", response_model=Token)
@limiter.limit("5/minute")
async def signup(user_data: UserCreate, request: Request):
    """User signup"""
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    password_hash = auth_service.hash_password(user_data.password)
    
    user = User(
        user_id=user_id,
        email=user_data.email,
        full_name=user_data.full_name,
        password_hash=password_hash,
        created_at=datetime.now(timezone.utc).isoformat(),
        is_active=True,
        subscription_plan="free"
    )
    
    await db.users.insert_one(user.model_dump())
    
    access_token = auth_service.create_access_token({"user_id": user_id, "email": user_data.email})
    
    return Token(
        access_token=access_token,
        user={
            "user_id": user_id,
            "email": user_data.email,
            "full_name": user_data.full_name,
            "subscription_plan": "free"
        }
    )

@api_router.post("/auth/login", response_model=Token)
@limiter.limit("10/minute")
async def login(credentials: UserLogin, request: Request):
    """User login"""
    user = await db.users.find_one({"email": credentials.email})
    
    if not user or not auth_service.verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is disabled")
    
    access_token = auth_service.create_access_token({
        "user_id": user["user_id"],
        "email": user["email"]
    })
    
    return Token(
        access_token=access_token,
        user={
            "user_id": user["user_id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "subscription_plan": user.get("subscription_plan", "free")
        }
    )

@api_router.get("/auth/me")
@limiter.limit("30/minute")
async def get_me(request: Request, current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    return current_user

# Dashboard stats (protected)
@api_router.get("/dashboard/stats")
@limiter.limit("60/minute")
async def get_dashboard_stats(request: Request, current_user: dict = Depends(get_current_user)):
    """Get dashboard statistics"""
    user_id = current_user["user_id"]

    accounts = await db.facebook_accounts.find(
        {"user_id": user_id},
        {"_id": 0, "access_token": 0}
    ).to_list(100)

    total_accounts = len(accounts)
    total_pages = await db.facebook_pages.count_documents({"user_id": user_id})

    scheduled_posts = await db.scheduled_posts.count_documents({
        "user_id": user_id,
        "status": "pending"
    })

    published_posts = await db.post_history.count_documents({
        "user_id": user_id,
        "status": "success"
    })

    failed_posts = await db.post_history.count_documents({
        "user_id": user_id,
        "status": "failed"
    })

    recent_activity = await db.post_history.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)

    pages_by_account = []
    for account in accounts:
        page_count = await db.facebook_pages.count_documents({
            "user_id": user_id,
            "fb_user_id": account["fb_user_id"]
        })
        pages_by_account.append({
            "fb_user_id": account["fb_user_id"],
            "fb_user_name": account["fb_user_name"],
            "pages_count": page_count,
            "created_at": account.get("created_at")
        })

    preferred_slots = [
        f"{slot['hour']:02d}:{slot['minute']:02d}" for slot in scheduler_service.default_slots
    ]

    return {
        "total_accounts": total_accounts,
        "total_pages": total_pages,
        "scheduled_posts": scheduled_posts,
        "published_posts": published_posts,
        "failed_posts": failed_posts,
        "automation_status": "active" if scheduled_posts > 0 else "idle",
        "timezone": "America/New_York",
        "timezone_label": "US Eastern Time (EST/EDT)",
        "preferred_slots": preferred_slots,
        "pages_by_account": pages_by_account,
        "recent_activity": recent_activity
    }

# Analytics endpoint
@api_router.get("/analytics/stats")
@limiter.limit("60/minute")
async def get_analytics_stats(request: Request, current_user: dict = Depends(get_current_user)):
    """Get analytics and insights"""
    user_id = current_user["user_id"]
    
    # Get all post history
    all_posts = await db.post_history.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    
    # Calculate metrics
    total_posts = len(all_posts)
    success_count = sum(1 for p in all_posts if p["status"] == "success")
    failed_count = sum(1 for p in all_posts if p["status"] == "failed")
    success_rate = (success_count / total_posts * 100) if total_posts > 0 else 0
    
    # Posts by content type
    content_types = {}
    for post in all_posts:
        ct = post["content_type"]
        content_types[ct] = content_types.get(ct, 0) + 1
    
    # Posts over time (last 30 days)
    from datetime import timedelta
    import pytz
    now = datetime.now(pytz.UTC)
    daily_posts = {}
    
    for i in range(30):
        day = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        daily_posts[day] = 0
    
    for post in all_posts:
        try:
            post_date = datetime.fromisoformat(post["created_at"].replace('Z', '+00:00'))
            day = post_date.strftime("%Y-%m-%d")
            if day in daily_posts:
                daily_posts[day] += 1
        except:
            pass
    
    # Best posting times (hour analysis)
    hour_distribution = {str(h): 0 for h in range(24)}
    for post in all_posts:
        try:
            post_date = datetime.fromisoformat(post["created_at"].replace('Z', '+00:00'))
            hour = str(post_date.hour)
            hour_distribution[hour] = hour_distribution.get(hour, 0) + 1
        except:
            pass
    
    return {
        "overview": {
            "total_posts": total_posts,
            "success_count": success_count,
            "failed_count": failed_count,
            "success_rate": round(success_rate, 2)
        },
        "content_types": content_types,
        "daily_posts": [{"date": k, "count": v} for k, v in sorted(daily_posts.items())],
        "hourly_distribution": [{"hour": int(k), "count": v} for k, v in sorted(hour_distribution.items(), key=lambda x: int(x[0]))]
    }

# Facebook Auth routes (protected)
@api_router.get("/auth/facebook/login")
@limiter.limit("10/minute")
async def facebook_login(request: Request, current_user: dict = Depends(get_current_user)):
    """Generate Facebook login URL"""
    state = secrets.token_hex(16)
    login_url = fb_service.get_login_url(state)

    await db.oauth_states.insert_one({
        "state": state,
        "user_id": current_user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    
    return {
        "login_url": login_url,
        "state": state
    }

@api_router.get("/auth/facebook/callback")
@limiter.limit("10/minute")
async def facebook_callback(code: str, state: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Handle Facebook OAuth callback"""
    if not code:
        raise HTTPException(status_code=400, detail="No authorization code received")

    state_record = await db.oauth_states.find_one({
        "state": state,
        "user_id": current_user["user_id"],
    })
    if not state_record:
        raise HTTPException(status_code=400, detail="Invalid or expired Facebook state")
    
    try:
        access_token = await fb_service.exchange_code_for_token(code)
        user_info = await fb_service.get_user_info(access_token)
        
        encrypted_token = TokenEncryption.encrypt_token(access_token, encryption_key)
        
        fb_account = FacebookAccount(
            user_id=current_user["user_id"],
            fb_user_id=user_info["id"],
            fb_user_name=user_info["name"],
            access_token=encrypted_token,
            created_at=datetime.now(timezone.utc).isoformat()
        )
        
        await db.facebook_accounts.update_one(
            {"fb_user_id": fb_account.fb_user_id, "user_id": current_user["user_id"]},
            {"$set": fb_account.model_dump()},
            upsert=True
        )
        await db.oauth_states.delete_many({"user_id": current_user["user_id"]})
        
        return {
            "success": True,
            "fb_user_id": user_info["id"],
            "fb_user_name": user_info["name"],
            "message": "Successfully connected Facebook account"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Account routes
@api_router.get("/accounts")
@limiter.limit("60/minute")
async def get_connected_accounts(request: Request, current_user: dict = Depends(get_current_user)):
    """Get all connected Facebook accounts"""
    accounts = await db.facebook_accounts.find(
        {"user_id": current_user["user_id"]},
        {"_id": 0, "access_token": 0}
    ).sort("created_at", -1).to_list(100)

    enriched_accounts = []
    for account in accounts:
        pages_count = await db.facebook_pages.count_documents({
            "user_id": current_user["user_id"],
            "fb_user_id": account["fb_user_id"]
        })
        enriched_accounts.append({
            **account,
            "pages_count": pages_count,
            "timezone": "US Eastern Time"
        })

    return {"accounts": enriched_accounts}

@api_router.delete("/accounts/{fb_user_id}")
@limiter.limit("30/minute")
async def disconnect_account(fb_user_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Disconnect a Facebook account"""
    result = await db.facebook_accounts.delete_one({
        "fb_user_id": fb_user_id,
        "user_id": current_user["user_id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")
    
    await db.facebook_pages.delete_many({
        "fb_user_id": fb_user_id,
        "user_id": current_user["user_id"]
    })
    
    return {"success": True, "message": "Account disconnected"}

# Pages routes
@api_router.get("/pages/{fb_user_id}")
@limiter.limit("60/minute")
async def get_user_pages(fb_user_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Get pages for a specific Facebook account"""
    account = await db.facebook_accounts.find_one(
        {"fb_user_id": fb_user_id, "user_id": current_user["user_id"]},
        {"_id": 0}
    )
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    try:
        access_token = TokenEncryption.decrypt_token(account["access_token"], encryption_key)
        
        pages_data = await fb_service.get_user_pages(access_token)
        
        for page_data in pages_data:
            encrypted_page_token = TokenEncryption.encrypt_token(page_data["access_token"], encryption_key)
            
            fb_page = FacebookPage(
                user_id=current_user["user_id"],
                page_id=page_data["id"],
                page_name=page_data["name"],
                page_access_token=encrypted_page_token,
                category=page_data.get("category"),
                fb_user_id=fb_user_id
            )
            
            await db.facebook_pages.update_one(
                {"page_id": fb_page.page_id, "fb_user_id": fb_user_id, "user_id": current_user["user_id"]},
                {"$set": fb_page.model_dump()},
                upsert=True
            )
    except Exception as e:
        logger.warning(f"Could not refresh pages from Facebook API: {e}")
    
    pages = await db.facebook_pages.find(
        {"fb_user_id": fb_user_id, "user_id": current_user["user_id"]}, 
        {"_id": 0, "page_access_token": 0}
    ).to_list(100)
    
    return {"pages": pages}

# File Upload routes
@api_router.post("/upload")
@limiter.limit("30/minute")
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    content_type: str = Form("photo"),
    current_user: dict = Depends(get_current_user)
):
    """Upload file and auto-generate title + hashtags"""
    try:
        file_info = await file_upload_service.save_file(file, content_type, current_user["user_id"])
        
        title = await ai_service.generate_title_from_filename(
            file_info["original_filename"],
            content_type
        )
        
        hashtags = await ai_service.generate_hashtags(
            file_info["original_filename"],
            title
        )
        
        backend_url = os.getenv("REACT_APP_BACKEND_URL", "http://localhost:8001")
        public_url = f"{backend_url}{file_info['public_url']}"
        
        return {
            "success": True,
            "file_info": file_info,
            "public_url": public_url,
            "auto_generated": {
                "title": title,
                "hashtags": hashtags
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Media Library routes
@api_router.post("/media/upload")
@limiter.limit("50/minute")
async def upload_to_library(
    request: Request,
    file: UploadFile = File(...),
    title: str = "",
    current_user: dict = Depends(get_current_user)
):
    """Upload file to media library"""
    try:
        content_type = "photo" if file.content_type.startswith("image") else "video"
        file_info = await file_upload_service.save_file(file, content_type, current_user["user_id"])
        
        backend_url = os.getenv("REACT_APP_BACKEND_URL", "http://localhost:8001")
        public_url = f"{backend_url}{file_info['public_url']}"
        
        media_item = MediaItem(
            media_id=str(uuid.uuid4()),
            user_id=current_user["user_id"],
            filename=file_info["filename"],
            original_filename=file_info["original_filename"],
            file_type=file_info["content_type"],
            file_size=file_info["file_size"],
            public_url=public_url,
            file_path=file_info["file_path"],
            title=title or file_info["original_filename"],
            tags=[],
            created_at=datetime.now(timezone.utc).isoformat()
        )
        
        await db.media_library.insert_one(media_item.model_dump())
        
        return {
            "success": True,
            "media": media_item.model_dump()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/media")
@limiter.limit("100/minute")
async def get_media_library(
    request: Request,
    current_user: dict = Depends(get_current_user),
    file_type: str = None
):
    """Get user's media library"""
    query = {"user_id": current_user["user_id"]}
    if file_type:
        query["file_type"] = {"$regex": file_type, "$options": "i"}
    
    media = await db.media_library.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    return {"media": media}

@api_router.delete("/media/{media_id}")
@limiter.limit("30/minute")
async def delete_media(
    media_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Delete media from library"""
    media = await db.media_library.find_one({
        "media_id": media_id,
        "user_id": current_user["user_id"]
    })
    
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    file_path = Path(media["file_path"]) if media.get("file_path") else None
    if file_path is None and media.get("public_url"):
        resolved_path = resolve_local_upload_path_from_url(media.get("public_url"), current_user["user_id"])
        file_path = Path(resolved_path) if resolved_path else None

    if file_path and file_path.exists() and file_path.is_file():
        file_path.unlink()
    
    await db.media_library.delete_one({"media_id": media_id})
    
    return {"success": True, "message": "Media deleted"}

# AI routes
@api_router.post("/ai/generate-title")
@limiter.limit("20/minute")
async def generate_title(request: TitleGenerationRequest, mode: str = "informative", req: Request = None):
    """Generate title for content"""
    try:
        title = await ai_service.generate_title(
            request.content_description, 
            request.content_type,
            mode
        )
        return {"title": title}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/ai/generate-hashtags")
@limiter.limit("20/minute")
async def generate_hashtags(request: HashtagGenerationRequest, mode: str = "informative", req: Request = None):
    """Generate hashtags for content"""
    try:
        hashtags = await ai_service.generate_hashtags(
            request.content_description,
            request.title or "",
            mode
        )
        return {"hashtags": hashtags}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Posting routes
@api_router.post("/post")
@limiter.limit("20/minute")
async def create_post(request_data: PostRequest, request: Request, current_user: dict = Depends(get_current_user)):
    """Post content to selected pages"""
    try:
        # Verify the FB account belongs to the current user
        account = await db.facebook_accounts.find_one({
            "fb_user_id": request_data.fb_user_id,
            "user_id": current_user["user_id"]
        })
        if not account:
            raise HTTPException(status_code=403, detail="Facebook account not linked to your profile")
        
        pages = await db.facebook_pages.find(
            {
                "page_id": {"$in": request_data.selected_page_ids},
                "fb_user_id": request_data.fb_user_id,
                "user_id": current_user["user_id"],
            },
            {"_id": 0}
        ).to_list(100)
        
        if not pages:
            raise HTTPException(status_code=404, detail="No pages found")
        
        message = request_data.message or ""
        
        if request_data.auto_generate_title and request_data.message:
            title = await ai_service.generate_title(request_data.message, request_data.content_type)
            message = f"{title}\\n\\n{message}"
        
        if request_data.auto_generate_hashtags:
            hashtags = await ai_service.generate_hashtags(request_data.message or "", message)
            message = f"{message}\\n\\n{' '.join(hashtags)}"
        
        results = []
        tasks = []
        
        for page in pages:
            decrypted_token = TokenEncryption.decrypt_token(page["page_access_token"], encryption_key)
            
            media_url = None
            if request_data.content_type == "photo" and request_data.image_url:
                media_url = request_data.image_url
            elif request_data.content_type in ["video", "reel"] and request_data.video_url:
                media_url = request_data.video_url
            
            task = fb_service.post_to_page(
                page["page_id"],
                decrypted_token,
                message,
                request_data.content_type,
                media_url
            )
            tasks.append((page, task))
        
        post_results = await asyncio.gather(
            *[t[1] for t in tasks], 
            return_exceptions=True
        )
        
        for (page, _), result in zip(tasks, post_results):
            if isinstance(result, Exception):
                results.append({
                    "page_id": page["page_id"],
                    "page_name": page["page_name"],
                    "success": False,
                    "error": str(result)
                })
                
                post_history = PostHistory(
                    user_id=current_user["user_id"],
                    fb_user_id=request_data.fb_user_id,
                    content_type=request_data.content_type,
                    message=message,
                    page_ids=[page["page_id"]],
                    page_names=[page["page_name"]],
                    status=PostStatus.FAILED,
                    error_message=str(result),
                    created_at=datetime.now(timezone.utc).isoformat()
                )
            else:
                results.append({
                    "page_id": page["page_id"],
                    "page_name": page["page_name"],
                    "success": True,
                    "post_id": result.get("id") or result.get("post_id")
                })
                
                post_history = PostHistory(
                    user_id=current_user["user_id"],
                    fb_user_id=request_data.fb_user_id,
                    content_type=request_data.content_type,
                    message=message,
                    page_ids=[page["page_id"]],
                    page_names=[page["page_name"]],
                    status=PostStatus.SUCCESS,
                    created_at=datetime.now(timezone.utc).isoformat()
                )
            
            await db.post_history.insert_one(post_history.model_dump())
        
        return {
            "success": all(r["success"] for r in results),
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# History routes
@api_router.get("/history")
@limiter.limit("60/minute")
async def get_posting_history(request: Request, current_user: dict = Depends(get_current_user), fb_user_id: str = None, limit: int = 50):
    """Get posting history"""
    query = {"user_id": current_user["user_id"]}
    if fb_user_id:
        query["fb_user_id"] = fb_user_id
    
    history = await db.post_history.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {"history": history}

# Scheduling routes
@api_router.post("/schedule")
@limiter.limit("30/minute")
async def schedule_post(request_data: SchedulePostRequest, request: Request, current_user: dict = Depends(get_current_user)):
    """Schedule a post for later"""
    from datetime import datetime
    import pytz
    import uuid
    
    if not request_data.selected_page_ids:
        raise HTTPException(status_code=400, detail="No pages selected")
    
    try:
        account = await db.facebook_accounts.find_one({
            "fb_user_id": request_data.fb_user_id,
            "user_id": current_user["user_id"]
        })
        if not account:
            raise HTTPException(status_code=403, detail="Facebook account not linked to your profile")

        message = request_data.message or ""
        
        if request_data.auto_generate_title and message:
            title = await ai_service.generate_title(message, request_data.content_type)
            message = f"{title}\\n\\n{message}"
        
        if request_data.auto_generate_hashtags:
            hashtags = await ai_service.generate_hashtags(message or "", message)
            message = f"{message}\\n\\n{' '.join(hashtags)}"
        
        est_tz = pytz.timezone('America/New_York')
        
        if request_data.schedule_type == ScheduleType.AUTO:
            scheduled_time = scheduler_service.get_next_available_slot()
        else:
            if not request_data.scheduled_time:
                raise HTTPException(status_code=400, detail="Manual schedule requires scheduled_time")
            
            scheduled_time = datetime.fromisoformat(request_data.scheduled_time.replace('Z', '+00:00'))
            if scheduled_time.tzinfo is None:
                scheduled_time = est_tz.localize(scheduled_time)
            else:
                scheduled_time = scheduled_time.astimezone(est_tz)
            
            if scheduled_time <= datetime.now(est_tz):
                raise HTTPException(status_code=400, detail="Scheduled time must be in the future")
        
        uploaded_media_path = None
        cleanup_media_after_publish = False
        if request_data.content_type in ["video", "reel"] and request_data.video_url:
            uploaded_media_path = resolve_local_upload_path_from_url(request_data.video_url, current_user["user_id"])
            cleanup_media_after_publish = uploaded_media_path is not None

        scheduled_post = ScheduledPost(
            schedule_id=str(uuid.uuid4()),
            user_id=current_user["user_id"],
            fb_user_id=request_data.fb_user_id,
            content_type=request_data.content_type,
            message=message,
            image_url=request_data.image_url,
            video_url=request_data.video_url,
            selected_page_ids=request_data.selected_page_ids,
            scheduled_time=scheduled_time.isoformat(),
            schedule_type=request_data.schedule_type,
            status=PostStatus.PENDING,
            created_at=datetime.now(pytz.UTC).isoformat(),
            uploaded_media_path=uploaded_media_path,
            cleanup_media_after_publish=cleanup_media_after_publish
        )
        
        await db.scheduled_posts.insert_one(scheduled_post.model_dump())
        
        return {
            "success": True,
            "schedule_id": scheduled_post.schedule_id,
            "scheduled_time": scheduled_time.isoformat(),
            "message": f"Post scheduled for {scheduled_time.strftime('%B %d, %Y at %I:%M %p EST')}"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/scheduled")
@limiter.limit("60/minute")
async def get_scheduled_posts(request: Request, current_user: dict = Depends(get_current_user), fb_user_id: str = None, status: str = None):
    """Get scheduled posts"""
    query = {"user_id": current_user["user_id"]}
    if fb_user_id:
        query["fb_user_id"] = fb_user_id
    if status:
        query["status"] = status
    
    scheduled = await db.scheduled_posts.find(query, {"_id": 0}).sort("scheduled_time", 1).to_list(100)
    
    return {"scheduled_posts": scheduled}

@api_router.delete("/scheduled/{schedule_id}")
@limiter.limit("30/minute")
async def delete_scheduled_post(schedule_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Delete a scheduled post"""
    scheduled_post = await db.scheduled_posts.find_one({
        "schedule_id": schedule_id,
        "user_id": current_user["user_id"]
    })

    if not scheduled_post:
        raise HTTPException(status_code=404, detail="Scheduled post not found")

    uploaded_media_path = scheduled_post.get("uploaded_media_path")
    if uploaded_media_path:
        media_path = Path(uploaded_media_path)
        if media_path.exists():
            media_path.unlink()

    result = await db.scheduled_posts.delete_one({
        "schedule_id": schedule_id,
        "user_id": current_user["user_id"]
    })
    
    return {"success": True, "message": "Scheduled post deleted"}

@api_router.get("/schedule/time-slots")
@limiter.limit("100/minute")
async def get_time_slots(request: Request, current_user: dict = Depends(get_current_user)):
    """Get default time slots for scheduling"""
    slots = scheduler_service.get_default_time_slots()
    return {
        "timezone": "America/New_York",
        "label": "US Eastern Time",
        "time_slots": slots
    }

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    """Start the scheduler on app startup"""
    scheduler_enabled = os.getenv("SCHEDULER_ENABLED", "true").lower() == "true"
    if scheduler_enabled:
        try:
            scheduler_service.start()
            logger.info("Application started with scheduler enabled")
        except Exception as exc:
            logger.exception("Scheduler startup failed: %s", exc)
    else:
        logger.info("Application started (scheduler disabled by env)")

@app.on_event("shutdown")
async def shutdown_db_client():
    @app.get("/")
async def root():
    return {"status": "ok", "service": "SocialAiPro API"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
    try:
        scheduler_service.shutdown()
    except Exception:
        logger.warning("Scheduler shutdown skipped")
    client.close()
    logger.info("Application shutdown")
