import hashlib
import hmac
from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import User
from catalog.models import Category, Product, ProductVariant
from coupons.models import Coupon, CouponUsage

from .models import Order


class OrderFlowTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='c@t.com', email='c@t.com', password='x', role='customer')
        self.other = User.objects.create_user(username='o@t.com', email='o@t.com', password='x', role='customer')
        cat = Category.objects.create(name='Shoes', slug='shoes')
        product = Product.objects.create(category=cat, name='Shoe', slug='shoe')
        self.variant = ProductVariant.objects.create(product=product, sku='S-1', price=400, stock=5)
        self.last_one = ProductVariant.objects.create(product=product, sku='S-2', price=800, stock=1)
        self.client.force_authenticate(self.user)
        self.address_id = self.client.post('/api/addresses/', {
            'name': 'Sindhu', 'phone': '9876543210', 'address': '1 Main St', 'city': 'Chennai', 'pincode': '600001',
        }).data['id']

    def order(self, variant, qty=1, coupon=''):
        return self.client.post('/api/orders/', {
            'address_id': self.address_id, 'coupon_code': coupon,
            'items': [{'variant_id': variant.id, 'qty': qty, 'price': 1}],  # fake price is ignored
        }, format='json')

    def pay(self, res, result='success'):
        order_id, payment_id = res.data['order']['id'], res.data['payment']['payment_id']
        return self.client.post(f'/api/orders/{order_id}/pay/verify/',
                                {'payment_id': payment_id, 'mock_result': result}, format='json')

    # ----- addresses -----
    def test_first_address_is_default_and_phone_validated(self):
        self.assertTrue(self.client.get('/api/addresses/').data[0]['is_default'])
        bad = self.client.post('/api/addresses/', {'name': 'X', 'phone': '123', 'address': 'a', 'city': 'c', 'pincode': '12'})
        self.assertEqual(set(bad.data), {'phone', 'pincode'})

    # ----- order creation -----
    def test_order_uses_server_price(self):
        res = self.order(self.variant, qty=2)
        self.assertEqual(res.status_code, 201)
        self.assertEqual(Decimal(res.data['order']['subtotal']), Decimal('800'))  # 2 × 400 from DB
        self.assertEqual(res.data['payment']['mode'], 'mock')
        self.assertEqual(res.data['order']['status'], 'pending_payment')

    def test_cannot_order_more_than_stock(self):
        res = self.order(self.variant, qty=6)
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data['problems'][0]['code'], 'exceeds_stock')

    # ----- payment -----
    def test_successful_payment_reduces_stock(self):
        res = self.pay(self.order(self.variant, qty=2))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['order']['status'], 'placed')
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, 3)

    def test_failed_payment_keeps_stock_and_can_retry(self):
        created = self.order(self.variant)
        self.assertEqual(self.pay(created, 'failure').status_code, 400)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, 5)  # stock NOT reduced
        order_id = created.data['order']['id']
        self.assertEqual(Order.objects.get(pk=order_id).payment_status, 'failed')
        retry = self.client.post(f'/api/orders/{order_id}/pay/')
        res = self.client.post(f'/api/orders/{order_id}/pay/verify/',
                               {'payment_id': retry.data['payment_id'], 'mock_result': 'success'}, format='json')
        self.assertEqual(res.data['order']['status'], 'placed')

    def test_last_item_only_one_buyer_succeeds(self):
        first = self.order(self.last_one)
        self.client.force_authenticate(self.other)
        self.address_id = self.client.post('/api/addresses/', {
            'name': 'O', 'phone': '9876543211', 'address': 'x', 'city': 'Madurai', 'pincode': '625001'}).data['id']
        second = self.order(self.last_one)  # both orders created while stock = 1
        self.assertEqual(self.pay(second).status_code, 200)  # other user pays first
        self.client.force_authenticate(self.user)
        res = self.pay(first)
        self.assertEqual(res.status_code, 409)
        self.assertEqual(res.data['order']['status'], 'cancelled')
        self.assertEqual(res.data['order']['payment_status'], 'refund_pending')
        self.last_one.refresh_from_db()
        self.assertEqual(self.last_one.stock, 0)  # never negative

    def test_cannot_see_or_pay_other_users_order(self):
        created = self.order(self.variant)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(f"/api/orders/{created.data['order']['id']}/").status_code, 404)

    # ----- cancel -----
    def test_cancel_before_shipping_returns_stock(self):
        order_id = self.pay(self.order(self.variant, qty=2)).data['order']['id']
        res = self.client.post(f'/api/orders/{order_id}/cancel/')
        self.assertEqual(res.data['status'], 'cancelled')
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, 5)

    def test_cannot_cancel_after_shipping(self):
        order_id = self.pay(self.order(self.variant)).data['order']['id']
        Order.objects.filter(pk=order_id).update(status='shipped')
        self.assertEqual(self.client.post(f'/api/orders/{order_id}/cancel/').status_code, 400)

    # ----- coupons -----
    def test_coupon_rules(self):
        Coupon.objects.create(code='SAVE10', type='percent', value=10, min_order=500)
        Coupon.objects.create(code='OLD', type='flat', value=50, expires_at=timezone.now() - timedelta(days=1))
        self.assertEqual(self.order(self.variant, qty=1, coupon='SAVE10').status_code, 400)  # 400 < min 500
        self.assertEqual(self.order(self.variant, qty=1, coupon='old').status_code, 400)  # expired
        res = self.order(self.variant, qty=2, coupon='save10')  # 800 → 10% off
        self.assertEqual(Decimal(res.data['order']['discount']), Decimal('80'))
        self.pay(res)
        self.assertTrue(CouponUsage.objects.filter(user=self.user, coupon__code='SAVE10').exists())
        again = self.order(self.variant, qty=2, coupon='SAVE10')  # one use per user
        self.assertEqual(again.status_code, 400)
        self.assertIn('already used', again.data['coupon_error'])


@override_settings(RAZORPAY_KEY_ID='rzp_test_key', RAZORPAY_KEY_SECRET='test_secret')
class RazorpaySignatureTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='r@t.com', email='r@t.com', password='x')
        cat = Category.objects.create(name='C', slug='c')
        product = Product.objects.create(category=cat, name='P', slug='p')
        self.variant = ProductVariant.objects.create(product=product, sku='P-1', price=999, stock=3)
        self.client.force_authenticate(self.user)
        address = self.client.post('/api/addresses/', {'name': 'R', 'phone': '9876543210', 'address': 'a',
                                                       'city': 'c', 'pincode': '600001'}).data['id']
        with patch('orders.services.create_razorpay_order', return_value='order_TEST123'):
            res = self.client.post('/api/orders/', {'address_id': address,
                                                    'items': [{'variant_id': self.variant.id, 'qty': 1}]}, format='json')
        self.order_id, self.payment = res.data['order']['id'], res.data['payment']

    def verify(self, signature, mock_result=None):
        body = {'payment_id': self.payment['payment_id'], 'razorpay_order_id': 'order_TEST123',
                'razorpay_payment_id': 'pay_ABC', 'razorpay_signature': signature}
        if mock_result:
            body['mock_result'] = mock_result
        return self.client.post(f'/api/orders/{self.order_id}/pay/verify/', body, format='json')

    def test_real_signature_places_order(self):
        self.assertEqual(self.payment['mode'], 'razorpay')
        good = hmac.new(b'test_secret', b'order_TEST123|pay_ABC', hashlib.sha256).hexdigest()
        self.assertEqual(self.verify(good).data['order']['status'], 'placed')

    def test_fake_signature_is_rejected(self):
        res = self.verify('fake-signature', mock_result='success')  # mock trick not allowed either
        self.assertEqual(res.status_code, 400)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, 3)
