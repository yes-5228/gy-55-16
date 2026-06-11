from django.db import transaction
from django.db.models import Count
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from .models import LockerCell, Reservation
from .serializers import (
    LockerCellSerializer,
    ReservationCreateSerializer,
    ReservationSerializer,
)
from .services import clean_expired_reservations


class LockerCellViewSet(viewsets.ModelViewSet):
    queryset = LockerCell.objects.all()
    serializer_class = LockerCellSerializer

    def list(self, request, *args, **kwargs):
        clean_expired_reservations()
        return super().list(request, *args, **kwargs)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        clean_expired_reservations()
        total = LockerCell.objects.count()
        by_status = {
            item["status"]: item["count"]
            for item in LockerCell.objects.values("status").annotate(count=Count("id"))
        }
        return Response(
            {
                "total": total,
                "empty": by_status.get(LockerCell.Status.EMPTY, 0),
                "reserved": by_status.get(LockerCell.Status.RESERVED, 0),
                "occupied": by_status.get(LockerCell.Status.OCCUPIED, 0),
                "open": by_status.get(LockerCell.Status.OPEN, 0),
                "maintenance": by_status.get(LockerCell.Status.MAINTENANCE, 0),
            }
        )

    @action(detail=False, methods=["get"])
    def zones(self, request):
        zones = list(
            LockerCell.objects.order_by("zone").values_list("zone", flat=True).distinct()
        )
        return Response(zones)

    @action(detail=False, methods=["get"])
    def availability(self, request):
        clean_expired_reservations()
        size = request.query_params.get("size")
        zone = request.query_params.get("zone")
        cells = LockerCell.objects.filter(status=LockerCell.Status.EMPTY)
        if size:
            cells = cells.filter(size=size)
        if zone:
            cells = cells.filter(zone=zone)
        serializer = self.get_serializer(cells, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def mark_maintenance(self, request, pk=None):
        cell = self.get_object()
        cell.status = LockerCell.Status.MAINTENANCE
        cell.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(cell).data)

    @action(detail=True, methods=["post"])
    def reset(self, request, pk=None):
        cell = self.get_object()
        cell.status = LockerCell.Status.EMPTY
        cell.last_opened_at = timezone.now()
        cell.save(update_fields=["status", "last_opened_at", "updated_at"])
        return Response(self.get_serializer(cell).data)


class ReservationViewSet(viewsets.ModelViewSet):
    queryset = Reservation.objects.select_related("locker_cell").all()
    serializer_class = ReservationSerializer

    def get_serializer_class(self):
        if self.action == "create":
            return ReservationCreateSerializer
        return ReservationSerializer

    def list(self, request, *args, **kwargs):
        clean_expired_reservations()
        return super().list(request, *args, **kwargs)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        clean_expired_reservations()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        cells = LockerCell.objects.select_for_update().filter(
            status=LockerCell.Status.EMPTY,
            size=data["size"],
        )
        if data.get("zone"):
            cells = cells.filter(zone=data["zone"])
        cell = cells.order_by("zone", "code").first()
        if not cell:
            raise ValidationError({"locker_cell": "没有符合条件的可用柜格。"})

        expires_at = timezone.now() + timezone.timedelta(hours=data["expire_hours"])
        reservation = Reservation.objects.create(
            courier_name=data["courier_name"],
            courier_phone=data["courier_phone"],
            size=data["size"],
            zone=cell.zone,
            expires_at=expires_at,
            note=data.get("note", ""),
            locker_cell=cell,
        )
        cell.status = LockerCell.Status.RESERVED
        cell.save(update_fields=["status", "updated_at"])

        output = ReservationSerializer(reservation)
        return Response(output.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"])
    def active(self, request):
        clean_expired_reservations()
        qs = Reservation.objects.filter(status=Reservation.Status.ACTIVE).select_related("locker_cell")
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        clean_expired_reservations()
        with transaction.atomic():
            reservation = self.get_object()
            if reservation.status != Reservation.Status.ACTIVE:
                raise ValidationError({"status": "只能取消有效预约。"})
            reservation.status = Reservation.Status.CANCELLED
            reservation.save(update_fields=["status"])
            cell = reservation.locker_cell
            if cell.status == LockerCell.Status.RESERVED:
                cell.status = LockerCell.Status.EMPTY
                cell.save(update_fields=["status", "updated_at"])
        return Response(ReservationSerializer(reservation).data)
