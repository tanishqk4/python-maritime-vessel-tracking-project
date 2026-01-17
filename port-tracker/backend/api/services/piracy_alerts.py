from api.models import Vessel, VesselAlert

# Bounding boxes (real-world hotspots)
PIRACY_ZONES = [
    {"name": "Gulf of Aden", "min_lat": 10, "max_lat": 16, "min_lng": 42, "max_lng": 55},
    {"name": "Somali Basin", "min_lat": -5, "max_lat": 15, "min_lng": 45, "max_lng": 65},
]

def in_zone(lat, lng, z):
    return (
        z["min_lat"] <= lat <= z["max_lat"] and
        z["min_lng"] <= lng <= z["max_lng"]
    )

def check_piracy_alerts():
    for v in Vessel.objects.filter(status="at_sea"):
        if not v.latitude or not v.longitude:
            continue

        for zone in PIRACY_ZONES:
            if in_zone(v.latitude, v.longitude, zone):
                msg = f"Piracy risk zone ({zone['name']}) near vessel {v.name}"

                if not VesselAlert.objects.filter(message=msg).exists():
                    VesselAlert.objects.create(
                        vessel=v,
                        message=msg
                    )
