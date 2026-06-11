import threading
import time

from django.apps import AppConfig


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
                    clean_expired_reservations()
                except Exception:
                    pass
                time.sleep(300)

        t = threading.Thread(target=cleanup_worker, daemon=True, name="reservation-cleanup")
        t.start()
