from rest_framework import serializers

from .models import LockerCell, Reservation


class LockerCellSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    size_label = serializers.CharField(source="get_size_display", read_only=True)

    class Meta:
        model = LockerCell
        fields = [
            "id",
            "code",
            "zone",
            "size",
            "size_label",
            "status",
            "status_label",
            "temperature",
            "last_opened_at",
            "updated_at",
        ]


class ReservationSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    size_label = serializers.CharField(source="get_size_display", read_only=True)
    locker_cell_detail = LockerCellSerializer(source="locker_cell", read_only=True)

    class Meta:
        model = Reservation
        fields = [
            "id",
            "courier_name",
            "courier_phone",
            "size",
            "size_label",
            "zone",
            "status",
            "status_label",
            "reserved_at",
            "expires_at",
            "used_at",
            "note",
            "locker_cell",
            "locker_cell_detail",
        ]
        read_only_fields = ["status", "reserved_at", "used_at", "locker_cell"]


class ReservationCreateSerializer(serializers.Serializer):
    courier_name = serializers.CharField(max_length=40)
    courier_phone = serializers.CharField(max_length=30)
    size = serializers.ChoiceField(choices=LockerCell.Size.choices)
    zone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    expire_hours = serializers.IntegerField(min_value=1, max_value=72, default=24)
    note = serializers.CharField(max_length=200, required=False, allow_blank=True)
