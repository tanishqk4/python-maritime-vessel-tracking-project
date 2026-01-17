from django.utils import timezone
from api.models import Port, PortVisit, VesselAlert

WAIT_THRESHOLD_HOURS = 12

def check_port_congestion():
    now = timezone.now()

    for port in Port.objects.all():
        docked_visits = PortVisit.objects.filter(
            port=port,
            departure_time__isnull=True
        )

        ships_docked = docked_visits.count()

        if ships_docked < 2 or port.docking_capacity == 0:
            continue

        wait_hours = [
            (now - v.arrival_time).total_seconds() / 3600
            for v in docked_visits
        ]
        avg_wait = sum(wait_hours) / len(wait_hours)

        congestion_ratio = ships_docked / port.docking_capacity

        is_congested = (
            ships_docked >= port.docking_capacity or
            congestion_ratio >= 0.8 or
            avg_wait >= WAIT_THRESHOLD_HOURS
        )

        if is_congested:
            message = (
                f"Port congestion detected at {port.name} | "
                f"Docked: {ships_docked}/{port.docking_capacity}, "
                f"Avg wait: {round(avg_wait, 1)} hrs"
            )

            # prevent duplicate alerts
            exists = VesselAlert.objects.filter(
                message=message,
                created_at__date=now.date()
            ).exists()

            if not exists:
                VesselAlert.objects.create(
                    vessel=None,
                    message=message
                )
