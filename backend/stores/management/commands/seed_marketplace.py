"""DEMO DATA: rebuild the catalog – 4 stores × 40 affordable products, photos from Pexels.

Usage:  python manage.py seed_marketplace              (needs PEXELS_API_KEY in backend/.env)
        python manage.py seed_marketplace --no-images  (products without photos, for tests)

⚠️ Deletes ALL products first. Past orders keep their product names and prices (they are copies).
Every product is created THROUGH ITS STORE ADMIN with the real admin API, so the store rules apply.
"""
import json
import os
import random
import urllib.parse
import urllib.request
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils.text import slugify
from rest_framework.test import APIClient

from accounts.models import User
from catalog.models import Category, Product
from stores.models import Store
from stores.seed.marketplace import CATEGORIES, DESCRIPTIONS, PRODUCTS, STORES, VARIANTS

PASSWORD = 'Shop@1234'
IMAGE_DIR = Path(settings.MEDIA_ROOT) / 'products' / 'seed'
CREDITS_FILE = Path(__file__).resolve().parents[2] / 'seed' / 'pexels_credits.json'


class Command(BaseCommand):
    help = 'Rebuild the demo catalog (4 stores, 160 products) through the store admins'

    def add_arguments(self, parser):
        parser.add_argument('--no-images', action='store_true', help='Skip downloading photos from Pexels')

    def handle(self, *args, no_images, **options):
        self.key = os.getenv('PEXELS_API_KEY', '')
        if not no_images and not self.key:
            raise CommandError('Add PEXELS_API_KEY=... to backend/.env (free key: pexels.com/api) or use --no-images.')
        random.seed(21)
        self.used_photos, self.credits = set(), []

        Product.objects.all().delete()  # images, variants, cart items and wishlist rows go with them
        categories = {slug: Category.objects.update_or_create(slug=slug, defaults={'name': name})[0]
                      for slug, name in CATEGORIES.items()}

        for slug, name, description, email, admin_name, store_categories in STORES:
            store, _ = Store.objects.update_or_create(slug=slug, defaults={'name': name, 'description': description, 'is_active': True})
            admin = self.store_admin(email, admin_name, store)
            client = APIClient()
            client.force_authenticate(admin)  # act AS this store admin
            for category_slug in store_categories:
                for product in PRODUCTS[category_slug]:
                    self.create(client, store, categories[category_slug], product, no_images)
            self.stdout.write(self.style.SUCCESS(f'{name}: {store.products.count()} products (by {email})'))

        if self.credits:
            CREDITS_FILE.write_text(json.dumps(self.credits, indent=2), encoding='utf-8')
        self.stdout.write(self.style.SUCCESS(f'Done: {Product.objects.count()} products in {len(STORES)} stores.'))

    def store_admin(self, email, name, store):
        user, created = User.objects.get_or_create(username=email, defaults={'email': email, 'first_name': name})
        user.role, user.store, user.first_name = User.Role.ADMIN, store, name
        if created:
            user.set_password(PASSWORD)
        user.save()
        return user

    def create(self, client, store, category, product, no_images):
        name, price, query, variant_type = product
        slug = slugify(name)
        payload = {
            'name': name,
            'category': category.id,
            'description': DESCRIPTIONS[category.slug].format(name=name),
            'is_active': True,
            'variants': [
                {'size': size, 'color': '', 'sku': f'{store.slug[:4]}-{slug}-{size or "std"}'[:64],
                 'price': str(price + extra), 'stock': random.choice([0, 1, 2, 5, 8, 12, 20, 35, 50])}
                for size, extra in VARIANTS[variant_type]
            ],
            'images': [] if no_images else [{'path': p} for p in self.photos(query, slug)],
        }
        response = client.post('/api/manage/products/', payload, format='json', HTTP_HOST='localhost')
        if response.status_code != 201:
            raise CommandError(f'{name}: {response.data}')
        # Customers' ratings are not editable by admins → set the demo rating directly
        Product.objects.filter(pk=response.data['id']).update(rating=round(random.uniform(3.6, 4.7), 1))

    def photos(self, query, slug, wanted=2):
        """Search Pexels and save up to 2 new (not yet used) photos into media/products/seed/."""
        url = 'https://api.pexels.com/v1/search?' + urllib.parse.urlencode({'query': query, 'per_page': 10, 'orientation': 'square'})
        request = urllib.request.Request(url, headers={'Authorization': self.key, 'User-Agent': 'ShopKart-demo/1.0'})
        with urllib.request.urlopen(request, timeout=20) as response:
            results = json.load(response)['photos']

        IMAGE_DIR.mkdir(parents=True, exist_ok=True)
        paths = []
        for photo in results:
            if photo['id'] in self.used_photos or len(paths) == wanted:
                continue
            self.used_photos.add(photo['id'])
            file = IMAGE_DIR / f'{slug}-{len(paths) + 1}.jpg'
            download = urllib.request.Request(photo['src']['large'], headers={'User-Agent': 'ShopKart-demo/1.0'})
            with urllib.request.urlopen(download, timeout=30) as image:
                file.write_bytes(image.read())
            paths.append(f"/{settings.MEDIA_URL.strip('/')}/products/seed/{file.name}")  # → /media/products/seed/x.jpg
            self.credits.append({'product': slug, 'photographer': photo['photographer'],
                                 'photographer_url': photo['photographer_url'], 'pexels_url': photo['url']})
        return paths
