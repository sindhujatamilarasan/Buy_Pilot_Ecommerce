from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from accounts.models import User
from accounts.permissions import IsAdminRole
from catalog.models import Category, Product, ProductVariant

LOW_STOCK_LIMIT = 2  # 1–2 left = "low stock"


@api_view(['GET'])
@permission_classes([IsAdminRole])  # customers and staff get 403 Forbidden
def admin_dashboard(request):
    low_stock = (
        ProductVariant.objects.filter(stock__gt=0, stock__lte=LOW_STOCK_LIMIT)
        .select_related('product')
        .order_by('stock', 'product__name')[:10]
    )
    return Response({
        'stats': {
            'products': Product.objects.count(),
            'categories': Category.objects.count(),
            'variants': ProductVariant.objects.count(),
            'out_of_stock': ProductVariant.objects.filter(stock=0).count(),
            'low_stock': ProductVariant.objects.filter(stock__gt=0, stock__lte=LOW_STOCK_LIMIT).count(),
            'customers': User.objects.filter(role=User.Role.CUSTOMER).count(),
            'staff': User.objects.filter(role=User.Role.STAFF).count(),
        },
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
