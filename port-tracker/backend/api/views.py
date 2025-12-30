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

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def subscribe_vessel(request, vessel_id):
    vessel = Vessel.objects.get(id=vessel_id)

    VesselSubscription.objects.get_or_create(
        user=request.user,
        vessel=vessel
    )

    return Response({"message": "Subscribed successfully"})


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
