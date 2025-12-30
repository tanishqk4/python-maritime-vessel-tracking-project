from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    RegisterView,
    MeView,
    VesselViewSet,
    subscribe_vessel,
    my_alerts,
)

router = DefaultRouter()
router.register(r"vessels", VesselViewSet, basename="vessel")

urlpatterns = [
    # 🔐 Auth
    path("auth/register/", RegisterView.as_view()),
    path("auth/login/", TokenObtainPairView.as_view()),
    path("auth/refresh/", TokenRefreshView.as_view()),
    path("auth/me/", MeView.as_view()),

    # 🚢 Vessel CRUD (router)
    path("", include(router.urls)),

    # 🔔 Subscriptions & alerts
    path("vessels/<int:vessel_id>/subscribe/", subscribe_vessel),
    path("alerts/", my_alerts),
]
