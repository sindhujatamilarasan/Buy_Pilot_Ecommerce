from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from catalog.models import Category, Product, ProductVariant
from coupons.models import Coupon
from orders.models import Address, Order, OrderItem


class ChatbotTests(APITestCase):
    def setUp(self):
        # Create category, product, variant
        self.category = Category.objects.create(name='Electronics', slug='electronics')
        self.product = Product.objects.create(
            category=self.category,
            name='Noise Cancelling Headphones',
            slug='headphones',
            rating=4.8
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            price=2999.00,
            stock=15,
            sku='HEADPHONE-BLK'
        )

        # Create coupon
        self.coupon = Coupon.objects.create(
            code='SAVE100',
            type=Coupon.Type.FLAT,
            value=100,
            min_order=500,
            is_active=True
        )

        # Create customer user
        self.user = User.objects.create_user(
            username='testcustomer',
            email='testcustomer@shopkart.test',
            password='password123',
            first_name='Sindhu'
        )

        # Create address
        self.address = Address.objects.create(
            user=self.user,
            name='Sindhu',
            phone='9876543210',
            address='123 Marine Drive',
            city='Mumbai',
            pincode='400001',
            is_default=True
        )

        # Create order
        self.order = Order.objects.create(
            user=self.user,
            ship_name=self.address.name,
            ship_phone=self.address.phone,
            ship_address=self.address.address,
            ship_city=self.address.city,
            ship_pincode=self.address.pincode,
            subtotal=2999,
            discount=0,
            tax=539.82,
            shipping=0,
            total=3538.82,
            status=Order.Status.PACKED,
            payment_status=Order.PaymentStatus.PAID
        )
        self.order_item = OrderItem.objects.create(
            order=self.order,
            variant=self.variant,
            product_name=self.product.name,
            price=2999,
            qty=1
        )

    def test_guest_greeting_and_faq(self):
        res = self.client.post('/api/chat/', {'message': 'Hello'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('ShopBot', res.data['reply'])
        self.assertEqual(res.data['type'], 'greeting')

    def test_guest_coupons(self):
        res = self.client.post('/api/chat/', {'message': 'What coupons do you have?'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['type'], 'coupons')
        self.assertTrue(len(res.data['data']['coupons']) >= 1)
        self.assertEqual(res.data['data']['coupons'][0]['code'], 'SAVE100')

    def test_guest_shipping_policy(self):
        res = self.client.post('/api/chat/', {'action': 'shipping_policy'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('FREE Delivery', res.data['reply'])

    def test_customer_track_latest_order(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post('/api/chat/', {'action': 'latest_order'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['type'], 'order_detail')
        self.assertEqual(res.data['data']['order']['id'], self.order.id)
        self.assertEqual(res.data['data']['order']['status'], 'packed')

    def test_customer_order_lookup_by_id(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post('/api/chat/', {'message': f'Where is my order #{self.order.id}?'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['type'], 'order_detail')
        self.assertEqual(res.data['data']['order']['id'], self.order.id)

    def test_product_search(self):
        res = self.client.post('/api/chat/', {'message': 'Show me headphones'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['type'], 'product_cards')
        self.assertTrue(any('Headphones' in p['name'] for p in res.data['data']['products']))

    def test_cart_summary(self):
        cart_items = [{'variant_id': self.variant.id, 'name': 'Headphones', 'price': 2999, 'qty': 1}]
        res = self.client.post('/api/chat/', {'action': 'my_cart', 'cart': cart_items}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['type'], 'cart_summary')
        self.assertIn('FREE Delivery', res.data['data']['shipping_msg'])
