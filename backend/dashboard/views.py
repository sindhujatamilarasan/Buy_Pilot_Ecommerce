from datetime import timedelta

from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from accounts.models import User
from accounts.permissions import IsAdminRole, for_my_store
from catalog.models import Category, Product, ProductVariant
from orders.models import Order

LOW_STOCK_LIMIT = 2  # 1–2 left = "low stock"


def sales_last_7_days(orders):
    """Paid revenue + order count per day for the last 7 days (days with no sales = 0)."""
    today = timezone.localdate()
    start = today - timedelta(days=6)
    rows = (
        orders.filter(payment_status=Order.PaymentStatus.PAID, created_at__date__gte=start)
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


def recent_orders(orders):
    latest = (
        orders.exclude(status=Order.Status.PENDING_PAYMENT)
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
        for o in latest
    ]


@api_view(['GET'])
@permission_classes([IsAdminRole])  # customers and staff get 403 Forbidden
def admin_dashboard(request):
    user = request.user
    # Everything below is limited to the admin's own store (the super admin sees all stores)
    products = for_my_store(Product.objects.all(), user)
    variants = for_my_store(ProductVariant.objects.all(), user, field='product__store')
    orders = for_my_store(Order.objects.all(), user)
    store_filter = {} if user.role == 'superadmin' else {'products__store': user.store_id}

    low_stock = variants.filter(stock__gt=0, stock__lte=LOW_STOCK_LIMIT).select_related('product').order_by('stock', 'product__name')[:10]
    by_category = Category.objects.annotate(product_count=Count('products', filter=Q(**store_filter))).order_by('-product_count')
    customers = User.objects.filter(role=User.Role.CUSTOMER)
    if user.role != 'superadmin':
        customers = customers.filter(orders__store=user.store_id).distinct()  # people who bought from this store

    return Response({
        'store': user.store.name if user.store_id else 'All stores',
        'stats': {
            'products': products.count(),
            'categories': by_category.filter(product_count__gt=0).count(),
            'variants': variants.count(),
            'in_stock': variants.filter(stock__gt=LOW_STOCK_LIMIT).count(),
            'out_of_stock': variants.filter(stock=0).count(),
            'low_stock': variants.filter(stock__gt=0, stock__lte=LOW_STOCK_LIMIT).count(),
            'customers': customers.count(),
            'staff': for_my_store(User.objects.filter(role=User.Role.STAFF), user).count(),
            'orders': orders.exclude(status=Order.Status.PENDING_PAYMENT).count(),
            'revenue': orders.filter(payment_status=Order.PaymentStatus.PAID).aggregate(total=Sum('total'))['total'] or 0,
            'to_ship': orders.filter(status__in=[Order.Status.PLACED, Order.Status.PACKED]).count(),
        },
        'sales': sales_last_7_days(orders),
        'recent_orders': recent_orders(orders),
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
