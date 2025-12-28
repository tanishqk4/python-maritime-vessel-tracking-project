from rest_framework.permissions import BasePermission, SAFE_METHODS

class VesselPermission(BasePermission):
    """
    Role-based permissions for Vessel APIs
    """

    def has_permission(self, request, view):
        user = request.user

        print("DEBUG USER:", user)
        print("DEBUG ROLE:", getattr(user, "role", None))
        print("DEBUG METHOD:", request.method)

        if not user or not user.is_authenticated:
            return False

        # ADMIN → full access
        if user.role == "admin":
            return True

        # ANALYST → read-only
        if user.role == "analyst":
            return request.method in SAFE_METHODS

        # OPERATOR → read + update
        if user.role == "operator":
            return request.method in ["GET", "PUT", "PATCH"]

        return False
