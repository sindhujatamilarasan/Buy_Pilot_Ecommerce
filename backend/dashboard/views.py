from datetime import timedelta

from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from accounts.models import User
from accounts.permissions import IsAdminRole
from catalog.models import Category, Product, ProductVariant
from orders.models import Order

LOW_STOCK_LIMIT = 2  # 1–2 left = "low stock"


def sales_last_7_days():
    """Paid revenue + order count per day for the last 7 days (days with no sales = 0)."""
    today = timezone.localdate()
    start = today - timedelta(days=6)
    rows = (
        Order.objects.filter(payment_status=Order.PaymentStatus.PAID, created_at__date__gte=start)
        .annotate(day=TruncDate('created_at'))
        .values('day')
        .annotate(revenue=Sum('total'), orders=Count('id'))
    )
    by_day = {row['day']: row for row in rows}
    return [
        {
            'date': day.isoformat(),
            'revenue': by_day.get(day, {}).get('revenue') or 0,
            'orders': by_day.get(day, {}).get('orders') or 0,
        }
        for day in (start + timedelta(days=i) for i in range(7))
    ]


def recent_orders():
    orders = (
        Order.objects.exclude(status=Order.Status.PENDING_PAYMENT)
        .select_related('user')
        .annotate(item_count=Sum('items__qty'))[:5]
    )
    return [
        {
            'id': o.id,
            'customer': o.ship_name,
            'email': o.user.email,
            'items': o.item_count or 0,
            'total': o.total,
            'status': o.status,
            'status_label': o.get_status_display(),
            'created_at': o.created_at,
        }
        for o in orders
    ]


@api_view(['GET'])
@permission_classes([IsAdminRole])  # customers and staff get 403 Forbidden
def admin_dashboard(request):
    low_stock = (
        ProductVariant.objects.filter(stock__gt=0, stock__lte=LOW_STOCK_LIMIT)
        .select_related('product')
        .order_by('stock', 'product__name')[:10]
    )
    by_category = Category.objects.annotate(product_count=Count('products')).order_by('-product_count')

    return Response({
        'stats': {
            'products': Product.objects.count(),
            'categories': Category.objects.count(),
            'variants': ProductVariant.objects.count(),
            'in_stock': ProductVariant.objects.filter(stock__gt=LOW_STOCK_LIMIT).count(),
            'out_of_stock': ProductVariant.objects.filter(stock=0).count(),
            'low_stock': ProductVariant.objects.filter(stock__gt=0, stock__lte=LOW_STOCK_LIMIT).count(),
            'customers': User.objects.filter(role=User.Role.CUSTOMER).count(),
            'staff': User.objects.filter(role=User.Role.STAFF).count(),
            'orders': Order.objects.exclude(status=Order.Status.PENDING_PAYMENT).count(),
            'revenue': Order.objects.filter(payment_status=Order.PaymentStatus.PAID)
            .aggregate(total=Sum('total'))['total'] or 0,
            'to_ship': Order.objects.filter(status__in=[Order.Status.PLACED, Order.Status.PACKED]).count(),
        },
        'sales': sales_last_7_days(),
        'recent_orders': recent_orders(),
        'categories': [
            {'name': c.name, 'slug': c.slug, 'products': c.product_count} for c in by_category
        ],
        'low_stock_items': [
            {
                'sku': v.sku,
                'product': v.product.name,
                'size': v.size,
                'color': v.color,
                'stock': v.stock,
            }
            for v in low_stock
        ],
    })
