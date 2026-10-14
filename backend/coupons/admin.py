from django.contrib import admin

from .models import Coupon, CouponUsage


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ('code', 'type', 'value', 'min_order', 'expires_at', 'is_active')


admin.site.register(CouponUsage)
