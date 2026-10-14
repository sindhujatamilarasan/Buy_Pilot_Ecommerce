"""Admin panel APIs. Every view checks the role on the SERVER (hiding buttons in React is not security)."""
import uuid
from pathlib import Path

from django.core.files.storage import default_storage
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from accounts.models import User
from accounts.permissions import IsAdminRole, IsStaffOrAdmin
from catalog.models import Product
from coupons.models import Coupon
from orders.models import Order
from orders.serializers import OrderSerializer
from orders.services import advance_status, cancel_order

from .serializers import CouponSerializer, ProductAdminSerializer, UserAdminSerializer

ALLOWED_IMAGE_TYPES = {'.jpg', '.jpeg', '.png', '.webp'}
MAX_IMAGE_SIZE = 3 * 1024 * 1024  # 3 MB


# ---------- Products (admin) ----------
class ProductAdminList(generics.ListCreateAPIView):
    serializer_class = ProductAdminSerializer
    permission_classes = [IsAdminRole]

    def get_queryset(self):
        queryset = Product.objects.select_related('category').prefetch_related('variants', 'images').order_by('-id')
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(Q(name__icontains=search) | Q(variants__sku__icontains=search)).distinct()
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category__slug=category)
        return queryset


class ProductAdminDetail(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProductAdminSerializer
    permission_classes = [IsAdminRole]
    queryset = Product.objects.prefetch_related('variants', 'images')


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


# ---------- Coupons (admin) ----------
class CouponList(generics.ListCreateAPIView):
    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer
    permission_classes = [IsAdminRole]
    pagination_class = None


class CouponDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer
    permission_classes = [IsAdminRole]


# ---------- Orders (staff + admin) ----------
class OrderManageList(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsStaffOrAdmin]

    def get_queryset(self):
        queryset = Order.objects.select_related('user').prefetch_related('items', 'logs')
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
    order = get_object_or_404(Order, pk=pk)
    if not advance_status(order, request.user):
        return Response({'detail': 'This order cannot move to a next status.'}, status=status.HTTP_400_BAD_REQUEST)
    return Response(OrderSerializer(order, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([IsAdminRole])
def order_cancel(request, pk):
    order = get_object_or_404(Order, pk=pk)
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
        queryset = User.objects.order_by('-date_joined')
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(Q(email__icontains=search) | Q(first_name__icontains=search))
        return queryset


@api_view(['PATCH'])
@permission_classes([IsAdminRole])
def update_user_role(request, pk):
    user = get_object_or_404(User, pk=pk)
    if user == request.user:
        return Response({'detail': 'You cannot change your own role.'}, status=status.HTTP_400_BAD_REQUEST)
    role = request.data.get('role')
    if role not in User.Role.values:
        return Response({'detail': 'Unknown role.'}, status=status.HTTP_400_BAD_REQUEST)
    user.role = role
    user.save(update_fields=['role'])
    return Response(UserAdminSerializer(user).data)
