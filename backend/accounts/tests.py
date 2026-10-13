from rest_framework.test import APITestCase

from accounts.models import User
from catalog.models import Category, Product, ProductVariant


class AuthAndRoleTests(APITestCase):
    def setUp(self):
        self.customer = User.objects.create_user(
            username='c@test.com', email='c@test.com', password='Pass@12345', role='customer')
        self.staff = User.objects.create_user(
            username='s@test.com', email='s@test.com', password='Pass@12345', role='staff')
        self.admin = User.objects.create_user(
            username='a@test.com', email='a@test.com', password='Pass@12345', role='admin')
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
