"""
Fetches nearby points of interest from OpenStreetMap Overpass API.
Free, no API key required.
"""
import math
import httpx
from fastapi import APIRouter, Query

router = APIRouter()

CATEGORY_MAP = {
    # tourism
    "attraction": ("landmark", "Attraction"),
    "museum": ("landmark", "Museum"),
    "artwork": ("art", "Artwork"),
    "viewpoint": ("nature", "Viewpoint"),
    "monument": ("landmark", "Monument"),
    "information": ("info", "Information Point"),
    "gallery": ("art", "Gallery"),
    "zoo": ("nature", "Zoo"),
    "theme_park": ("entertainment", "Theme Park"),
    # historic
    "castle": ("landmark", "Castle"),
    "ruins": ("landmark", "Ruins"),
    "memorial": ("landmark", "Memorial"),
    "building": ("landmark", "Historic Building"),
    "church": ("cultural", "Historic Church"),
    "wayside_cross": ("cultural", "Wayside Cross"),
    "archaeological_site": ("landmark", "Archaeological Site"),
    "fort": ("landmark", "Fort"),
    # amenity
    "restaurant": ("food", "Restaurant"),
    "cafe": ("food", "Café"),
    "bar": ("food", "Bar"),
    "fast_food": ("food", "Fast Food"),
    "place_of_worship": ("cultural", "Place of Worship"),
    "hospital": ("medical", "Hospital"),
    "pharmacy": ("medical", "Pharmacy"),
    "bank": ("finance", "Bank"),
    "atm": ("finance", "ATM"),
    "police": ("safety", "Police Station"),
    "library": ("education", "Library"),
    "university": ("education", "University"),
    "cinema": ("entertainment", "Cinema"),
    "theatre": ("entertainment", "Theatre"),
    "marketplace": ("food", "Market"),
    "post_office": ("services", "Post Office"),
    "community_centre": ("cultural", "Community Centre"),
    # leisure
    "park": ("nature", "Park"),
    "garden": ("nature", "Garden"),
    "playground": ("nature", "Playground"),
    "sports_centre": ("sports", "Sports Centre"),
    "stadium": ("sports", "Stadium"),
    # natural
    "peak": ("nature", "Peak"),
    "spring": ("nature", "Spring"),
    "beach": ("nature", "Beach"),
    "waterfall": ("nature", "Waterfall"),
}

CATEGORY_COLORS = {
    "landmark": "#f59e0b",
    "art": "#ec4899",
    "nature": "#10b981",
    "food": "#f97316",
    "cultural": "#a78bfa",
    "medical": "#34d399",
    "finance": "#60a5fa",
    "safety": "#60a5fa",
    "education": "#818cf8",
    "entertainment": "#fb7185",
    "sports": "#fbbf24",
    "services": "#94a3b8",
    "info": "#94a3b8",
    "other": "#6b7280",
}


def haversine(lat1, lng1, lat2, lng2):
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def format_distance(m: int) -> str:
    if m < 1000:
        return f"{m}m"
    return f"{m / 1000:.1f}km"


OVERPASS_MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.openstreetmap.ru/api/interpreter",
]


@router.get("/nearby")
async def get_nearby(
    lat: float = Query(...),
    lng: float = Query(...),
    radius: int = Query(1000),
):
    query = f"""
[out:json][timeout:25];
(
  node["tourism"~"attraction|museum|artwork|viewpoint|monument|information|gallery|zoo|theme_park"](around:{radius},{lat},{lng});
  way["tourism"~"attraction|museum|artwork|viewpoint|monument|gallery|zoo|theme_park"](around:{radius},{lat},{lng});
  node["historic"~"monument|memorial|castle|ruins|building|church|wayside_cross|archaeological_site|fort"](around:{radius},{lat},{lng});
  way["historic"~"monument|memorial|castle|ruins|building|church|archaeological_site|fort"](around:{radius},{lat},{lng});
  node["amenity"~"restaurant|cafe|bar|fast_food|place_of_worship|hospital|pharmacy|bank|atm|police|library|university|cinema|theatre|marketplace|post_office|community_centre"](around:{radius},{lat},{lng});
  way["amenity"~"restaurant|cafe|bar|fast_food|place_of_worship|hospital|pharmacy|bank|library|university|cinema|theatre|marketplace|community_centre"](around:{radius},{lat},{lng});
  node["leisure"~"park|garden|playground|sports_centre|stadium"](around:{radius},{lat},{lng});
  way["leisure"~"park|garden|playground|sports_centre|stadium"](around:{radius},{lat},{lng});
  node["natural"~"peak|spring|beach|waterfall"](around:{radius},{lat},{lng});
);
out center 80;
"""
    data = None
    last_err = None
    async with httpx.AsyncClient(timeout=30.0) as client:
        for mirror in OVERPASS_MIRRORS:
            try:
                res = await client.post(mirror, data={"data": query})
                data = res.json()
                break
            except Exception as e:
                last_err = str(e)
                continue

    if data is None:
        return {"places": [], "error": last_err}

    places = []
    seen_names = set()

    for el in data.get("elements", []):
        tags = el.get("tags", {})
        name = tags.get("name") or tags.get("name:en")
        if not name or name in seen_names:
            continue
        seen_names.add(name)

        # Determine category
        category = "other"
        type_label = "Place"
        for key in ["tourism", "historic", "amenity", "leisure", "natural"]:
            val = tags.get(key)
            if val and val in CATEGORY_MAP:
                category, type_label = CATEGORY_MAP[val]
                break

        # nodes have lat/lon directly; ways have a "center" object
        center = el.get("center", {})
        el_lat = el.get("lat") or center.get("lat") or lat
        el_lng = el.get("lon") or center.get("lon") or lng
        distance = round(haversine(lat, lng, el_lat, el_lng))

        safe_tags = {
            k: v for k, v in tags.items()
            if k in ["website", "phone", "opening_hours", "description", "wikipedia", "wikidata", "cuisine", "denomination"]
        }

        places.append({
            "id": str(el.get("id")),
            "name": name,
            "category": category,
            "color": CATEGORY_COLORS.get(category, "#6b7280"),
            "type_label": type_label,
            "lat": el_lat,
            "lng": el_lng,
            "distance_m": distance,
            "distance_label": format_distance(distance),
            "tags": safe_tags,
        })

    places.sort(key=lambda p: p["distance_m"])
    return {"places": places[:50]}
