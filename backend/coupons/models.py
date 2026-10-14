from django.conf import settings
from django.db import models
from django.utils import timezone

from cart.pricing import money


class Coupon(models.Model):
    class Type(models.TextChoices):
        FLAT = 'flat', 'Flat amount (₹)'
        PERCENT = 'percent', 'Percentage (%)'

    code = models.CharField(max_length=30, unique=True)  # always saved in CAPITALS
    type = models.CharField(max_length=10, choices=Type.choices)
    value = models.DecimalField(max_digits=10, decimal_places=2)
    min_order = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        self.code = self.code.strip().upper()
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        return self.expires_at is not None and self.expires_at < timezone.now()

    def discount_for(self, subtotal):
        if self.type == self.Type.PERCENT:
            return money(subtotal * self.value / 100)
        return money(min(self.value, subtotal))

    def __str__(self):
        return self.code


class CouponUsage(models.Model):
    """One row per (coupon, user) → the database itself blocks a second use."""

    coupon = models.ForeignKey(Coupon, on_delete=models.CASCADE, related_name='usages')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    order = models.OneToOneField('orders.Order', on_delete=models.CASCADE, related_name='coupon_usage')
    used_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['coupon', 'user'], name='one_use_per_user')]
