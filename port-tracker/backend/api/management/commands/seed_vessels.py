from django.core.management.base import BaseCommand
from api.models import Vessel, Port
import random

VESSEL_TYPES = ["cargo", "tanker", "fishing", "patrol"]

# Regions (lat_min, lat_max, lng_min, lng_max)
REGIONS = [
    ("Arabian Sea", 8, 25, 60, 75),
    ("Bay of Bengal", 5, 22, 80, 95),
    ("Indian Ocean", -5, 10, 65, 85),
]

class Command(BaseCommand):
    help = "Seed 1000 realistic vessels (API-like data)"

    def handle(self, *args, **kwargs):
        Vessel.objects.all().delete()

        ports = list(Port.objects.all())
        total = 1000

        vessels = []

        for i in range(total):
            region = random.choice(REGIONS)

            lat = round(random.uniform(region[1], region[2]), 6)
            lng = round(random.uniform(region[3], region[4]), 6)

            speed = round(random.uniform(0, 22), 1)
            heading = random.randint(0, 359)

            status = "at_sea"
            current_port = None

            # 25% vessels at port
            if ports and random.random() < 0.25:
                current_port = random.choice(ports)
                lat = current_port.latitude
                lng = current_port.longitude
                speed = 0
                status = "at_port"

            vessels.append(
                Vessel(
                    name=f"MV-{i+1:04d}",
                    mmsi=200000000 + i,
                    latitude=lat,
                    longitude=lng,
                    speed=speed,
                    heading=heading,
                    vessel_type=random.choice(VESSEL_TYPES),
                    status=status,
                    current_port=current_port,
                )
            )

        Vessel.objects.bulk_create(vessels, batch_size=200)

        self.stdout.write(
            self.style.SUCCESS(f"Seeded {total} vessels successfully")
        )
