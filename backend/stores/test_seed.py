from django.core.management import call_command
from django.test import TestCase

from catalog.models import Product, ProductVariant
from stores.models import Store


class SeedMarketplaceTests(TestCase):
    def test_builds_160_products_in_4_stores_through_store_admins(self):
        call_command('seed_marketplace', '--no-images', verbosity=0)
        self.assertEqual(Product.objects.count(), 160)
        for slug in ['shopkart-official', 'urban-threads', 'stepup-sports', 'homenest']:
            store = Store.objects.get(slug=slug)
            self.assertEqual(store.products.count(), 40)
            self.assertTrue(store.members.filter(role='admin').exists())
        self.assertEqual(Product.objects.filter(category__slug='footwear', store__slug='stepup-sports').count(), 20)
        self.assertLessEqual(max(ProductVariant.objects.values_list('price', flat=True)), 2449)  # affordable
        self.assertEqual(ProductVariant.objects.filter(product__category__slug='mens-clothing').count(), 80)  # S–XL
