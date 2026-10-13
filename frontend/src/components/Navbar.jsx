import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const linkClass = ({ isActive }) =>
  `text-sm font-medium ${isActive ? 'text-indigo-600' : 'text-slate-600 hover:text-slate-900'}`

const Navbar = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const handleSearch = e => {
    e.preventDefault() // stop the browser from reloading the page
    navigate(`/products?search=${encodeURIComponent(search.trim())}`)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
        <Link to="/" className="text-xl font-extrabold text-indigo-600">
          🛍️ ShopKart
        </Link>

        <form onSubmit={handleSearch} className="order-last w-full sm:order-none sm:flex-1">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search for products…"
            className="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white"
          />
        </form>

        <nav className="ml-auto flex items-center gap-5">
          <NavLink to="/products" className={linkClass}>Products</NavLink>
          <NavLink to="/cart" className={linkClass}>🛒 Cart</NavLink>

          {user ? (
            <>
              {user.role === 'customer' && <NavLink to="/orders" className={linkClass}>My Orders</NavLink>}
              {user.role === 'admin' && <NavLink to="/admin" className={linkClass}>Dashboard</NavLink>}
              {user.role === 'staff' && <NavLink to="/staff/orders" className={linkClass}>Orders</NavLink>}
              <span className="hidden text-sm text-slate-500 md:inline">
                Hi, {user.name} <span className="rounded bg-indigo-50 px-1.5 text-xs text-indigo-600">{user.role}</span>
              </span>
              <button onClick={handleLogout} className="text-sm font-medium text-red-600 hover:underline">
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}

export default Navbar
