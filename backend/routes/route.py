"""
Route planning via OSRM (free, no API key required).
Uses the public OSRM demo server.
"""
import httpx
from fastapi import APIRouter, Query

router = APIRouter()

OSRM_PROFILES = {
    "walk": "foot",
    "bike": "bike",
    "drive": "car",
}

OSRM_BASE = "https://router.project-osrm.org/route/v1"


def format_instruction(step: dict) -> str:
    maneuver = step.get("maneuver", {})
    mtype = maneuver.get("type", "")
    modifier = maneuver.get("modifier", "")
    name = step.get("name", "")
    name_part = f" onto {name}" if name else ""
    mod_part = f" {modifier}" if modifier else ""

    if mtype == "depart":
        bearing = maneuver.get("bearing_after", 0)
        direction = _bearing_to_dir(bearing)
        return f"Head {direction}{(' on ' + name) if name else ''}"
    elif mtype == "arrive":
        return "Arrive at destination"
    elif mtype == "turn":
        return f"Turn{mod_part}{name_part}"
    elif mtype in ("new name", "continue"):
        return f"Continue{name_part}"
    elif mtype == "fork":
        return f"Keep{mod_part}{name_part}"
    elif mtype in ("on ramp", "off ramp"):
        return f"Take the ramp{mod_part}{name_part}"
    elif mtype == "merge":
        return f"Merge{name_part}"
    elif mtype == "end of road":
        return f"Turn{mod_part} at end of road{name_part}"
    elif mtype == "roundabout":
        exit_num = maneuver.get("exit", "")
        return f"Take exit {exit_num} at roundabout{name_part}"
    return f"Continue{name_part}"


def _bearing_to_dir(bearing: float) -> str:
    dirs = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"]
    idx = round(bearing / 45) % 8
    return dirs[idx]


def format_duration(seconds: float) -> str:
    seconds = int(seconds)
    if seconds < 60:
        return f"{seconds}s"
    minutes = seconds // 60
    if minutes < 60:
        return f"{minutes} min"
    hours = minutes // 60
    mins = minutes % 60
    return f"{hours}h {mins}m" if mins else f"{hours}h"


def format_distance(meters: float) -> str:
    m = int(meters)
    if m < 1000:
        return f"{m}m"
    return f"{m / 1000:.1f}km"


@router.get("/route")
async def get_route(
    orig_lat: float = Query(...),
    orig_lng: float = Query(...),
    dest_lat: float = Query(...),
    dest_lng: float = Query(...),
    mode: str = Query("walk"),
):
    profile = OSRM_PROFILES.get(mode, "foot")
    url = (
        f"{OSRM_BASE}/{profile}/"
        f"{orig_lng},{orig_lat};{dest_lng},{dest_lat}"
        f"?steps=true&geometries=geojson&overview=full"
    )

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.get(url)
            data = res.json()
    except Exception as e:
        return {"error": str(e)}

    if data.get("code") != "Ok" or not data.get("routes"):
        return {"error": data.get("message", "No route found")}

    route = data["routes"][0]
    leg = route["legs"][0]

    # Build steps
    steps = []
    for step in leg.get("steps", []):
        if step.get("maneuver", {}).get("type") in ("", None):
            continue
        dist = step.get("distance", 0)
        dur = step.get("duration", 0)
        steps.append({
            "instruction": format_instruction(step),
            "distance": format_distance(dist),
            "duration": format_duration(dur),
            "distance_m": dist,
        })

    # GeoJSON coordinates are [lng, lat] — flip to [lat, lng] for Leaflet
    coords = route["geometry"]["coordinates"]
    polyline = [[c[1], c[0]] for c in coords]

    return {
        "distance": format_distance(route["distance"]),
        "distance_m": route["distance"],
        "duration": format_duration(route["duration"]),
        "duration_s": route["duration"],
        "steps": steps,
        "polyline": polyline,
        "mode": mode,
    }
