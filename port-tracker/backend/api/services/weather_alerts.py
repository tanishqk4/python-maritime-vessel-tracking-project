from api.models import Vessel, VesselAlert
from api.services.noaa_weather import is_severe_weather

def check_weather_alerts():
    for v in Vessel.objects.filter(status="at_sea"):
        if not v.latitude or not v.longitude:
            continue

        if is_severe_weather(v.latitude, v.longitude):
            msg = f"Severe weather risk near vessel {v.name}"

            if not VesselAlert.objects.filter(message=msg).exists():
                VesselAlert.objects.create(
                    vessel=v,
                    message=msg
                )

from api.models import Vessel, VesselAlert
from api.services.noaa_weather import check_weather

def run_weather_alerts():
    for v in Vessel.objects.filter(latitude__isnull=False):
        alert = check_weather(v.latitude, v.longitude)
        if alert:
            VesselAlert.objects.get_or_create(
                vessel=v,
                message=f"⚠ Weather risk: {alert['message']}",
            )
