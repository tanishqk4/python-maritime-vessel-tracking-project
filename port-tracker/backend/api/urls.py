from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    RegisterView,
    MeView,
    VesselViewSet,
    PortViewSet,
    subscribe_vessel,
    my_alerts,
    port_congestion_metrics,
    mark_alert_read,
)

router = DefaultRouter()
router.register(r"vessels", VesselViewSet, basename="vessel")
router.register(r"ports", PortViewSet, basename="port")

urlpatterns = [
    # Auth
    path("auth/register/", RegisterView.as_view()),
    path("auth/login/", TokenObtainPairView.as_view()),
    path("auth/refresh/", TokenRefreshView.as_view()),
    path("auth/me/", MeView.as_view()),

    # Router URLs
    path("", include(router.urls)),  # ✅ OK

    # Subscriptions & alerts
    path("vessels/<int:vessel_id>/subscribe/", subscribe_vessel),
    path("alerts/", my_alerts),

    # Dashboard
    path("dashboard/port-congestion/", port_congestion_metrics),

    path("alerts/<int:alert_id>/read/", mark_alert_read),

]
