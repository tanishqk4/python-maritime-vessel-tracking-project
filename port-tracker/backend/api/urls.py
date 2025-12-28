from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import RegisterView, MeView, VesselViewSet

router = DefaultRouter()
router.register(r'vessels', VesselViewSet, basename='vessel')

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="auth_register"),
    path("auth/login/", TokenObtainPairView.as_view(), name="auth_login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="auth_refresh"),
    path("auth/me/", MeView.as_view(), name="auth_me"),

    path("", include(router.urls)),
]
