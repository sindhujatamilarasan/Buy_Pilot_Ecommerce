from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import User
from catalog.models import Category, Product, ProductVariant
from orders.models import Order, OrderItem


class SalesReportTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='a@t.com', email='a@t.com', password='x', role='admin')
        self.staff = User.objects.create_user(username='s@t.com', email='s@t.com', password='x', role='staff')
        category = Category.objects.create(name='Shoes', slug='shoes')
        product = Product.objects.create(category=category, name='Runner', slug='runner')
        self.variant = ProductVariant.objects.create(product=product, sku='RUN-8', price=1000, stock=10)

    def order(self, total, days_ago, paid=True, qty=1):
        order = Order.objects.create(
            user=self.admin, ship_name='A', ship_phone='1', ship_address='x', ship_city='c', ship_pincode='600001',
            subtotal=total, tax=0, shipping=0, total=total, status='placed',
            payment_status='paid' if paid else 'failed')
        OrderItem.objects.create(order=order, variant=self.variant, product_name='Runner', price=total / qty, qty=qty)
        Order.objects.filter(pk=order.pk).update(created_at=timezone.now() - timedelta(days=days_ago))
        return order

    def get(self, days):
        self.client.force_authenticate(self.admin)
        return self.client.get(f'/api/manage/reports/sales/?days={days}').data

    def test_admin_only(self):
        for user, code in [(None, 401), (self.staff, 403)]:
            self.client.force_authenticate(user)
            self.assertEqual(self.client.get('/api/manage/reports/sales/').status_code, code)

    def test_counts_only_paid_orders_in_range(self):
        self.order(Decimal('2000'), days_ago=1, qty=2)
        self.order(Decimal('500'), days_ago=2)
        self.order(Decimal('9999'), days_ago=2, paid=False)  # failed payment → not a sale
        self.order(Decimal('700'), days_ago=20)  # outside 7 days
        summary = self.get(7)['summary']
        self.assertEqual(summary['revenue'], Decimal('2500'))
        self.assertEqual(summary['orders'], 2)
        self.assertEqual(summary['items_sold'], 3)
        self.assertEqual(summary['avg_order'], Decimal('1250.00'))

    def test_daily_has_every_day_and_change_vs_previous_period(self):
        self.order(Decimal('1000'), days_ago=0)
        self.order(Decimal('500'), days_ago=8)  # previous 7-day period
        data = self.get(7)
        self.assertEqual(len(data['daily']), 7)
        self.assertEqual(data['summary']['revenue_change'], 100.0)  # 1000 vs 500 → +100%
        self.assertEqual(data['top_products'][0]['product_name'], 'Runner')
        self.assertEqual(data['by_category'][0]['name'], 'Shoes')

    def test_bad_days_falls_back_to_30(self):
        self.assertEqual(self.get('abc')['days'], 30)
        self.assertEqual(self.get(365)['days'], 30)
