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
from stores.models import default_store_id


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


class DashboardSalesTests(APITestCase):
    def test_paid_order_counted_today(self):
        admin = User.objects.create_user(username='ad@t.com', email='ad@t.com', password='x', role='admin', store_id=default_store_id())
        Order.objects.create(user=admin, ship_name='A', ship_phone='9876543210', ship_address='a', ship_city='c',
                             ship_pincode='600001', subtotal=100, tax=18, shipping=49, total=167,
                             status='placed', payment_status='paid')
        self.client.force_authenticate(admin)
        data = self.client.get('/api/admin/dashboard/').data
        self.assertEqual(data['sales'][-1]['orders'], 1)  # last entry = today
        self.assertEqual(Decimal(data['sales'][-1]['revenue']), Decimal('167'))
        self.assertEqual(data['recent_orders'][0]['customer'], 'A')


KEYS = dict(RAZORPAY_KEY_ID='rzp_test_x', RAZORPAY_KEY_SECRET='secret', RAZORPAY_WEBHOOK_SECRET='hook')


class PaymentBase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='c@t.com', email='c@t.com', password='x', role='customer')
        cat = Category.objects.create(name='Shoes', slug='shoes')
        product = Product.objects.create(category=cat, name='Shoe', slug='shoe')
        self.variant = ProductVariant.objects.create(product=product, sku='S-1', price=400, stock=5)
        self.big = ProductVariant.objects.create(product=product, sku='S-9', price=30000, stock=5)
        self.client.force_authenticate(self.user)
        self.address_id = self.client.post('/api/addresses/', {
            'name': 'Sindhu', 'phone': '9876543210', 'address': '1 Main St', 'city': 'Chennai', 'pincode': '600001'}).data['id']

    def buy(self, variant, qty=1, method='cod'):
        return self.client.post('/api/orders/', {'address_id': self.address_id, 'payment_method': method,
                                                  'items': [{'variant_id': variant.id, 'qty': qty}]}, format='json')


class CashOnDeliveryTests(PaymentBase):
    def test_cod_order_is_placed_at_once_and_takes_stock(self):
        res = self.buy(self.variant, 2)
        self.assertEqual(res.status_code, 201)
        self.assertEqual((res.data['order']['status'], res.data['order']['payment_status'], res.data['payment']['mode']),
                         ('placed', 'cod', 'cod'))
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, 3)

    def test_cod_is_paid_only_when_delivered(self):
        order = Order.objects.get(pk=self.buy(self.variant).data['order']['id'])
        admin = User.objects.create_user(username='a@t.com', email='a@t.com', password='x', role='admin', store=order.store)
        self.client.force_authenticate(admin)
        for _ in range(3):
            self.client.post(f'/api/manage/orders/{order.id}/next-status/')
        order.refresh_from_db()
        self.assertEqual((order.status, order.payment_status), ('delivered', 'paid'))
        self.assertEqual(order.payments.get().status, 'success')

    def test_cancelling_a_cod_order_needs_no_refund_and_restores_stock(self):
        res = self.buy(self.variant, 2)
        out = self.client.post(f"/api/orders/{res.data['order']['id']}/cancel/")
        self.assertEqual((out.data['status'], out.data['payment_status']), ('cancelled', 'none_due'))
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, 5)

    def test_cod_limit_and_switch(self):
        self.assertEqual(self.buy(self.big).status_code, 400)  # ₹30,000 > ₹20,000 limit
        with override_settings(COD_ENABLED=False):
            self.assertEqual(self.buy(self.variant).status_code, 400)
            self.assertFalse(self.client.get('/api/payments/options/').data['cod'])
        self.assertTrue(self.client.get('/api/payments/options/').data['cod'])

    def test_cod_order_cannot_be_paid_online_later(self):
        order_id = self.buy(self.variant).data['order']['id']
        self.assertEqual(self.client.post(f'/api/orders/{order_id}/pay/').status_code, 400)


@override_settings(**KEYS)
class RazorpayTests(PaymentBase):
    """Real Razorpay mode – the Razorpay API itself is replaced by a fake."""

    def online(self):
        with patch('orders.services.create_razorpay_order', return_value='order_R1'):
            return self.buy(self.variant, 1, 'online')

    def hook(self, event, order_id='order_R1', payment_id='pay_R1', secret='hook'):
        import json
        body = json.dumps({'event': event, 'payload': {'payment': {'entity': {'id': payment_id, 'order_id': order_id}}}})
        sig = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
        self.client.force_authenticate(None)
        return self.client.post('/api/payments/webhook/', body, content_type='application/json', HTTP_X_RAZORPAY_SIGNATURE=sig)

    def test_webhook_places_the_order_when_the_browser_never_came_back(self):
        res = self.online()
        order_id = res.data['order']['id']
        self.assertEqual(self.hook('payment.captured').status_code, 200)
        order = Order.objects.get(pk=order_id)
        self.assertEqual((order.status, order.payment_status), ('placed', 'paid'))
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, 4)
        self.hook('payment.captured')  # Razorpay retries – nothing is done twice
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, 4)

    def test_webhook_with_a_wrong_signature_is_refused(self):
        self.online()
        self.assertEqual(self.hook('payment.captured', secret='wrong').status_code, 400)
        self.assertEqual(Order.objects.get().status, 'pending_payment')

    def test_webhook_failed_event_marks_payment_failed(self):
        self.online()
        self.hook('payment.failed')
        self.assertEqual(Order.objects.get().payment_status, 'failed')

    def test_cancel_refunds_through_razorpay(self):
        order_id = self.online().data['order']['id']
        self.hook('payment.captured')
        self.client.force_authenticate(self.user)
        with patch('orders.services.refund_razorpay_payment', return_value='rfnd_1') as refund:
            res = self.client.post(f'/api/orders/{order_id}/cancel/')
        refund.assert_called_once_with('pay_R1', Order.objects.get(pk=order_id).total)
        self.assertEqual(res.data['payment_status'], 'refunded')
        self.assertEqual(Order.objects.get(pk=order_id).payments.get().razorpay_refund_id, 'rfnd_1')

    def test_failed_refund_stays_pending_and_admin_can_retry(self):
        order_id = self.online().data['order']['id']
        self.hook('payment.captured')
        self.client.force_authenticate(self.user)
        with patch('orders.services.refund_razorpay_payment', side_effect=OSError('down')):
            res = self.client.post(f'/api/orders/{order_id}/cancel/')
        self.assertEqual((res.status_code, res.data['status'], res.data['payment_status']), (200, 'cancelled', 'refund_pending'))
        admin = User.objects.create_user(username='a@t.com', email='a@t.com', password='x', role='admin',
                                         store=Order.objects.get(pk=order_id).store)
        self.client.force_authenticate(admin)
        with patch('orders.services.refund_razorpay_payment', return_value='rfnd_2'):
            again = self.client.post(f'/api/manage/orders/{order_id}/refund/')
        self.assertEqual(again.data['payment_status'], 'refunded')
        self.assertEqual(self.client.post(f'/api/manage/orders/{order_id}/refund/').status_code, 400)
