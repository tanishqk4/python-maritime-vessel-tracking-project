from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied
from .permissions import AdminOnly
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenViewBase
from .serializers import CustomTokenSerializer
from django.db.models import Q



from .models import (
    User,
    Vessel,
    VesselSubscription,
    VesselAlert,
    Port,
    PortVisit,
    AuditLog,
)
from .serializers import (
    RegisterSerializer,
    UserSerializer,
    VesselSerializer,
    PortSerializer,
    PortCreateUpdateSerializer,
)
from .permissions import VesselPermission


# AUTH


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user
class CustomTokenView(TokenViewBase):
    serializer_class = CustomTokenSerializer


# JWT CHECK (ADMIN APPROVAL)

class CustomTokenSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)

        if self.user.role == "admin" and not self.user.is_approved:
            raise PermissionDenied("Admin approval pending")

        return data



# ADMIN — USERS LIST

@api_view(["GET"])
@permission_classes([AdminOnly])
def list_users(request):
    users = User.objects.all()
    return Response(UserSerializer(users, many=True).data)


# ADMIN — PENDING ADMINS

@api_view(["GET"])
@permission_classes([AdminOnly])
def pending_admin_requests(request):
    users = User.objects.filter(role="admin", is_approved=False)
    return Response(UserSerializer(users, many=True).data)


# ADMIN — APPROVE / REJECT

@api_view(["POST"])
@permission_classes([AdminOnly])
def approve_admin(request, user_id):
    user = get_object_or_404(User, id=user_id, role="admin")
    action = request.data.get("action")

    if action == "approve":
        user.is_approved = True
        user.save()

        AuditLog.objects.create(
            user=request.user,
            action="admin_approve",
            entity_type="User",
            target=user.username,
            description=f"Approved admin request for {user.username}"
        )

        return Response({"message": "Admin approved"})

    if action == "reject":

        AuditLog.objects.create(
            user=request.user,
            action="admin_reject",
            target=user.username,
            description=f"Rejected admin request for {user.username}"
        )
        user.delete()
        return Response({"message": "Admin rejected"})

    return Response({"error": "Invalid action"}, status=400)


# ADMIN — CHANGE USER ROLE

@api_view(["PATCH"])
@permission_classes([AdminOnly])
def change_role(request, user_id):
    user = get_object_or_404(User, id=user_id)
    role = request.data.get("role")

    if role not in ["admin", "operator", "analyst"]:
        return Response({"error": "Invalid role"}, status=400)

    old_role = user.role
    user.role = role
    user.save()
    AuditLog.objects.create(
        user=request.user,
        action="role_change",
        target=user.username,
        description=f"Changed role from {old_role} to {role} for {user.username}"
    )
    return Response({"message": "Role updated"})

@api_view(["GET"])
@permission_classes([AdminOnly])
def list_users(request):
    users = User.objects.all()
    return Response(UserSerializer(users, many=True).data)




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

            from api.services.audit_logger import log_action

            log_action(
                user=self.request.user,
                action="UPDATE_STATUS",
                entity_type="Vessel",
                entity_id=updated_vessel.id,
                description=f"Status changed from {old_status} to {updated_vessel.status}"
            )


        check_port_congestion_alerts()

        try:
            from api.services.alert_runner import run_alerts
        except ImportError:
            def run_alerts(vessel):
                return None

        try:
            from api.services.weather_alerts import check_weather_risk
        except ImportError:
            def check_weather_risk(vessel):
                return None

        run_alerts(isinstance)




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
        log_action(
            self.request.user,
            "CREATE",
            "Port",
            serializer.instance.id,
            f"Port {serializer.instance.name} created"
        )

    def perform_update(self, serializer):
        if self.request.user.role not in ["admin", "operator"]:
            raise PermissionDenied("Only admin can update ports")
        serializer.save()
        log_action(
            self.request.user,
            "UPDATE",
            "Port",
            serializer.instance.id,
            f"Port {serializer.instance.name} updated"
        )

    def perform_destroy(self, instance):
        if self.request.user.role != "admin":
            raise PermissionDenied("Only admin can delete ports")
        instance.delete()
        log_action(
            self.request.user,
            "DELETE",
            "Port",
            instance.id,
            f"Port {instance.name} deleted"
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
        Q(vessel__subscribers__user=request.user) | 
        Q(user=request.user)

    ).order_by("-created_at")

    return Response([
        {
            "id": alert.id,
            "vessel": alert.vessel.name if alert.vessel else None,
            "vessel_id": alert.vessel.id if alert.vessel else None,
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

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Vessel
from .services.marinesia_service import fetch_live_vessels

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def sync_live_vessels(request):
    live_vessels = fetch_live_vessels()
    updated = 0

    for v in live_vessels:
        mmsi = v.get("mmsi")
        if not mmsi:
            continue

        Vessel.objects.update_or_create(
            mmsi=mmsi,
            defaults={
                "name": v.get("name", "Unknown"),
                "latitude": v.get("latitude"),
                "longitude": v.get("longitude"),
                "speed": v.get("speed", 0),
                "heading": v.get("heading"),
                "status": "at_sea",
            }
        )
        updated += 1

    return Response({
        "message": "Live vessels synced",
        "count": updated,
    })

from api.services.noaa_weather import check_weather
from api.models import Vessel
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def weather_zones(request):
    zones = []

    vessels = Vessel.objects.filter(
        latitude__isnull=False,
        longitude__isnull=False
    )

    for v in vessels:
        alert = check_weather(v.latitude, v.longitude)
        if alert and alert.get("radius"):
            zones.append({
                "center": [v.latitude, v.longitude],
                "radius": int(alert.get("radius", 150)),
                "severity": alert["severity"],
                "message": alert["message"],
                "vessel": v.name,
            })

    return Response(zones)

# def weather_zones(request):
#     zones = []

#     # 🔴 DEMO WEATHER ALERT — MUMBAI
#     zones.append({
#         "center": [18.94, 72.83],   # Mumbai
#         "radius": 120,              # km
#         "severity": "High",
#         "message": "Severe Thunderstorm (DEMO)",
#         "vessel": "Demo Zone - Mumbai",
#     })

#     return Response(zones)

from api.models import VesselPositionHistory
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def vessel_history(request, vessel_id):
    qs = VesselPositionHistory.objects.filter(
        vessel_id=vessel_id
    ).order_by("recorded_at")

    return Response([
        {
            "lat": p.latitude,
            "lng": p.longitude,
            "speed": p.speed,
            "time": p.recorded_at,
        }
        for p in qs
    ])
@api_view(["GET"])
@permission_classes([AdminOnly])
def audit_logs(request):
    logs = AuditLog.objects.all().order_by("-created_at")
    return Response(AuditLogSerializer(logs, many=True).data)

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count
from .models import User, Vessel, Port
from rest_framework.exceptions import PermissionDenied


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_overview(request):
    # 🔒 Admin only
    if request.user.role != "admin":
        raise PermissionDenied("Admins only")

    total_users = User.objects.count()
    pending_admin_requests = User.objects.filter(
        role="admin",
        is_approved=False
    ).count()

    total_vessels = Vessel.objects.count()
    total_ports = Port.objects.count()

    users_by_role = (
        User.objects.values("role")
        .annotate(count=Count("id"))
    )

    return Response({
        "total_users": total_users,
        "pending_admin_requests": pending_admin_requests,
        "total_vessels": total_vessels,
        "total_ports": total_ports,
        "users_by_role": {
            u["role"]: u["count"] for u in users_by_role
        }
    })
@api_view(["POST"])
@permission_classes([AdminOnly])
def broadcast_alert(request):
    message = request.data.get("message")
    target = request.data.get("target", "all")

    if not message:
        return Response({"error": "Message required"}, status=400)
    
    users = User.objects.all() 
    if target != "all":
        users = users.filter(role=target)

    for user in users:
        VesselAlert.objects.create(
            user=user,
            message=f"[BROADCAST - {target.upper()}] {message}"
        )
    

    AuditLog.objects.create(
        user=request.user,
        action="broadcast",
        target=target,
        description=f"Broadcasted message to {target}"
    )

    return Response({"message": "Broadcast sent"})


# ==========================
# LIST USERS (ADMIN)
# ==========================
@api_view(["GET"])
@permission_classes([AdminOnly])
def admin_list_users(request):
    users = User.objects.all().order_by("-date_joined")
    return Response(UserSerializer(users, many=True).data)

@api_view(["PATCH"])
@permission_classes([AdminOnly])
def toggle_user_active(request, user_id):
    user = get_object_or_404(User, id=user_id)

    user.is_active = not user.is_active
    user.save(update_fields=["is_active"])

    return Response({
        "id": user.id,
        "is_active": user.is_active
    })


# ==========================
# CHANGE ROLE
# ==========================
@api_view(["PATCH"])
@permission_classes([AdminOnly])
def admin_change_role(request, user_id):
    user = get_object_or_404(User, id=user_id)

    if user == request.user:
        return Response({"error": "Cannot change your own role"}, status=400)

    role = request.data.get("role")
    if role not in ["admin", "operator", "analyst"]:
        return Response({"error": "Invalid role"}, status=400)

    user.role = role
    user.save()
    return Response({"message": "Role updated"})


# ==========================
# DEACTIVATE USER
# ==========================
@api_view(["PATCH"])
@permission_classes([AdminOnly])
def admin_toggle_user(request, user_id):
    user = get_object_or_404(User, id=user_id)

    if user == request.user:
        return Response({"error": "Cannot deactivate yourself"}, status=400)

    user.is_active = not user.is_active
    user.save()

    return Response({
        "message": "User status updated",
        "is_active": user.is_active
    })

@api_view(["GET"])
@permission_classes([AdminOnly])
def audit_logs(request):
    logs = AuditLog.objects.select_related("user").order_by("-created_at")

    data = [
        {
            "id": log.id,
            "user": log.user.username if log.user else "System",
            "action": log.action,
            "target": log.target,
            "description": log.description,
            "created_at": log.created_at,
        }
        for log in logs
    ]

    return Response(data)
