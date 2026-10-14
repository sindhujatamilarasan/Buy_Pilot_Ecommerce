from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from cart.serializers import quote_to_json
from cart.services import build_quote

from .models import Address, Order, OrderItem, Payment
from .payments import payment_mode, verify_signature
from .serializers import AddressSerializer, CreateOrderSerializer, OrderSerializer, VerifyPaymentSerializer
from .services import cancel_order, complete_payment, log, mark_payment_failed, start_payment


# ---------- Addresses (each user sees only their own) ----------
class AddressList(generics.ListCreateAPIView):
    serializer_class = AddressSerializer
    pagination_class = None

    def get_queryset(self):
        return self.request.user.addresses.all()

    def perform_create(self, serializer):
        first = not self.request.user.addresses.exists()
        address = serializer.save(user=self.request.user, is_default=serializer.validated_data.get('is_default') or first)
        if address.is_default:
            self.request.user.addresses.exclude(pk=address.pk).update(is_default=False)


class AddressDetail(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AddressSerializer

    def get_queryset(self):
        return self.request.user.addresses.all()

    def perform_update(self, serializer):
        address = serializer.save()
        if address.is_default:
            self.request.user.addresses.exclude(pk=address.pk).update(is_default=False)


# ---------- Orders ----------
@api_view(['GET', 'POST'])
def orders(request):
    if request.method == 'GET':
        queryset = request.user.orders.prefetch_related('items', 'logs')
        return Response(OrderSerializer(queryset, many=True, context={'request': request}).data)
    return create_order(request)


def create_order(request):
    """POST /api/orders/ → recalculate on the server, save the order, start the payment."""
    serializer = CreateOrderSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    address = get_object_or_404(Address, pk=data['address_id'], user=request.user)

    quote = build_quote(data['items'], data.get('coupon_code', ''), request.user)
    if quote['problems'] or quote['coupon_error'] or not quote['lines']:
        return Response({'detail': 'Please fix your cart before paying.', **quote_to_json(quote)},
                        status=status.HTTP_400_BAD_REQUEST)

    summary = quote['summary']
    with transaction.atomic():
        order = Order.objects.create(
            user=request.user,
            ship_name=address.name, ship_phone=address.phone, ship_address=address.address,
            ship_city=address.city, ship_pincode=address.pincode,
            subtotal=summary['subtotal'], discount=summary['discount'], tax=summary['tax'],
            shipping=summary['shipping'], total=summary['total'],
            coupon_code=quote['coupon'].code if quote['coupon'] else '',
        )
        OrderItem.objects.bulk_create(
            OrderItem(order=order, variant=line['variant'], product_name=line['name'],
                      variant_label=line['variant_label'], image=line['image'],
                      price=line['price'], qty=line['qty'])
            for line in quote['lines']
        )
        log(order, Order.Status.PENDING_PAYMENT, 'Order created', request.user)

    payment = start_payment(order)
    return Response({'order': OrderSerializer(order, context={'request': request}).data, 'payment': payment},
                    status=status.HTTP_201_CREATED)


@api_view(['GET'])
def order_detail(request, pk):
    order = get_object_or_404(request.user.orders.prefetch_related('items', 'logs'), pk=pk)
    return Response(OrderSerializer(order, context={'request': request}).data)


@api_view(['POST'])
def retry_payment(request, pk):
    """Start a new payment attempt for an unpaid order."""
    order = get_object_or_404(request.user.orders, pk=pk)
    if order.status != Order.Status.PENDING_PAYMENT or order.payment_status == Order.PaymentStatus.PAID:
        return Response({'detail': 'This order cannot be paid again.'}, status=status.HTTP_400_BAD_REQUEST)
    Order.objects.filter(pk=order.pk).update(payment_status=Order.PaymentStatus.PENDING)
    return Response(start_payment(order))


@api_view(['POST'])
def verify_payment(request, pk):
    """The browser says "I paid". We CHECK it before trusting it."""
    order = get_object_or_404(request.user.orders, pk=pk)
    serializer = VerifyPaymentSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    payment = get_object_or_404(Payment, pk=data['payment_id'], order=order)

    if payment.provider == 'razorpay':
        valid = (data.get('razorpay_order_id') == payment.razorpay_order_id
                 and verify_signature(payment.razorpay_order_id, data.get('razorpay_payment_id', ''),
                                      data.get('razorpay_signature', '')))
        if not valid:
            mark_payment_failed(payment, 'Payment signature did not match')
            return Response({'detail': 'Payment could not be verified.'}, status=status.HTTP_400_BAD_REQUEST)
        placed = complete_payment(payment, data['razorpay_payment_id'])
    else:
        if payment_mode() != 'mock':  # never allow fake payments when real Razorpay is configured
            return Response({'detail': 'Mock payments are disabled.'}, status=status.HTTP_400_BAD_REQUEST)
        if data.get('mock_result') != 'success':
            mark_payment_failed(payment, 'Payment failed (test)')
            return Response({'detail': 'Payment failed. You can try again.'}, status=status.HTTP_400_BAD_REQUEST)
        placed = complete_payment(payment, 'mock_' + str(payment.id))

    order.refresh_from_db()
    body = OrderSerializer(order, context={'request': request}).data
    if not placed:
        return Response({'detail': 'Sorry – an item sold out while you were paying. A refund will be made.',
                         'order': body}, status=status.HTTP_409_CONFLICT)
    return Response({'order': body})


@api_view(['POST'])
def payment_failed(request, pk):
    """Razorpay popup closed or payment failed in the browser."""
    order = get_object_or_404(request.user.orders, pk=pk)
    payment = order.payments.filter(status=Payment.Status.CREATED).first()
    if payment:
        mark_payment_failed(payment, request.data.get('reason', 'Payment cancelled'))
    return Response({'detail': 'Payment marked as failed.'})


@api_view(['POST'])
def cancel(request, pk):
    order = get_object_or_404(request.user.orders, pk=pk)
    if not cancel_order(order, request.user, 'Cancelled by customer'):
        return Response({'detail': 'Orders can only be cancelled before they are shipped.'},
                        status=status.HTTP_400_BAD_REQUEST)
    order.refresh_from_db()
    return Response(OrderSerializer(order, context={'request': request}).data)
