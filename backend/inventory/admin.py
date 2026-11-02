from django.contrib import admin

from .models import GoodsReceipt, StockAdjustment, StockMovement, StockTransfer, Warehouse, WarehouseStock


@admin.register(Warehouse)
class WarehouseAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'store', 'city', 'is_default', 'is_active')
    list_filter = ('store', 'is_active')


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'warehouse', 'variant', 'kind', 'change', 'balance_after', 'reference')
    list_filter = ('kind', 'warehouse')


admin.site.register([WarehouseStock, GoodsReceipt, StockAdjustment, StockTransfer])
