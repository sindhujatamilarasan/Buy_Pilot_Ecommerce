"""Order business rules: payment start, payment success (stock), cancel."""
from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import F

from catalog.models import ProductVariant
from coupons.models import Coupon, CouponUsage

from .models import Order, OrderStatusLog, Payment
from .payments import create_razorpay_order, payment_mode, to_paise

CANCELLABLE = (Order.Status.PLACED, Order.Status.PACKED)  # only before "shipped"
NEXT_STATUS = {  # admin / staff move an order forward one step at a time
    Order.Status.PLACED: Order.Status.PACKED,
    Order.Status.PACKED: Order.Status.SHIPPED,
    Order.Status.SHIPPED: Order.Status.DELIVERED,
}


class OutOfStock(Exception):
    pass


def log(order, status, note='', user=None):
    OrderStatusLog.objects.create(order=order, status=status, note=note, changed_by=user)


def start_payment(order):
    """Create a Payment row (and a Razorpay order in razorpay mode). Returns what the frontend needs."""
    mode = payment_mode()
    payment = Payment(order=order, provider=mode, amount=order.total)
    if mode == 'razorpay':
        payment.razorpay_order_id = create_razorpay_order(order.total, receipt=f'order_{order.id}')
    payment.save()
    return {
        'mode': mode,
        'payment_id': payment.id,
        'key_id': settings.RAZORPAY_KEY_ID if mode == 'razorpay' else '',
        'razorpay_order_id': payment.razorpay_order_id,
        'amount': to_paise(order.total),
        'currency': 'INR',
    }


def mark_payment_failed(payment, reason='Payment failed'):
    payment.status = Payment.Status.FAILED
    payment.save(update_fields=['status'])
    Order.objects.filter(pk=payment.order_id, payment_status=Order.PaymentStatus.PENDING).update(
        payment_status=Order.PaymentStatus.FAILED
    )
    log(payment.order, payment.order.status, reason)


def complete_payment(payment, razorpay_payment_id=''):
    """Payment verified → reduce stock. Returns True if the order is placed.

    Stock is reduced ONLY here (after payment). The update below only succeeds while
    stock >= qty, and the database runs it as one step – so if two people pay for the
    LAST item at the same time, only one update succeeds and the other order is cancelled.
    """
    order = payment.order
    try:
        with transaction.atomic():
            locked = Order.objects.select_for_update().get(pk=order.pk)
            if locked.payment_status == Order.PaymentStatus.PAID:
                return True  # already done (e.g. double click) – do nothing twice

            for item in locked.items.all():
                # Lock the variant row (PostgreSQL) and reduce only if enough stock is left
                ProductVariant.objects.select_for_update().filter(pk=item.variant_id).first()
                updated = ProductVariant.objects.filter(pk=item.variant_id, stock__gte=item.qty).update(
                    stock=F('stock') - item.qty
                )
                if not updated:
                    raise OutOfStock(item.product_name)

            payment.status = Payment.Status.SUCCESS
            payment.razorpay_payment_id = razorpay_payment_id
            payment.save()
            locked.status = Order.Status.PLACED
            locked.payment_status = Order.PaymentStatus.PAID
            locked.save(update_fields=['status', 'payment_status'])
            log(locked, Order.Status.PLACED, 'Payment received')
            if locked.coupon_code:
                coupon = Coupon.objects.filter(code=locked.coupon_code).first()
                if coupon:
                    try:
                        with transaction.atomic():
                            CouponUsage.objects.create(coupon=coupon, user=locked.user, order=locked)
                    except IntegrityError:
                        pass  # already recorded
        return True
    except OutOfStock as error:
        # Everything above was rolled back. Money was taken, so the order needs a refund.
        payment.status = Payment.Status.SUCCESS
        payment.razorpay_payment_id = razorpay_payment_id
        payment.save()
        Order.objects.filter(pk=order.pk).update(
            status=Order.Status.CANCELLED, payment_status=Order.PaymentStatus.REFUND_PENDING
        )
        log(order, Order.Status.CANCELLED, f'{error} sold out during payment – refund pending')
        return False


def cancel_order(order, user, note='Cancelled'):
    """Cancel before shipping and put the stock back."""
    with transaction.atomic():
        locked = Order.objects.select_for_update().get(pk=order.pk)
        if locked.status not in CANCELLABLE:
            return False
        for item in locked.items.all():
            if item.variant_id:
                ProductVariant.objects.filter(pk=item.variant_id).update(stock=F('stock') + item.qty)
        locked.status = Order.Status.CANCELLED
        locked.payment_status = Order.PaymentStatus.REFUND_PENDING
        locked.save(update_fields=['status', 'payment_status'])
        log(locked, Order.Status.CANCELLED, note, user)
    return True


def advance_status(order, user):
    """placed → packed → shipped → delivered"""
    next_status = NEXT_STATUS.get(order.status)
    if not next_status:
        return False
    order.status = next_status
    order.save(update_fields=['status'])
    log(order, next_status, '', user)
    return True
