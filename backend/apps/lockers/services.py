import logging

from django.db import transaction
from django.utils import timezone

from .models import LockerCell, Reservation

logger = logging.getLogger(__name__)


@transaction.atomic
def clean_expired_reservations():
    now = timezone.now()
    expired = Reservation.objects.select_for_update().filter(
        status=Reservation.Status.ACTIVE,
        expires_at__lt=now,
    )
    count = 0
    for r in expired:
        try:
            r.status = Reservation.Status.EXPIRED
            r.save(update_fields=["status"])
            cell = r.locker_cell
            if cell.status == LockerCell.Status.RESERVED:
                cell.status = LockerCell.Status.EMPTY
                cell.save(update_fields=["status", "updated_at"])
            count += 1
            logger.info("预约 #%d 已过期，柜格 %s 已释放", r.id, cell.code)
        except Exception as exc:
            logger.exception("释放预约 #%d 的柜格时失败: %s", r.id, exc)
            raise
    return count
