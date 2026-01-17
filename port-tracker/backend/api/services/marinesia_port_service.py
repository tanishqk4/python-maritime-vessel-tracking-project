import requests

BASE_URL = "https://api.marinesia.com/api/v1"
API_KEY = "ccVhZcORZMYGBTPIoXbBUqlWO"

# Region centers (not bounding boxes)
REGIONS = [
    {"name": "India", "lat": 20.0, "lng": 77.0},
    {"name": "Europe", "lat": 48.0, "lng": 8.0},
    {"name": "East Asia", "lat": 30.0, "lng": 120.0},
]

def fetch_ports(region, radius=800, page=1, limit=50):
    params = {
        "key": API_KEY,
        "lat": region["lat"],
        "lng": region["lng"],
        "radius": radius,   # km
        "page": page,
        "limit": limit,
    }

    res = requests.get(
        f"{BASE_URL}/port/nearby",
        params=params,
        timeout=10,
    )
    res.raise_for_status()

    return res.json().get("data", [])
