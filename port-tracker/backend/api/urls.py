from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    RegisterView,
    MeView,
    subscribe_vessel,
    my_alerts,
)

urlpatterns = [
    # 🔐 Auth
    path("auth/register/", RegisterView.as_view()),
    path("auth/login/", TokenObtainPairView.as_view()),
    path("auth/refresh/", TokenRefreshView.as_view()),
    path("auth/me/", MeView.as_view()),

    # 🚢 Vessel subscriptions & alerts
    path("vessels/<int:vessel_id>/subscribe/", subscribe_vessel),
    path("alerts/", my_alerts),
]
