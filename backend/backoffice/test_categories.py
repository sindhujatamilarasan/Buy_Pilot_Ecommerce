from rest_framework.test import APITestCase

from accounts.models import User
from catalog.models import Category, Product
from stores.models import default_store_id


class CategoryAdminTests(APITestCase):
    def setUp(self):
        self.boss = User.objects.create_user(username='b@t.com', email='b@t.com', password='x', role='superadmin')
        self.admin = User.objects.create_user(username='a@t.com', email='a@t.com', password='x', role='admin', store_id=default_store_id())
        self.customer = User.objects.create_user(username='c@t.com', email='c@t.com', password='x', role='customer')
        self.toys = Category.objects.create(name='Toys', slug='toys')

    def test_store_admin_can_add_but_customer_cannot(self):
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.post('/api/manage/categories/', {'name': 'Books'}).status_code, 403)
        self.client.force_authenticate(self.admin)
        response = self.client.post('/api/manage/categories/', {'name': '  Kids   Books '})
        self.assertEqual(response.status_code, 201)
        self.assertEqual((response.data['name'], response.data['slug']), ('Kids Books', 'kids-books'))

    def test_duplicate_name_is_rejected_ignoring_capitals(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post('/api/manage/categories/', {'name': 'TOYS'})
        self.assertEqual(response.status_code, 400)
        self.assertIn('already exists', str(response.data['name']))

    def test_only_super_admin_renames_and_slug_stays(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.patch(f'/api/manage/categories/{self.toys.id}/', {'name': 'Games'}).status_code, 403)
        self.client.force_authenticate(self.boss)
        response = self.client.patch(f'/api/manage/categories/{self.toys.id}/', {'name': 'Toys & Games'})
        self.assertEqual((response.status_code, response.data['slug']), (200, 'toys'))

    def test_category_with_products_cannot_be_deleted(self):
        Product.objects.create(category=self.toys, name='Ball', slug='ball')
        self.client.force_authenticate(self.boss)
        response = self.client.delete(f'/api/manage/categories/{self.toys.id}/')
        self.assertEqual(response.status_code, 400)
        self.assertIn('1 products', response.data['detail'])
        empty = Category.objects.create(name='Empty', slug='empty')
        self.assertEqual(self.client.delete(f'/api/manage/categories/{empty.id}/').status_code, 204)
