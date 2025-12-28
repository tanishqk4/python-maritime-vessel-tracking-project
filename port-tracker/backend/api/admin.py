from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('Role Information', {'fields': ('role',)}),
    )

admin.site.register(User, CustomUserAdmin)

from .models import Vessel

@admin.register(Vessel)
class VesselAdmin(admin.ModelAdmin):
    list_display = ("name", "mmsi", "status", "last_updated")
    search_fields = ("name", "mmsi")
    list_filter = ("status",)
