import httpx
from .config import get_settings

CITY_DISTANCE = {
    ("Houston", "TX", "Dallas", "TX"): 239,
    ("Dallas", "TX", "Houston", "TX"): 239,
    ("Houston", "TX", "Austin", "TX"): 165,
    ("Austin", "TX", "Dallas", "TX"): 195,
    ("Sugar Land", "TX", "Fort Worth", "TX"): 275,
    ("Fort Worth", "TX", "Dallas", "TX"): 33,
    ("San Antonio", "TX", "Dallas", "TX"): 275,
}

def fallback_distance(origin_city: str, origin_state: str, dest_city: str, dest_state: str) -> float:
    key = (origin_city, origin_state, dest_city, dest_state)
    reverse = (dest_city, dest_state, origin_city, origin_state)
    if key in CITY_DISTANCE:
        return CITY_DISTANCE[key]
    if reverse in CITY_DISTANCE:
        return CITY_DISTANCE[reverse]
    if origin_city.lower() == dest_city.lower() and origin_state.lower() == dest_state.lower():
        return 0
    return 180

def address(city: str, state: str) -> str:
    return f"{city}, {state}, USA"

async def compute_route(origin_city: str, origin_state: str, dest_city: str, dest_state: str) -> dict:
    settings = get_settings()
    api_key = settings.maps_key
    fallback_miles = fallback_distance(origin_city, origin_state, dest_city, dest_state)
    fallback = {
        "origin": address(origin_city, origin_state),
        "destination": address(dest_city, dest_state),
        "distance_miles": round(fallback_miles, 2),
        "duration_minutes": round((fallback_miles / 60) * 60, 0),
        "source": "fallback",
    }
    if not api_key:
        return fallback

    payload = {
        "origin": {"address": fallback["origin"]},
        "destination": {"address": fallback["destination"]},
        "travelMode": "DRIVE",
        "routingPreference": "TRAFFIC_AWARE",
        "computeAlternativeRoutes": False,
        "units": "IMPERIAL",
    }
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.post("https://routes.googleapis.com/directions/v2:computeRoutes", json=payload, headers=headers)
            res.raise_for_status()
            data = res.json()
            route = (data.get("routes") or [{}])[0]
            meters = route.get("distanceMeters")
            duration = route.get("duration", "0s")
            seconds = int(str(duration).replace("s", "") or 0)
            if meters:
                return {
                    "origin": fallback["origin"],
                    "destination": fallback["destination"],
                    "distance_miles": round(meters / 1609.344, 2),
                    "duration_minutes": round(seconds / 60, 0),
                    "polyline": (route.get("polyline") or {}).get("encodedPolyline"),
                    "source": "google_routes_api",
                }
    except Exception as exc:
        fallback["warning"] = f"Google Routes failed; using fallback miles. {type(exc).__name__}"
    return fallback
