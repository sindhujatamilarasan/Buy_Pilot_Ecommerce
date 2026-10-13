from decimal import Decimal

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from catalog.models import ProductVariant

from .pricing import calculate_summary, money
from .serializers import QuoteSerializer


@api_view(['POST'])
@permission_classes([AllowAny])  # guests can check their cart too
def quote(request):
    """POST /api/cart/quote/  { "items": [{ "variant_id": 5, "qty": 2 }] }

    Recalculates the cart from the DATABASE prices – the frontend only sends ids and quantities,
    never prices. Also reports stock problems.
    """
    serializer = QuoteSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    items = serializer.validated_data['items']

    variants = ProductVariant.objects.select_related('product').in_bulk(
        [item['variant_id'] for item in items]
    )

    lines, problems = [], []
    subtotal = Decimal('0')

    for item in items:
        variant = variants.get(item['variant_id'])
        if variant is None or not variant.product.is_active:
            problems.append({'variant_id': item['variant_id'], 'code': 'not_found',
                             'message': 'This product is no longer available.'})
            continue
        if variant.stock == 0:
            problems.append({'variant_id': variant.id, 'code': 'out_of_stock',
                             'message': f'{variant.product.name} is out of stock.'})
            continue
        if item['qty'] > variant.stock:
            problems.append({'variant_id': variant.id, 'code': 'exceeds_stock', 'available': variant.stock,
                             'message': f'Only {variant.stock} left of {variant.product.name}.'})
            continue

        line_total = money(variant.price * item['qty'])
        subtotal += line_total
        lines.append({
            'variant_id': variant.id,
            'name': variant.product.name,
            'price': variant.price,
            'qty': item['qty'],
            'line_total': line_total,
            'stock': variant.stock,
        })

    return Response({'lines': lines, 'problems': problems, 'summary': calculate_summary(subtotal)})
