import logging

from django.core.management.base import BaseCommand

from apps.lockers.services import clean_expired_reservations

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "清理已过期的预约，释放对应柜格回空闲状态。"

    def handle(self, *args, **options):
        try:
            count = clean_expired_reservations()
            if count > 0:
                msg = f"已清理 {count} 个过期预约，柜格已释放。"
                self.stdout.write(self.style.SUCCESS(msg))
                logger.info(msg)
            else:
                msg = "没有需要清理的过期预约。"
                self.stdout.write(self.style.SUCCESS(msg))
                logger.info(msg)
            return 0
        except Exception as exc:
            msg = f"清理过期预约失败: {exc}"
            self.stderr.write(self.style.ERROR(msg))
            logger.exception(msg)
            return 1
