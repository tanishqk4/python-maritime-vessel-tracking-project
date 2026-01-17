from django.core.management.base import BaseCommand
from django.utils import timezone
from api.services.marinesia_service import fetch_live_vessels
from api.models import Vessel, Port, PortVisit, VesselPositionHistory
import time


# -------------------------
# Detect vessel status
# -------------------------
from math import sqrt

def near_port(lat1, lng1, lat2, lng2, km=5):
    # ~1 deg ≈ 111km
    return sqrt((lat1-lat2)**2 + (lng1-lng2)**2) * 111 <= km


def detect_status(lat, lng, speed):
    for port in Port.objects.exclude(latitude__isnull=True):
        if near_port(lat, lng, port.latitude, port.longitude):
            if speed <= 1:
                return "at_port", port

    return "at_sea", None



# -------------------------
# Ensure PortVisit exists
# -------------------------
def ensure_port_visit(vessel, port):
    exists = PortVisit.objects.filter(
        vessel=vessel,
        port=port,
        departure_time__isnull=True
    ).exists()

    if not exists:
        PortVisit.objects.create(
            vessel=vessel,
            port=port,
            arrival_time=timezone.now()
        )


class Command(BaseCommand):
    help = "Continuously sync live vessel positions from Marinesia"

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS("Starting live vessel sync..."))

        while True:
            try:
                vessels = fetch_live_vessels()
                updated = 0

                for v in vessels:
                    if not v.get("lat") or not v.get("lng") or not v.get("mmsi"):
                        continue

                    status, port = detect_status(
                        v["lat"],
                        v["lng"],
                        v.get("sog", 0)
                    )

                    vessel, _ = Vessel.objects.update_or_create(
                        mmsi=v["mmsi"],
                        defaults={
                            "name": v.get("name", "Unknown"),
                            "latitude": v["lat"],
                            "longitude": v["lng"],
                            "speed": v.get("sog", 0),
                            "heading": v.get("cog"),
                            "status": status,
                            "current_port": port,
                        },
                    )

                    VesselPositionHistory.objects.create(
                        vessel=vessel,
                        latitude=v["lat"],
                        longitude=v["lng"],
                        speed=v.get("sog", 0),
                        heading=v.get("cog"),
                    )
                    # 🚢 ARRIVAL → create PortVisit
                    if status == "at_port" and port:
                        PortVisit.objects.get_or_create(
                            vessel=vessel,
                            port=port,
                            departure_time__isnull=True,
                            defaults={"arrival_time": timezone.now()},
                        )
                        

                    # 🚢 DEPARTURE → close PortVisit
                    if status == "at_sea":
                        PortVisit.objects.filter(
                            vessel=vessel,
                            departure_time__isnull=True
                        ).update(departure_time=timezone.now())

                    # ✅ CRITICAL FIX
                    if status == "at_port" and port:
                        ensure_port_visit(vessel, port)

                    updated += 1

                self.stdout.write(
                    self.style.SUCCESS(f"Updated {updated} vessel positions")
                )

            except Exception as e:
                self.stderr.write(str(e))

            # refresh every 60 seconds
            time.sleep(60)
