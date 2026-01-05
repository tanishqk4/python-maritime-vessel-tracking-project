from rest_framework import generics, permissions, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter

from .models import User, Vessel, VesselSubscription, VesselAlert
from .serializers import RegisterSerializer, UserSerializer, VesselSerializer
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
# VESSEL CRUD + ALERT LOGIC
# =========================

class VesselViewSet(viewsets.ModelViewSet):
    queryset = Vessel.objects.all()
    serializer_class = VesselSerializer
    permission_classes = [VesselPermission]

    # 🔍 Search by name or MMSI
    filter_backends = [DjangoFilterBackend, SearchFilter]
    search_fields = ['name', 'mmsi']

    # 🎯 Filter by status
    filterset_fields = ['status']

    def perform_update(self, serializer):
        vessel = self.get_object()

        # ✅ Capture old status BEFORE update
        old_status = vessel.status

        # ✅ Save updated vessel
        updated_vessel = serializer.save()

        # 🚨 Generate alert if status changed
        if old_status != updated_vessel.status:
            VesselAlert.objects.create(
                vessel=updated_vessel,
                message=f"Vessel status changed to {updated_vessel.status}"
            )


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
        # Manual check to avoid DB crash
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
        # Absolute fallback — never crash
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

    data = [
        {
            "id": alert.id,
            "vessel": alert.vessel.name,
            "message": alert.message,
            "created_at": alert.created_at,
        }
        for alert in alerts
    ]

    return Response(data)

from django.utils import timezone
from datetime import timedelta
from django.db.models import Avg
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Vessel


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def port_congestion_metrics(request):
    now = timezone.now()

    # Vessels currently at port
    vessels_at_port = Vessel.objects.filter(status="at_port")

    arrivals = vessels_at_port.count()
    departures = Vessel.objects.filter(status="at_sea").count()

    # Simulated wait times (hours)
    wait_times = [
        (now - v.last_updated).total_seconds() / 3600
        for v in vessels_at_port
    ]

    avg_wait_time = round(
        sum(wait_times) / len(wait_times), 2
    ) if wait_times else 0

    # Congestion logic
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
