"""Super admin only: create and manage stores and their store admins."""
from django.db.models import Count
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from accounts.permissions import IsSuperAdmin

from .models import Store
from .serializers import StoreAdminCreateSerializer, StoreSerializer


def stores_with_counts():
    return Store.objects.annotate(
        product_count=Count('products', distinct=True), order_count=Count('orders', distinct=True),
    ).prefetch_related('members')


class StoreList(generics.ListCreateAPIView):
    """GET / POST /api/manage/stores/"""

    serializer_class = StoreSerializer
    permission_classes = [IsSuperAdmin]
    pagination_class = None

    def get_queryset(self):
        return stores_with_counts()


class StoreDetail(generics.RetrieveUpdateAPIView):
    """GET / PATCH /api/manage/stores/<id>/  (no delete: deactivate a store instead – orders must stay)"""

    serializer_class = StoreSerializer
    permission_classes = [IsSuperAdmin]

    def get_queryset(self):
        return stores_with_counts()


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def add_store_admin(request, pk):
    """POST /api/manage/stores/<id>/admins/  { name, email, password }"""
    store = get_object_or_404(Store, pk=pk)
    serializer = StoreAdminCreateSerializer(data=request.data, context={'store': store})
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    return Response({'id': user.id, 'name': user.first_name, 'email': user.email, 'role': user.role},
                    status=status.HTTP_201_CREATED)
