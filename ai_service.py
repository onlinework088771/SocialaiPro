import os
import random
import re
from pathlib import Path
from typing import List

from dotenv import load_dotenv

load_dotenv()


class AIService:
    """
    Lightweight fallback AI service.

    This version avoids third-party LLM SDK dependencies so the backend can
    deploy reliably on services like Railway. It generates usable titles and
    hashtags with local text heuristics and keyword extraction.
    """

    STOPWORDS = {
        "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has",
        "how", "in", "is", "it", "its", "of", "on", "or", "our", "that", "the",
        "their", "this", "to", "with", "you", "your", "we", "us", "was", "were",
        "will", "about", "into", "over", "under", "after", "before", "during",
        "than", "then", "them", "they", "he", "she", "his", "her", "him", "i",
        "me", "my", "mine", "yours", "ours", "these", "those", "just", "more",
        "most", "very", "can", "could", "should", "would", "new", "best", "top"
    }

    GENERIC_KEYWORDS = {
        "video", "photo", "reel", "post", "content", "facebook", "social", "media"
    }

    MODE_PREFIXES = {
        "funny": ["Just for laughs:", "Too good not to share:", "Mood of the day:"],
        "emotional": ["A moment worth feeling:", "Straight from the heart:", "A story to remember:"],
        "informative": ["Quick update:", "What you should know:", "Helpful insight:"],
        "trending": ["Everyone's talking about:", "Trending now:", "Don't miss this:"],
    }

    MODE_HASHTAGS = {
        "funny": ["#Funny", "#LOL", "#GoodVibes", "#SmileMore", "#JustForFun"],
        "emotional": ["#Emotional", "#Heartfelt", "#RealMoments", "#Feelings", "#Inspiration"],
        "informative": ["#Tips", "#LearnSomething", "#DidYouKnow", "#Insight", "#Useful"],
        "trending": ["#Trending", "#Viral", "#Buzz", "#MustSee", "#PopularNow"],
    }

    CONTENT_HASHTAGS = {
        "text": ["#TextPost", "#Update"],
        "photo": ["#PhotoOfTheDay", "#PhotoPost"],
        "video": ["#VideoPost", "#WatchNow"],
        "reel": ["#Reel", "#Reels"],
    }

    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY") or os.getenv("EMERGENT_LLM_KEY") or ""
        self.banned_hashtags = self._load_hashtag_list("banned_hashtags.txt")
        self.trending_hashtags = self._load_hashtag_list("trending_hashtags.txt")

    def _load_hashtag_list(self, filename: str) -> List[str]:
        try:
            file_path = Path(__file__).parent.parent / "data" / filename
            if file_path.exists():
                with open(file_path, "r", encoding="utf-8") as f:
                    return [
                        line.strip().lower()
                        for line in f
                        if line.strip() and not line.startswith("#")
                    ]
            return []
        except Exception as e:
            print(f"Error loading {filename}: {e}")
            return []

    def _normalize_text(self, text: str) -> str:
        text = (text or "").replace("_", " ").replace("-", " ").strip()
        return re.sub(r"\s+", " ", text)

    def _title_case_phrase(self, text: str) -> str:
        words = self._normalize_text(text).split()
        return " ".join(word[:1].upper() + word[1:] for word in words if word)

    def _truncate(self, text: str, max_length: int) -> str:
        text = self._normalize_text(text)
        if len(text) <= max_length:
            return text
        truncated = text[: max_length - 1].rstrip(" ,:-")
        return f"{truncated}…"

    def _filter_hashtags(self, hashtags: List[str]) -> List[str]:
        filtered = []
        seen = set()
        for tag in hashtags:
            tag = tag.strip()
            if not tag:
                continue
            if not tag.startswith("#"):
                tag = f"#{tag}"
            tag_lower = tag.lower()
            if tag_lower in self.banned_hashtags or tag_lower in seen:
                continue
            seen.add(tag_lower)
            filtered.append(tag)
        return filtered

    def _extract_keywords(self, text: str, limit: int = 6) -> List[str]:
        cleaned = self._normalize_text(text).lower()
        words = re.findall(r"[a-zA-Z][a-zA-Z0-9']+", cleaned)
        scored = []
        seen = set()
        for word in words:
            bare = word.strip("'")
            if (
                len(bare) < 3
                or bare in self.STOPWORDS
                or bare in self.GENERIC_KEYWORDS
                or bare.isdigit()
                or bare in seen
            ):
                continue
            seen.add(bare)
            scored.append(bare)
        return scored[:limit]

    def _build_title_from_keywords(self, keywords: List[str], content_type: str, mode: str) -> str:
        prefix_options = self.MODE_PREFIXES.get(mode, self.MODE_PREFIXES["informative"])
        prefix = random.choice(prefix_options)

        if not keywords:
            base = {
                "text": "Fresh social update",
                "photo": "Fresh photo update",
                "video": "Fresh video update",
                "reel": "Fresh reel moment",
            }.get(content_type, "Fresh content update")
            return self._truncate(f"{prefix} {base}", 100)

        lead = self._title_case_phrase(" ".join(keywords[:2]))
        if mode == "funny":
            body = f"{lead} that deserves a laugh"
        elif mode == "emotional":
            body = f"{lead} worth sharing from the heart"
        elif mode == "trending":
            body = f"{lead} everyone will be talking about"
        else:
            body = f"{lead} you should know right now"

        return self._truncate(f"{prefix} {body}", 100)

    def _keyword_hashtags(self, keywords: List[str]) -> List[str]:
        tags = []
        for keyword in keywords:
            parts = re.split(r"[^a-zA-Z0-9]+", keyword)
            joined = "".join(part.capitalize() for part in parts if part)
            if len(joined) >= 3:
                tags.append(f"#{joined}")
        return tags

    async def generate_title(self, content_description: str, content_type: str, mode: str = "informative") -> str:
        keywords = self._extract_keywords(content_description)
        return self._build_title_from_keywords(keywords, content_type, mode)

    async def generate_title_from_filename(self, filename: str, content_type: str) -> str:
        clean_name = self._normalize_text(filename)
        name_without_ext = re.sub(r"\.[A-Za-z0-9]+$", "", clean_name)
        keywords = self._extract_keywords(name_without_ext)
        if keywords:
            return self._truncate(
                f"{self._title_case_phrase(' '.join(keywords[:2]))} {content_type.capitalize()} Update",
                100,
            )
        return self._truncate(f"New {content_type.capitalize()} Upload", 100)

    async def generate_hashtags(self, content_description: str, title: str = "", mode: str = "informative") -> List[str]:
        source_text = f"{content_description} {title}".strip()
        keywords = self._extract_keywords(source_text, limit=8)

        keyword_tags = self._keyword_hashtags(keywords)
        mode_tags = list(self.MODE_HASHTAGS.get(mode, self.MODE_HASHTAGS["informative"]))
        content_tags = list(self.CONTENT_HASHTAGS.get("video" if "video" in source_text.lower() else "text", []))

        if "photo" in source_text.lower():
            content_tags = self.CONTENT_HASHTAGS["photo"]
        elif "reel" in source_text.lower():
            content_tags = self.CONTENT_HASHTAGS["reel"]
        elif "video" in source_text.lower():
            content_tags = self.CONTENT_HASHTAGS["video"]

        trending_sample = random.sample(self.trending_hashtags, min(4, len(self.trending_hashtags)))
        trending_with_hash = [tag if tag.startswith("#") else f"#{tag}" for tag in trending_sample]

        combined = keyword_tags + mode_tags + content_tags + trending_with_hash
        return self._filter_hashtags(combined)[:15]
