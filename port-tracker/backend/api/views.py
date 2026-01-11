from rest_framework import generics, permissions, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied

from .models import (
    User,
    Vessel,
    VesselSubscription,
    VesselAlert,
    Port,
    PortVisit,
)
from .serializers import (
    RegisterSerializer,
    UserSerializer,
    VesselSerializer,
    PortSerializer,
    PortCreateUpdateSerializer,
)
from .permissions import VesselPermission



# =========================
# AUTH
# =========================

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


# =========================
# VESSEL CRUD + PORT LOGIC
# =========================
from django.db.models import Count, Avg, F, ExpressionWrapper, DurationField
from datetime import timedelta

def check_port_congestion_alerts():
    from .models import Port, PortVisit, VesselAlert

    ports = Port.objects.all()

    for port in ports:
        docked = PortVisit.objects.filter(
            port=port,
            departure_time__isnull=True
        )

        docked_count = docked.count()

        if docked_count == 0:
            continue

        avg_wait = docked.annotate(
            wait_time=ExpressionWrapper(
                timezone.now() - F("arrival_time"),
                output_field=DurationField()
            )
        ).aggregate(avg=Avg("wait_time"))["avg"]

        avg_wait_hours = avg_wait.total_seconds() / 3600 if avg_wait else 0

        capacity_ratio = docked_count / port.docking_capacity if port.docking_capacity else 0

        if capacity_ratio >= 0.8 or avg_wait_hours >= 12:
            VesselAlert.objects.create(
                vessel=docked.first().vessel,
                message=(
                    f"⚠️ Port congestion alert at {port.name}: "
                    f"{docked_count}/{port.docking_capacity} vessels docked, "
                    f"avg wait {round(avg_wait_hours, 1)} hrs"
                )
            )


class VesselViewSet(viewsets.ModelViewSet):
    queryset = Vessel.objects.all()
    serializer_class = VesselSerializer
    permission_classes = [VesselPermission]

    filter_backends = [DjangoFilterBackend, SearchFilter]
    search_fields = ['name', 'mmsi']
    filterset_fields = ['status', 'vessel_type']

    def perform_update(self, serializer):
        vessel = self.get_object()
        old_status = vessel.status

        updated_vessel = serializer.save()

        # 🚢 ARRIVAL: at_sea → at_port
        if old_status == "at_sea" and updated_vessel.status == "at_port":
            PortVisit.objects.create(
                vessel=updated_vessel,
                port=updated_vessel.current_port,
                arrival_time=timezone.now()
            )
            updated_vessel.heading = None
            updated_vessel.save(update_fields=["heading"])

        # 🚢 DEPARTURE: at_port → at_sea
        if old_status == "at_port" and updated_vessel.status == "at_sea":
            visit = PortVisit.objects.filter(
                vessel=updated_vessel,
                departure_time__isnull=True
            ).order_by("-arrival_time").first()

            if visit:
                visit.departure_time = timezone.now()
                visit.save()

            updated_vessel.current_port = None
            updated_vessel.save(update_fields=["current_port"])

        # 🚨 Alert on status change
        if old_status != updated_vessel.status:
            VesselAlert.objects.create(
                vessel=updated_vessel,
                message=f"Vessel status changed to {updated_vessel.status}"
            )

        check_port_congestion_alerts()



# =========================
# PORT CRUD + ANALYTICS
# =========================

class PortViewSet(viewsets.ModelViewSet):
    queryset = Port.objects.all()

    def get_permissions(self):
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.request.method in ["POST", "PUT", "PATCH"]:
            return PortCreateUpdateSerializer
        return PortSerializer

    def perform_create(self, serializer):
        if self.request.user.role != "admin":
            raise PermissionDenied("Only admin can create ports")
        serializer.save()

    def perform_update(self, serializer):
        if self.request.user.role not in ["admin", "operator"]:
            raise PermissionDenied("Only admin can update ports")
        serializer.save()

    def perform_destroy(self, instance):
        if self.request.user.role != "admin":
            raise PermissionDenied("Only admin can delete ports")
        instance.delete()


# =========================
# SUBSCRIPTIONS & ALERTS
# =========================

from django.db import IntegrityError
from rest_framework import status

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def subscribe_vessel(request, vessel_id):
    try:
        vessel = Vessel.objects.get(id=vessel_id)
    except Vessel.DoesNotExist:
        return Response(
            {"message": "Vessel not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    try:
        exists = VesselSubscription.objects.filter(
            user=request.user,
            vessel=vessel
        ).exists()

        if exists:
            return Response(
                {"message": "Already subscribed"},
                status=status.HTTP_200_OK
            )

        VesselSubscription.objects.create(
            user=request.user,
            vessel=vessel
        )

        return Response(
            {"message": "Subscribed successfully"},
            status=status.HTTP_201_CREATED
        )

    except IntegrityError:
        return Response(
            {"message": "Already subscribed"},
            status=status.HTTP_200_OK
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_alerts(request):
    alerts = VesselAlert.objects.filter(
        vessel__subscribers__user=request.user
    ).order_by("-created_at")

    return Response([
        {
            "id": alert.id,
            "vessel": alert.vessel.name,
            "vessel_id": alert.vessel.id,
            "message": alert.message,
            "created_at": alert.created_at,
        }
        for alert in alerts
    ])

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_alert_read(request, alert_id):
    try:
        alert = VesselAlert.objects.get(
            id=alert_id,
            vessel__subscribers__user=request.user
        )
        alert.is_read = True
        alert.save()
        return Response({"message": "Marked as read"})
    except VesselAlert.DoesNotExist:
        return Response({"message": "Not found"}, status=404)


# =========================
# DASHBOARD — PORT CONGESTION
# =========================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def port_congestion_metrics(request):
    now = timezone.now()

    visits = PortVisit.objects.filter(departure_time__isnull=True)

    arrivals = visits.count()
    departures = Vessel.objects.filter(status="at_sea").count()

    wait_times = [
        (now - v.arrival_time).total_seconds() / 3600
        for v in visits
    ]

    avg_wait_time = round(
        sum(wait_times) / len(wait_times), 2
    ) if wait_times else 0

    if arrivals > 10 or avg_wait_time > 12:
        congestion_level = "High"
    elif arrivals > 5 or avg_wait_time > 6:
        congestion_level = "Medium"
    else:
        congestion_level = "Low"

    return Response({
        "arrivals": arrivals,
        "departures": departures,
        "average_wait_time_hours": avg_wait_time,
        "congestion_level": congestion_level,
    })

from django.db.models import Count
from django.db.models.functions import TruncDate
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import PortVisit

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def arrivals_departures_trend(request):
    arrivals = (
        PortVisit.objects
        .annotate(date=TruncDate("arrival_time"))
        .values("date")
        .annotate(count=Count("id"))
        .order_by("date")
    )

    departures = (
        PortVisit.objects
        .filter(departure_time__isnull=False)
        .annotate(date=TruncDate("departure_time"))
        .values("date")
        .annotate(count=Count("id"))
        .order_by("date")
    )

    return Response({
        "arrivals": list(arrivals),
        "departures": list(departures),
    })

from django.db.models import Count
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Vessel

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def vessel_type_distribution(request):
    data = (
        Vessel.objects
        .values("vessel_type")
        .annotate(count=Count("id"))
    )

    return Response(list(data))

from django.db.models import Count, Avg, F, ExpressionWrapper, DurationField
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from .models import Port, PortVisit

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def port_congestion_ranking(request):
    now = timezone.now()
    data = []

    for port in Port.objects.all():
        visits = PortVisit.objects.filter(
            port=port,
            departure_time__isnull=True
        )

        docked = visits.count()
        if docked == 0:
            continue

        avg_wait = visits.annotate(
            wait=ExpressionWrapper(
                now - F("arrival_time"),
                output_field=DurationField()
            )
        ).aggregate(avg=Avg("wait"))["avg"]

        avg_wait_hours = round(
            avg_wait.total_seconds() / 3600, 2
        ) if avg_wait else 0

        congestion_score = round(
            (docked / port.docking_capacity) * 100, 2
        ) if port.docking_capacity else 0

        data.append({
            "port": port.name,
            "country": port.country,
            "docked": docked,
            "avg_wait": avg_wait_hours,
            "congestion_score": congestion_score,
        })

    data.sort(key=lambda x: x["congestion_score"], reverse=True)
    return Response(data)

from django.utils import timezone
from datetime import timedelta
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Vessel, PortVisit

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_kpi_trends(request):
    now = timezone.now()
    yesterday = now - timedelta(days=1)

    today_arrivals = PortVisit.objects.filter(
        arrival_time__date=now.date()
    ).count()

    yesterday_arrivals = PortVisit.objects.filter(
        arrival_time__date=yesterday.date()
    ).count()

    today_departures = PortVisit.objects.filter(
        departure_time__date=now.date()
    ).count()

    yesterday_departures = PortVisit.objects.filter(
        departure_time__date=yesterday.date()
    ).count()

    def percent_change(today, yesterday):
        if yesterday == 0:
            return 0
        return round(((today - yesterday) / yesterday) * 100, 1)

    return Response({
        "arrivals_change": percent_change(today_arrivals, yesterday_arrivals),
        "departures_change": percent_change(today_departures, yesterday_departures),
    })
