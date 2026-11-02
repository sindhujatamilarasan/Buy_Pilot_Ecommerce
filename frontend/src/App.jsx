// All routes in one place.
// Layout routes (no path) wrap pages with a frame; ProtectedRoute guards by login/role.
import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Spinner from './components/Spinner'
import AccountLayout from './pages/account/AccountLayout'
import Addresses from './pages/account/Addresses'
import Profile from './pages/account/Profile'
import Security from './pages/account/Security'
import AdminLayout from './layouts/AdminLayout'
import CustomerLayout from './layouts/CustomerLayout'
import Categories from './pages/admin/Categories'
import Coupons from './pages/admin/Coupons'
import Dashboard from './pages/admin/Dashboard'
import ManageOrders from './pages/admin/Orders'
import ProductForm from './pages/admin/ProductForm'
import SiteContent from './pages/admin/SiteContent'
import AdminProducts from './pages/admin/Products'
import Stores from './pages/admin/Stores'
import Users from './pages/admin/Users'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Home from './pages/Home'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import OrderDetail from './pages/OrderDetail'
import Orders from './pages/Orders'
import ProductDetail from './pages/ProductDetail'
import Products from './pages/Products'
import Register from './pages/Register'
import Wishlist from './pages/Wishlist'
// Inventory pages are loaded only when opened (smaller first download for shoppers)
const Adjustments = lazy(() => import('./pages/inventory/Adjustments'))
const Movements = lazy(() => import('./pages/inventory/Movements'))
const InventoryOverview = lazy(() => import('./pages/inventory/Overview'))
const PickList = lazy(() => import('./pages/inventory/PickList'))
const Receipts = lazy(() => import('./pages/inventory/Receipts'))
const StockLevels = lazy(() => import('./pages/inventory/Stock'))
const Transfers = lazy(() => import('./pages/inventory/Transfers'))
const Warehouses = lazy(() => import('./pages/inventory/Warehouses'))

// Lazy loading: the Reports page (and its big chart library) downloads only when an admin opens it
const Reports = lazy(() => import('./pages/admin/Reports'))

const App = () => (
  <Routes>
    <Route element={<CustomerLayout />}>
      {/* Public – no login needed */}
      <Route path="/" element={<Home />} />
      <Route path="/products" element={<Products />} />
      <Route path="/products/:slug" element={<ProductDetail />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forbidden" element={<NotFound forbidden />} />

      {/* Any logged-in user */}
      <Route element={<ProtectedRoute />}>
        <Route path="/checkout" element={<Checkout />} />
        <Route element={<AccountLayout />}>
          <Route path="/account" element={<Profile />} />
          <Route path="/account/addresses" element={<Addresses />} />
          <Route path="/account/security" element={<Security />} />
          <Route path="/orders" element={<Orders />} />
        </Route>
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
      </Route>
    </Route>

    {/* Store admin + super admin (the backend limits a store admin to their own store) */}
    <Route element={<ProtectedRoute roles={['admin', 'superadmin']} />}>
      <Route element={<AdminLayout />}>
        <Route path="/admin" element={<Dashboard />} />
        <Route path="/admin/products" element={<AdminProducts />} />
        <Route path="/admin/products/new" element={<ProductForm />} />
        <Route path="/admin/products/:id" element={<ProductForm />} />
        <Route path="/admin/orders" element={<ManageOrders />} />
        <Route path="/admin/users" element={<Users />} />
        <Route path="/admin/reports" element={<Suspense fallback={<Spinner />}><Reports /></Suspense>} />
        {/* Super admin only */}
        <Route element={<ProtectedRoute roles={['superadmin']} />}>
          <Route path="/admin/stores" element={<Stores />} />
          <Route path="/admin/categories" element={<Categories />} />
          <Route path="/admin/coupons" element={<Coupons />} />
          <Route path="/admin/site" element={<SiteContent />} />
        </Route>
      </Route>
    </Route>

    {/* Inventory: warehouse managers + store admins + super admin (the backend limits each to their store) */}
    <Route element={<ProtectedRoute roles={['warehouse', 'admin', 'superadmin']} />}>
      <Route element={<AdminLayout />}>
        <Route path="/inventory" element={<Suspense fallback={<Spinner />}><InventoryOverview /></Suspense>} />
        <Route path="/inventory/stock" element={<Suspense fallback={<Spinner />}><StockLevels /></Suspense>} />
        <Route path="/inventory/receipts" element={<Suspense fallback={<Spinner />}><Receipts /></Suspense>} />
        <Route path="/inventory/transfers" element={<Suspense fallback={<Spinner />}><Transfers /></Suspense>} />
        <Route path="/inventory/adjustments" element={<Suspense fallback={<Spinner />}><Adjustments /></Suspense>} />
        <Route path="/inventory/movements" element={<Suspense fallback={<Spinner />}><Movements /></Suspense>} />
        <Route path="/inventory/warehouses" element={<Suspense fallback={<Spinner />}><Warehouses /></Suspense>} />
      </Route>
    </Route>

    {/* Pick list (printable, no sidebar): everyone who packs orders */}
    <Route element={<ProtectedRoute roles={['staff', 'warehouse', 'admin', 'superadmin']} />}>
      <Route path="/pick-list/:orderId" element={<Suspense fallback={<Spinner />}><PickList /></Suspense>} />
    </Route>

    {/* Staff only */}
    <Route element={<ProtectedRoute roles={['staff']} />}>
      <Route element={<AdminLayout />}>
        <Route path="/staff/orders" element={<ManageOrders />} />
      </Route>
    </Route>

    <Route path="*" element={<NotFound />} />
  </Routes>
)

export default App
