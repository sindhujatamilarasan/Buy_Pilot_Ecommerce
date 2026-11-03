from django.db import models

DEFAULT_STORE_SLUG = 'shopkart-official'


class Store(models.Model):
    """A seller on the marketplace. Each store has its own admin(s), staff, products and orders."""

    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True)
    description = models.CharField(max_length=300, blank=True)
    is_active = models.BooleanField(default=True)  # inactive → its products are hidden from the shop
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


def default_store_id():
    """The store used when none is given (existing products / orders, and old code paths)."""
    store, _ = Store.objects.get_or_create(slug=DEFAULT_STORE_SLUG, defaults={'name': 'Shopora Official'})
    return store.pk
