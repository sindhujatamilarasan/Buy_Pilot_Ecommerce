from rest_framework.test import APITestCase

from accounts.models import User
from catalog.models import Category, Product, ProductVariant
from orders.models import Order, OrderItem, Payment
from orders.services import cancel_order, complete_payment
from stores.models import Store

from .models import StockMovement, Warehouse, WarehouseStock
from .services import ensure_stock_rows


class InventoryBase(APITestCase):
    """Shop A with an admin, a warehouse manager, staff and two warehouses (Main, Bangalore)."""

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


class InventoryTests(InventoryBase):
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
        self.assertEqual(self.client.get('/api/inventory/adjustments/').data['count'], 0)  # no leftover "pending" row

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


class LocationWarehouseTests(InventoryBase):
    """One login per warehouse (Chennai / Bangalore); an order is packed from the warehouse in the customer's city."""

    def setUp(self):
        super().setUp()
        self.main.city = 'Chennai'
        self.main.save()
        self.second.city = 'Bangalore'
        self.second.save()
        WarehouseStock.objects.update_or_create(warehouse=self.second, variant=self.variant, defaults={'quantity': 6})
        ProductVariant.objects.filter(pk=self.variant.pk).update(stock=11)  # the shop total = Main 5 + Bangalore 6
        self.chennai = User.objects.create_user(username='chn@t.com', email='chn@t.com', password='x', role='warehouse',
                                                store=self.store, warehouse=self.main)
        self.bangalore = User.objects.create_user(username='blr@t.com', email='blr@t.com', password='x', role='warehouse',
                                                  store=self.store, warehouse=self.second)

    def order_to(self, city, qty):
        order = Order.objects.create(user=self.customer, store=self.store, ship_name='C', ship_phone='9876543210',
                                     ship_address='x', ship_city=city, ship_pincode='560001',
                                     subtotal=1000, tax=0, shipping=0, total=1000)
        OrderItem.objects.create(order=order, variant=self.variant, product_name='Runner', price=1000, qty=qty)
        complete_payment(Payment.objects.create(order=order, provider='mock', amount=1000))
        return order

    def test_order_is_packed_from_the_customers_city(self):
        self.order_to('bangalore ', 2)  # spelling / spaces / case do not matter
        self.assertEqual((self.qty(self.main), self.qty(self.second)), (5, 4))
        self.order_to('Chennai', 1)
        self.assertEqual((self.qty(self.main), self.qty(self.second)), (4, 4))

    def test_unknown_city_or_too_little_local_stock_falls_back(self):
        self.order_to('Delhi', 1)  # no warehouse there → the default (Chennai / MAIN)
        self.assertEqual(self.qty(self.main), 4)
        self.order_to('Bangalore', 6)  # Bangalore has 6 → all from Bangalore
        self.assertEqual(self.qty(self.second), 0)
        self.order_to('Bangalore', 3)  # Bangalore is empty → Chennai covers it
        self.assertEqual(self.qty(self.main), 1)

    def test_manager_sees_only_their_warehouse(self):
        self.client.force_authenticate(self.chennai)
        self.assertEqual({w['code'] for w in self.client.get('/api/inventory/warehouses/').data}, {'MAIN'})
        self.assertEqual({r['warehouse_name'] for r in self.client.get('/api/inventory/stock/').data['results']}, {'Main warehouse'})
        self.client.force_authenticate(self.manager)  # not tied → the whole store
        self.assertEqual(len(self.client.get('/api/inventory/warehouses/').data), 2)

    def test_manager_can_pick_any_warehouse_as_transfer_destination(self):
        self.client.force_authenticate(self.chennai)
        self.assertEqual({w['code'] for w in self.client.get('/api/inventory/warehouses/', {'targets': 1}).data}, {'MAIN', 'BLR'})
        move = {'from_warehouse': self.main.id, 'to_warehouse': self.second.id, 'lines': [{'variant': self.variant.id, 'qty': 1}]}
        self.assertEqual(self.client.post('/api/inventory/transfers/', move, format='json').status_code, 201)
        # the receiving manager sees it too
        self.client.force_authenticate(self.bangalore)
        self.assertEqual(len(self.client.get('/api/inventory/transfers/').data['results']), 1)

    def test_manager_cannot_act_in_the_other_warehouse(self):
        self.client.force_authenticate(self.chennai)
        receipt = {'warehouse': self.second.id, 'supplier': 'Nike', 'lines': [{'variant': self.variant.id, 'qty': 1}]}
        self.assertEqual(self.client.post('/api/inventory/receipts/', receipt, format='json').status_code, 403)
        receipt['warehouse'] = self.main.id
        self.assertEqual(self.client.post('/api/inventory/receipts/', receipt, format='json').status_code, 201)
        # a transfer must leave from their own warehouse
        move = {'from_warehouse': self.second.id, 'to_warehouse': self.main.id, 'lines': [{'variant': self.variant.id, 'qty': 1}]}
        self.assertEqual(self.client.post('/api/inventory/transfers/', move, format='json').status_code, 403)

    def test_transfer_steps_belong_to_the_right_warehouse(self):
        self.client.force_authenticate(self.admin)
        move = {'from_warehouse': self.second.id, 'to_warehouse': self.main.id, 'lines': [{'variant': self.variant.id, 'qty': 2}]}
        transfer = self.client.post('/api/inventory/transfers/', move, format='json').data['id']
        self.assertEqual(self.client.post(f'/api/inventory/transfers/{transfer}/dispatch/').status_code, 200)
        self.client.force_authenticate(self.bangalore)  # the sender cannot press Receive
        self.assertEqual(self.client.post(f'/api/inventory/transfers/{transfer}/receive/').status_code, 403)
        self.client.force_authenticate(self.chennai)  # the receiver can
        self.assertEqual(self.client.post(f'/api/inventory/transfers/{transfer}/receive/').status_code, 200)
        self.assertEqual((self.qty(self.main), self.qty(self.second)), (7, 4))

    def test_orders_to_pick_and_pick_list_are_per_warehouse(self):
        blr_order, chn_order = self.order_to('Bangalore', 2), self.order_to('Chennai', 1)
        self.client.force_authenticate(self.bangalore)
        self.assertEqual([o['order'] for o in self.client.get('/api/inventory/orders-to-pick/').data], [blr_order.id])
        self.assertEqual(self.client.get(f'/api/inventory/pick-list/{blr_order.id}/').status_code, 200)
        self.assertEqual(self.client.get(f'/api/inventory/pick-list/{chn_order.id}/').status_code, 404)
        self.client.force_authenticate(self.chennai)
        self.assertEqual([o['order'] for o in self.client.get('/api/inventory/orders-to-pick/').data], [chn_order.id])

    def test_store_admin_creates_and_moves_a_location_manager(self):
        self.client.force_authenticate(self.admin)
        made = self.client.post('/api/manage/staff/', {'name': 'Priya', 'email': 'priya@t.com', 'password': 'Stock@2026x',
                                                       'role': 'warehouse', 'warehouse': self.second.id}, format='json')
        self.assertEqual((made.status_code, made.data['warehouse_name']), (201, 'Bangalore'))
        moved = self.client.patch(f"/api/manage/users/{made.data['id']}/warehouse/", {'warehouse': self.main.id}, format='json')
        self.assertEqual(moved.data['warehouse_name'], 'Main warehouse')
        other = Warehouse.objects.create(store=self.other_store, name='X', code='X')  # another store's warehouse
        bad = self.client.patch(f"/api/manage/users/{made.data['id']}/warehouse/", {'warehouse': other.id}, format='json')
        self.assertEqual(bad.status_code, 404)
