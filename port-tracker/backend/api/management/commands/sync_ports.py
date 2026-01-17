from django.core.management.base import BaseCommand
from api.services.marinesia_port_service import fetch_ports, REGIONS
from api.models import Port


class Command(BaseCommand):
    help = "Sync ports from Marinesia using region-based queries"

    def handle(self, *args, **kwargs):
        total = 0

        for region in REGIONS:
            self.stdout.write(
                self.style.WARNING(f"Syncing ports for region: {region['name']}")
            )

            page = 1
            while True:
                try:
                    ports = fetch_ports(region=region, page=page)
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f"Failed for region {region['name']}: {e}")
                    )
                    break

                if not ports:
                    break

                for p in ports:
                    name = p.get("name")
                    if not name:
                        continue

                    Port.objects.update_or_create(
                        name=name,
                        defaults={
                            "country": p.get("country", "Unknown"),
                            "latitude": p.get("lat"),
                            "longitude": p.get("lng"),
                            "docking_capacity": p.get("capacity", 50),
                        },
                    )
                    total += 1

                page += 1

        self.stdout.write(
            self.style.SUCCESS(f"Synced {total} ports from Marinesia")
        )
