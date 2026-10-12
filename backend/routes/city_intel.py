"""
City Intel endpoint — four AI-powered features for first-time visitors:
  scams    → common local tourist scams & how to avoid them
  prices   → local vs tourist price benchmarks for everyday items
  planner  → AI-generated day itinerary based on current location
  transit  → how to use public transport in this city

Static curated data is served instantly for known cities.
Gemini is only called for unknown locations.
"""
import os
import json
from fastapi import APIRouter, Form, HTTPException
from google import genai
from google.genai import types
from dotenv import load_dotenv
from data.cities import CITY_DATA, find_city

load_dotenv()

router = APIRouter()

_api_key = os.getenv("GEMINI_API_KEY")
_client  = genai.Client(api_key=_api_key) if _api_key else None

LANGUAGE_NAMES = {
    "en": "English", "es": "Spanish", "fr": "French", "ar": "Arabic",
    "hi": "Hindi", "ja": "Japanese", "ko": "Korean", "pt": "Portuguese",
    "de": "German", "it": "Italian", "zh": "Mandarin Chinese",
    "tl": "Filipino (Tagalog)", "vi": "Vietnamese", "tr": "Turkish",
}

SYSTEM = """\
You are TourGuide — an expert travel intelligence system helping first-time visitors \
navigate unfamiliar cities safely and confidently. You give specific, local, actionable \
information — never generic travel advice. You know which scams target tourists in which \
cities, what things actually cost locally, how each city's transit works, and what a \
first-timer should see. Always respond with raw JSON only (no markdown fences, no preamble).\
"""

PROMPTS = {
"scams": """\
Location: {location}
GPS: {gps}

List the 5–7 most common and currently active tourist scams, traps, and tricks \
in this specific city/area. Focus on what's actually happening RIGHT NOW in this \
location, not generic global scam lists.

Return ONLY raw JSON:
{{
  "city": "City name",
  "warning_level": "low | moderate | high",
  "scams": [
    {{
      "name": "Short catchy name for the scam",
      "where": "Specific locations/neighborhoods where this happens",
      "how_it_works": "2-3 sentences explaining exactly how the scam plays out",
      "red_flags": ["specific thing to watch for", "another red flag"],
      "how_to_avoid": "One clear, actionable sentence"
    }}
  ],
  "golden_rule": "Single most important safety principle for this specific city"
}}
Respond in {lang_name}. Output must begin with {{ and end with }}.
""",

"prices": """\
Location: {location}
GPS: {gps}

Provide a realistic price guide for a tourist in this specific city RIGHT NOW. \
Include both the fair local price and what tourists often get charged. Be specific \
to this city — not regional averages.

Return ONLY raw JSON:
{{
  "city": "City name",
  "currency": "Currency name and symbol, e.g. Euro (€)",
  "exchange_tip": "One sentence on best way to get local currency here",
  "items": [
    {{
      "item": "Item name",
      "emoji": "relevant emoji",
      "local_price": "What a local pays, e.g. €1.50–2",
      "tourist_price": "What tourists typically get charged, e.g. €4–6",
      "markup": "low | medium | high",
      "tip": "Where/how to get the local price here specifically"
    }}
  ],
  "bargaining": "Is bargaining expected/acceptable here? Where and how?"
}}

Include these items: coffee, street food meal, sit-down restaurant meal, beer/local drink, \
water bottle, taxi per km, public transit fare, souvenir (typical), museum entry.
Respond in {lang_name}. Output must begin with {{ and end with }}.
""",

"planner": """\
Location: {location}
GPS: {gps}
Available time: {duration} hours
Time of day: {time_of_day}
Visitor preferences: {user_context}

Create a realistic, walkable {duration}-hour itinerary for a first-time visitor \
starting RIGHT NOW from this location. Sequence stops logically by proximity. \
Include a mix of must-sees, local hidden gems, and practical breaks. Factor in \
the current time of day (opening hours, crowd levels, meal times). \
If visitor preferences are provided, prioritize stops that match those interests.

Return ONLY raw JSON:
{{
  "city": "City name",
  "duration_hours": {duration},
  "theme": "One-line description of this itinerary's character",
  "stops": [
    {{
      "order": 1,
      "name": "Specific name of place",
      "category": "landmark | food | market | museum | park | neighborhood | viewpoint | other",
      "why": "2 sentences — why this is worth visiting and what makes it special",
      "time_to_spend": "e.g. 45 min",
      "from_previous": "e.g. 10 min walk, 5 min metro — null for first stop",
      "insider_tip": "One specific local tip most tourists miss",
      "best_for": "photos | history | food | relaxing | shopping | culture"
    }}
  ],
  "total_walking": "Approximate total walking distance",
  "budget_estimate": "Rough cost for this itinerary per person"
}}
Respond in {lang_name}. Output must begin with {{ and end with }}.
""",

"transit": """\
Location: {location}
GPS: {gps}

Give a complete beginner's guide to public transit in this specific city. \
Be concrete — name the actual card, actual app, actual fare prices. \
Write as if explaining to someone who has never used transit before.

Return ONLY raw JSON:
{{
  "city": "City name",
  "systems": [
    {{
      "name": "System name (e.g. Metro, Bus, Tram, Ferry)",
      "emoji": "relevant emoji",
      "coverage": "What areas/neighborhoods it covers",
      "frequency": "How often it runs, peak vs off-peak",
      "hours": "Operating hours"
    }}
  ],
  "card": {{
    "name": "Name of the transit card/pass to buy",
    "cost": "Card purchase cost",
    "where_to_buy": "Specific locations — machines, shops, etc.",
    "how_to_use": "Step-by-step: tap in/out, validate, etc.",
    "tourist_pass": "Is there a tourist day/week pass? Cost and value?"
  }},
  "fares": {{
    "single_ride": "Cost per ride",
    "day_pass": "Day pass cost if available",
    "airport_to_center": "Typical cost and method"
  }},
  "apps": [
    {{
      "name": "App name",
      "what_for": "Navigation | Tickets | Real-time | Payment",
      "platform": "iOS | Android | Both"
    }}
  ],
  "avoid": ["Common mistake tourists make", "Another pitfall"],
  "pro_tip": "Single most useful transit hack for this specific city"
}}
Respond in {lang_name}. Output must begin with {{ and end with }}.
""",
}


@router.post("/city-intel")
async def city_intel(
    lat:            float = Form(None),
    lng:            float = Form(None),
    location_name:  str   = Form(""),
    intel_type:     str   = Form("scams"),   # scams | prices | planner | transit
    duration_hours: int   = Form(4),
    time_of_day:    str   = Form("afternoon"),
    user_context:   str   = Form(""),
    language:       str   = Form("en"),
):
    if intel_type not in PROMPTS:
        raise HTTPException(status_code=400, detail=f"Unknown intel_type: {intel_type}")

    import math
    if lat is None or lng is None or not math.isfinite(lat) or not math.isfinite(lng):
        raise HTTPException(status_code=422, detail="lat and lng must be finite numbers")

    # ── Static data fast-path — transit only (scams/prices/planner always use Gemini) ──
    if intel_type == "transit":
        city_key = find_city(lat, lng)
        if city_key and city_key in CITY_DATA:
            static = CITY_DATA[city_key].get(intel_type)
            if static:
                return static

    # ── Gemini AI call ────────────────────────────────────────────────────────
    if not _client:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY not set")

    lang_name = LANGUAGE_NAMES.get(language, "English")
    location  = location_name or "Unknown location"
    gps       = f"{lat:.5f}, {lng:.5f}" if lat and lng else "unknown"

    fmt_vars = dict(
        location=location,
        gps=gps,
        lang_name=lang_name,
        duration=duration_hours,
        time_of_day=time_of_day,
        user_context=user_context or "None specified",
    )
    # Only pass keys the template actually uses to avoid KeyError
    import string
    used_keys = {f[1] for f in string.Formatter().parse(PROMPTS[intel_type]) if f[1]}
    prompt = PROMPTS[intel_type].format(**{k: v for k, v in fmt_vars.items() if k in used_keys})

    try:
        response = _client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=[types.Part.from_text(text=prompt)],
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM,
                temperature=0.2,
                max_output_tokens=8192,
                response_mime_type="application/json",
            ),
        )

        raw = response.text.strip()

        # Strip markdown fences if model disobeys
        if raw.startswith("```"):
            lines = raw.split("\n")
            raw = "\n".join(lines[1:-1]).strip()

        start = raw.find("{")
        end   = raw.rfind("}") + 1
        if start == -1 or end == 0:
            raise ValueError("No JSON found in model output")
        raw = raw[start:end]

        return json.loads(raw)

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Model returned invalid JSON: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
