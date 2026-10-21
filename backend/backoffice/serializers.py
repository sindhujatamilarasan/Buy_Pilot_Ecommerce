"""Serializers for the admin panel (they can WRITE products, coupons, roles…)."""
from django.db.models import Sum
from django.utils.text import slugify
from rest_framework import serializers

from accounts.models import User
from catalog.models import Category, Product, ProductImage, ProductVariant
from catalog.utils import absolute_media
from coupons.models import Coupon
from stores.models import Store


class CategoryAdminSerializer(serializers.ModelSerializer):
    """Add (store admin + super admin) or rename (super admin) a category. The slug is made once from the name."""

    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'product_count']
        read_only_fields = ['slug']  # kept on rename, so old links (/products?category=…) keep working
        extra_kwargs = {'name': {'validators': []}}  # checked below without caring about capitals

    def validate_name(self, value):
        name = ' '.join(value.split())  # "  kids   toys " → "kids toys"
        if not slugify(name):
            raise serializers.ValidationError('Use letters or numbers in the name.')
        taken = Category.objects.filter(name__iexact=name)
        if self.instance:
            taken = taken.exclude(pk=self.instance.pk)
        if taken.exists():
            raise serializers.ValidationError(f'"{name}" already exists – pick it from the list.')
        return name

    def create(self, data):
        base = slug = slugify(data['name'])
        number = 2
        while Category.objects.filter(slug=slug).exists():  # "toys" taken → "toys-2"
            slug, number = f'{base}-{number}', number + 1
        return Category.objects.create(name=data['name'], slug=slug)


class VariantWriteSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)  # present = update this variant, missing = new variant

    class Meta:
        model = ProductVariant
        fields = ['id', 'size', 'color', 'sku', 'price', 'stock']
        extra_kwargs = {'sku': {'validators': []}}  # uniqueness is checked in ProductAdminSerializer


class ImageWriteSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model = ProductImage
        fields = ['id', 'path']


class ProductAdminSerializer(serializers.ModelSerializer):
    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all())
    category_name = serializers.CharField(source='category.name', read_only=True)
    # Only the super admin's choice is used – a store admin's products always go to their own store (see views)
    store = serializers.PrimaryKeyRelatedField(queryset=Store.objects.all(), required=False)
    store_name = serializers.CharField(source='store.name', read_only=True)
    variants = VariantWriteSerializer(many=True)
    images = ImageWriteSerializer(many=True, required=False)
    total_stock = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ['id', 'name', 'slug', 'store', 'store_name', 'category', 'category_name', 'description', 'rating',
                  'is_active', 'variants', 'images', 'total_stock']
        read_only_fields = ['rating']
        extra_kwargs = {'slug': {'required': False, 'allow_blank': True, 'validators': []}}

    def get_total_stock(self, product):
        return product.variants.aggregate(total=Sum('stock'))['total'] or 0

    def to_representation(self, product):
        data = super().to_representation(product)
        request = self.context.get('request')
        for image in data['images']:
            image['url'] = absolute_media(request, image['path'])
        return data

    def validate_variants(self, variants):
        if not variants:
            raise serializers.ValidationError('Add at least one variant (price + stock).')
        skus = [v['sku'].strip().upper() for v in variants]
        if len(skus) != len(set(skus)):
            raise serializers.ValidationError('Each variant needs a different SKU.')
        own_ids = [v['id'] for v in variants if v.get('id')]
        taken = ProductVariant.objects.filter(sku__in=skus).exclude(id__in=own_ids)
        if self.instance:
            taken = taken.exclude(product=self.instance)
        if taken.exists():
            raise serializers.ValidationError(f'SKU already used: {taken.first().sku}')
        for v in variants:
            v['sku'] = v['sku'].strip().upper()
        return variants

    def validate(self, data):
        # Make a unique slug from the name when it is left empty
        if not data.get('slug'):
            base = slugify(data.get('name') or self.instance.name)
            slug, n = base, 2
            while Product.objects.filter(slug=slug).exclude(pk=getattr(self.instance, 'pk', None)).exists():
                slug, n = f'{base}-{n}', n + 1
            data['slug'] = slug
        return data

    def _sync(self, model, product, rows, extra=lambda i: {}):
        """Update rows that have an id, create rows without one, delete rows that were removed."""
        existing = {obj.id: obj for obj in model.objects.filter(product=product)}
        keep = []
        for index, row in enumerate(rows):
            row = {**row, **extra(index)}
            obj_id = row.pop('id', None)
            if obj_id in existing:
                obj = existing[obj_id]
                for field, value in row.items():
                    setattr(obj, field, value)
                obj.save()
            else:
                obj = model.objects.create(product=product, **row)
            keep.append(obj.id)
        model.objects.filter(product=product).exclude(id__in=keep).delete()

    def create(self, data):
        variants, images = data.pop('variants'), data.pop('images', [])
        product = Product.objects.create(**data)
        self._sync(ProductVariant, product, variants)
        self._sync(ProductImage, product, images, extra=lambda i: {'sort_order': i})
        return product

    def update(self, product, data):
        variants, images = data.pop('variants', None), data.pop('images', None)
        for field, value in data.items():
            setattr(product, field, value)
        product.save()
        if variants is not None:
            self._sync(ProductVariant, product, variants)
        if images is not None:
            self._sync(ProductImage, product, images, extra=lambda i: {'sort_order': i})
        return product


class CouponSerializer(serializers.ModelSerializer):
    times_used = serializers.IntegerField(source='usages.count', read_only=True)
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = Coupon
        fields = ['id', 'code', 'type', 'value', 'min_order', 'expires_at', 'is_active', 'times_used', 'is_expired']

    def validate_code(self, value):
        value = value.strip().upper()
        if Coupon.objects.filter(code=value).exclude(pk=getattr(self.instance, 'pk', None)).exists():
            raise serializers.ValidationError('This code already exists.')
        return value

    def validate(self, data):
        coupon_type = data.get('type', getattr(self.instance, 'type', None))
        value = data.get('value', getattr(self.instance, 'value', 0))
        if value <= 0:
            raise serializers.ValidationError({'value': 'Value must be more than 0.'})
        if coupon_type == Coupon.Type.PERCENT and value > 90:
            raise serializers.ValidationError({'value': 'A percentage coupon can be at most 90%.'})
        return data


class UserAdminSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='first_name', read_only=True)
    orders = serializers.IntegerField(source='orders.count', read_only=True)
    store_name = serializers.CharField(source='store.name', read_only=True, default=None)

    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'role', 'store', 'store_name', 'is_active', 'date_joined', 'orders']
        read_only_fields = ['email', 'date_joined']
