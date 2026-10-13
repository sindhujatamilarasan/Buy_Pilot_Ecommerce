from decimal import Decimal

from rest_framework.test import APITestCase

from catalog.models import Category, Product, ProductVariant

from .pricing import calculate_summary


class PricingRulesTests(APITestCase):
    """The money rules on their own – no database needed."""

    def test_gst_and_free_shipping_above_500(self):
        s = calculate_summary(Decimal('999'))
        self.assertEqual(s['tax'], Decimal('179.82'))  # 18% of 999
        self.assertEqual(s['shipping'], Decimal('0'))  # 999 ≥ 500 → free
        self.assertEqual(s['total'], Decimal('1178.82'))

    def test_shipping_charged_below_500(self):
        s = calculate_summary(Decimal('300'))
        self.assertEqual(s['shipping'], Decimal('49'))
        self.assertEqual(s['total'], Decimal('403.00'))  # 300 + 54 GST + 49

    def test_exactly_500_is_free(self):
        self.assertEqual(calculate_summary(Decimal('500'))['shipping'], Decimal('0'))

    def test_discount_applied_before_tax_and_shipping(self):
        s = calculate_summary(Decimal('600'), discount=Decimal('150'))  # 450 after discount
        self.assertEqual(s['tax'], Decimal('81.00'))
        self.assertEqual(s['shipping'], Decimal('49'))  # below 500 after discount
        self.assertEqual(s['total'], Decimal('580.00'))

    def test_discount_never_more_than_subtotal(self):
        s = calculate_summary(Decimal('100'), discount=Decimal('500'))
        self.assertEqual(s['discount'], Decimal('100.00'))
        self.assertEqual(s['total'], Decimal('0.00'))

    def test_empty_cart(self):
        self.assertEqual(calculate_summary(Decimal('0'))['total'], Decimal('0.00'))


class QuoteApiTests(APITestCase):
    def setUp(self):
        category = Category.objects.create(name='Books', slug='books')
        product = Product.objects.create(category=category, name='Book', slug='book')
        self.variant = ProductVariant.objects.create(product=product, sku='B-1', price=250, stock=3)
        self.sold_out = ProductVariant.objects.create(product=product, sku='B-2', price=100, stock=0)

    def quote(self, items):
        return self.client.post('/api/cart/quote/', {'items': items}, format='json')

    def test_quote_uses_database_price(self):
        # The client cannot send a price – only ids and quantities
        res = self.quote([{'variant_id': self.variant.id, 'qty': 2, 'price': 1}])
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['summary']['subtotal'], Decimal('500.00'))
        self.assertEqual(res.data['summary']['shipping'], Decimal('0'))
        self.assertEqual(res.data['problems'], [])

    def test_quote_reports_stock_problems(self):
        res = self.quote([
            {'variant_id': self.variant.id, 'qty': 5},
            {'variant_id': self.sold_out.id, 'qty': 1},
            {'variant_id': 9999, 'qty': 1},
        ])
        codes = [p['code'] for p in res.data['problems']]
        self.assertEqual(codes, ['exceeds_stock', 'out_of_stock', 'not_found'])
        self.assertEqual(res.data['problems'][0]['available'], 3)
        self.assertEqual(res.data['summary']['total'], Decimal('0.00'))

    def test_quote_rejects_bad_quantity(self):
        self.assertEqual(self.quote([{'variant_id': self.variant.id, 'qty': 0}]).status_code, 400)
