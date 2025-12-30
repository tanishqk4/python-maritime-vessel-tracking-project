from django.db import models
from django.contrib.auth.models import AbstractUser


# -------------------
# Custom User Model
# -------------------
class User(AbstractUser):
    ROLE_CHOICES = [
        ('operator', 'Operator'),
        ('analyst', 'Analyst'),
        ('admin', 'Admin'),
    ]

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='operator'
    )

    def __str__(self):
        return f"{self.username} ({self.role})"


# -------------------
# Vessel Model
# -------------------
class Vessel(models.Model):

    STATUS_CHOICES = [
        ("at_sea", "At Sea"),
        ("at_port", "At Port"),
    ]

    VESSEL_TYPE_CHOICES = [
        ("cargo", "Cargo"),
        ("fishing", "Fishing"),
        ("patrol", "Patrol"),
        ("tanker", "Tanker"),
    ]

    name = models.CharField(max_length=100)
    mmsi = models.CharField(max_length=20, unique=True)

    # Position
    latitude = models.FloatField()
    longitude = models.FloatField()

    # Movement
    speed = models.FloatField(help_text="Speed in knots")
    heading = models.FloatField(help_text="Direction in degrees (0–360)")

    # Status & Type
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="at_sea"
    )

    vessel_type = models.CharField(
        max_length=20,
        choices=VESSEL_TYPE_CHOICES,
        default="cargo"
    )

    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.vessel_type}, {self.mmsi})"

class VesselSubscription(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="subscriptions"
    )
    vessel = models.ForeignKey(
        Vessel,
        on_delete=models.CASCADE,
        related_name="subscribers"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "vessel")

    def __str__(self):
        return f"{self.user.username} → {self.vessel.name}"


class VesselAlert(models.Model):
    vessel = models.ForeignKey(
        Vessel,
        on_delete=models.CASCADE,
        related_name="alerts"
    )
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    def __str__(self):
        return f"Alert: {self.vessel.name}"
