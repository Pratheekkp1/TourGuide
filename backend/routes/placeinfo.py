"""
Generates rich, culturally-aware descriptions of a place using Gemini.
Called on demand when user taps a map marker.
"""
import os
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from google import genai
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

_api_key = os.getenv("GEMINI_API_KEY")
_client = genai.Client(api_key=_api_key) if _api_key else None

LANGUAGE_NAMES = {
    "en": "English", "es": "Spanish", "fr": "French", "ar": "Arabic",
    "hi": "Hindi", "ja": "Japanese", "ko": "Korean", "pt": "Portuguese",
    "de": "German", "it": "Italian", "zh": "Mandarin Chinese", "tl": "Filipino (Tagalog)",
    "vi": "Vietnamese", "sw": "Swahili", "tr": "Turkish", "pl": "Polish",
    "ru": "Russian", "uk": "Ukrainian", "bn": "Bengali", "ur": "Urdu",
}


class PlaceInfoRequest(BaseModel):
    name: str
    category: str
    type_label: str
    lat: float
    lng: float
    location_context: str = ""
    language: str = "en"
    tags: dict = {}


@router.post("/place-info")
async def get_place_info(req: PlaceInfoRequest):
    if not _client:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY not set")

    lang_name = LANGUAGE_NAMES.get(req.language, "English")

    extras = []
    if req.tags.get("opening_hours"):
        extras.append(f"Opening hours: {req.tags['opening_hours']}")
    if req.tags.get("cuisine"):
        extras.append(f"Cuisine: {req.tags['cuisine']}")
    if req.tags.get("denomination"):
        extras.append(f"Denomination: {req.tags['denomination']}")
    if req.tags.get("description"):
        extras.append(f"Description: {req.tags['description']}")
    extra_str = ". ".join(extras) + "." if extras else ""

    location_str = req.location_context or f"GPS {req.lat:.4f}, {req.lng:.4f}"

    prompt = f"""You are a knowledgeable local guide helping an immigrant or traveler understand a place they found nearby.

Place: {req.name}
Type: {req.type_label}
Near: {location_str}
{extra_str}

The user may be unfamiliar with local culture, language, or customs. Be welcoming and practical.
Respond in {lang_name}.

Return ONLY a raw JSON object — no markdown, no code fences:
{{
  "description": "2-3 engaging sentences about what this place is and why it is significant",
  "history": "1-2 sentences of historical or cultural background (null if not applicable)",
  "visitor_info": "Practical details — when it is open, cost if any, what to bring or expect",
  "local_tip": "One insider tip a local friend would share with a newcomer visiting this place",
  "cultural_notes": "Customs or etiquette specific to this type of place (dress code, behavior, etc.)",
  "interesting_fact": "One surprising or little-known fact about this place"
}}"""

    try:
        response = _client.models.generate_content(model="gemini-2.5-flash-lite", contents=prompt)
        raw = response.text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()
        return json.loads(raw)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
