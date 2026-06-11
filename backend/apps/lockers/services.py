from django.db import transaction
from django.utils import timezone

from .models import LockerCell, Reservation


@transaction.atomic
def clean_expired_reservations():
    now = timezone.now()
    expired = Reservation.objects.select_for_update().filter(
        status=Reservation.Status.ACTIVE,
        expires_at__lt=now,
    )
    count = 0
    for r in expired:
        r.status = Reservation.Status.EXPIRED
        r.save(update_fields=["status"])
        cell = r.locker_cell
        if cell.status == LockerCell.Status.RESERVED:
            cell.status = LockerCell.Status.EMPTY
            cell.save(update_fields=["status", "updated_at"])
        count += 1
    return count
