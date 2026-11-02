from rest_framework.test import APITestCase

from accounts.models import User
from catalog.models import Category, Product, ProductVariant
from orders.models import Order, OrderItem, Payment
from orders.services import cancel_order, complete_payment
from stores.models import Store

from .models import StockMovement, Warehouse, WarehouseStock
from .services import ensure_stock_rows


class InventoryTests(APITestCase):
    def setUp(self):
        self.store = Store.objects.create(name='Shop A', slug='shop-a')
        self.other_store = Store.objects.create(name='Shop B', slug='shop-b')
        category = Category.objects.create(name='Shoes', slug='shoes')
        product = Product.objects.create(category=category, name='Runner', slug='runner', store=self.store)
        self.variant = ProductVariant.objects.create(product=product, sku='RUN-8', price=1000, stock=5)
        other_product = Product.objects.create(category=category, name='Other', slug='other', store=self.other_store)
        self.other_variant = ProductVariant.objects.create(product=other_product, sku='OTH-1', price=10, stock=3)

        def person(email, role, store=None):
            return User.objects.create_user(username=email, email=email, password='x', role=role, store=store)
        self.admin = person('admin@t.com', 'admin', self.store)
        self.manager = person('wh@t.com', 'warehouse', self.store)
        self.staff = person('staff@t.com', 'staff', self.store)
        self.customer = person('c@t.com', 'customer')
        self.super = person('super@t.com', 'superadmin')

        ensure_stock_rows([self.variant.id])  # existing stock → "Main warehouse"
        self.main = Warehouse.objects.get(store=self.store, code='MAIN')
        self.second = Warehouse.objects.create(store=self.store, name='Bangalore', code='BLR')

    def qty(self, warehouse, variant=None):
        row = WarehouseStock.objects.filter(warehouse=warehouse, variant=variant or self.variant).first()
        return row.quantity if row else 0

    def total(self):
        self.variant.refresh_from_db()
        return self.variant.stock

    def paid_order(self, qty):
        order = Order.objects.create(user=self.customer, store=self.store, ship_name='C', ship_phone='9876543210',
                                     ship_address='x', ship_city='c', ship_pincode='600001',
                                     subtotal=1000, tax=0, shipping=0, total=1000)
        OrderItem.objects.create(order=order, variant=self.variant, product_name='Runner', price=1000, qty=qty)
        placed = complete_payment(Payment.objects.create(order=order, provider='mock', amount=1000))
        return order, placed

    # ----- existing stock is kept -----
    def test_existing_stock_moves_into_main_warehouse(self):
        self.assertTrue(self.main.is_default)
        self.assertEqual(self.qty(self.main), 5)
        self.assertEqual(StockMovement.objects.get(variant=self.variant).kind, 'opening')

    # ----- sales: automatic warehouse choice -----
    def test_sale_takes_default_warehouse_first_then_splits(self):
        WarehouseStock.objects.create(warehouse=self.second, variant=self.variant, quantity=0)
        self.client.force_authenticate(self.manager)
        self.client.post('/api/inventory/receipts/', {'warehouse': self.second.id, 'supplier': 'Nike',
                                                      'lines': [{'variant': self.variant.id, 'qty': 4}]}, format='json')
        order, placed = self.paid_order(3)  # default (MAIN) has 5 → all from MAIN
        self.assertTrue(placed)
        self.assertEqual((self.qty(self.main), self.qty(self.second)), (2, 4))
        _, placed = self.paid_order(5)  # no single warehouse has 5 → 2 from MAIN + 3 from BLR
        self.assertTrue(placed)
        self.assertEqual((self.qty(self.main), self.qty(self.second), self.total()), (0, 1, 1))

    def test_cancel_returns_stock_to_the_same_warehouse(self):
        order, _ = self.paid_order(2)
        cancel_order(order, self.admin)
        self.assertEqual((self.qty(self.main), self.total()), (5, 5))
        self.assertEqual(StockMovement.objects.filter(kind='return').count(), 1)

    def test_selling_more_than_stock_fails(self):
        order, placed = self.paid_order(9)
        self.assertFalse(placed)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, 'refund_pending')
        self.assertEqual(self.total(), 5)

    # ----- goods receipt -----
    def test_goods_receipt_adds_stock_and_history(self):
        self.client.force_authenticate(self.manager)
        res = self.client.post('/api/inventory/receipts/', {
            'warehouse': self.main.id, 'supplier': 'Nike India', 'reference': 'INV-77',
            'lines': [{'variant': self.variant.id, 'qty': 10}]}, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['number'], f"GR-{res.data['id']:05d}")
        self.assertEqual((self.qty(self.main), self.total()), (15, 15))
        movement = StockMovement.objects.filter(kind='receipt').get()
        self.assertEqual((movement.change, movement.balance_after, movement.created_by), (10, 15, self.manager))

    def test_cannot_receive_another_stores_product(self):
        self.client.force_authenticate(self.manager)
        res = self.client.post('/api/inventory/receipts/', {'warehouse': self.main.id, 'supplier': 'X',
                                                            'lines': [{'variant': self.other_variant.id, 'qty': 1}]}, format='json')
        self.assertEqual(res.status_code, 400)

    # ----- adjustments need approval from an admin -----
    def test_manager_adjustment_waits_for_admin_approval(self):
        self.client.force_authenticate(self.manager)
        res = self.client.post('/api/inventory/adjustments/', {'warehouse': self.main.id, 'variant': self.variant.id,
                                                               'change': -2, 'reason': 'damaged'}, format='json')
        self.assertEqual(res.data['status'], 'pending')
        self.assertEqual(self.total(), 5)  # nothing changed yet
        self.assertEqual(self.client.post(f"/api/inventory/adjustments/{res.data['id']}/approve/").status_code, 403)
        self.client.force_authenticate(self.admin)
        approved = self.client.post(f"/api/inventory/adjustments/{res.data['id']}/approve/")
        self.assertEqual(approved.data['status'], 'approved')
        self.assertEqual(self.total(), 3)
        self.assertEqual(self.client.post(f"/api/inventory/adjustments/{res.data['id']}/approve/").status_code, 400)

    def test_admin_adjustment_is_applied_at_once_but_never_below_zero(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post('/api/inventory/adjustments/', {'warehouse': self.main.id, 'variant': self.variant.id,
                                                               'change': -9, 'reason': 'lost'}, format='json')
        self.assertEqual(res.status_code, 400)  # only 5 in stock
        self.assertEqual(self.total(), 5)

    # ----- transfers: requested → approved → in transit → received -----
    def test_transfer_flow(self):
        self.client.force_authenticate(self.manager)
        res = self.client.post('/api/inventory/transfers/', {'from_warehouse': self.main.id, 'to_warehouse': self.second.id,
                                                             'lines': [{'variant': self.variant.id, 'qty': 3}]}, format='json')
        tid = res.data['id']
        self.assertEqual(res.data['status'], 'requested')
        self.assertEqual(self.client.post(f'/api/inventory/transfers/{tid}/dispatch/').status_code, 400)  # not approved
        self.client.force_authenticate(self.admin)
        self.client.post(f'/api/inventory/transfers/{tid}/approve/')
        self.client.force_authenticate(self.manager)
        self.assertEqual(self.client.post(f'/api/inventory/transfers/{tid}/dispatch/').data['status'], 'in_transit')
        self.assertEqual((self.qty(self.main), self.qty(self.second), self.total()), (2, 0, 2))  # not sellable in transit
        self.assertEqual(self.client.post(f'/api/inventory/transfers/{tid}/receive/').data['status'], 'received')
        self.assertEqual((self.qty(self.main), self.qty(self.second), self.total()), (2, 3, 5))

    # ----- access -----
    def test_who_can_use_inventory(self):
        for user, code in [(None, 401), (self.customer, 403), (self.staff, 403), (self.manager, 200), (self.admin, 200), (self.super, 200)]:
            self.client.force_authenticate(user)
            self.assertEqual(self.client.get('/api/inventory/stock/').status_code, code)

    def test_store_isolation(self):
        ensure_stock_rows([self.other_variant.id])
        self.client.force_authenticate(self.manager)
        skus = {row['sku'] for row in self.client.get('/api/inventory/stock/').data['results']}
        self.assertEqual(skus, {'RUN-8'})
        other_wh = Warehouse.objects.get(store=self.other_store)
        self.assertEqual(self.client.get(f'/api/inventory/warehouses/{other_wh.id}/').status_code, 404)

    def test_only_admins_create_warehouses(self):
        self.client.force_authenticate(self.manager)
        self.assertEqual(self.client.post('/api/inventory/warehouses/', {'name': 'X', 'code': 'x'}).status_code, 400)
        self.client.force_authenticate(self.admin)
        res = self.client.post('/api/inventory/warehouses/', {'name': 'Pune', 'code': 'pun-1'})
        self.assertEqual((res.status_code, res.data['code']), (201, 'PUN-1'))

    def test_export_and_pick_list(self):
        self.client.force_authenticate(self.manager)
        csv = self.client.get('/api/inventory/export/stock.csv')
        self.assertEqual(csv['Content-Type'], 'text/csv; charset=utf-8')
        self.assertIn('RUN-8', csv.content.decode('utf-8-sig'))
        order, _ = self.paid_order(2)
        self.client.force_authenticate(self.staff)
        pick = self.client.get(f'/api/inventory/pick-list/{order.id}/')
        self.assertEqual(pick.data['items'][0]['picks'], [{'warehouse': 'Main warehouse', 'code': 'MAIN', 'qty': 2, 'bin': ''}])
