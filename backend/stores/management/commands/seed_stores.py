"""DEMO DATA: a second store, so the multi-store rules can be shown.

Usage:  python manage.py seed_stores
Creates "Urban Threads" (fashion) and moves the clothing + footwear products into it.
Everything else stays in "Shopora Official". Safe to run again.
"""
from django.core.management.base import BaseCommand

from catalog.models import Product
from stores.models import Store, default_store_id

FASHION_CATEGORIES = ['mens-clothing', 'womens-clothing', 'footwear']


class Command(BaseCommand):
    help = 'Create the demo store "Urban Threads" and move fashion products into it'

    def handle(self, *args, **options):
        official = Store.objects.get(pk=default_store_id())
        official.description = 'Electronics, home, beauty, sports and more – sold by Shopora.'
        official.save()

        urban, _ = Store.objects.get_or_create(
            slug='urban-threads',
            defaults={'name': 'Urban Threads', 'description': 'Clothing and footwear for every day.'},
        )
        moved = Product.objects.filter(category__slug__in=FASHION_CATEGORIES).update(store=urban)
        self.stdout.write(self.style.SUCCESS(
            f'{official.name}: {official.products.count()} products · {urban.name}: {moved} products'))
