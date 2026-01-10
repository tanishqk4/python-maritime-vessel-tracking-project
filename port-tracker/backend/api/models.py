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
# Port Model
# -------------------
class Port(models.Model):
    name = models.CharField(max_length=100, unique=True)
    country = models.CharField(max_length=100)
    docking_capacity = models.PositiveIntegerField(
        help_text="Maximum number of vessels that can dock"
    )

    def __str__(self):
        return f"{self.name}, {self.country}"


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

    # Movement (relevant when at sea)
    speed = models.FloatField(help_text="Speed in knots")
    heading = models.FloatField(
        help_text="Direction in degrees (0–360)",
        null=True,
        blank=True
    )

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

    # Port relations
    current_port = models.ForeignKey(
        Port,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="docked_vessels",
        help_text="Port where the vessel is currently docked"
    )

    destination_port = models.ForeignKey(
        Port,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="incoming_vessels",
        help_text="Final destination port of the vessel"
    )

    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.vessel_type}, {self.mmsi})"


# -------------------
# Port Visit Model (Analytics Backbone)
# -------------------
class PortVisit(models.Model):
    vessel = models.ForeignKey(
        Vessel,
        on_delete=models.CASCADE,
        related_name="port_visits"
    )
    port = models.ForeignKey(
        Port,
        on_delete=models.CASCADE,
        related_name="visits"
    )
    arrival_time = models.DateTimeField()
    departure_time = models.DateTimeField(
        null=True,
        blank=True
    )

    def __str__(self):
        return f"{self.vessel.name} at {self.port.name}"


# -------------------
# Vessel Subscription
# -------------------
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


# -------------------
# Vessel Alerts
# -------------------
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
