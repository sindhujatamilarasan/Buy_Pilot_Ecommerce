"""Admin panel APIs. Every view checks the role on the SERVER (hiding buttons in React is not security)."""
import uuid
from pathlib import Path

from django.core.files.storage import default_storage
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from accounts.models import User
from accounts.permissions import STORE_TEAM_ROLES, IsAdminRole, IsStaffOrAdmin, IsSuperAdmin, for_my_store
from catalog.models import Category, Product
from coupons.models import Coupon
from orders.models import Order
from orders.serializers import OrderSerializer
from orders.services import advance_status, cancel_order
from stores.models import Store
from stores.serializers import StoreAdminCreateSerializer

from .reports import ALLOWED_DAYS, sales_report
from .serializers import CategoryAdminSerializer, CouponSerializer, ProductAdminSerializer, UserAdminSerializer

ALLOWED_IMAGE_TYPES = {'.jpg', '.jpeg', '.png', '.webp'}
MAX_IMAGE_SIZE = 3 * 1024 * 1024  # 3 MB


# ---------- Products (admin) ----------
class ProductAdminList(generics.ListCreateAPIView):
    serializer_class = ProductAdminSerializer
    permission_classes = [IsAdminRole]

    def get_queryset(self):
        queryset = Product.objects.select_related('category', 'store').prefetch_related('variants', 'images').order_by('-id')
        queryset = for_my_store(queryset, self.request.user)  # a store admin only sees their own products
        store = self.request.query_params.get('store')  # super admin can filter by store
        if store:
            queryset = queryset.filter(store__slug=store)
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(Q(name__icontains=search) | Q(variants__sku__icontains=search)).distinct()
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category__slug=category)
        return queryset

    def perform_create(self, serializer):
        serializer.save(store=product_store(self.request, serializer))


class ProductAdminDetail(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProductAdminSerializer
    permission_classes = [IsAdminRole]

    def get_queryset(self):
        # Another store's product → 404, as if it did not exist
        return for_my_store(Product.objects.prefetch_related('variants', 'images'), self.request.user)

    def perform_update(self, serializer):
        serializer.save(store=product_store(self.request, serializer, serializer.instance.store))


def product_store(request, serializer, current=None):
    """Store admins always save into THEIR store; only the super admin may choose (or move) the store."""
    if request.user.role != 'superadmin':
        return request.user.store
    chosen = serializer.validated_data.get('store') or current
    if chosen is None:
        raise ValidationError({'store': 'Choose which store this product belongs to.'})
    return chosen


@api_view(['POST'])
@permission_classes([IsAdminRole])
@parser_classes([MultiPartParser])
def upload_image(request):
    """Save an uploaded product photo in backend/media/products/ (local storage)."""
    file = request.FILES.get('file')
    if not file:
        return Response({'detail': 'Choose an image file.'}, status=status.HTTP_400_BAD_REQUEST)
    extension = Path(file.name).suffix.lower()
    if extension not in ALLOWED_IMAGE_TYPES:
        return Response({'detail': 'Only JPG, PNG or WEBP images are allowed.'}, status=status.HTTP_400_BAD_REQUEST)
    if file.size > MAX_IMAGE_SIZE:
        return Response({'detail': 'Image must be smaller than 3 MB.'}, status=status.HTTP_400_BAD_REQUEST)

    saved = default_storage.save(f'products/{uuid.uuid4().hex}{extension}', file)
    path = default_storage.url(saved)  # "/media/products/abc.jpg"
    path = path if path.startswith('/') else f'/{path}'
    return Response({'path': path, 'url': request.build_absolute_uri(path)}, status=status.HTTP_201_CREATED)


# ---------- Categories (shared by all stores) ----------
categories_with_count = Category.objects.annotate(product_count=Count('products')).order_by('name')  # annotate drops Meta.ordering


class CategoryAdminList(generics.ListCreateAPIView):
    """Store admins may ADD a category (e.g. from the product form) when none fits."""
    queryset = categories_with_count
    serializer_class = CategoryAdminSerializer
    permission_classes = [IsAdminRole]
    pagination_class = None


class CategoryAdminDetail(generics.RetrieveUpdateDestroyAPIView):
    """Only the super admin renames or deletes (it changes the shop for every store)."""
    queryset = categories_with_count
    serializer_class = CategoryAdminSerializer
    permission_classes = [IsSuperAdmin]

    def perform_destroy(self, category):
        if category.product_count:  # on_delete=PROTECT would crash; explain instead
            raise ValidationError({'detail': f'"{category.name}" still has {category.product_count} products. Move them to another category first.'})
        category.delete()


# ---------- Coupons (super admin: shop-wide offers) ----------
class CouponList(generics.ListCreateAPIView):
    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer
    permission_classes = [IsSuperAdmin]
    pagination_class = None


class CouponDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer
    permission_classes = [IsSuperAdmin]


# ---------- Orders (staff + admin) ----------
class OrderManageList(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsStaffOrAdmin]

    def get_queryset(self):
        queryset = Order.objects.select_related('user', 'store').prefetch_related('items', 'logs')
        queryset = for_my_store(queryset, self.request.user)  # staff / store admin: only their store's orders
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        search = self.request.query_params.get('search', '').strip().lstrip('#')
        if search:
            queryset = queryset.filter(Q(user__email__icontains=search) | Q(ship_name__icontains=search)
                                       | Q(id=int(search) if search.isdigit() else 0))
        return queryset


@api_view(['POST'])
@permission_classes([IsStaffOrAdmin])
def order_next_status(request, pk):
    """Staff and admin: move the order one step forward (placed → packed → shipped → delivered)."""
    order = get_object_or_404(for_my_store(Order.objects.all(), request.user), pk=pk)
    if not advance_status(order, request.user):
        return Response({'detail': 'This order cannot move to a next status.'}, status=status.HTTP_400_BAD_REQUEST)
    return Response(OrderSerializer(order, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([IsAdminRole])
def order_cancel(request, pk):
    order = get_object_or_404(for_my_store(Order.objects.all(), request.user), pk=pk)
    if not cancel_order(order, request.user, 'Cancelled by admin'):
        return Response({'detail': 'Only orders that are not shipped yet can be cancelled.'},
                        status=status.HTTP_400_BAD_REQUEST)
    order.refresh_from_db()
    return Response(OrderSerializer(order, context={'request': request}).data)


# ---------- Users (admin) ----------
class UserList(generics.ListAPIView):
    serializer_class = UserAdminSerializer
    permission_classes = [IsAdminRole]

    def get_queryset(self):
        queryset = User.objects.select_related('store').order_by('-date_joined')
        me = self.request.user
        if me.role != 'superadmin':
            # A store admin sees customers + the staff of THEIR store (not other stores' people or admins)
            queryset = queryset.filter(Q(role=User.Role.CUSTOMER) | Q(role__in=STORE_TEAM_ROLES, store=me.store_id))
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(Q(email__icontains=search) | Q(first_name__icontains=search))
        return queryset


@api_view(['POST'])
@permission_classes([IsAdminRole])
def add_staff(request):
    """POST /api/manage/staff/ { name, email, password, role? } → a NEW staff or warehouse-manager login.

    role = 'staff' (default) or 'warehouse'.

    Staff are always new accounts: a shopper's customer account is never turned into staff.
    The super admin also sends { store: id }.
    """
    me = request.user
    store = me.store if me.role != 'superadmin' else get_object_or_404(Store, pk=request.data.get('store'))
    role = request.data.get('role') or User.Role.STAFF
    if role not in STORE_TEAM_ROLES:
        return Response({'detail': 'Choose staff or warehouse manager.'}, status=status.HTTP_400_BAD_REQUEST)
    warehouse = None
    if role == User.Role.WAREHOUSE and request.data.get('warehouse'):
        # Tie the manager to ONE warehouse of the store (e.g. Chennai). Empty = all warehouses of the store.
        warehouse = get_object_or_404(store.warehouses.filter(is_active=True), pk=request.data['warehouse'])
    serializer = StoreAdminCreateSerializer(data=request.data, context={'store': store, 'role': role, 'warehouse': warehouse})
    serializer.is_valid(raise_exception=True)
    return Response(UserAdminSerializer(serializer.save()).data, status=status.HTTP_201_CREATED)


@api_view(['PATCH'])
@permission_classes([IsAdminRole])
def update_user_role(request, pk):
    user = get_object_or_404(User, pk=pk)
    if user == request.user:
        return Response({'detail': 'You cannot change your own role.'}, status=status.HTTP_400_BAD_REQUEST)
    if user.role == User.Role.CUSTOMER:
        return Response({'detail': 'Customer accounts cannot become staff or admins. Create a new staff account instead.'},
                        status=status.HTTP_400_BAD_REQUEST)
    role = request.data.get('role')
    me = request.user

    if me.role == 'superadmin':
        # admin ⇄ staff (with a store), or remove access (→ customer)
        if role not in (User.Role.CUSTOMER, User.Role.ADMIN, *STORE_TEAM_ROLES) or user.role == User.Role.SUPERADMIN:
            return Response({'detail': 'This role change is not allowed.'}, status=status.HTTP_400_BAD_REQUEST)
        store = get_object_or_404(Store, pk=request.data.get('store')) if role != User.Role.CUSTOMER else None
    else:
        # Store admin: can only REMOVE staff / warehouse-manager access, and only in their own store
        if role != User.Role.CUSTOMER or user.role not in STORE_TEAM_ROLES or user.store_id != me.store_id:
            return Response({'detail': 'Store admins can only remove staff or warehouse-manager access in their own store.'},
                            status=status.HTTP_403_FORBIDDEN)
        store = None

    user.role, user.store, user.warehouse = role, store, None
    user.save(update_fields=['role', 'store', 'warehouse'])
    return Response(UserAdminSerializer(user).data)


@api_view(['PATCH'])
@permission_classes([IsAdminRole])
def set_manager_warehouse(request, pk):
    """PATCH /api/manage/users/<id>/warehouse/ { warehouse: id | null } → move a warehouse manager to another location."""
    manager = get_object_or_404(User, pk=pk, role=User.Role.WAREHOUSE)
    if request.user.role != 'superadmin' and manager.store_id != request.user.store_id:
        return Response({'detail': 'This manager belongs to another store.'}, status=status.HTTP_403_FORBIDDEN)
    warehouse_id = request.data.get('warehouse')
    manager.warehouse = get_object_or_404(manager.store.warehouses.filter(is_active=True), pk=warehouse_id) if warehouse_id else None
    manager.save(update_fields=['warehouse'])
    return Response(UserAdminSerializer(manager).data)


# ---------- Reports (admin) ----------
@api_view(['GET'])
@permission_classes([IsAdminRole])
def sales_report_view(request):
    """GET /api/manage/reports/sales/?days=7|30|90"""
    try:
        days = int(request.query_params.get('days', 30))
    except ValueError:
        days = 30
    if days not in ALLOWED_DAYS:
        days = 30
    store = None if request.user.role == 'superadmin' else request.user.store
    return Response(sales_report(days, store))
