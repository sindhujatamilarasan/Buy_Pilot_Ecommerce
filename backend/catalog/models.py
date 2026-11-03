from django.conf import settings
from django.db import models

from stores.models import default_store_id


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True)  # URL-friendly name, e.g. "home-kitchen"

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'categories'

    def __str__(self):
        return self.name


class Product(models.Model):
    # Which seller this product belongs to (existing products → "Buy Pilot Official")
    store = models.ForeignKey('stores.Store', on_delete=models.PROTECT, related_name='products', default=default_store_id)
    # PROTECT: a category that still has products cannot be deleted
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='products')
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True)
    description = models.TextField(blank=True)
    rating = models.DecimalField(max_digits=2, decimal_places=1, default=0)
    is_active = models.BooleanField(default=True)  # hidden from the shop when False
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class ProductImage(models.Model):
    # CASCADE: deleting a product also deletes its images
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    path = models.CharField(max_length=500)  # URL or media path
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['sort_order']

    def __str__(self):
        return f'{self.product.name} – image {self.sort_order}'


class ProductVariant(models.Model):
    """One buyable version of a product (size + colour) with its OWN price and stock."""

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants')
    size = models.CharField(max_length=20, blank=True)
    color = models.CharField(max_length=30, blank=True)
    sku = models.CharField(max_length=64, unique=True)  # unique stock code
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['price']

    def __str__(self):
        return self.sku


class WishlistItem(models.Model):
    """A product a user saved with the ❤️ button. One row per (user, product)."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='wishlist_items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='wishlisted_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            # The database itself refuses the same product twice for one user
            models.UniqueConstraint(fields=['user', 'product'], name='unique_wishlist_item'),
        ]

    def __str__(self):
        return f'{self.user} ❤️ {self.product}'
