import re

from rest_framework import serializers

from cart.serializers import QuoteItemSerializer
from catalog.utils import absolute_media

from .models import Address, Order, OrderItem, OrderStatusLog
from .services import CANCELLABLE


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = ['id', 'name', 'phone', 'address', 'city', 'pincode', 'is_default']

    def validate_phone(self, value):
        if not re.fullmatch(r'[6-9]\d{9}', value):
            raise serializers.ValidationError('Enter a valid 10-digit mobile number.')
        return value

    def validate_pincode(self, value):
        if not re.fullmatch(r'\d{6}', value):
            raise serializers.ValidationError('Pincode must be 6 digits.')
        return value


class OrderItemSerializer(serializers.ModelSerializer):
    line_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    image = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ['id', 'product_name', 'variant_label', 'image', 'price', 'qty', 'line_total']

    def get_image(self, item):
        return absolute_media(self.context.get('request'), item.image)


class StatusLogSerializer(serializers.ModelSerializer):
    changed_by = serializers.CharField(source='changed_by.first_name', default='', read_only=True)

    class Meta:
        model = OrderStatusLog
        fields = ['status', 'note', 'changed_by', 'created_at']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    logs = StatusLogSerializer(many=True, read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    payment_status_label = serializers.CharField(source='get_payment_status_display', read_only=True)
    customer = serializers.CharField(source='user.email', read_only=True)
    can_cancel = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'customer', 'status', 'status_label', 'payment_status', 'payment_status_label',
            'subtotal', 'discount', 'tax', 'shipping', 'total', 'coupon_code',
            'ship_name', 'ship_phone', 'ship_address', 'ship_city', 'ship_pincode',
            'items', 'logs', 'can_cancel', 'created_at',
        ]

    def get_can_cancel(self, order):
        return order.status in CANCELLABLE


class CreateOrderSerializer(serializers.Serializer):
    address_id = serializers.IntegerField()
    items = QuoteItemSerializer(many=True, min_length=1, max_length=50)
    coupon_code = serializers.CharField(required=False, allow_blank=True, max_length=30)


class VerifyPaymentSerializer(serializers.Serializer):
    payment_id = serializers.IntegerField()
    # Razorpay mode
    razorpay_order_id = serializers.CharField(required=False, allow_blank=True)
    razorpay_payment_id = serializers.CharField(required=False, allow_blank=True)
    razorpay_signature = serializers.CharField(required=False, allow_blank=True)
    # Mock mode (development only)
    mock_result = serializers.ChoiceField(choices=['success', 'failure'], required=False)
