"""The 'last item' race, for real: two buyers pay for the LAST unit at the same moment.

Uses two threads (two database connections) that start together. Needs PostgreSQL,
because SQLite cannot run two writing transactions at the same time.
"""
import threading
import unittest

from django.db import connection
from django.test import TransactionTestCase

from accounts.models import User
from catalog.models import Category, Product, ProductVariant

from .models import Order, OrderItem, Payment
from .services import complete_payment


@unittest.skipUnless(connection.vendor == 'postgresql', 'needs PostgreSQL row locks')
class LastItemRaceTests(TransactionTestCase):
    def setUp(self):
        category = Category.objects.create(name='Watches', slug='watches')
        product = Product.objects.create(category=category, name='Last Watch', slug='last-watch')
        self.variant = ProductVariant.objects.create(product=product, sku='LAST-1', price=999, stock=1)
        self.payments = [self.unpaid_order(f'buyer{n}@t.com') for n in (1, 2)]

    def unpaid_order(self, email):
        user = User.objects.create_user(username=email, email=email, password='x')
        order = Order.objects.create(
            user=user, ship_name='B', ship_phone='9876543210', ship_address='x', ship_city='Chennai',
            ship_pincode='600001', subtotal=999, tax=0, shipping=0, total=999)
        OrderItem.objects.create(order=order, variant=self.variant, product_name='Last Watch', price=999, qty=1)
        return Payment.objects.create(order=order, provider='mock', amount=999)

    def test_two_buyers_at_the_same_time_only_one_gets_it(self):
        start_together = threading.Barrier(2)

        def buy(payment):
            try:
                start_together.wait()  # both threads continue at the same moment
                complete_payment(payment)
            finally:
                connection.close()  # each thread has its own DB connection

        threads = [threading.Thread(target=buy, args=(p,)) for p in self.payments]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        statuses = sorted(Order.objects.values_list('payment_status', flat=True))
        self.assertEqual(statuses, ['paid', 'refund_pending'])  # exactly one winner
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, 0)  # never -1
