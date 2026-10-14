import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APITestCase

from accounts.models import User
from catalog.models import Category, Product, ProductVariant
from orders.models import Order


class BackofficeTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='a@t.com', email='a@t.com', password='x', role='admin')
        self.staff = User.objects.create_user(username='s@t.com', email='s@t.com', password='x', role='staff')
        self.customer = User.objects.create_user(username='c@t.com', email='c@t.com', password='x', role='customer')
        self.category = Category.objects.create(name='Shoes', slug='shoes')

    def product_payload(self, **extra):
        return {'name': 'Runner Shoe', 'category': self.category.id, 'description': 'Light', 'is_active': True,
                'variants': [{'size': '8', 'color': '', 'sku': 'run-8', 'price': '1999', 'stock': 4},
                             {'size': '9', 'color': '', 'sku': 'RUN-9', 'price': '1999', 'stock': 0}],
                'images': [{'path': 'https://example.com/shoe.jpg'}], **extra}

    # ----- permissions -----
    def test_only_admin_manages_products(self):
        for user, code in [(None, 401), (self.customer, 403), (self.staff, 403)]:
            self.client.force_authenticate(user)
            self.assertEqual(self.client.get('/api/manage/products/').status_code, code)

    # ----- products -----
    def test_create_and_edit_product_with_variants(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post('/api/manage/products/', self.product_payload(), format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['slug'], 'runner-shoe')  # made from the name
        self.assertEqual(res.data['total_stock'], 4)
        self.assertEqual({v['sku'] for v in res.data['variants']}, {'RUN-8', 'RUN-9'})

        # edit: change stock of one variant, remove the other, add a new one
        keep = next(v for v in res.data['variants'] if v['sku'] == 'RUN-8')
        update = self.product_payload(variants=[
            {**keep, 'stock': 10},
            {'size': '10', 'color': '', 'sku': 'RUN-10', 'price': '2099', 'stock': 2},
        ])
        res = self.client.put(f"/api/manage/products/{res.data['id']}/", update, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['total_stock'], 12)
        self.assertFalse(ProductVariant.objects.filter(sku='RUN-9').exists())
        self.assertEqual(ProductVariant.objects.get(sku='RUN-8').id, keep['id'])  # same row updated

    def test_duplicate_sku_rejected(self):
        self.client.force_authenticate(self.admin)
        self.client.post('/api/manage/products/', self.product_payload(), format='json')
        res = self.client.post('/api/manage/products/', self.product_payload(name='Other'), format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('variants', res.data)

    @override_settings(MEDIA_ROOT=tempfile.mkdtemp())
    def test_image_upload_checks_type(self):
        self.client.force_authenticate(self.admin)
        good = SimpleUploadedFile('photo.png', b'\x89PNG fake', content_type='image/png')
        res = self.client.post('/api/manage/uploads/', {'file': good}, format='multipart')
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.data['path'].startswith('/media/products/'))
        bad = SimpleUploadedFile('virus.exe', b'MZ', content_type='application/octet-stream')
        self.assertEqual(self.client.post('/api/manage/uploads/', {'file': bad}, format='multipart').status_code, 400)

    # ----- coupons -----
    def test_coupon_crud_and_validation(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post('/api/manage/coupons/', {'code': 'fest20', 'type': 'percent', 'value': 20,
                                                        'min_order': 999, 'is_active': True}, format='json')
        self.assertEqual(res.data['code'], 'FEST20')
        bad = self.client.post('/api/manage/coupons/', {'code': 'BIG', 'type': 'percent', 'value': 95}, format='json')
        self.assertEqual(bad.status_code, 400)

    # ----- orders: staff can only move the status forward -----
    def test_staff_moves_order_status_forward(self):
        order = Order.objects.create(user=self.customer, ship_name='C', ship_phone='9876543210', ship_address='a',
                                     ship_city='c', ship_pincode='600001', subtotal=100, tax=18, shipping=49,
                                     total=167, status='placed', payment_status='paid')
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.get('/api/manage/orders/?status=placed').data['count'], 1)
        for expected in ['packed', 'shipped', 'delivered']:
            res = self.client.post(f'/api/manage/orders/{order.id}/next-status/')
            self.assertEqual(res.data['status'], expected)
        self.assertEqual(self.client.post(f'/api/manage/orders/{order.id}/next-status/').status_code, 400)
        self.assertEqual(self.client.post(f'/api/manage/orders/{order.id}/cancel/').status_code, 403)  # admin only
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.get('/api/manage/orders/').status_code, 403)

    # ----- users -----
    def test_admin_assigns_staff_role_but_not_own(self):
        self.client.force_authenticate(self.admin)
        res = self.client.patch(f'/api/manage/users/{self.customer.id}/role/', {'role': 'staff'}, format='json')
        self.assertEqual(res.data['role'], 'staff')
        own = self.client.patch(f'/api/manage/users/{self.admin.id}/role/', {'role': 'customer'}, format='json')
        self.assertEqual(own.status_code, 400)
