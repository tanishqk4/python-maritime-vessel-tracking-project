from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views
from rest_framework_simplejwt.views import TokenViewBase



from .views import (
    RegisterView,
    MeView,
    VesselViewSet,
    PortViewSet,
    admin_overview,
    broadcast_alert,
    subscribe_vessel,
    my_alerts,
    port_congestion_metrics,
    mark_alert_read,
    arrivals_departures_trend,
    vessel_type_distribution,
    port_congestion_ranking,
    dashboard_kpi_trends,
    sync_live_vessels,
    weather_zones,
    vessel_history,
    audit_logs,
    CustomTokenSerializer,
    list_users,
    approve_admin,
    change_role,
    pending_admin_requests,
    admin_list_users,
    admin_change_role,
    admin_toggle_user,
)

class CustomTokenView(TokenViewBase):
    serializer_class = CustomTokenSerializer

router = DefaultRouter()
router.register(r"vessels", VesselViewSet, basename="vessel")
router.register(r"ports", PortViewSet, basename="port")

urlpatterns = [
    # Auth
    path("auth/register/", RegisterView.as_view()),
    path("auth/login/", TokenObtainPairView.as_view()),
    path("auth/refresh/", TokenRefreshView.as_view()),
    path("auth/me/", MeView.as_view()),


    path("auth/login/", CustomTokenView.as_view()),

    # Router URLs
    path("", include(router.urls)),  

    # Subscriptions & alerts
    path("vessels/<int:vessel_id>/subscribe/", subscribe_vessel),
    path("alerts/", my_alerts),

    # Dashboard
    path("dashboard/port-congestion/", port_congestion_metrics),

    path("alerts/<int:alert_id>/read/", mark_alert_read),

    path("analytics/arrivals-departures/", arrivals_departures_trend),

    path("analytics/vessel-type-distribution/", vessel_type_distribution),

    path("analytics/port-congestion-ranking/", port_congestion_ranking),

    path("analytics/kpi-trends/", dashboard_kpi_trends),

    path("sync/live-vessels/", sync_live_vessels),

    path("weather/zones/", views.weather_zones),

    path("vessels/<int:vessel_id>/history/", vessel_history),

    #admin panel

    path("audit/logs/", audit_logs),

    path("admin/users/", list_users),
    path("admin/pending-admins/", pending_admin_requests),
    path("admin/admin-approval/<int:user_id>/", approve_admin),
    path("admin/change-role/<int:user_id>/", change_role),
    path("admin/overview/", admin_overview),

    path("admin/broadcast/", broadcast_alert),

    path("admin/users/", admin_list_users),
    path("admin/users/<int:user_id>/role/", admin_change_role),
    path("admin/users/<int:user_id>/toggle/", admin_toggle_user),



]
