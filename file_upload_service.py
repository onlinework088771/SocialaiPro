import os
import uuid
from pathlib import Path
from typing import Optional
import shutil
from fastapi import UploadFile

class FileUploadService:
    def __init__(self):
        self.upload_dir = Path("/app/backend/uploads")
        self.upload_dir.mkdir(exist_ok=True)

        self.public_dir = self.upload_dir / "public"
        self.public_dir.mkdir(exist_ok=True)

        self.max_file_size = 100 * 1024 * 1024  # 100MB

        self.allowed_image_types = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
        self.allowed_video_types = ["video/mp4", "video/mpeg", "video/quicktime", "video/x-msvideo"]

    async def save_file(self, file: UploadFile, content_type: str, owner_id: Optional[str] = None) -> dict:
        """Save uploaded file and return file info"""
        file_extension = self._get_file_extension(file.filename)
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        target_dir = self.public_dir / owner_id if owner_id else self.public_dir
        target_dir.mkdir(parents=True, exist_ok=True)
        file_path = target_dir / unique_filename

        if content_type == "photo":
            if file.content_type not in self.allowed_image_types:
                raise ValueError(f"Invalid image type. Allowed: {', '.join(self.allowed_image_types)}")
        elif content_type in ["video", "reel"]:
            if file.content_type not in self.allowed_video_types:
                raise ValueError(f"Invalid video type. Allowed: {', '.join(self.allowed_video_types)}")

        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            file_size = file_path.stat().st_size

            if file_size > self.max_file_size:
                file_path.unlink()
                raise ValueError(f"File too large. Maximum size: {self.max_file_size / (1024*1024)}MB")

            public_prefix = f"{owner_id}/" if owner_id else ""
            public_url = f"/api/uploads/public/{public_prefix}{unique_filename}"

            return {
                "filename": unique_filename,
                "original_filename": file.filename,
                "file_path": str(file_path),
                "public_url": public_url,
                "content_type": file.content_type,
                "file_size": file_size
            }
        except Exception as e:
            if file_path.exists():
                file_path.unlink()
            raise e
    
    def _get_file_extension(self, filename: str) -> str:
        """Extract file extension"""
        return Path(filename).suffix.lower()
    
    def delete_file(self, file_path: str) -> bool:
        """Delete uploaded file"""
        try:
            path = Path(file_path)
            if path.exists():
                path.unlink()
                return True
            return False
        except Exception:
            return False
