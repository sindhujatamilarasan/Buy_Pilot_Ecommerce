// All routes in one place.
// Layout routes (no path) wrap pages with a frame; ProtectedRoute guards by login/role.
import { Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AccountLayout from './pages/account/AccountLayout'
import Addresses from './pages/account/Addresses'
import Profile from './pages/account/Profile'
import Security from './pages/account/Security'
import AdminLayout from './layouts/AdminLayout'
import CustomerLayout from './layouts/CustomerLayout'
import Coupons from './pages/admin/Coupons'
import Dashboard from './pages/admin/Dashboard'
import ManageOrders from './pages/admin/Orders'
import ProductForm from './pages/admin/ProductForm'
import AdminProducts from './pages/admin/Products'
import Users from './pages/admin/Users'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Home from './pages/Home'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import OrderDetail from './pages/OrderDetail'
import Orders from './pages/Orders'
import Placeholder from './pages/Placeholder'
import ProductDetail from './pages/ProductDetail'
import Products from './pages/Products'
import Register from './pages/Register'
import Wishlist from './pages/Wishlist'

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

    {/* Admin only */}
    <Route element={<ProtectedRoute roles={['admin']} />}>
      <Route element={<AdminLayout />}>
        <Route path="/admin" element={<Dashboard />} />
        <Route path="/admin/products" element={<AdminProducts />} />
        <Route path="/admin/products/new" element={<ProductForm />} />
        <Route path="/admin/products/:id" element={<ProductForm />} />
        <Route path="/admin/coupons" element={<Coupons />} />
        <Route path="/admin/orders" element={<ManageOrders />} />
        <Route path="/admin/users" element={<Users />} />
        <Route path="/admin/reports" element={<Placeholder title="Sales report" when="Day 13" />} />
      </Route>
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
