import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from google import genai
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

_api_key = os.getenv("GEMINI_API_KEY")
_client = genai.Client(api_key=_api_key) if _api_key else None


class GuidanceRequest(BaseModel):
    scene: str
    confidence: float
    people_count: int
    density: str
    social_state: str
    activity: str | None = None
    region: str = "Unknown"


@router.post("/guidance")
async def get_guidance(req: GuidanceRequest):
    if not _client:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY not set in .env")

    activity_line = f"- Observed activity: {req.activity}\n" if req.activity else ""
    region_context = req.region if req.region != "Unknown" else "an unspecified country"

    prompt = f"""You are a real-time cultural guide for an immigrant or traveler who is unfamiliar with local customs and norms.

Current situation:
- Location type: {req.scene}
- People present: {req.people_count} ({req.social_state})
{activity_line}- Country/region: {region_context}

Give 2-3 specific, immediately actionable tips a newcomer needs RIGHT NOW to navigate this place without making mistakes.

Prioritize: local etiquette, unwritten rules, how to get help, what NOT to do, how locals behave here.
Examples of good advice: how to queue, whether to tip, how to address staff, what's considered rude, how to order, what phrases help.

Be concrete — name specific behaviors, not vague principles.
Tone: calm, direct, like advice from a local friend. Max 65 words. No bullet points. No intro phrase like "Here are tips"."""

    try:
        response = _client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        return {"guidance": response.text.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
