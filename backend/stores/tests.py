"""Multi-store rules: each store admin sees ONLY their store; only the super admin manages stores."""
from rest_framework.test import APITestCase

from accounts.models import User
from catalog.models import Category, Product, ProductVariant
from orders.models import Order

from .models import Store


class MultiStoreTests(APITestCase):
    def setUp(self):
        self.store_a = Store.objects.create(name='Store A', slug='store-a')
        self.store_b = Store.objects.create(name='Store B', slug='store-b')
        self.boss = User.objects.create_user(username='boss@t.com', email='boss@t.com', password='x', role='superadmin')
        self.admin_a = User.objects.create_user(username='a@t.com', email='a@t.com', password='x', role='admin', store=self.store_a)
        self.customer = User.objects.create_user(username='c@t.com', email='c@t.com', password='x')
        category = Category.objects.create(name='Shoes', slug='shoes')
        self.shoe_a = self.product(category, self.store_a, 'Shoe A', 1000)
        self.shoe_b = self.product(category, self.store_b, 'Shoe B', 2000)

    def product(self, category, store, name, price):
        product = Product.objects.create(category=category, store=store, name=name, slug=name.lower().replace(' ', '-'))
        ProductVariant.objects.create(product=product, sku=name.upper().replace(' ', '-'), price=price, stock=5)
        return product

    def order(self, store, total):
        return Order.objects.create(user=self.customer, store=store, ship_name='C', ship_phone='9876543210',
                                    ship_address='a', ship_city='c', ship_pincode='600001', subtotal=total, tax=0,
                                    shipping=0, total=total, status='placed', payment_status='paid')

    # ----- super admin -----
    def test_only_super_admin_manages_stores(self):
        self.client.force_authenticate(self.admin_a)
        self.assertEqual(self.client.get('/api/manage/stores/').status_code, 403)
        self.client.force_authenticate(self.boss)
        res = self.client.post('/api/manage/stores/', {'name': 'Kids Corner'}, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['slug'], 'kids-corner')

    def test_super_admin_adds_store_admin(self):
        self.client.force_authenticate(self.boss)
        res = self.client.post(f'/api/manage/stores/{self.store_b.id}/admins/',
                               {'name': 'Bala', 'email': 'Bala@B.com', 'password': 'Strong@123'}, format='json')
        self.assertEqual(res.status_code, 201)
        new_admin = User.objects.get(email='bala@b.com')
        self.assertEqual((new_admin.role, new_admin.store), ('admin', self.store_b))
        self.assertTrue(self.client.login(username='bala@b.com', password='Strong@123'))  # can log in

    # ----- store admin sees only their store -----
    def test_store_admin_sees_only_own_products(self):
        self.client.force_authenticate(self.admin_a)
        names = [p['name'] for p in self.client.get('/api/manage/products/').data['results']]
        self.assertEqual(names, ['Shoe A'])
        self.assertEqual(self.client.get(f'/api/manage/products/{self.shoe_b.id}/').status_code, 404)
        self.assertEqual(self.client.delete(f'/api/manage/products/{self.shoe_b.id}/').status_code, 404)

    def test_store_admin_creates_product_only_in_own_store(self):
        self.client.force_authenticate(self.admin_a)
        res = self.client.post('/api/manage/products/', {
            'name': 'Sneaker', 'category': self.shoe_a.category_id, 'store': self.store_b.id,  # tries Store B
            'variants': [{'size': '8', 'color': '', 'sku': 'SNK-8', 'price': '999', 'stock': 3}]}, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(Product.objects.get(name='Sneaker').store, self.store_a)  # forced to Store A

    def test_store_admin_sees_only_own_orders_and_revenue(self):
        mine, theirs = self.order(self.store_a, 1000), self.order(self.store_b, 5000)
        self.client.force_authenticate(self.admin_a)
        ids = [o['id'] for o in self.client.get('/api/manage/orders/').data['results']]
        self.assertEqual(ids, [mine.id])
        self.assertEqual(self.client.post(f'/api/manage/orders/{theirs.id}/next-status/').status_code, 404)
        self.assertEqual(self.client.get('/api/admin/dashboard/').data['stats']['revenue'], 1000)
        self.assertEqual(self.client.get('/api/manage/reports/sales/?days=7').data['summary']['revenue'], 1000)
        self.client.force_authenticate(self.boss)  # super admin: all stores
        self.assertEqual(self.client.get('/api/admin/dashboard/').data['stats']['revenue'], 6000)

    def test_store_admin_adds_staff_only_to_own_store(self):
        self.client.force_authenticate(self.admin_a)
        data = {'name': 'Meena', 'email': 'meena@t.com', 'password': 'Packing@2026', 'store': self.store_b.id}
        res = self.client.post('/api/manage/staff/', data, format='json')  # the store sent is ignored
        self.assertEqual((res.data['role'], res.data['store']), ('staff', self.store_a.id))
        other = User.objects.create_user(username='o@t.com', email='o@t.com', password='x', role='staff', store=self.store_b)
        url = f'/api/manage/users/{other.id}/role/'
        self.assertEqual(self.client.patch(url, {'role': 'customer'}, format='json').status_code, 403)  # not my staff

    # ----- shop rules -----
    def test_cart_with_two_stores_cannot_be_ordered(self):
        items = [{'variant_id': p.variants.first().id, 'qty': 1} for p in (self.shoe_a, self.shoe_b)]
        quote = self.client.post('/api/cart/quote/', {'items': items}, format='json').data
        self.assertEqual([p['code'] for p in quote['problems']], ['mixed_stores'])

    def test_inactive_store_is_hidden_from_shop(self):
        self.store_b.is_active = False
        self.store_b.save()
        names = [p['name'] for p in self.client.get('/api/products/').data['results']]
        self.assertEqual(names, ['Shoe A'])
