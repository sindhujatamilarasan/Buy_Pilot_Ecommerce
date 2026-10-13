from django.db.models import Min, Sum
from rest_framework import filters, generics
from rest_framework.permissions import AllowAny

from .models import Category, Product
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


class ProductList(generics.ListAPIView):
    """GET /api/products/?search=mug&category=books&ordering=min_price&page=2"""

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
        return queryset


class ProductDetail(generics.RetrieveAPIView):
    """GET /api/products/<slug>/"""

    serializer_class = ProductDetailSerializer
    permission_classes = [AllowAny]
    lookup_field = 'slug'

    def get_queryset(self):
        return product_queryset().prefetch_related('variants')
