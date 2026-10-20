"""DEMO DATA ONLY – create realistic past orders so the Reports charts have something to show.

Usage:  python manage.py seed_orders            (150 orders over the last 90 days)
        python manage.py seed_orders --clear    (only delete the demo orders)

Demo orders belong to demo customers (demo1…demo6@shopkart.test) and do NOT change stock.
"""
import random
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.models import User
from cart.pricing import calculate_summary, money
from catalog.models import ProductVariant
from orders.models import Order, OrderItem, OrderStatusLog, Payment

DEMO_DOMAIN = '@shopkart.test'
DEMO_NAMES = ['Priya R', 'Karthik S', 'Anu M', 'Vijay K', 'Divya P', 'Arun T']
CITIES = [('Chennai', '600001'), ('Coimbatore', '641001'), ('Madurai', '625001'), ('Bengaluru', '560001')]
# Older orders are usually delivered; recent ones are still on the way
STATUS_BY_AGE = [(3, ['placed', 'packed']), (7, ['packed', 'shipped']), (999, ['delivered', 'delivered', 'shipped'])]


class Command(BaseCommand):
    help = 'Create demo paid orders for the sales report (development only)'

    def add_arguments(self, parser):
        parser.add_argument('--count', type=int, default=150)
        parser.add_argument('--days', type=int, default=90)
        parser.add_argument('--clear', action='store_true', help='Only delete earlier demo orders')

    @transaction.atomic
    def handle(self, *args, count, days, clear, **options):
        random.seed(7)
        Order.objects.filter(user__email__startswith='demo', user__email__endswith=DEMO_DOMAIN).delete()
        if clear:
            self.stdout.write(self.style.SUCCESS('Demo orders deleted.'))
            return

        customers = [self.demo_customer(i, name) for i, name in enumerate(DEMO_NAMES, start=1)]
        # Cheaper products sell more often (weights), like a real shop
        variants = list(ProductVariant.objects.select_related('product').prefetch_related('product__images'))
        weights = [1 / max(float(v.price), 100) ** 0.5 for v in variants]
        now = timezone.now()

        for _ in range(count):
            age = int(random.triangular(0, days, 0))  # more orders in recent days
            created = now - timedelta(days=age, hours=random.randint(0, 12), minutes=random.randint(0, 59))
            self.create_order(random.choice(customers), random.choices(variants, weights, k=random.randint(1, 3)),
                              created, age)

        self.stdout.write(self.style.SUCCESS(f'Created {count} demo orders over the last {days} days.'))

    def demo_customer(self, number, name):
        email = f'demo{number}{DEMO_DOMAIN}'
        user, _ = User.objects.get_or_create(username=email, defaults={'email': email, 'first_name': name})
        return user

    def create_order(self, user, picked, created, age):
        lines = {v.id: (v, random.randint(1, 2)) for v in picked}  # same variant twice → one line
        subtotal = sum((v.price * qty for v, qty in lines.values()), Decimal('0'))
        summary = calculate_summary(subtotal)
        status = random.choice(next(options for limit, options in STATUS_BY_AGE if age <= limit))
        city, pincode = random.choice(CITIES)

        order = Order.objects.create(
            user=user, ship_name=user.first_name, ship_phone='9876543210', ship_address='12 Demo Street',
            ship_city=city, ship_pincode=pincode, subtotal=summary['subtotal'], discount=summary['discount'],
            tax=summary['tax'], shipping=summary['shipping'], total=summary['total'],
            status=status, payment_status=Order.PaymentStatus.PAID,
        )
        for variant, qty in lines.values():
            images = variant.product.images.all()[:1]
            OrderItem.objects.create(
                order=order, variant=variant, product_name=variant.product.name,
                variant_label=' · '.join(filter(None, [variant.color, variant.size])),
                image=images[0].path if images else '', price=money(variant.price), qty=qty,
            )
        Payment.objects.create(order=order, provider='mock', amount=order.total, status=Payment.Status.SUCCESS)
        OrderStatusLog.objects.create(order=order, status=status, note='Demo order')
        # created_at uses auto_now_add, so set the past date with an UPDATE afterwards
        Order.objects.filter(pk=order.pk).update(created_at=created)
        OrderStatusLog.objects.filter(order=order).update(created_at=created)
