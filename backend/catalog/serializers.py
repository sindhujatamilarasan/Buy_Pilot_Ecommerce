# Serializers turn model objects into JSON for React (and check incoming data).
from rest_framework import serializers

from .models import Category, Product, ProductImage, ProductVariant


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug']


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'path']


class ProductVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = ['id', 'size', 'color', 'sku', 'price', 'stock']


class ProductListSerializer(serializers.ModelSerializer):
    """Small version for the product grid."""

    category = CategorySerializer(read_only=True)
    image = serializers.SerializerMethodField()
    # min_price and total_stock are calculated in the view's queryset (annotate)
    min_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total_stock = serializers.IntegerField(read_only=True)

    class Meta:
        model = Product
        fields = ['id', 'name', 'slug', 'category', 'rating', 'image', 'min_price', 'total_stock']

    def get_image(self, product):
        first = product.images.first()
        return first.path if first else None


class ProductDetailSerializer(ProductListSerializer):
    """Full version for the product page: all images + all variants."""

    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)

    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + ['description', 'images', 'variants']
