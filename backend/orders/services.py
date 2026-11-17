"""Order business rules: payment start, payment success (stock), cancel."""
from django.conf import settings
from django.db import IntegrityError, transaction

from catalog.models import ProductVariant
from coupons.models import Coupon, CouponUsage
from inventory.services import StockError, allocate_order_item, return_order_item

from .models import Order, OrderStatusLog, Payment
from .payments import create_razorpay_order, payment_mode, refund_razorpay_payment, to_paise

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

    Stock is reduced ONLY here (after payment). The variant row is locked first, then the
    warehouse stock is taken (default warehouse first) with updates that only succeed while
    enough is left – so if two people pay for the LAST item at the same time, only one
    succeeds and the other order is cancelled.
    """
    order = payment.order
    try:
        with transaction.atomic():
            locked = Order.objects.select_for_update().get(pk=order.pk)
            if locked.payment_status == Order.PaymentStatus.PAID:
                return True  # already done (e.g. double click) – do nothing twice

            for item in locked.items.all():
                if item.variant_id is None:
                    raise OutOfStock(item.product_name)  # the product was deleted
                # Lock the variant row (PostgreSQL): a second buyer of the same item waits here
                ProductVariant.objects.select_for_update().filter(pk=item.variant_id).first()
                try:
                    allocate_order_item(item, locked)  # inventory: picks the warehouse(s), logs the sale
                except StockError:
                    raise OutOfStock(item.product_name)

            payment.status = Payment.Status.SUCCESS
            payment.razorpay_payment_id = razorpay_payment_id
            payment.save()
            locked.status = Order.Status.PLACED
            locked.payment_status = Order.PaymentStatus.PAID
            locked.save(update_fields=['status', 'payment_status'])
            log(locked, Order.Status.PLACED, 'Payment received')
            record_coupon_use(locked)
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
        order.refresh_from_db()
        refund_order(order)
        return False


def place_cod_order(order):
    """Cash on delivery: no money now. Take the stock, place the order, and the cash is collected on delivery.

    Returns True if placed. If an item sold out meanwhile the order is cancelled (nothing was paid, so no refund).
    """
    payment = Payment.objects.create(order=order, provider='cod', amount=order.total)
    try:
        with transaction.atomic():
            locked = Order.objects.select_for_update().get(pk=order.pk)
            if locked.status != Order.Status.PENDING_PAYMENT:
                return True  # already placed
            for item in locked.items.all():
                if item.variant_id is None:
                    raise OutOfStock(item.product_name)
                ProductVariant.objects.select_for_update().filter(pk=item.variant_id).first()
                try:
                    allocate_order_item(item, locked)
                except StockError:
                    raise OutOfStock(item.product_name)
            locked.status = Order.Status.PLACED
            locked.payment_status = Order.PaymentStatus.COD
            locked.save(update_fields=['status', 'payment_status'])
            log(locked, Order.Status.PLACED, 'Order placed – pay on delivery')
            record_coupon_use(locked)
        return True
    except OutOfStock as error:
        payment.status = Payment.Status.FAILED
        payment.save(update_fields=['status'])
        Order.objects.filter(pk=order.pk).update(status=Order.Status.CANCELLED, payment_status=Order.PaymentStatus.NONE_DUE)
        log(order, Order.Status.CANCELLED, f'{error} sold out – order not placed')
        return False


def record_coupon_use(order):
    if not order.coupon_code:
        return
    coupon = Coupon.objects.filter(code=order.coupon_code).first()
    if coupon:
        try:
            with transaction.atomic():
                CouponUsage.objects.create(coupon=coupon, user=order.user, order=order)
        except IntegrityError:
            pass  # already recorded


def refund_order(order, user=None):
    """Give the money of a paid ONLINE order back. Returns True when it is refunded.

    Real Razorpay payments are refunded through the Razorpay API. If that fails (or the payment was a
    mock one) the order simply stays "Refund pending" so an admin can retry / settle it by hand.
    """
    paid = order.payments.filter(status=Payment.Status.SUCCESS, provider='razorpay').exclude(razorpay_payment_id='').first()
    if not paid or order.payment_status != Order.PaymentStatus.REFUND_PENDING:
        return False
    try:
        refund_id = refund_razorpay_payment(paid.razorpay_payment_id, paid.amount)
    except Exception as error:  # network / Razorpay error – never lose the cancellation because of it
        log(order, order.status, f'Refund could not be sent yet ({type(error).__name__}) – refund pending', user)
        return False
    paid.status = Payment.Status.REFUNDED
    paid.razorpay_refund_id = refund_id
    paid.save(update_fields=['status', 'razorpay_refund_id'])
    Order.objects.filter(pk=order.pk).update(payment_status=Order.PaymentStatus.REFUNDED)
    order.payment_status = Order.PaymentStatus.REFUNDED
    log(order, order.status, f'Refund of ₹{paid.amount} sent ({refund_id})', user)
    return True


def cancel_order(order, user, note='Cancelled'):
    """Cancel before shipping, put the stock back, and refund the money if it was paid online."""
    with transaction.atomic():
        locked = Order.objects.select_for_update().get(pk=order.pk)
        if locked.status not in CANCELLABLE:
            return False
        for item in locked.items.all():
            return_order_item(item, locked, user)  # back to the warehouse(s) it came from
        locked.status = Order.Status.CANCELLED
        cash = locked.payment_method == Order.Method.COD
        locked.payment_status = Order.PaymentStatus.NONE_DUE if cash else Order.PaymentStatus.REFUND_PENDING
        locked.save(update_fields=['status', 'payment_status'])
        log(locked, Order.Status.CANCELLED, note, user)
    if not cash:
        refund_order(locked, user)  # outside the transaction: it calls the internet
    order.refresh_from_db()
    return True


def advance_status(order, user):
    """placed → packed → shipped → delivered"""
    next_status = NEXT_STATUS.get(order.status)
    if not next_status:
        return False
    order.status = next_status
    fields = ['status']
    if next_status == Order.Status.DELIVERED and order.payment_status == Order.PaymentStatus.COD:
        order.payment_status = Order.PaymentStatus.PAID  # the delivery person collected the cash
        order.payments.filter(provider='cod').update(status=Payment.Status.SUCCESS)
        fields.append('payment_status')
    order.save(update_fields=fields)
    log(order, next_status, 'Cash collected' if 'payment_status' in fields else '', user)
    return True
