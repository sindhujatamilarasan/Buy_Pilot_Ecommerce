from decimal import Decimal, InvalidOperation

from django.db.models import Min, Sum
from django.shortcuts import get_object_or_404
from rest_framework import filters, generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Category, Product, WishlistItem
from .serializers import CategorySerializer, ProductDetailSerializer, ProductListSerializer


def product_queryset():
    """Active products + their lowest price and total stock (calculated by the database)."""
    return (
        Product.objects.filter(is_active=True)
        .select_related('category')
        .prefetch_related('images')
        .annotate(min_price=Min('variants__price'), total_stock=Sum('variants__stock'))
    )


class CategoryList(generics.ListAPIView):
    """GET /api/categories/ – anyone can see categories."""

    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]
    pagination_class = None


def to_decimal(value):
    """'499' → Decimal('499'); empty or invalid text → None (the filter is then ignored)."""
    try:
        return Decimal(value) if value not in (None, '') else None
    except InvalidOperation:
        return None


class ProductList(generics.ListAPIView):
    """GET /api/products/?search=mug&category=books&min_price=500&max_price=5000&min_rating=4
    &ordering=min_price&page=2"""

    serializer_class = ProductListSerializer
    permission_classes = [AllowAny]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['min_price', 'rating', 'name', 'created_at']

    def get_queryset(self):
        queryset = product_queryset()
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category__slug=category)

        # Price range uses the product's LOWEST variant price ("from ₹…")
        params = self.request.query_params
        min_price, max_price = to_decimal(params.get('min_price')), to_decimal(params.get('max_price'))
        min_rating = to_decimal(params.get('min_rating'))
        if min_price is not None:
            queryset = queryset.filter(min_price__gte=min_price)
        if max_price is not None:
            queryset = queryset.filter(min_price__lte=max_price)
        if min_rating is not None:
            queryset = queryset.filter(rating__gte=min_rating)
        return queryset


class ProductDetail(generics.RetrieveAPIView):
    """GET /api/products/<slug>/"""

    serializer_class = ProductDetailSerializer
    permission_classes = [AllowAny]
    lookup_field = 'slug'

    def get_queryset(self):
        return product_queryset().prefetch_related('variants')


# ---------- Wishlist (login needed) ----------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def wishlist(request):
    """GET /api/wishlist/ → my saved products.   POST { product_id } → save one."""
    if request.method == 'POST':
        product = get_object_or_404(Product, pk=request.data.get('product_id'), is_active=True)
        _, created = WishlistItem.objects.get_or_create(user=request.user, product=product)
        return Response({'product_id': product.id}, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    ids = request.user.wishlist_items.values_list('product_id', flat=True)
    products = product_queryset().filter(id__in=ids)
    # Keep "most recently saved first" (the order of the wishlist rows)
    order = {product_id: index for index, product_id in enumerate(ids)}
    products = sorted(products, key=lambda p: order[p.id])
    return Response(ProductListSerializer(products, many=True).data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def wishlist_remove(request, product_id):
    """DELETE /api/wishlist/<product_id>/ → un-save (no error if it was not saved)."""
    request.user.wishlist_items.filter(product_id=product_id).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
