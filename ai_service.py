from emergentintegrations.llm.chat import LlmChat, UserMessage
import os
from dotenv import load_dotenv
from typing import List
from pathlib import Path
import random

load_dotenv()

class AIService:
    def __init__(self):
        self.api_key = os.getenv("EMERGENT_LLM_KEY")
        self.banned_hashtags = self._load_hashtag_list("banned_hashtags.txt")
        self.trending_hashtags = self._load_hashtag_list("trending_hashtags.txt")
        
        self.mode_prompts = {
            "funny": "You are a humorous social media expert. Create funny, witty, and entertaining content that makes people laugh. Use playful language and humor.",
            "emotional": "You are an emotional storytelling expert. Create heartfelt, touching content that resonates emotionally. Use emotive language that connects with feelings.",
            "informative": "You are an educational content expert. Create clear, informative, and valuable content that teaches or informs. Use professional and authoritative language.",
            "trending": "You are a viral content expert. Create trending, buzzworthy content that captures attention. Use current trends and popular culture references."
        }
    
    def _load_hashtag_list(self, filename: str) -> List[str]:
        """Load hashtag list from file"""
        try:
            file_path = Path(__file__).parent.parent / "data" / filename
            if file_path.exists():
                with open(file_path, 'r') as f:
                    return [line.strip().lower() for line in f if line.strip() and not line.startswith('#')]
            return []
        except Exception as e:
            print(f"Error loading {filename}: {e}")
            return []
    
    def _filter_hashtags(self, hashtags: List[str]) -> List[str]:
        """Filter out banned hashtags"""
        filtered = []
        for tag in hashtags:
            tag_lower = tag.lower()
            if tag_lower not in self.banned_hashtags:
                filtered.append(tag)
        return filtered
    
    async def generate_title(self, content_description: str, content_type: str, mode: str = "informative") -> str:
        """Generate catchy title for social media post"""
        system_prompt = self.mode_prompts.get(mode, self.mode_prompts["informative"])
        
        chat = LlmChat(
            api_key=self.api_key,
            session_id=f"title-gen-{content_type}-{mode}",
            system_message=f"{system_prompt} Generate catchy, engaging titles for Facebook posts. Keep titles under 100 characters. Return ONLY the title, no quotes or extra text."
        ).with_model("openai", "gpt-5.2")
        
        user_message = UserMessage(
            text=f"Create a catchy {mode} title for a {content_type} post about: {content_description}"
        )
        
        response = await chat.send_message(user_message)
        return response.strip()
    
    async def generate_title_from_filename(self, filename: str, content_type: str) -> str:
        """Generate title from uploaded filename"""
        clean_name = filename.replace('_', ' ').replace('-', ' ')
        name_without_ext = '.'.join(clean_name.split('.')[:-1])
        
        chat = LlmChat(
            api_key=self.api_key,
            session_id="title-from-file",
            system_message="You are a social media expert. Create a catchy, engaging title from a filename. Keep it under 100 characters. Return ONLY the title, no quotes."
        ).with_model("openai", "gpt-5.2")
        
        user_message = UserMessage(
            text=f"Create an engaging {content_type} post title from this filename: {name_without_ext}"
        )
        
        response = await chat.send_message(user_message)
        return response.strip()
    
    async def generate_hashtags(self, content_description: str, title: str = "", mode: str = "informative") -> List[str]:
        """Generate 10-15 relevant hashtags with trending + AI mix"""
        system_prompt = self.mode_prompts.get(mode, self.mode_prompts["informative"])
        
        chat = LlmChat(
            api_key=self.api_key,
            session_id=f"hashtag-gen-{mode}",
            system_message=f"{system_prompt} Generate 8-10 relevant, specific hashtags for Facebook posts. Return ONLY hashtags separated by spaces, with # prefix. Focus on specific, relevant tags."
        ).with_model("openai", "gpt-5.2")
        
        prompt = f"Generate specific {mode} hashtags for: {content_description}"
        if title:
            prompt += f" Title: {title}"
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        ai_hashtags = [h.strip() for h in response.strip().split() if h.startswith('#')]
        
        ai_hashtags = self._filter_hashtags(ai_hashtags)
        
        trending_sample = random.sample(
            self.trending_hashtags, 
            min(5, len(self.trending_hashtags))
        )
        trending_with_hash = [f"#{tag}" if not tag.startswith('#') else tag for tag in trending_sample]
        
        combined = ai_hashtags + trending_with_hash
        
        unique_hashtags = []
        seen = set()
        for tag in combined:
            tag_lower = tag.lower()
            if tag_lower not in seen:
                seen.add(tag_lower)
                unique_hashtags.append(tag)
        
        return unique_hashtags[:15]