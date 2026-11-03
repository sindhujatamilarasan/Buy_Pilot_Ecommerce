from rest_framework import serializers

from catalog.models import ProductVariant

from .models import GoodsReceipt, StockAdjustment, StockMovement, StockTransfer, Warehouse, WarehouseStock


def variant_label(variant):
    return ' · '.join(filter(None, [variant.color, variant.size])) or 'Standard'


class WarehouseSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source='store.name', read_only=True)
    units = serializers.IntegerField(read_only=True)  # annotated in the view
    skus = serializers.IntegerField(read_only=True)
    low = serializers.IntegerField(read_only=True)

    class Meta:
        model = Warehouse
        fields = ['id', 'store', 'store_name', 'name', 'code', 'city', 'address', 'is_default', 'is_active',
                  'units', 'skus', 'low']
        read_only_fields = ['store']

    def validate_code(self, value):
        return value.strip().upper()


class StockRowSerializer(serializers.ModelSerializer):
    """One variant in one warehouse (Stock page)."""

    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    sku = serializers.CharField(source='variant.sku', read_only=True)
    product = serializers.CharField(source='variant.product.name', read_only=True)
    variant_label = serializers.SerializerMethodField()
    is_low = serializers.SerializerMethodField()

    class Meta:
        model = WarehouseStock
        fields = ['id', 'warehouse', 'warehouse_name', 'variant', 'sku', 'product', 'variant_label',
                  'quantity', 'reorder_level', 'bin_location', 'is_low']
        read_only_fields = ['warehouse', 'variant', 'quantity']  # quantity changes only through operations

    def get_variant_label(self, row):
        return variant_label(row.variant)

    def get_is_low(self, row):
        return row.quantity <= row.reorder_level


class MovementSerializer(serializers.ModelSerializer):
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    sku = serializers.CharField(source='variant.sku', read_only=True)
    product = serializers.CharField(source='variant.product.name', read_only=True)
    kind_label = serializers.CharField(source='get_kind_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.first_name', default='System', read_only=True)

    class Meta:
        model = StockMovement
        fields = ['id', 'created_at', 'warehouse_name', 'sku', 'product', 'kind', 'kind_label', 'change',
                  'balance_after', 'reference', 'note', 'created_by_name']


class VariantPickSerializer(serializers.ModelSerializer):
    """Variant search for receipt / adjustment / transfer forms."""

    product = serializers.CharField(source='product.name', read_only=True)
    label = serializers.SerializerMethodField()
    warehouses = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = ['id', 'sku', 'product', 'label', 'stock', 'warehouses']

    def get_label(self, variant):
        return variant_label(variant)

    def get_warehouses(self, variant):
        return {row.warehouse_id: row.quantity for row in variant.warehouse_stock.all()}


# ---------- Operations (input) ----------

class NewProductInput(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    category = serializers.IntegerField()
    price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=1)
    sku = serializers.CharField(max_length=64, required=False, allow_blank=True)
    size = serializers.CharField(max_length=20, required=False, allow_blank=True)
    color = serializers.CharField(max_length=30, required=False, allow_blank=True)



class LineInput(serializers.Serializer):
    variant = serializers.IntegerField()
    qty = serializers.IntegerField(min_value=1, max_value=100000)


class ReceiptInput(serializers.Serializer):
    warehouse = serializers.IntegerField()
    supplier = serializers.CharField(max_length=100)
    reference = serializers.CharField(max_length=40, required=False, allow_blank=True)
    note = serializers.CharField(max_length=200, required=False, allow_blank=True)
    lines = LineInput(many=True, min_length=1, max_length=100)


class AdjustmentInput(serializers.Serializer):
    warehouse = serializers.IntegerField()
    variant = serializers.IntegerField()
    change = serializers.IntegerField(min_value=-100000, max_value=100000)
    reason = serializers.ChoiceField(choices=StockAdjustment.Reason.choices)
    note = serializers.CharField(max_length=200, required=False, allow_blank=True)

    def validate_change(self, value):
        if value == 0:
            raise serializers.ValidationError('Enter a number of items to add (+) or remove (−).')
        return value


class TransferInput(serializers.Serializer):
    from_warehouse = serializers.IntegerField()
    to_warehouse = serializers.IntegerField()
    note = serializers.CharField(max_length=200, required=False, allow_blank=True)
    lines = LineInput(many=True, min_length=1, max_length=100)


# ---------- Operations (output) ----------

class ReceiptSerializer(serializers.ModelSerializer):
    number = serializers.CharField(read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    received_by_name = serializers.CharField(source='received_by.first_name', default='', read_only=True)
    lines = serializers.SerializerMethodField()

    class Meta:
        model = GoodsReceipt
        fields = ['id', 'number', 'warehouse', 'warehouse_name', 'supplier', 'reference', 'note',
                  'received_by_name', 'created_at', 'lines']

    def get_lines(self, receipt):
        return [{'sku': line.sku, 'product': line.product_name, 'qty': line.qty} for line in receipt.lines.all()]


class AdjustmentSerializer(serializers.ModelSerializer):
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    sku = serializers.CharField(source='variant.sku', read_only=True)
    product = serializers.CharField(source='variant.product.name', read_only=True)
    reason_label = serializers.CharField(source='get_reason_display', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    requested_by_name = serializers.CharField(source='requested_by.first_name', default='', read_only=True)
    decided_by_name = serializers.CharField(source='decided_by.first_name', default='', read_only=True)

    class Meta:
        model = StockAdjustment
        fields = ['id', 'warehouse', 'warehouse_name', 'variant', 'sku', 'product', 'change', 'reason',
                  'reason_label', 'note', 'status', 'status_label', 'requested_by_name', 'decided_by_name',
                  'created_at', 'decided_at']


class TransferSerializer(serializers.ModelSerializer):
    number = serializers.CharField(read_only=True)
    from_name = serializers.CharField(source='from_warehouse.name', read_only=True)
    to_name = serializers.CharField(source='to_warehouse.name', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    requested_by_name = serializers.CharField(source='requested_by.first_name', default='', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.first_name', default='', read_only=True)
    lines = serializers.SerializerMethodField()

    class Meta:
        model = StockTransfer
        fields = ['id', 'number', 'from_warehouse', 'from_name', 'to_warehouse', 'to_name', 'status',
                  'status_label', 'note', 'requested_by_name', 'approved_by_name', 'created_at', 'approved_at',
                  'dispatched_at', 'received_at', 'lines']

    def get_lines(self, transfer):
        return [{'sku': line.variant.sku, 'product': line.variant.product.name,
                 'label': variant_label(line.variant), 'qty': line.qty}
                for line in transfer.lines.all()]
