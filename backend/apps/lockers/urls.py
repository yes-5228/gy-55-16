from rest_framework.routers import DefaultRouter

from .views import LockerCellViewSet, ReservationViewSet


router = DefaultRouter()
router.register("cells", LockerCellViewSet, basename="locker-cell")
router.register("reservations", ReservationViewSet, basename="reservation")

urlpatterns = router.urls
