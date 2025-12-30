from rest_framework import generics, permissions
from .serializers import RegisterSerializer, UserSerializer
from .models import User

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

class MeView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Vessel
from .serializers import VesselSerializer
from .permissions import VesselPermission
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter

class VesselViewSet(viewsets.ModelViewSet):
    queryset = Vessel.objects.all()
    serializer_class = VesselSerializer
    permission_classes = [VesselPermission]
    # 🔍 Search by name or MMSI
    search_fields = ['name', 'mmsi']

    # 🎯 Filter by status
    filterset_fields = ['status']

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Vessel, VesselSubscription, VesselAlert


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
