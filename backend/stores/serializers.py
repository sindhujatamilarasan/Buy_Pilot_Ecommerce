from django.contrib.auth.password_validation import validate_password
from django.utils.text import slugify
from rest_framework import serializers

from accounts.models import User

from .models import Store


class StoreSerializer(serializers.ModelSerializer):
    """A store with its numbers and its admins (for the super admin's Stores page)."""

    products = serializers.IntegerField(source='product_count', read_only=True)
    orders = serializers.IntegerField(source='order_count', read_only=True)
    admins = serializers.SerializerMethodField()

    class Meta:
        model = Store
        fields = ['id', 'name', 'slug', 'description', 'is_active', 'created_at', 'products', 'orders', 'admins']
        read_only_fields = ['slug', 'created_at']

    def get_admins(self, store):
        people = store.members.filter(role__in=[User.Role.ADMIN, User.Role.STAFF]).order_by('role', 'first_name')
        return [{'id': u.id, 'name': u.first_name, 'email': u.email, 'role': u.role} for u in people]

    def create(self, data):
        base = slugify(data['name']) or 'store'
        slug, n = base, 2
        while Store.objects.filter(slug=slug).exists():
            slug, n = f'{base}-{n}', n + 1
        return Store.objects.create(slug=slug, **data)


class StoreAdminCreateSerializer(serializers.Serializer):
    """Creates a NEW login (email + password) for one store: a store admin (default) or staff.

    context = {'store': store, 'role': User.Role.STAFF}  (role is optional, default = store admin)
    """

    name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value.lower()

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, data):
        return User.objects.create_user(
            username=data['email'], email=data['email'], password=data['password'],
            first_name=data['name'], role=self.context.get('role', User.Role.ADMIN), store=self.context['store'],
        )
