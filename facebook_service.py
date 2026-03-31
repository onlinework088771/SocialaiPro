import httpx
import os
from typing import List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

class FacebookService:
    def __init__(self):
        self.app_id = os.getenv("FACEBOOK_APP_ID")
        self.app_secret = os.getenv("FACEBOOK_APP_SECRET")
        self.redirect_uri = os.getenv("FACEBOOK_REDIRECT_URI")
        self.graph_api_version = "v20.0"
        self.api_base_url = "https://graph.facebook.com"
    
    def get_login_url(self, state: str) -> str:
        """Generate Facebook OAuth login URL"""
        scopes = [
            "public_profile",
            "pages_manage_posts",
            "pages_manage_engagement",
            "pages_read_engagement",
            "pages_show_list",
            "pages_manage_metadata"
        ]
        
        params = {
            "client_id": self.app_id,
            "redirect_uri": self.redirect_uri,
            "scope": ",".join(scopes),
            "response_type": "code",
            "state": state
        }
        
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"https://www.facebook.com/{self.graph_api_version}/dialog/oauth?{query_string}"
    
    async def exchange_code_for_token(self, code: str) -> str:
        """Exchange authorization code for access token"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_base_url}/{self.graph_api_version}/oauth/access_token",
                params={
                    "client_id": self.app_id,
                    "client_secret": self.app_secret,
                    "redirect_uri": self.redirect_uri,
                    "code": code
                },
                timeout=30.0
            )
            
            if response.status_code != 200:
                raise Exception(f"Failed to exchange code: {response.text}")
            
            data = response.json()
            return data.get("access_token")
    
    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """Get user information"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_base_url}/{self.graph_api_version}/me",
                params={"fields": "id,name,email"},
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=30.0
            )
            
            if response.status_code != 200:
                raise Exception(f"Failed to get user info: {response.text}")
            
            return response.json()
    
    async def get_user_pages(self, access_token: str) -> List[Dict[str, Any]]:
        """Fetch all pages managed by the user"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_base_url}/{self.graph_api_version}/me/accounts",
                headers={"Authorization": f"Bearer {access_token}"},
                params={"fields": "id,name,access_token,category"},
                timeout=30.0
            )
            
            if response.status_code != 200:
                raise Exception(f"Failed to fetch pages: {response.text}")
            
            data = response.json()
            return data.get("data", [])
    
    async def post_to_page(self, page_id: str, page_access_token: str, message: str, 
                          content_type: str, media_url: str = None) -> Dict[str, Any]:
        """Post content to a Facebook page"""
        async with httpx.AsyncClient() as client:
            if content_type == "text":
                response = await client.post(
                    f"{self.api_base_url}/{self.graph_api_version}/{page_id}/feed",
                    json={
                        "message": message,
                        "access_token": page_access_token
                    },
                    timeout=60.0
                )
            elif content_type == "photo":
                response = await client.post(
                    f"{self.api_base_url}/{self.graph_api_version}/{page_id}/photos",
                    json={
                        "url": media_url,
                        "caption": message,
                        "access_token": page_access_token
                    },
                    timeout=60.0
                )
            elif content_type in ["video", "reel"]:
                response = await client.post(
                    f"{self.api_base_url}/{self.graph_api_version}/{page_id}/videos",
                    json={
                        "file_url": media_url,
                        "description": message,
                        "access_token": page_access_token
                    },
                    timeout=120.0
                )
            else:
                raise Exception(f"Unsupported content type: {content_type}")
            
            if response.status_code not in [200, 201]:
                raise Exception(f"Failed to post: {response.text}")
            
            return response.json()