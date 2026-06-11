from django.core.management.base import BaseCommand

from apps.lockers.services import clean_expired_reservations


class Command(BaseCommand):
    help = "清理已过期的预约，释放对应柜格回空闲状态。"

    def handle(self, *args, **options):
        count = clean_expired_reservations()
        if count > 0:
            self.stdout.write(self.style.SUCCESS(f"已清理 {count} 个过期预约，柜格已释放。"))
        else:
            self.stdout.write(self.style.SUCCESS("没有需要清理的过期预约。"))
        return 0
