"""Inventory APIs: warehouses, stock levels, stock history, overview, CSV export, pick lists.

Who: warehouse managers, store admins (their store) and the super admin (all stores).
Creating / editing warehouses is for store admins and the super admin only.
"""
import csv
from datetime import date

from django.db.models import Count, F, Q, Sum
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from accounts.permissions import ADMIN_ROLES, IsFulfilmentTeam, IsWarehouseTeam, for_my_store, for_my_warehouse, my_warehouse_id
from catalog.models import ProductVariant
from orders.models import Order
from stores.models import Store

from .models import OrderAllocation, StockAdjustment, StockMovement, StockTransfer, Warehouse, WarehouseStock
from .serializers import MovementSerializer, StockRowSerializer, VariantPickSerializer, WarehouseSerializer
from .services import ensure_store_stock


def my_store(user):
    return None if user.role == 'superadmin' else user.store


def my_transfers(queryset, user):
    """A tied warehouse manager sees transfers going out of OR into their warehouse."""
    warehouse_id = my_warehouse_id(user)
    return queryset.filter(Q(from_warehouse=warehouse_id) | Q(to_warehouse=warehouse_id)) if warehouse_id else queryset


def warehouses_with_numbers(user):
    low = Q(stock__quantity__lte=F('stock__reorder_level'))
    mine = for_my_warehouse(Warehouse.objects.select_related('store'), user, field='pk')  # a Chennai manager sees only Chennai
    return for_my_store(mine, user).annotate(
        units=Sum('stock__quantity', default=0),
        skus=Count('stock', filter=Q(stock__quantity__gt=0)),
        low=Count('stock', filter=low),
    )


# ---------- Warehouses ----------

class WarehouseList(generics.ListCreateAPIView):
    serializer_class = WarehouseSerializer
    permission_classes = [IsWarehouseTeam]
    pagination_class = None

    def get_queryset(self):
        ensure_store_stock(my_store(self.request.user))  # first visit: stores get their "Main warehouse"
        return warehouses_with_numbers(self.request.user)

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in ADMIN_ROLES:
            raise ValidationError({'detail': 'Only a store admin can add warehouses.'})
        store = user.store if user.role != 'superadmin' else get_object_or_404(Store, pk=self.request.data.get('store'))
        if store.warehouses.filter(code=serializer.validated_data['code']).exists():
            raise ValidationError({'code': 'This code is already used in this store.'})
        first = not store.warehouses.exists()
        warehouse = serializer.save(store=store, is_default=serializer.validated_data.get('is_default') or first)
        if warehouse.is_default:
            store.warehouses.exclude(pk=warehouse.pk).update(is_default=False)


class WarehouseDetail(generics.RetrieveUpdateAPIView):
    serializer_class = WarehouseSerializer
    permission_classes = [IsWarehouseTeam]

    def get_queryset(self):
        return warehouses_with_numbers(self.request.user)

    def perform_update(self, serializer):
        warehouse, data = serializer.instance, serializer.validated_data
        if self.request.user.role not in ADMIN_ROLES:
            raise ValidationError({'detail': 'Only a store admin can edit warehouses.'})
        if data.get('is_active') is False:
            if warehouse.is_default or data.get('is_default'):
                raise ValidationError({'detail': 'Make another warehouse the default first.'})
            if warehouse.units:
                raise ValidationError({'detail': f'Move the {warehouse.units} items out of this warehouse first.'})
        if warehouse.is_default and data.get('is_default') is False:
            raise ValidationError({'detail': 'Choose another warehouse as the default instead.'})
        saved = serializer.save()
        if saved.is_default:
            saved.store.warehouses.exclude(pk=saved.pk).update(is_default=False)


# ---------- Stock levels ----------

def stock_rows(request):
    user, params = request.user, request.query_params
    ensure_store_stock(my_store(user))
    rows = for_my_warehouse(for_my_store(WarehouseStock.objects.select_related('warehouse', 'variant__product'), user,
                                         field='warehouse__store'), user).order_by('variant__product__name', 'variant__sku', 'warehouse__name')
    if params.get('warehouse'):
        rows = rows.filter(warehouse_id=params['warehouse'])
    if params.get('search'):
        rows = rows.filter(Q(variant__sku__icontains=params['search']) | Q(variant__product__name__icontains=params['search']))
    if params.get('low') == '1':
        rows = rows.filter(quantity__lte=F('reorder_level'))
    return rows


class StockList(generics.ListAPIView):
    serializer_class = StockRowSerializer
    permission_classes = [IsWarehouseTeam]

    def get_queryset(self):
        return stock_rows(self.request)


class StockDetail(generics.UpdateAPIView):
    """PATCH reorder level / bin location (quantity changes only through receipts, adjustments, transfers)."""

    serializer_class = StockRowSerializer
    permission_classes = [IsWarehouseTeam]

    def get_queryset(self):
        return for_my_warehouse(for_my_store(WarehouseStock.objects.all(), self.request.user, field='warehouse__store'),
                                self.request.user)


@api_view(['GET'])
@permission_classes([IsWarehouseTeam])
def variant_search(request):
    """GET /api/inventory/variants/?search=… → variants of my store with stock per warehouse (for forms)."""
    user = request.user
    ensure_store_stock(my_store(user))
    variants = for_my_store(ProductVariant.objects.select_related('product').prefetch_related('warehouse_stock'),
                            user, field='product__store')
    search = request.query_params.get('search', '').strip()
    if search:
        variants = variants.filter(Q(sku__icontains=search) | Q(product__name__icontains=search))
    return Response(VariantPickSerializer(variants.order_by('product__name', 'sku')[:20], many=True).data)


# ---------- Stock history ----------

def movement_rows(request):
    user, params = request.user, request.query_params
    rows = for_my_warehouse(for_my_store(StockMovement.objects.select_related('warehouse', 'variant__product', 'created_by'),
                                         user, field='warehouse__store'), user)
    if params.get('warehouse'):
        rows = rows.filter(warehouse_id=params['warehouse'])
    if params.get('kind'):
        rows = rows.filter(kind=params['kind'])
    if params.get('search'):
        term = params['search']
        rows = rows.filter(Q(variant__sku__icontains=term) | Q(variant__product__name__icontains=term)
                           | Q(reference__icontains=term))
    if params.get('from'):
        rows = rows.filter(created_at__date__gte=params['from'])
    if params.get('to'):
        rows = rows.filter(created_at__date__lte=params['to'])
    return rows


class MovementList(generics.ListAPIView):
    serializer_class = MovementSerializer
    permission_classes = [IsWarehouseTeam]

    def get_queryset(self):
        return movement_rows(self.request)


# ---------- Overview ----------

@api_view(['GET'])
@permission_classes([IsWarehouseTeam])
def overview(request):
    user = request.user
    ensure_store_stock(my_store(user))
    rows = for_my_warehouse(for_my_store(WarehouseStock.objects.filter(warehouse__is_active=True), user,
                                         field='warehouse__store'), user)
    adjustments = for_my_warehouse(for_my_store(StockAdjustment.objects.all(), user, field='warehouse__store'), user)
    transfers = my_transfers(for_my_store(StockTransfer.objects.all(), user, field='from_warehouse__store'), user)
    low = rows.filter(quantity__lte=F('reorder_level')).select_related('warehouse', 'variant__product')
    return Response({
        'stats': {
            'warehouses': for_my_warehouse(for_my_store(Warehouse.objects.filter(is_active=True), user), user, field='pk').count(),
            'units': rows.aggregate(total=Sum('quantity', default=0))['total'],
            'skus': rows.filter(quantity__gt=0).values('variant').distinct().count(),
            'low': low.filter(quantity__gt=0).count(),
            'out': rows.filter(quantity=0).count(),
            'pending_adjustments': adjustments.filter(status='pending').count(),
            'pending_transfers': transfers.filter(status=StockTransfer.Status.REQUESTED).count(),
            'ready_to_dispatch': transfers.filter(status=StockTransfer.Status.APPROVED).count(),
            'in_transit': transfers.filter(status=StockTransfer.Status.IN_TRANSIT).count(),
        },
        'low_stock': StockRowSerializer(low.order_by('quantity', 'variant__product__name')[:10], many=True).data,
    })


# ---------- CSV export ----------

def csv_response(name, header, rows):
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="{name}-{date.today():%Y-%m-%d}.csv"'
    response.write('﻿')  # BOM → Excel shows ₹ and other characters correctly
    writer = csv.writer(response)
    writer.writerow(header)
    writer.writerows(rows)
    return response


@api_view(['GET'])
@permission_classes([IsWarehouseTeam])
def export_stock(request):
    rows = stock_rows(request)
    return csv_response('stock-levels', ['Warehouse', 'SKU', 'Product', 'Variant', 'Quantity', 'Reorder level', 'Bin', 'Low stock'], (
        [r.warehouse.name, r.variant.sku, r.variant.product.name,
         ' · '.join(filter(None, [r.variant.color, r.variant.size])) or 'Standard',
         r.quantity, r.reorder_level, r.bin_location, 'Yes' if r.quantity <= r.reorder_level else 'No']
        for r in rows))


@api_view(['GET'])
@permission_classes([IsWarehouseTeam])
def export_movements(request):
    rows = movement_rows(request)[:20000]
    return csv_response('stock-movements', ['Date', 'Warehouse', 'SKU', 'Product', 'Type', 'Change', 'Balance after', 'Reference', 'Note', 'By'], (
        [m.created_at.strftime('%Y-%m-%d %H:%M'), m.warehouse.name, m.variant.sku, m.variant.product.name,
         m.get_kind_display(), m.change, m.balance_after, m.reference, m.note,
         m.created_by.first_name if m.created_by else 'System']
        for m in rows))


# ---------- Pick list (fulfilment) ----------

@api_view(['GET'])
@permission_classes([IsFulfilmentTeam])
def pick_list(request, order_id):
    """Which warehouse and shelf to pick each item of a paid order from."""
    order = get_object_or_404(for_my_store(Order.objects.select_related('store'), request.user), pk=order_id)
    mine = my_warehouse_id(request.user)
    if mine and not OrderAllocation.objects.filter(item__order=order, warehouse_id=mine).exists():
        return Response({'detail': 'This order is packed from another warehouse.'}, status=status.HTTP_404_NOT_FOUND)
    bins = {(s.warehouse_id, s.variant_id): s.bin_location
            for s in WarehouseStock.objects.filter(variant__in=order.items.values('variant'))}
    items = []
    for item in order.items.prefetch_related('allocations__warehouse'):
        allocations = [a for a in item.allocations.all() if not mine or a.warehouse_id == mine]
        if mine and not allocations:
            continue  # this line is picked in another warehouse
        items.append({
            'product': item.product_name, 'variant': item.variant_label or 'Standard', 'qty': item.qty,
            'sku': item.variant.sku if item.variant_id else '',
            'picks': [{'warehouse': a.warehouse.name, 'code': a.warehouse.code, 'qty': a.qty,
                       'bin': bins.get((a.warehouse_id, item.variant_id), '')} for a in allocations],
        })
    if order.status == Order.Status.PENDING_PAYMENT:
        return Response({'detail': 'This order is not paid yet.'}, status=status.HTTP_400_BAD_REQUEST)
    return Response({
        'order': order.id, 'status': order.status, 'status_label': order.get_status_display(),
        'store': order.store.name, 'created_at': order.created_at,
        'ship_to': {'name': order.ship_name, 'phone': order.ship_phone, 'address': order.ship_address,
                    'city': order.ship_city, 'pincode': order.ship_pincode},
        'items': items,
    })



@api_view(['GET'])
@permission_classes([IsWarehouseTeam])
def orders_to_pick(request):
    """Paid orders not yet shipped that take stock from MY warehouse(s): what to pick and pack next (oldest first)."""
    rows = for_my_warehouse(for_my_store(
        OrderAllocation.objects.filter(item__order__status__in=[Order.Status.PLACED, Order.Status.PACKED])
        .select_related('warehouse', 'item__order'), request.user, field='warehouse__store'), request.user)
    orders = {}
    for row in rows.order_by('item__order__created_at', 'item__order_id'):
        order = row.item.order
        entry = orders.setdefault(order.id, {
            'order': order.id, 'created_at': order.created_at, 'status': order.status, 'status_label': order.get_status_display(),
            'city': order.ship_city, 'pincode': order.ship_pincode, 'warehouses': set(), 'units': 0})
        entry['warehouses'].add(row.warehouse.name)
        entry['units'] += row.qty
    return Response([{**entry, 'warehouses': sorted(entry['warehouses'])} for entry in list(orders.values())[:100]])
