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
