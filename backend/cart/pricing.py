"""Price rules – the ONE place where money is calculated.

The frontend shows the same numbers for speed, but at checkout this backend
version is the truth (users can change anything in their browser).

Order of calculation (from the project rules):
    subtotal → discount → tax (GST %) → shipping (free above ₹500) → total
"""
from decimal import ROUND_HALF_UP, Decimal

GST_PERCENT = Decimal('18')
FREE_SHIPPING_MIN = Decimal('500')
SHIPPING_FEE = Decimal('49')


def money(value):
    """Round to paise: 179.825 → 179.83"""
    return Decimal(value).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def calculate_summary(subtotal, discount=Decimal('0')):
    subtotal = money(subtotal)
    discount = money(min(discount, subtotal))  # a discount can never be more than the subtotal
    taxable = subtotal - discount
    tax = money(taxable * GST_PERCENT / 100)
    # Empty cart → no shipping. Otherwise free when the amount after discount is ₹500 or more.
    shipping = Decimal('0') if taxable == 0 or taxable >= FREE_SHIPPING_MIN else SHIPPING_FEE
    total = money(taxable + tax + shipping)

    return {
        'subtotal': subtotal,
        'discount': discount,
        'tax': tax,
        'tax_percent': GST_PERCENT,
        'shipping': money(shipping),
        'total': total,
        'free_shipping_min': FREE_SHIPPING_MIN,
    }
