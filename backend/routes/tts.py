"""
Text-to-speech proxy for ElevenLabs.
Keeps the ElevenLabs API key on the server instead of shipping it in the frontend bundle.
"""
import os
import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

_api_key = os.getenv("ELEVENLABS_API_KEY")
VOICE_ID = "pFZP5JQG7iQjIQuC4Bku"  # Lily
MODEL_ID = "eleven_flash_v2_5"


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000)


@router.post("/tts")
async def tts(req: TTSRequest):
    if not _api_key:
        # Frontend falls back to the browser's speechSynthesis on any non-200
        raise HTTPException(status_code=503, detail="TTS not configured")

    async with httpx.AsyncClient(timeout=20) as client:
        res = await client.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}",
            headers={"xi-api-key": _api_key, "Content-Type": "application/json"},
            json={
                "text": req.text,
                "model_id": MODEL_ID,
                "voice_settings": {
                    "stability": 0.35,
                    "similarity_boost": 0.8,
                    "style": 0.4,
                    "use_speaker_boost": True,
                },
            },
        )
    if res.status_code != 200:
        raise HTTPException(status_code=502, detail=f"ElevenLabs error {res.status_code}")
    return Response(content=res.content, media_type="audio/mpeg")
