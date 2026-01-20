from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User, Vessel


# =========================
# AUTH SERIALIZERS
# =========================

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password]
    )

    class Meta:
        model = User
        fields = [
            'id', 
            'username', 
            'email',
            'password', 
            'first_name',
            'last_name', 
            'role' , 
        ]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)

        if user.role == "admin":
            user.is_approved = False

        user.set_password(password)
        user.save()
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 
            'username', 
            'email',
            'first_name', 
            'last_name', 
            'role', 
            'is_approved', 
            'is_active',
            'last_login',
            'date_joined',
        ]

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.exceptions import PermissionDenied

class CustomTokenSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)

        is_approved = getattr(self.user, "is_approved", True)


        self.user.last_login = timezone.now()
        self.user.save(update_fields=["last_login"])

        if self.user.role == "admin" and not self.user.is_approved:
            raise PermissionDenied(
                "Admin approval pending. Please wait for approval."
            )

        return data


# =========================
# VESSEL SERIALIZER (VALIDATION ONLY)
# =========================

class VesselSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vessel
        fields = "__all__"

    def validate(self, data):
        status = data.get("status")
        heading = data.get("heading")
        current_port = data.get("current_port")

        if status == "at_sea":
            if heading is None:
                raise serializers.ValidationError(
                    {"heading": "Heading is required when vessel is at sea."}
                )
            if current_port is not None:
                raise serializers.ValidationError(
                    {"current_port": "Current port must be empty when vessel is at sea."}
                )

        if status == "at_port":
            if current_port is None:
                raise serializers.ValidationError(
                    {"current_port": "Current port is required when vessel is at port."}
                )
            if heading is not None:
                raise serializers.ValidationError(
                    {"heading": "Heading must be empty when vessel is at port."}
                )

        return data
from .models import Port, PortVisit
from django.utils import timezone


class PortSerializer(serializers.ModelSerializer):
    ships_docked = serializers.SerializerMethodField()
    average_wait_time = serializers.SerializerMethodField()
    congestion_level = serializers.SerializerMethodField()

    class Meta:
        model = Port
        fields = [
            "id",
            "name",
            "country",
            "latitude",
            "longitude",
            "docking_capacity",
            "ships_docked",
            "average_wait_time",
            "congestion_level",
        ]

    def get_ships_docked(self, port):
        return PortVisit.objects.filter(
            port=port,
            departure_time__isnull=True
        ).count()

    def get_average_wait_time(self, port):
        visits = PortVisit.objects.filter(
            port=port,
            departure_time__isnull=False
        )

        if not visits.exists():
            return 0

        total_hours = sum(
            (v.departure_time - v.arrival_time).total_seconds() / 3600
            for v in visits
        )

        return round(total_hours / visits.count(), 2)

    def get_congestion_level(self, port):
        docked = self.get_ships_docked(port)
        capacity = port.docking_capacity

        if capacity == 0:
            return "Unknown"

        ratio = docked / capacity

        if ratio >= 0.8:
            return "High"
        elif ratio >= 0.5:
            return "Medium"
        else:
            return "Low"

class PortCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Port
        fields = ["id", "name", "country", "docking_capacity"]
