"""The ONLY place where stock changes.

Every change goes through apply_change(): it updates the warehouse quantity, the variant's
total (ProductVariant.stock – what the shop shows) and writes a StockMovement, inside one
database transaction. A decrease only succeeds while enough stock is left (conditional
UPDATE), so stock can never go below 0 – even when two requests run at the same moment.
"""
from django.db import IntegrityError, transaction
from django.db.models import F
from django.utils import timezone

from catalog.models import ProductVariant

from .models import (
    Approval, GoodsReceipt, GoodsReceiptLine, OrderAllocation, StockAdjustment, StockMovement, StockTransfer,
    StockTransferLine, Warehouse, WarehouseStock,
)

Kind = StockMovement.Kind
ADMIN_ROLES = ('admin', 'superadmin')


class StockError(Exception):
    """Not enough stock, or an action that is not allowed in the current status."""


# ---------- Warehouses ----------

def default_warehouse(store):
    """The store's default warehouse. A store that has none gets a "Main warehouse" (first use)."""
    found = store.warehouses.filter(is_active=True).order_by('-is_default', 'id').first()
    if found:
        return found
    try:
        with transaction.atomic():
            return Warehouse.objects.create(store=store, name='Main warehouse', code='MAIN', is_default=True)
    except IntegrityError:  # created at the same moment by another request
        return store.warehouses.get(code='MAIN')


def ensure_stock_rows(variant_ids):
    """Variants that have stock but no warehouse rows yet (seed data, products created before
    warehouses existed) get their stock placed in their store's default warehouse."""
    missing = (ProductVariant.objects.filter(id__in=variant_ids, warehouse_stock__isnull=True)
               .select_related('product__store'))
    defaults = {}
    for variant in missing:
        store = variant.product.store
        warehouse = defaults.setdefault(store.id, default_warehouse(store))
        try:
            with transaction.atomic():
                WarehouseStock.objects.create(warehouse=warehouse, variant=variant, quantity=variant.stock)
                if variant.stock:
                    StockMovement.objects.create(warehouse=warehouse, variant=variant, kind=Kind.OPENING,
                                                 change=variant.stock, balance_after=variant.stock,
                                                 reference='Opening stock')
        except IntegrityError:
            pass  # another request created it first


def ensure_store_stock(store=None):
    """ensure_stock_rows() for every variant of one store (or all stores)."""
    variants = ProductVariant.objects.filter(warehouse_stock__isnull=True)
    if store is not None:
        variants = variants.filter(product__store=store)
    ensure_stock_rows(list(variants.values_list('id', flat=True)))


@transaction.atomic
def apply_change(warehouse_id, variant_id, change, kind, *, reference='', note='', user=None):
    """Add (change > 0) or remove (change < 0) stock in one warehouse. Raises StockError if not enough."""
    if change == 0:
        return
    row, _ = WarehouseStock.objects.get_or_create(warehouse_id=warehouse_id, variant_id=variant_id)
    rows = WarehouseStock.objects.filter(pk=row.pk)
    totals = ProductVariant.objects.filter(pk=variant_id)
    if change < 0:  # only when enough is left – the database checks and updates in one step
        rows, totals = rows.filter(quantity__gte=-change), totals.filter(stock__gte=-change)
    if not rows.update(quantity=F('quantity') + change) or not totals.update(stock=F('stock') + change):
        raise StockError('Not enough stock in this warehouse.')
    row.refresh_from_db()
    StockMovement.objects.create(warehouse_id=warehouse_id, variant_id=variant_id, kind=kind, change=change,
                                 balance_after=row.quantity, reference=reference, note=note, created_by=user)


def add_opening_stock(variant, qty, user=None):
    """Stock typed in when a NEW variant is created in the product form → the store's default warehouse."""
    warehouse = default_warehouse(variant.product.store)
    WarehouseStock.objects.get_or_create(warehouse=warehouse, variant=variant)
    if qty:
        ProductVariant.objects.filter(pk=variant.pk).update(stock=0)  # apply_change adds it back with a movement
        apply_change(warehouse.id, variant.id, qty, Kind.OPENING, reference='Opening stock', user=user)


# ---------- Orders ----------

def allocate_order_item(item, order):
    """Take the stock for one paid order line. Automatic: the warehouse in the customer's city first, then the
    default one; if no single warehouse has enough, the line is split over several. Raises StockError if the store runs out."""
    ensure_stock_rows([item.variant_id])
    rows = list(WarehouseStock.objects.select_for_update(of=('self',)).select_related('warehouse')
                .filter(variant_id=item.variant_id, quantity__gt=0, warehouse__is_active=True,
                        warehouse__store_id=order.store_id))
    # Closest first: the warehouse in the customer's city, then the default one, then the fullest
    city = (order.ship_city or '').strip().lower()
    rows.sort(key=lambda r: (not (city and r.warehouse.city.strip().lower() == city),
                             not r.warehouse.is_default, -r.quantity, r.warehouse_id))
    whole = next((r for r in rows if r.quantity >= item.qty), None)
    plan, left = ([(whole.warehouse_id, item.qty)], 0) if whole else ([], item.qty)
    for row in ([] if whole else rows):
        take = min(row.quantity, left)
        if take:
            plan.append((row.warehouse_id, take))
            left -= take
    if left:
        raise StockError(f'{item.product_name} is sold out.')
    for warehouse_id, qty in plan:
        apply_change(warehouse_id, item.variant_id, -qty, Kind.SALE, reference=f'Order #{order.id}')
        OrderAllocation.objects.create(item=item, warehouse_id=warehouse_id, qty=qty)


def return_order_item(item, order, user=None):
    """Cancelled order → stock goes back to the warehouse(s) it came from."""
    if not item.variant_id:
        return  # the product was deleted
    allocations = list(item.allocations.all())
    if not allocations:  # paid before warehouses existed → default warehouse
        ensure_stock_rows([item.variant_id])
        allocations = [OrderAllocation(warehouse=default_warehouse(order.store), qty=item.qty)]
    for allocation in allocations:
        apply_change(allocation.warehouse.id, item.variant_id, allocation.qty, Kind.RETURN,
                     reference=f'Order #{order.id}', note='Order cancelled', user=user)


# ---------- Goods receipts ----------

@transaction.atomic
def receive_goods(warehouse, lines, supplier, reference='', note='', user=None):
    """lines = [(variant, qty), …] → stock goes UP in that warehouse."""
    receipt = GoodsReceipt.objects.create(warehouse=warehouse, supplier=supplier, reference=reference,
                                          note=note, received_by=user)
    for variant, qty in lines:
        GoodsReceiptLine.objects.create(receipt=receipt, variant=variant, sku=variant.sku,
                                        product_name=variant.product.name, qty=qty)
        ensure_stock_rows([variant.id])
        apply_change(warehouse.id, variant.id, qty, Kind.RECEIPT, reference=receipt.number,
                     note=f'From {supplier}', user=user)
    return receipt


# ---------- Adjustments (approval for warehouse managers) ----------

@transaction.atomic  # an admin's adjustment that fails (not enough stock) must not stay behind as "pending"
def request_adjustment(warehouse, variant, change, reason, note, user):
    adjustment = StockAdjustment.objects.create(warehouse=warehouse, variant=variant, change=change,
                                                reason=reason, note=note, requested_by=user)
    if user.role in ADMIN_ROLES:  # an admin's own adjustment needs no second person
        approve_adjustment(adjustment, user)
    return adjustment


@transaction.atomic
def approve_adjustment(adjustment, user):
    adjustment = StockAdjustment.objects.select_for_update().get(pk=adjustment.pk)
    if adjustment.status != Approval.PENDING:
        raise StockError('This adjustment was already decided.')
    ensure_stock_rows([adjustment.variant_id])
    apply_change(adjustment.warehouse_id, adjustment.variant_id, adjustment.change, Kind.ADJUSTMENT,
                 reference=f'ADJ-{adjustment.id:05d}',
                 note=f'{adjustment.get_reason_display()}: {adjustment.note}'.rstrip(': '), user=user)
    adjustment.status, adjustment.decided_by, adjustment.decided_at = Approval.APPROVED, user, timezone.now()
    adjustment.save()
    return adjustment


def reject_adjustment(adjustment, user):
    updated = StockAdjustment.objects.filter(pk=adjustment.pk, status=Approval.PENDING).update(
        status=Approval.REJECTED, decided_by=user, decided_at=timezone.now())
    if not updated:
        raise StockError('This adjustment was already decided.')


# ---------- Transfers: requested → approved → in transit → received ----------

@transaction.atomic
def request_transfer(from_warehouse, to_warehouse, lines, note, user):
    if from_warehouse.id == to_warehouse.id:
        raise StockError('Choose two different warehouses.')
    transfer = StockTransfer.objects.create(from_warehouse=from_warehouse, to_warehouse=to_warehouse,
                                            note=note, requested_by=user)
    StockTransferLine.objects.bulk_create(StockTransferLine(transfer=transfer, variant=v, qty=q) for v, q in lines)
    if user.role in ADMIN_ROLES:
        transfer.status, transfer.approved_by, transfer.approved_at = StockTransfer.Status.APPROVED, user, timezone.now()
        transfer.save()
    return transfer


def _move_status(transfer, allowed_from, new_status, **fields):
    updated = StockTransfer.objects.filter(pk=transfer.pk, status__in=allowed_from).update(status=new_status, **fields)
    if not updated:
        raise StockError('This transfer cannot do that in its current status.')


def approve_transfer(transfer, user):
    _move_status(transfer, [StockTransfer.Status.REQUESTED], StockTransfer.Status.APPROVED,
                 approved_by=user, approved_at=timezone.now())


def reject_transfer(transfer, user):
    _move_status(transfer, [StockTransfer.Status.REQUESTED], StockTransfer.Status.REJECTED,
                 approved_by=user, approved_at=timezone.now())


def cancel_transfer(transfer, user):
    _move_status(transfer, [StockTransfer.Status.REQUESTED, StockTransfer.Status.APPROVED],
                 StockTransfer.Status.CANCELLED)


@transaction.atomic
def dispatch_transfer(transfer, user):
    """Stock LEAVES the source warehouse (it is not sellable while in transit)."""
    _move_status(transfer, [StockTransfer.Status.APPROVED], StockTransfer.Status.IN_TRANSIT, dispatched_at=timezone.now())
    for line in transfer.lines.all():
        ensure_stock_rows([line.variant_id])
        apply_change(transfer.from_warehouse_id, line.variant_id, -line.qty, Kind.TRANSFER_OUT,
                     reference=transfer.number, note=f'To {transfer.to_warehouse.name}', user=user)


@transaction.atomic
def receive_transfer(transfer, user):
    """Stock ARRIVES in the destination warehouse."""
    _move_status(transfer, [StockTransfer.Status.IN_TRANSIT], StockTransfer.Status.RECEIVED, received_at=timezone.now())
    for line in transfer.lines.all():
        apply_change(transfer.to_warehouse_id, line.variant_id, line.qty, Kind.TRANSFER_IN,
                     reference=transfer.number, note=f'From {transfer.from_warehouse.name}', user=user)
