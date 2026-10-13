"""Load catalog/seed/products.json into the database.

Usage:  python manage.py seed_products
Safe to run again: it deletes the old catalog first.
"""
import json
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction

from catalog.models import Category, Product, ProductImage, ProductVariant

SEED_FILE = Path(__file__).resolve().parents[2] / 'seed' / 'products.json'


class Command(BaseCommand):
    help = 'Load seed categories, products, images and variants'

    @transaction.atomic  # all-or-nothing: if anything fails, nothing is saved
    def handle(self, *args, **options):
        data = json.loads(SEED_FILE.read_text(encoding='utf-8'))

        ProductVariant.objects.all().delete()
        ProductImage.objects.all().delete()
        Product.objects.all().delete()
        Category.objects.all().delete()

        categories = {
            c['slug']: Category.objects.create(name=c['name'], slug=c['slug'])
            for c in data['categories']
        }

        for p in data['products']:
            product = Product.objects.create(
                category=categories[p['category']],
                name=p['name'],
                slug=p['slug'],
                description=p['description'],
                rating=p['rating'],
                is_active=p['is_active'],
            )
            ProductImage.objects.bulk_create(
                ProductImage(product=product, path=url, sort_order=i)
                for i, url in enumerate(p['images'])
            )
            ProductVariant.objects.bulk_create(
                ProductVariant(
                    product=product,
                    size=v['size'] or '',
                    color=v['color'] or '',
                    sku=v['sku'],
                    price=v['price'],
                    stock=v['stock'],
                )
                for v in p['variants']
            )

        self.stdout.write(self.style.SUCCESS(
            f'Loaded {Category.objects.count()} categories, {Product.objects.count()} products, '
            f'{ProductVariant.objects.count()} variants'
        ))
