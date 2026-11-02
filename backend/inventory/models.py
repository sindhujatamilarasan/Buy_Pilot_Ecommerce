"""Warehouses and stock.

ProductVariant.stock stays the TOTAL of all warehouses (the shop, cart and checkout read it).
Only inventory/services.py changes stock: it updates WarehouseStock, the variant total and
writes a StockMovement in the same database transaction.
"""
from django.conf import settings
from django.db import models


class Warehouse(models.Model):
    store = models.ForeignKey('stores.Store', on_delete=models.PROTECT, related_name='warehouses')
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=12)  # short label, e.g. "CHN-1"
    city = models.CharField(max_length=60, blank=True)
    address = models.CharField(max_length=200, blank=True)
    is_default = models.BooleanField(default=False)  # sales take stock from here first
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-is_default', 'name']
        constraints = [models.UniqueConstraint(fields=['store', 'code'], name='unique_warehouse_code_per_store')]

    def __str__(self):
        return f'{self.name} ({self.code})'


class WarehouseStock(models.Model):
    """How many of ONE variant are in ONE warehouse."""

    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='stock')
    variant = models.ForeignKey('catalog.ProductVariant', on_delete=models.CASCADE, related_name='warehouse_stock')
    quantity = models.PositiveIntegerField(default=0)
    reorder_level = models.PositiveIntegerField(default=2)  # at or below this → "low stock" alert
    bin_location = models.CharField(max_length=20, blank=True)  # shelf, e.g. "A-03"

    class Meta:
        constraints = [models.UniqueConstraint(fields=['warehouse', 'variant'], name='one_stock_row_per_warehouse')]


class StockMovement(models.Model):
    """Every stock change, so nothing changes silently (the stock ledger)."""

    class Kind(models.TextChoices):
        OPENING = 'opening', 'Opening stock'
        RECEIPT = 'receipt', 'Goods receipt'
        SALE = 'sale', 'Sale'
        RETURN = 'return', 'Order cancelled'
        ADJUSTMENT = 'adjustment', 'Adjustment'
        TRANSFER_OUT = 'transfer_out', 'Transfer out'
        TRANSFER_IN = 'transfer_in', 'Transfer in'

    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='movements')
    variant = models.ForeignKey('catalog.ProductVariant', on_delete=models.CASCADE, related_name='movements')
    kind = models.CharField(max_length=20, choices=Kind.choices)
    change = models.IntegerField()  # + in, − out
    balance_after = models.PositiveIntegerField()  # warehouse quantity after this change
    reference = models.CharField(max_length=40, blank=True)  # "Order #12", "GR-00003", "T-00002"
    note = models.CharField(max_length=200, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at', '-id']


class OrderAllocation(models.Model):
    """Which warehouse an order line was taken from (used for the pick list and for cancel)."""

    item = models.ForeignKey('orders.OrderItem', on_delete=models.CASCADE, related_name='allocations')
    warehouse = models.ForeignKey(Warehouse, on_delete=models.PROTECT, related_name='allocations')
    qty = models.PositiveIntegerField()


class GoodsReceipt(models.Model):
    """New stock arriving from a supplier."""

    warehouse = models.ForeignKey(Warehouse, on_delete=models.PROTECT, related_name='receipts')
    supplier = models.CharField(max_length=100)
    reference = models.CharField(max_length=40, blank=True)  # supplier invoice / delivery note
    note = models.CharField(max_length=200, blank=True)
    received_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    @property
    def number(self):
        return f'GR-{self.id:05d}'


class GoodsReceiptLine(models.Model):
    receipt = models.ForeignKey(GoodsReceipt, on_delete=models.CASCADE, related_name='lines')
    variant = models.ForeignKey('catalog.ProductVariant', on_delete=models.SET_NULL, null=True)
    sku = models.CharField(max_length=64)  # copied: the receipt stays readable if the product is deleted
    product_name = models.CharField(max_length=200)
    qty = models.PositiveIntegerField()


class Approval(models.TextChoices):
    PENDING = 'pending', 'Waiting for approval'
    APPROVED = 'approved', 'Approved'
    REJECTED = 'rejected', 'Rejected'


class StockAdjustment(models.Model):
    """Damaged / lost / found items or a stock-count correction. Warehouse managers' requests need approval."""

    class Reason(models.TextChoices):
        DAMAGED = 'damaged', 'Damaged'
        LOST = 'lost', 'Lost / missing'
        FOUND = 'found', 'Found'
        COUNT = 'count', 'Stock-count correction'
        OTHER = 'other', 'Other'

    warehouse = models.ForeignKey(Warehouse, on_delete=models.PROTECT, related_name='adjustments')
    variant = models.ForeignKey('catalog.ProductVariant', on_delete=models.CASCADE, related_name='adjustments')
    change = models.IntegerField()  # + adds stock, − removes stock (never 0)
    reason = models.CharField(max_length=10, choices=Reason.choices)
    note = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=10, choices=Approval.choices, default=Approval.PENDING)
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='+')
    decided_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)
    decided_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']


class StockTransfer(models.Model):
    """Move stock between two warehouses of the same store: requested → approved → in transit → received."""

    class Status(models.TextChoices):
        REQUESTED = 'requested', 'Waiting for approval'
        APPROVED = 'approved', 'Approved – ready to dispatch'
        REJECTED = 'rejected', 'Rejected'
        IN_TRANSIT = 'in_transit', 'In transit'
        RECEIVED = 'received', 'Received'
        CANCELLED = 'cancelled', 'Cancelled'

    from_warehouse = models.ForeignKey(Warehouse, on_delete=models.PROTECT, related_name='transfers_out')
    to_warehouse = models.ForeignKey(Warehouse, on_delete=models.PROTECT, related_name='transfers_in')
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.REQUESTED)
    note = models.CharField(max_length=200, blank=True)
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='+')
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    dispatched_at = models.DateTimeField(null=True, blank=True)
    received_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    @property
    def number(self):
        return f'T-{self.id:05d}'


class StockTransferLine(models.Model):
    transfer = models.ForeignKey(StockTransfer, on_delete=models.CASCADE, related_name='lines')
    variant = models.ForeignKey('catalog.ProductVariant', on_delete=models.CASCADE)
    qty = models.PositiveIntegerField()
