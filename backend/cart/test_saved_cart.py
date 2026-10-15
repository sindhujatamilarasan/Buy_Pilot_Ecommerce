from rest_framework.test import APITestCase

from accounts.models import User
from catalog.models import Category, Product, ProductVariant


class SavedCartTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='c@t.com', email='c@t.com', password='Pass@12345')
        category = Category.objects.create(name='Shoes', slug='shoes')
        product = Product.objects.create(category=category, name='Runner', slug='runner')
        self.shoe = ProductVariant.objects.create(product=product, sku='RUN-8', size='8', price=999, stock=3)
        self.sold_out = ProductVariant.objects.create(product=product, sku='RUN-9', size='9', price=999, stock=0)
        self.client.force_authenticate(self.user)

    def item(self, variant, qty, saved=False):
        return {'variant_id': variant.id, 'qty': qty, 'saved_for_later': saved}

    def test_needs_login(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get('/api/cart/').status_code, 401)

    def test_replace_caps_qty_at_stock_and_drops_sold_out(self):
        res = self.client.put('/api/cart/', {'items': [self.item(self.shoe, 10), self.item(self.sold_out, 1)]}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual([(i['variantId'], i['qty']) for i in res.data['items']], [(self.shoe.id, 3)])
        # GET returns the same saved cart
        self.assertEqual(self.client.get('/api/cart/').data, res.data)

    def test_merge_adds_guest_qty_but_never_above_stock(self):
        self.client.put('/api/cart/', {'items': [self.item(self.shoe, 2)]}, format='json')
        res = self.client.post('/api/cart/merge/', {'items': [self.item(self.shoe, 2)]}, format='json')
        self.assertEqual(res.data['items'][0]['qty'], 3)  # 2 + 2 = 4, capped at stock 3

    def test_merge_into_empty_cart(self):
        res = self.client.post('/api/cart/merge/', {'items': [self.item(self.shoe, 1, saved=True)]}, format='json')
        self.assertEqual(res.data['items'][0]['qty'], 1)
        self.assertTrue(res.data['items'][0]['savedForLater'])
