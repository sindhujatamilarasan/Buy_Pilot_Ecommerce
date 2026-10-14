"""Build a price quote from the DATABASE. Used by the cart quote API and by order creation."""
from decimal import Decimal

from catalog.models import ProductVariant
from coupons.services import validate_coupon

from .pricing import calculate_summary, money


def build_quote(items, coupon_code='', user=None):
    """items = [{'variant_id': 5, 'qty': 2}, …] – only ids and quantities, never prices."""
    variants = ProductVariant.objects.select_related('product').prefetch_related('product__images').in_bulk(
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
        first_image = variant.product.images.all()[:1]
        lines.append({
            'variant_id': variant.id,
            'variant': variant,
            'name': variant.product.name,
            'variant_label': ' · '.join(filter(None, [variant.color, variant.size])),
            'image': first_image[0].path if first_image else '',
            'price': variant.price,
            'qty': item['qty'],
            'line_total': line_total,
            'stock': variant.stock,
        })

    coupon, coupon_error, discount = None, None, Decimal('0')
    if coupon_code:
        coupon, coupon_error = validate_coupon(coupon_code, subtotal, user)
        if coupon:
            discount = coupon.discount_for(subtotal)

    return {
        'lines': lines,
        'problems': problems,
        'coupon': coupon,
        'coupon_error': coupon_error,
        'summary': calculate_summary(subtotal, discount),
    }
