import logging
import threading
import time

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class LockersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.lockers"
    verbose_name = "柜格管理"

    def ready(self):
        import os

        if os.environ.get("RUN_MAIN") != "true" and os.environ.get("DJANGO_SETTINGS_MODULE"):
            return

        def cleanup_worker():
            from .services import clean_expired_reservations

            time.sleep(10)
            while True:
                try:
                    count = clean_expired_reservations()
                    if count > 0:
                        logger.info("自动清理过期预约 %d 个", count)
                except Exception as exc:
                    logger.exception("清理过期预约时发生异常: %s", exc)
                time.sleep(30)

        t = threading.Thread(target=cleanup_worker, daemon=True, name="reservation-cleanup")
        t.start()
