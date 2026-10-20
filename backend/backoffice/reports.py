"""Sales report numbers for the admin Reports page.

Only PAID orders count as sales (a cancelled paid order becomes "refund pending", so it drops out).
"""
from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, DecimalField, ExpressionWrapper, F, Sum
from django.db.models.functions import Coalesce, TruncDate
from django.utils import timezone

from orders.models import Order, OrderItem

ALLOWED_DAYS = (7, 30, 90)
LINE_TOTAL = ExpressionWrapper(F('price') * F('qty'), output_field=DecimalField(max_digits=14, decimal_places=2))


def paid_orders(start, end):
    """Paid orders created between two dates (both included, in the shop's time zone)."""
    return Order.objects.filter(
        payment_status=Order.PaymentStatus.PAID, created_at__date__gte=start, created_at__date__lte=end,
    )


def totals(orders):
    result = orders.aggregate(revenue=Coalesce(Sum('total'), Decimal('0')), orders=Count('id'))
    result['revenue'] = Decimal(result['revenue']).quantize(Decimal('0.01'))  # round to paise
    items = OrderItem.objects.filter(order__in=orders).aggregate(qty=Coalesce(Sum('qty'), 0))
    result['items_sold'] = items['qty']
    result['avg_order'] = (result['revenue'] / result['orders']).quantize(Decimal('0.01')) if result['orders'] else Decimal('0')
    return result


def change(now, before):
    """% change from the previous period. None when there is nothing to compare with."""
    if not before:
        return None
    return round((float(now) - float(before)) / float(before) * 100, 1)


def sales_report(days):
    today = timezone.localdate()
    start = today - timedelta(days=days - 1)
    prev_end = start - timedelta(days=1)
    prev_start = prev_end - timedelta(days=days - 1)

    orders = paid_orders(start, today)
    current, previous = totals(orders), totals(paid_orders(prev_start, prev_end))

    # Revenue + orders per day; days without sales are filled with 0 so the chart has no gaps
    rows = orders.annotate(day=TruncDate('created_at')).values('day').annotate(revenue=Sum('total'), orders=Count('id'))
    by_day = {row['day']: row for row in rows}
    daily = [
        {'date': day.isoformat(), 'revenue': by_day.get(day, {}).get('revenue') or 0,
         'orders': by_day.get(day, {}).get('orders') or 0}
        for day in (start + timedelta(days=i) for i in range(days))
    ]

    items = OrderItem.objects.filter(order__in=orders)
    top_products = list(
        items.values('product_name')
        .annotate(units=Sum('qty'), revenue=Sum(LINE_TOTAL))  # not "qty": that name is the column
        .order_by('-revenue')[:5]
    )
    by_category = list(
        items.values(name=F('variant__product__category__name'))
        .annotate(revenue=Sum(LINE_TOTAL))
        .order_by('-revenue')
    )
    for row in by_category:
        row['name'] = row['name'] or 'Removed products'  # the variant was deleted later

    statuses = (
        Order.objects.filter(created_at__date__gte=start)
        .exclude(status=Order.Status.PENDING_PAYMENT)
        .values('status').annotate(count=Count('id')).order_by('-count')
    )

    return {
        'days': days,
        'start': start.isoformat(),
        'end': today.isoformat(),
        'summary': {
            **current,
            'revenue_change': change(current['revenue'], previous['revenue']),
            'orders_change': change(current['orders'], previous['orders']),
        },
        'daily': daily,
        'top_products': top_products,
        'by_category': by_category,
        'statuses': list(statuses),
    }
