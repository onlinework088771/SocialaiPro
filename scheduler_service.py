from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta
from pathlib import Path
import pytz
from typing import List
import logging
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

from services.facebook_service import FacebookService
from services.encryption import TokenEncryption
from models import PostStatus

logger = logging.getLogger(__name__)

class SchedulerService:
    def __init__(self, db, encryption_key: str):
        self.db = db
        self.encryption_key = encryption_key
        self.fb_service = FacebookService()
        self.scheduler = BackgroundScheduler(timezone=pytz.timezone('America/New_York'))
        self.est_tz = pytz.timezone('America/New_York')
        
        self.default_slots = [
            {"hour": 8, "minute": 30},
            {"hour": 12, "minute": 0},
            {"hour": 15, "minute": 0},
            {"hour": 18, "minute": 0},
            {"hour": 21, "minute": 0}
        ]
    
    def start(self):
        """Start the background scheduler"""
        if self.scheduler.running:
            logger.info("Scheduler already running")
            return

        existing_job = self.scheduler.get_job('process_scheduled_posts')
        if existing_job is None:
            self.scheduler.add_job(
                self.process_scheduled_posts,
                'interval',
                minutes=1,
                id='process_scheduled_posts',
                replace_existing=True,
                max_instances=1,
                coalesce=True,
                misfire_grace_time=300,
            )
        self.scheduler.start()
        logger.info("Scheduler started - processing every minute")
    
    def shutdown(self):
        """Shutdown the scheduler"""
        if not self.scheduler.running:
            return
        self.scheduler.shutdown(wait=False)
        logger.info("Scheduler shutdown")
    
    def get_next_available_slot(self, base_time: datetime = None) -> datetime:
        """Get next available time slot in EST"""
        if base_time is None:
            base_time = datetime.now(self.est_tz)
        
        current_date = base_time.date()
        
        for slot in self.default_slots:
            slot_time = self.est_tz.localize(
                datetime.combine(current_date, datetime.min.time()).replace(
                    hour=slot["hour"],
                    minute=slot["minute"]
                )
            )
            
            if slot_time > base_time:
                return slot_time
        
        next_day = current_date + timedelta(days=1)
        first_slot = self.default_slots[0]
        return self.est_tz.localize(
            datetime.combine(next_day, datetime.min.time()).replace(
                hour=first_slot["hour"],
                minute=first_slot["minute"]
            )
        )
    
    def process_scheduled_posts(self):
        """Process scheduled posts that are due"""
        try:
            import threading
            thread = threading.Thread(target=self._sync_process)
            thread.start()
            thread.join()
        except Exception as e:
            logger.error(f"Error in process_scheduled_posts: {str(e)}")
    
    def _sync_process(self):
        """Synchronous wrapper for async processing"""
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(self._process_scheduled_posts_async())
        except Exception as e:
            logger.error(f"Error in _sync_process: {str(e)}")
        finally:
            try:
                loop.close()
            except:
                pass
    
    async def _process_scheduled_posts_async(self):
        """Async processing of scheduled posts"""
        now = datetime.now(self.est_tz)
        
        scheduled_posts = await self.db.scheduled_posts.find({
            "status": "pending",
            "scheduled_time": {"$lte": now.isoformat()}
        }).to_list(100)
        
        logger.info(f"Processing {len(scheduled_posts)} scheduled posts")
        
        for post in scheduled_posts:
            try:
                await self._execute_scheduled_post(post, now)
            except Exception as e:
                logger.error(f"Error executing scheduled post {post['schedule_id']}: {str(e)}")
                
                await self.db.scheduled_posts.update_one(
                    {"schedule_id": post["schedule_id"]},
                    {
                        "$set": {
                            "status": "failed",
                            "error_message": str(e),
                            "processed_at": now.isoformat()
                        }
                    }
                )
    
    def _cleanup_uploaded_media(self, post: dict):
        """Delete hosted upload after scheduled publish succeeds"""
        if not post.get("cleanup_media_after_publish"):
            return

        uploaded_media_path = post.get("uploaded_media_path")
        if not uploaded_media_path:
            return

        try:
            media_path = Path(uploaded_media_path)
            uploads_root = Path("/app/backend/uploads/public").resolve()
            resolved_path = media_path.resolve()
            if uploads_root not in resolved_path.parents:
                logger.warning("Skipped cleanup for media outside uploads root: %s", resolved_path)
                return

            if resolved_path.exists():
                resolved_path.unlink()
                logger.info("Deleted hosted scheduled media: %s", resolved_path)
        except Exception as exc:
            logger.warning("Failed to delete hosted scheduled media %s: %s", uploaded_media_path, exc)

    async def _execute_scheduled_post(self, post: dict, now: datetime):
        """Execute a single scheduled post"""
        logger.info(f"Executing scheduled post {post['schedule_id']}")
        
        if post.get("schedule_type") == "auto":
            scheduled_time = datetime.fromisoformat(post["scheduled_time"])
            if scheduled_time.tzinfo is None:
                scheduled_time = self.est_tz.localize(scheduled_time)
            if now - scheduled_time > timedelta(minutes=10):
                next_slot = self.get_next_available_slot(now)
                await self.db.scheduled_posts.update_one(
                    {"schedule_id": post["schedule_id"]},
                    {
                        "$set": {
                            "scheduled_time": next_slot.isoformat(),
                            "error_message": "Missed slot detected. Auto-moved to the next available US slot.",
                        }
                    }
                )
                logger.info(f"Rescheduled missed auto slot for {post['schedule_id']} to {next_slot.isoformat()}")
                return

        pages = await self.db.facebook_pages.find(
            {
                "page_id": {"$in": post["selected_page_ids"]},
                "fb_user_id": post["fb_user_id"],
                "user_id": post["user_id"],
            },
            {"_id": 0}
        ).to_list(100)
        
        if not pages:
            raise Exception("No pages found for scheduled post")
        
        results = []
        for page in pages:
            try:
                decrypted_token = TokenEncryption.decrypt_token(
                    page["page_access_token"],
                    self.encryption_key
                )
                
                media_url = None
                if post["content_type"] == "photo" and post.get("image_url"):
                    media_url = post["image_url"]
                elif post["content_type"] in ["video", "reel"] and post.get("video_url"):
                    media_url = post["video_url"]
                
                result = await self.fb_service.post_to_page(
                    page["page_id"],
                    decrypted_token,
                    post["message"],
                    post["content_type"],
                    media_url
                )
                
                results.append({
                    "page_id": page["page_id"],
                    "success": True,
                    "post_id": result.get("id") or result.get("post_id")
                })
                
                from models import PostHistory
                history = PostHistory(
                    user_id=post["user_id"],
                    fb_user_id=post["fb_user_id"],
                    content_type=post["content_type"],
                    message=post["message"],
                    page_ids=[page["page_id"]],
                    page_names=[page["page_name"]],
                    status=PostStatus.SUCCESS,
                    created_at=now.isoformat()
                )
                await self.db.post_history.insert_one(history.model_dump())
                
            except Exception as e:
                logger.error(f"Error posting to page {page['page_id']}: {str(e)}")
                results.append({
                    "page_id": page["page_id"],
                    "success": False,
                    "error": str(e)
                })
        
        success_count = sum(1 for r in results if r.get("success"))
        
        if success_count > 0:
            await self.db.scheduled_posts.update_one(
                {"schedule_id": post["schedule_id"]},
                {
                    "$set": {
                        "status": "success",
                        "processed_at": now.isoformat()
                    }
                }
            )
            self._cleanup_uploaded_media(post)
        else:
            await self.db.scheduled_posts.update_one(
                {"schedule_id": post["schedule_id"]},
                {
                    "$set": {
                        "status": "failed",
                        "error_message": "Failed to post to all pages",
                        "processed_at": now.isoformat()
                    }
                }
            )
        
        logger.info(f"Completed scheduled post {post['schedule_id']}: {success_count}/{len(pages)} successful")
    
    def get_default_time_slots(self, date: datetime = None) -> List[dict]:
        """Get default time slots for a given date"""
        if date is None:
            date = datetime.now(self.est_tz)
        
        slots = []
        for slot in self.default_slots:
            slot_time = self.est_tz.localize(
                datetime.combine(date.date(), datetime.min.time()).replace(
                    hour=slot["hour"],
                    minute=slot["minute"]
                )
            )
            
            slots.append({
                "time": slot_time.isoformat(),
                "label": slot_time.strftime("%I:%M %p"),
                "available": slot_time > datetime.now(self.est_tz)
            })
        
        return slots
