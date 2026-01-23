import csv
from django.core.management.base import BaseCommand
from api.models import Vessel, Port

class Command(BaseCommand):
    help = "Import vessels from CSV"

    def handle(self, *args, **kwargs):
        file_path = "api/data/vessels_seed.csv"

        Vessel.objects.all().delete()

        with open(file_path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            count = 0

            for row in reader:
                port = None
                if row["current_port"]:
                    port = Port.objects.filter(name=row["current_port"]).first()

                Vessel.objects.create(
                    name=row["name"],
                    mmsi=row["mmsi"],
                    vessel_type=row["vessel_type"],
                    latitude=float(row["latitude"]),
                    longitude=float(row["longitude"]),
                    speed=float(row["speed"]),
                    heading=int(row["heading"]),
                    status=row["status"],
                    current_port=port,
                )
                count += 1

        self.stdout.write(self.style.SUCCESS(f"Imported {count} vessels"))
