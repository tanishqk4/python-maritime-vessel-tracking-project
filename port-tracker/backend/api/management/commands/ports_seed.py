import csv
from django.core.management.base import BaseCommand
from api.models import Port
from django.conf import settings
import os


class Command(BaseCommand):
    help = "Seed ports from static dataset"

    def handle(self, *args, **kwargs):
        file_path = os.path.join(
            settings.BASE_DIR, "api", "data", "ports_seed.csv"
        )

        created = 0

        with open(file_path, newline="", encoding="utf-8") as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                Port.objects.update_or_create(
                    name=row["name"],
                    defaults={
                        "country": row["country"],
                        "latitude": float(row["latitude"]),
                        "longitude": float(row["longitude"]),
                        "docking_capacity": int(row["docking_capacity"]),
                    },
                )
                created += 1

        self.stdout.write(
            self.style.SUCCESS(f"Seeded {created} ports successfully")
        )
