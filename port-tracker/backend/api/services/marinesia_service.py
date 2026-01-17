import requests
from django.conf import settings

BASE_URL = "https://api.marinesia.com/api/v1/vessel/location"

def fetch_live_vessels(page=1):
    params = {
        "key": settings.MARINESIA_API_KEY,   # ✅ REQUIRED
        "page": page,
        "limit": 10,                         # max allowed
        "sort": "timestamp",
        "order": "desc",
    }

    response = requests.get(
        BASE_URL,
        params=params,
        timeout=20
    )

    response.raise_for_status()

    data = response.json()

    # Marinesia returns list directly OR wrapped
    return data.get("data", data)
