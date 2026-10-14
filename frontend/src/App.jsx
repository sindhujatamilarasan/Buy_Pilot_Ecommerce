// All routes in one place.
// Layout routes (no path) wrap pages with a frame; ProtectedRoute guards by login/role.
import { Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLayout from './layouts/AdminLayout'
import CustomerLayout from './layouts/CustomerLayout'
import Dashboard from './pages/admin/Dashboard'
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
        <Route path="/wishlist" element={<Placeholder icon="❤️" title="Wishlist" when="Day 4" />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
      </Route>
    </Route>

    {/* Admin only */}
    <Route element={<ProtectedRoute roles={['admin']} />}>
      <Route element={<AdminLayout />}>
        <Route path="/admin" element={<Dashboard />} />
        <Route path="/admin/products" element={<Placeholder title="Manage products" when="Day 12" />} />
        <Route path="/admin/coupons" element={<Placeholder title="Coupons" when="Day 12" />} />
        <Route path="/admin/orders" element={<Placeholder title="All orders" when="Day 13" />} />
        <Route path="/admin/users" element={<Placeholder title="Users" when="Day 13" />} />
        <Route path="/admin/reports" element={<Placeholder title="Sales report" when="Day 13" />} />
      </Route>
    </Route>

    {/* Staff only */}
    <Route element={<ProtectedRoute roles={['staff']} />}>
      <Route element={<AdminLayout />}>
        <Route path="/staff/orders" element={<Placeholder title="Orders to process" when="Day 13" />} />
      </Route>
    </Route>

    <Route path="*" element={<NotFound />} />
  </Routes>
)

export default App
