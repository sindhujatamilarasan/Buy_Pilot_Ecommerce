from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from cart.serializers import quote_to_json
from cart.services import build_quote

from .models import Address, Order, OrderItem, Payment
from .payments import payment_mode, verify_signature, verify_webhook_signature
from .serializers import AddressSerializer, CreateOrderSerializer, OrderSerializer, VerifyPaymentSerializer
from .services import cancel_order, complete_payment, log, mark_payment_failed, place_cod_order, start_payment


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

    def perform_destroy(self, address):
        was_default = address.is_default
        address.delete()
        # Deleted the default? Make the newest remaining address the default
        next_address = self.request.user.addresses.first()
        if was_default and next_address:
            next_address.is_default = True
            next_address.save(update_fields=['is_default'])


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
        return Response({'detail': 'Please fix your cart before paying.', **quote_to_json(quote, request)},
                        status=status.HTTP_400_BAD_REQUEST)

    summary = quote['summary']
    cod = data['payment_method'] == Order.Method.COD
    if cod:
        if not settings.COD_ENABLED:
            return Response({'detail': 'Cash on delivery is not available.'}, status=status.HTTP_400_BAD_REQUEST)
        if summary['total'] > settings.COD_MAX_AMOUNT:
            return Response({'detail': f'Cash on delivery is only for orders up to ₹{settings.COD_MAX_AMOUNT}. Please pay online.'},
                            status=status.HTTP_400_BAD_REQUEST)
    with transaction.atomic():
        order = Order.objects.create(
            user=request.user,
            store_id=quote['lines'][0]['store_id'],  # all lines are from one store (checked in build_quote)
            ship_name=address.name, ship_phone=address.phone, ship_address=address.address,
            ship_city=address.city, ship_pincode=address.pincode,
            subtotal=summary['subtotal'], discount=summary['discount'], tax=summary['tax'],
            shipping=summary['shipping'], total=summary['total'],
            coupon_code=quote['coupon'].code if quote['coupon'] else '',
            payment_method=data['payment_method'],
        )
        OrderItem.objects.bulk_create(
            OrderItem(order=order, variant=line['variant'], product_name=line['name'],
                      variant_label=line['variant_label'], image=line['image'],
                      price=line['price'], qty=line['qty'])
            for line in quote['lines']
        )
        log(order, Order.Status.PENDING_PAYMENT, 'Order created', request.user)

    if cod:
        placed = place_cod_order(order)
        order.refresh_from_db()
        body = OrderSerializer(order, context={'request': request}).data
        if not placed:
            return Response({'detail': 'Sorry – an item sold out just now. Your order was not placed.', 'order': body},
                            status=status.HTTP_409_CONFLICT)
        return Response({'order': body, 'payment': {'mode': 'cod'}}, status=status.HTTP_201_CREATED)
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
    if (order.status != Order.Status.PENDING_PAYMENT or order.payment_status == Order.PaymentStatus.PAID
            or order.payment_method != Order.Method.ONLINE):
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


@api_view(['GET'])
@permission_classes([AllowAny])
def payment_options(request):
    """What the checkout page may offer: pay online (always) and cash on delivery (if switched on)."""
    return Response({'online': True, 'mode': payment_mode(), 'cod': settings.COD_ENABLED, 'cod_max': settings.COD_MAX_AMOUNT})


@csrf_exempt
@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def razorpay_webhook(request):
    """Razorpay tells US the payment result (server to server), so an order is confirmed even if the
    customer closed the browser before it came back. The body is signed with the webhook secret."""
    if not verify_webhook_signature(request.body, request.headers.get('X-Razorpay-Signature', '')):
        return Response({'detail': 'Bad signature.'}, status=status.HTTP_400_BAD_REQUEST)
    event = request.data.get('event', '')
    entity = (request.data.get('payload', {}).get('payment') or {}).get('entity') or {}
    payment = Payment.objects.filter(razorpay_order_id=entity.get('order_id') or '', provider='razorpay').first()
    if payment and event in ('payment.captured', 'order.paid'):
        payment_id = entity.get('id', '')
        if payment.order.status == Order.Status.PENDING_PAYMENT:  # not placed / cancelled yet
            complete_payment(payment, payment_id)
    elif payment and event == 'payment.failed' and payment.order.payment_status != Order.PaymentStatus.PAID:
        mark_payment_failed(payment, 'Payment failed at the bank')
    return Response({'ok': True})  # always answer 200 for events we do not need, or Razorpay keeps retrying
