from django.contrib import admin

from .models import Address, Order, OrderItem, OrderStatusLog, Payment


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'total', 'status', 'payment_status', 'created_at')
    list_filter = ('status', 'payment_status')
    inlines = [OrderItemInline]


admin.site.register([Address, OrderStatusLog, Payment])
