"""Saved carts for logged-in users: load, replace and merge (guest cart → account cart)."""
from django.db import transaction

from catalog.models import ProductVariant

from .models import Cart, CartItem


def cart_payload(user):
    """The cart in the SAME shape the React cart uses, so it can replace the local cart directly."""
    cart, _ = Cart.objects.get_or_create(user=user)
    items = cart.items.select_related('variant__product').prefetch_related('variant__product__images')
    payload = []
    for item in items:
        variant = item.variant
        images = variant.product.images.all()[:1]
        payload.append({
            'variantId': variant.id,
            'slug': variant.product.slug,
            'name': variant.product.name,
            'image': images[0].path if images else '',
            'size': variant.size,
            'color': variant.color,
            'price': float(variant.price),
            'stock': variant.stock,
            'qty': item.qty,
            'savedForLater': item.saved_for_later,
        })
    return {'items': payload}


def _buyable_variants(items):
    """Only variants that exist, are active and have stock (others are dropped)."""
    ids = [item['variant_id'] for item in items]
    return {
        v.id: v
        for v in ProductVariant.objects.filter(id__in=ids, product__is_active=True, stock__gt=0)
    }


@transaction.atomic
def replace_cart(user, items):
    """Make the saved cart exactly match `items` (used on every change while logged in)."""
    cart, _ = Cart.objects.get_or_create(user=user)
    variants = _buyable_variants(items)
    cart.items.all().delete()
    CartItem.objects.bulk_create(
        CartItem(cart=cart, variant=variants[item['variant_id']],
                 qty=min(item['qty'], variants[item['variant_id']].stock),  # never more than stock
                 saved_for_later=item['saved_for_later'])
        for item in items if item['variant_id'] in variants
    )
    return cart_payload(user)


@transaction.atomic
def merge_cart(user, guest_items):
    """After login: ADD the guest cart into the account cart.

    Same variant in both → quantities are added, but capped at the stock.
    """
    cart, _ = Cart.objects.get_or_create(user=user)
    variants = _buyable_variants(guest_items)
    existing = {item.variant_id: item for item in cart.items.select_for_update()}

    for guest in guest_items:
        variant = variants.get(guest['variant_id'])
        if variant is None:
            continue
        item = existing.get(variant.id)
        if item:
            item.qty = min(item.qty + guest['qty'], variant.stock)
            item.saved_for_later = item.saved_for_later and guest['saved_for_later']
            item.save()
        else:
            existing[variant.id] = CartItem.objects.create(
                cart=cart, variant=variant, qty=min(guest['qty'], variant.stock),
                saved_for_later=guest['saved_for_later'],
            )
    return cart_payload(user)
