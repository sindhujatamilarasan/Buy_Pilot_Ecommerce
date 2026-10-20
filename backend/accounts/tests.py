from rest_framework.test import APITestCase

from accounts.models import User
from catalog.models import Category, Product, ProductVariant
from stores.models import default_store_id


class AuthAndRoleTests(APITestCase):
    def setUp(self):
        self.customer = User.objects.create_user(
            username='c@test.com', email='c@test.com', password='Pass@12345', role='customer')
        self.staff = User.objects.create_user(
            username='s@test.com', email='s@test.com', password='Pass@12345', role='staff', store_id=default_store_id())
        self.admin = User.objects.create_user(
            username='a@test.com', email='a@test.com', password='Pass@12345', role='admin', store_id=default_store_id())
        category = Category.objects.create(name='Books', slug='books')
        product = Product.objects.create(category=category, name='Book', slug='book')
        ProductVariant.objects.create(product=product, sku='BOOK-1', price=199, stock=1)

    # ----- register / login -----
    def test_register_always_creates_customer(self):
        res = self.client.post('/api/auth/register/', {
            'name': 'New', 'email': 'new@test.com', 'password': 'Strong@123', 'role': 'admin'})
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['user']['role'], 'customer')  # 'role': 'admin' was ignored
        self.assertIn('token', res.data)

    def test_register_duplicate_email(self):
        res = self.client.post('/api/auth/register/', {
            'name': 'X', 'email': 'c@test.com', 'password': 'Strong@123'})
        self.assertEqual(res.status_code, 400)

    def test_login_wrong_password(self):
        res = self.client.post('/api/auth/login/', {'email': 'c@test.com', 'password': 'nope'})
        self.assertEqual(res.status_code, 400)

    def test_login_and_me(self):
        res = self.client.post('/api/auth/login/', {'email': 'c@test.com', 'password': 'Pass@12345'})
        self.assertEqual(res.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {res.data['token']}")
        self.assertEqual(self.client.get('/api/auth/me/').data['role'], 'customer')

    # ----- public product APIs -----
    def test_products_are_public(self):
        res = self.client.get('/api/products/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['count'], 1)
        self.assertEqual(self.client.get('/api/products/book/').status_code, 200)

    # ----- role-based access to the admin dashboard -----
    def test_dashboard_needs_login(self):
        self.assertEqual(self.client.get('/api/admin/dashboard/').status_code, 401)

    def test_dashboard_blocks_customer_and_staff(self):
        for user in (self.customer, self.staff):
            self.client.force_authenticate(user)
            self.assertEqual(self.client.get('/api/admin/dashboard/').status_code, 403)

    def test_dashboard_allows_admin(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get('/api/admin/dashboard/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['stats']['low_stock'], 1)
        self.assertEqual(res.data['categories'], [{'name': 'Books', 'slug': 'books', 'products': 1}])
        self.assertEqual(len(res.data['sales']), 7)  # always 7 days, zero-filled
        self.assertEqual(res.data['recent_orders'], [])


class ProfileTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='p@t.com', email='p@t.com', password='Old@12345',
                                             first_name='Old', role='customer')
        self.client.force_authenticate(self.user)

    def test_update_name_but_not_role_or_email(self):
        res = self.client.patch('/api/auth/me/', {'name': 'New Name', 'role': 'admin', 'email': 'x@y.com'})
        self.assertEqual(res.data['name'], 'New Name')
        self.assertEqual(res.data['role'], 'customer')
        self.assertEqual(res.data['email'], 'p@t.com')

    def test_change_password(self):
        wrong = self.client.post('/api/auth/change-password/', {'old_password': 'nope', 'new_password': 'Brand@New99'})
        self.assertEqual(wrong.status_code, 400)
        ok = self.client.post('/api/auth/change-password/', {'old_password': 'Old@12345', 'new_password': 'Brand@New99'})
        self.assertEqual(ok.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('Brand@New99'))

    def test_deleting_default_address_moves_default(self):
        first = self.client.post('/api/addresses/', {'name': 'A', 'phone': '9876543210', 'address': 'a',
                                                     'city': 'c', 'pincode': '600001'}).data
        second = self.client.post('/api/addresses/', {'name': 'B', 'phone': '9876543210', 'address': 'b',
                                                      'city': 'c', 'pincode': '600002'}).data
        self.client.delete(f"/api/addresses/{first['id']}/")
        self.assertTrue(self.client.get('/api/addresses/').data[0]['is_default'])
        self.assertEqual(self.client.get('/api/addresses/').data[0]['id'], second['id'])
