from .models import Coupon, CouponUsage


def validate_coupon(code, subtotal, user=None):
    """Return (coupon, None) if it can be used, or (None, 'reason') if not.

    Rules: exists + active, not expired, minimum order reached, not used before by this user.
    """
    try:
        coupon = Coupon.objects.get(code=code.strip().upper())
    except Coupon.DoesNotExist:
        return None, 'This coupon code does not exist.'

    if not coupon.is_active:
        return None, 'This coupon is not active.'
    if coupon.is_expired:
        return None, 'This coupon has expired.'
    if subtotal < coupon.min_order:
        return None, f'Add items worth ₹{coupon.min_order - subtotal:.0f} more to use this coupon (minimum ₹{coupon.min_order:.0f}).'
    if user is not None and user.is_authenticated and CouponUsage.objects.filter(coupon=coupon, user=user).exists():
        return None, 'You have already used this coupon.'
    return coupon, None
