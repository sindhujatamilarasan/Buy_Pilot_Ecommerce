"""Stock operations: goods receipts, adjustments and transfers.

Approval rule: a warehouse manager's adjustment or transfer waits for a store admin
(or the super admin) to approve it. An admin's own request is approved straight away.
"""
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from accounts.permissions import IsAdminRole, IsWarehouseTeam, for_my_store
from catalog.models import ProductVariant

from . import services
from .models import GoodsReceipt, StockAdjustment, StockTransfer, Warehouse
from .serializers import (
    AdjustmentInput, AdjustmentSerializer, ReceiptInput, ReceiptSerializer, TransferInput, TransferSerializer,
)


def my_warehouse(user, pk):
    """A warehouse of MY store (another store's warehouse → 404) that is still active."""
    warehouse = get_object_or_404(for_my_store(Warehouse.objects.all(), user), pk=pk)
    if not warehouse.is_active:
        raise ValidationError({'detail': f'{warehouse.name} is inactive.'})
    return warehouse


def variants_of(warehouse, lines):
    """[{variant: id, qty}] → [(variant, qty)], only products of the warehouse's store."""
    ids = [line['variant'] for line in lines]
    found = ProductVariant.objects.select_related('product').in_bulk(ids)
    result = []
    for line in lines:
        variant = found.get(line['variant'])
        if variant is None or variant.product.store_id != warehouse.store_id:
            raise ValidationError({'lines': 'One of the products does not belong to this store.'})
        result.append((variant, line['qty']))
    return result


def run(action, *args):
    """Call a service; turn StockError into a friendly 400."""
    try:
        return action(*args)
    except services.StockError as error:
        raise ValidationError({'detail': str(error)})


def with_status(queryset, request):
    wanted = request.query_params.get('status')
    return queryset.filter(status=wanted) if wanted else queryset


# ---------- Goods receipts ----------

class ReceiptList(generics.ListCreateAPIView):
    serializer_class = ReceiptSerializer
    permission_classes = [IsWarehouseTeam]

    def get_queryset(self):
        return for_my_store(GoodsReceipt.objects.select_related('warehouse', 'received_by').prefetch_related('lines'),
                            self.request.user, field='warehouse__store')

    def create(self, request, *args, **kwargs):
        data = ReceiptInput(data=request.data)
        data.is_valid(raise_exception=True)
        d = data.validated_data
        warehouse = my_warehouse(request.user, d['warehouse'])
        receipt = run(services.receive_goods, warehouse, variants_of(warehouse, d['lines']), d['supplier'],
                      d.get('reference', ''), d.get('note', ''), request.user)
        return Response(ReceiptSerializer(receipt).data, status=status.HTTP_201_CREATED)


# ---------- Adjustments ----------

class AdjustmentList(generics.ListCreateAPIView):
    serializer_class = AdjustmentSerializer
    permission_classes = [IsWarehouseTeam]

    def get_queryset(self):
        rows = StockAdjustment.objects.select_related('warehouse', 'variant__product', 'requested_by', 'decided_by')
        return with_status(for_my_store(rows, self.request.user, field='warehouse__store'), self.request)

    def create(self, request, *args, **kwargs):
        data = AdjustmentInput(data=request.data)
        data.is_valid(raise_exception=True)
        d = data.validated_data
        warehouse = my_warehouse(request.user, d['warehouse'])
        (variant, _), = variants_of(warehouse, [{'variant': d['variant'], 'qty': 1}])
        adjustment = run(services.request_adjustment, warehouse, variant, d['change'], d['reason'],
                         d.get('note', ''), request.user)
        adjustment.refresh_from_db()
        return Response(AdjustmentSerializer(adjustment).data, status=status.HTTP_201_CREATED)


def my_adjustment(request, pk):
    return get_object_or_404(for_my_store(StockAdjustment.objects.all(), request.user, field='warehouse__store'), pk=pk)


@api_view(['POST'])
@permission_classes([IsAdminRole])  # a warehouse manager cannot approve their own request
def approve_adjustment(request, pk):
    adjustment = run(services.approve_adjustment, my_adjustment(request, pk), request.user)
    return Response(AdjustmentSerializer(adjustment).data)


@api_view(['POST'])
@permission_classes([IsAdminRole])
def reject_adjustment(request, pk):
    adjustment = my_adjustment(request, pk)
    run(services.reject_adjustment, adjustment, request.user)
    adjustment.refresh_from_db()
    return Response(AdjustmentSerializer(adjustment).data)


# ---------- Transfers ----------

class TransferList(generics.ListCreateAPIView):
    serializer_class = TransferSerializer
    permission_classes = [IsWarehouseTeam]

    def get_queryset(self):
        rows = StockTransfer.objects.select_related('from_warehouse', 'to_warehouse', 'requested_by', 'approved_by') \
            .prefetch_related('lines__variant__product')
        return with_status(for_my_store(rows, self.request.user, field='from_warehouse__store'), self.request)

    def create(self, request, *args, **kwargs):
        data = TransferInput(data=request.data)
        data.is_valid(raise_exception=True)
        d = data.validated_data
        source, target = my_warehouse(request.user, d['from_warehouse']), my_warehouse(request.user, d['to_warehouse'])
        if source.store_id != target.store_id:
            raise ValidationError({'detail': 'Transfers are between warehouses of the same store.'})
        transfer = run(services.request_transfer, source, target, variants_of(source, d['lines']),
                       d.get('note', ''), request.user)
        return Response(TransferSerializer(transfer).data, status=status.HTTP_201_CREATED)


def transfer_action(action):
    """POST /api/inventory/transfers/<id>/<action>/ → run the service, return the updated transfer."""
    def view(request, pk):
        transfer = get_object_or_404(for_my_store(StockTransfer.objects.all(), request.user,
                                                  field='from_warehouse__store'), pk=pk)
        run(action, transfer, request.user)
        transfer.refresh_from_db()
        return Response(TransferSerializer(transfer).data)
    return view


approve_transfer = api_view(['POST'])(permission_classes([IsAdminRole])(transfer_action(services.approve_transfer)))
reject_transfer = api_view(['POST'])(permission_classes([IsAdminRole])(transfer_action(services.reject_transfer)))
dispatch_transfer = api_view(['POST'])(permission_classes([IsWarehouseTeam])(transfer_action(services.dispatch_transfer)))
receive_transfer = api_view(['POST'])(permission_classes([IsWarehouseTeam])(transfer_action(services.receive_transfer)))
cancel_transfer = api_view(['POST'])(permission_classes([IsWarehouseTeam])(transfer_action(services.cancel_transfer)))
