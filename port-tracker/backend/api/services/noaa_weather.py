import requests

NOAA_URL = "https://api.weather.gov/points/{lat},{lon}"

DANGER_LEVELS = ["Severe Thunderstorm", "Hurricane", "Storm", "Gale"]

def check_weather(lat, lon):
    try:
        r = requests.get(
            NOAA_URL.format(lat=lat, lon=lon),
            headers={"User-Agent": "port-tracker"}
        )
        r.raise_for_status()
        data = r.json()

        forecast_url = data["properties"]["forecast"]
        forecast = requests.get(
            forecast_url,
            headers={"User-Agent": "port-tracker"}
        ).json()

        for p in forecast["properties"]["periods"]:
            for level in DANGER_LEVELS:
                if level.lower() in p["shortForecast"].lower():
                    return {
                        "severity": "High",
                        "message": p["shortForecast"],
                        "radius": 150,  # km
                    }
        return None
    except:
        return None
