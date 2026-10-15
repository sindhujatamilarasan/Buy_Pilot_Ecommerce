from django.conf import settings
from django.db import models

from catalog.models import ProductVariant


class Cart(models.Model):
    """The saved cart of a LOGGED-IN user (guests keep their cart in localStorage)."""

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='cart')
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Cart of {self.user}'


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE, related_name='cart_items')
    qty = models.PositiveIntegerField(default=1)
    saved_for_later = models.BooleanField(default=False)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['added_at']
        constraints = [
            # One row per variant – adding again increases qty instead
            models.UniqueConstraint(fields=['cart', 'variant'], name='unique_cart_variant'),
        ]
