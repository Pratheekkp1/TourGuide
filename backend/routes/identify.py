"""
Region-analysis endpoint: user drags a selection on the camera feed.
We send the cropped frame to Gemini Vision with rich location context
and get back a structured multi-item scene analysis.
"""
import os
import json
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

_api_key = os.getenv("GEMINI_API_KEY")
_client  = genai.Client(api_key=_api_key) if _api_key else None

LANGUAGE_NAMES = {
    "en": "English", "es": "Spanish", "fr": "French", "ar": "Arabic",
    "hi": "Hindi",   "ja": "Japanese", "ko": "Korean", "pt": "Portuguese",
    "de": "German",  "it": "Italian",  "zh": "Mandarin Chinese",
    "tl": "Filipino (Tagalog)", "vi": "Vietnamese", "sw": "Swahili",
    "tr": "Turkish", "pl": "Polish",   "ru": "Russian", "uk": "Ukrainian",
    "bn": "Bengali", "ur": "Urdu",
}

SYSTEM_PROMPT = """\
You are TourGuide — an expert real-time visual guide built specifically for immigrants, tourists, \
and travelers navigating unfamiliar environments. Your job is NOT to describe what an image looks \
like — your job is to identify, name, and explain the real-world significance of everything visible \
so that a newcomer can understand where they are, what they are looking at, and how to act.

You excel at:
- Recognising named landmarks, monuments, buildings, and their cultural / historical significance
- Identifying signs (including foreign-language signs) and explaining what they mean
- Reading social situations and crowd dynamics (is this safe? what social norms apply here?)
- Spotting food dishes and cultural practices and explaining them
- Detecting multiple distinct objects in a single frame and ranking them by prominence
- Adapting all output to the visitor's chosen language

You NEVER return generic descriptions like "a street scene" or "people walking". You always try to \
name the specific thing (e.g. "the Lincoln Memorial", "a Shabu-Shabu restaurant sign", "a Shinto \
torii gate"). If you are not certain of a specific name, say so clearly and explain what type of \
thing it is and why it matters.
"""

ANALYSIS_PROMPT = """\
{location_context}

The user has selected a region of their live camera feed to analyse. Study this cropped image carefully.

Your task:
1. Identify EVERY distinct, meaningful element visible — landmarks, signs, buildings, people, \
food, objects, text, cultural symbols, environmental cues (crowds, queues, weather indicators), etc.
2. Determine if there is a clear MAIN FOCUS (the thing the user most likely intended to capture — \
usually the most prominent, centred, or in-focus element). If so, give it special treatment with \
full detail. If the frame shows a general situation with no single focus, set main_focus to null \
and make scene_summary carry the weight.
3. Assess the overall SITUATION — what is happening here? What does this environment tell a \
newcomer about where they are and how they should behave?
4. For any named landmark, monument, or significant building: provide its real name, brief history, \
and why it matters to someone visiting this specific area.
5. For any sign containing text: read every word, translate it if not in the user's language, and \
explain what it means practically.
6. Detect social norms, etiquette, safety signals, pricing cues, queue behaviour, dress codes — \
anything a newcomer could easily miss that a local would instinctively know.

Respond in {lang_name}. Return ONLY a raw JSON object (absolutely no markdown code fences, no \
preamble, no trailing text), exactly matching this schema:

{{
  "scene_summary": "1-2 sentences: what is the overall situation/environment here, and what is the single most important thing a newcomer should know right now?",
  "main_focus": {{
    "name": "The specific real-world name of the primary subject (e.g. 'Washington Monument', 'Halal cart', 'Emergency exit sign'). Use null if no clear single focus.",
    "category": "landmark | building | sign | food | person | nature | artwork | object | situation | other",
    "description": "2-4 sentences — what exactly is this, why does it matter, what is its function or significance?",
    "local_context": "1-2 sentences — how does this relate specifically to the user's current city/region/country? What cultural, historical, or practical weight does it carry here?",
    "visitor_tip": "One concrete, immediately actionable tip for a newcomer encountering this specific thing for the first time",
    "confidence": "high | medium | low"
  }},
  "other_items": [
    {{
      "name": "Specific name or descriptive label",
      "category": "landmark | building | sign | food | person | nature | artwork | object | situation | other",
      "description": "1-2 sentences — what is this and why should a newcomer pay attention to it?",
      "significance": "low | moderate | high",
      "visitor_tip": "Short tip, or null if not applicable"
    }}
  ],
  "situation_flags": [
    {{
      "type": "safety | social_norm | etiquette | navigation | pricing | language | accessibility",
      "message": "Short, direct, actionable note written as advice to the visitor — e.g. 'This is a no-photography zone — putting your camera away avoids confrontation', 'Prices here are tourist-inflated — negotiate or walk 2 blocks for local pricing'"
    }}
  ],
  "overall_confidence": "high | medium | low"
}}

Strict rules:
- other_items: include ALL meaningful visible elements, 2–8 items, sorted most-to-least significant. Do not omit things just because they seem minor — a small sign or a queue behaviour can be crucial for a newcomer.
- situation_flags: only include flags that are genuinely relevant and specific to THIS scene. Never pad with generic travel advice.
- If the image is blurry, too dark, or genuinely ambiguous, return valid JSON with overall_confidence "low" and your best-effort interpretation.
- Every field must be a real observation about THIS specific image, never a placeholder.
- Do not wrap the JSON in any code block. Output must begin with {{ and end with }}.
"""


@router.post("/identify")
async def identify(
    file:           UploadFile = File(...),
    lat:            float      = Form(None),
    lng:            float      = Form(None),
    location_name:  str        = Form(""),
    language:       str        = Form("en"),
    venue_name:     str        = Form(""),   # specific building/place from Google Places
):
    if not _client:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY not set")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty image")

    lang_name = LANGUAGE_NAMES.get(language, "English")

    # Build rich location context — most specific first
    lines = []

    if venue_name:
        lines.append(f"EXACT VENUE: The user is physically inside or immediately outside **{venue_name}**.")

    if location_name and location_name != venue_name:
        lines.append(f"AREA: {location_name}")

    if lat and lng:
        lines.append(f"GPS: {lat:.6f}, {lng:.6f}")

    if lines:
        location_context = (
            "PRECISE LOCATION CONTEXT (treat this as ground truth — use it to identify "
            "specific rooms, buildings, artworks, and local significance):\n"
            + "\n".join(lines)
            + "\n\nIMPORTANT: If the image shows anything inside or relating to the named venue above, "
            "identify it specifically within that venue context (e.g. 'the Special Collections reading room "
            "in McKeldin Library' rather than just 'a library reading room'). Draw on your knowledge of "
            "this specific institution's history, collections, and significance."
        )
    else:
        location_context = "No location data — rely on visual cues only."

    prompt = ANALYSIS_PROMPT.format(
        location_context=location_context,
        lang_name=lang_name,
    )

    try:
        response = _client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
                types.Part.from_text(text=prompt),
            ],
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=0.15,    # Very low — maximise factual accuracy
                max_output_tokens=3000,
            ),
        )

        raw = response.text.strip()

        # Strip markdown fences if model disobeys the instruction
        if raw.startswith("```"):
            lines = raw.split("\n")
            # Remove first line (```json) and last line (```)
            raw = "\n".join(lines[1:-1]).strip()

        # Find JSON boundaries in case there's stray text
        start = raw.find("{")
        end   = raw.rfind("}") + 1
        if start == -1 or end == 0:
            raise ValueError("No JSON object found in model output")
        raw = raw[start:end]

        result = json.loads(raw)

        # Normalise — ensure all keys exist so the frontend never crashes
        result.setdefault("scene_summary", "")
        result.setdefault("main_focus", None)
        result.setdefault("other_items", [])
        result.setdefault("situation_flags", [])
        result.setdefault("overall_confidence", "medium")

        # Normalise each other_item
        for item in result["other_items"]:
            item.setdefault("name", "Unknown")
            item.setdefault("category", "other")
            item.setdefault("description", "")
            item.setdefault("significance", "moderate")
            item.setdefault("visitor_tip", None)

        # Normalise each flag
        for flag in result["situation_flags"]:
            flag.setdefault("type", "social_norm")
            flag.setdefault("message", "")

        return result

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Model returned invalid JSON: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
