from django.contrib import admin

from .models import LockerCell, Reservation


@admin.register(LockerCell)
class LockerCellAdmin(admin.ModelAdmin):
    list_display = ("code", "zone", "size", "status", "temperature", "updated_at")
    list_filter = ("zone", "size", "status")
    search_fields = ("code",)


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ("id", "courier_name", "courier_phone", "locker_cell", "size", "zone", "status", "reserved_at", "expires_at")
    list_filter = ("status", "size", "zone")
    search_fields = ("courier_name", "courier_phone")
