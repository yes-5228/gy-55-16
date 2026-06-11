from django.db import models
from django.utils import timezone


class LockerCell(models.Model):
    class Size(models.TextChoices):
        SMALL = "small", "小"
        MEDIUM = "medium", "中"
        LARGE = "large", "大"

    class Status(models.TextChoices):
        EMPTY = "empty", "空闲"
        RESERVED = "reserved", "已预约"
        OCCUPIED = "occupied", "已占用"
        OPEN = "open", "已开门"
        MAINTENANCE = "maintenance", "维护中"

    code = models.CharField(max_length=20, unique=True)
    zone = models.CharField(max_length=30, default="A区")
    size = models.CharField(max_length=20, choices=Size.choices, default=Size.MEDIUM)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.EMPTY)
    temperature = models.DecimalField(max_digits=5, decimal_places=2, default=24)
    last_opened_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["zone", "code"]

    def __str__(self):
        return f"{self.zone}-{self.code}"


class Reservation(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "有效"
        USED = "used", "已使用"
        CANCELLED = "cancelled", "已取消"
        EXPIRED = "expired", "已过期"

    courier_name = models.CharField(max_length=40)
    courier_phone = models.CharField(max_length=30)
    size = models.CharField(max_length=20, choices=LockerCell.Size.choices)
    zone = models.CharField(max_length=30)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    reserved_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    note = models.CharField(max_length=200, blank=True)
    locker_cell = models.ForeignKey(
        LockerCell,
        on_delete=models.PROTECT,
        related_name="reservations",
    )

    class Meta:
        ordering = ["-reserved_at"]

    def __str__(self):
        return f"预约-{self.id}-{self.locker_cell.code}"

    def is_expired(self):
        return timezone.now() > self.expires_at and self.status == Reservation.Status.ACTIVE
