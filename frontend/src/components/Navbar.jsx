import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCart } from '../hooks/useCart'
import UserMenu from './UserMenu'

const linkClass = ({ isActive }) =>
  `rounded-full px-3 py-1.5 text-sm font-semibold transition ${
    isActive ? 'bg-brand-100 text-brand-700' : 'text-ink-600 hover:bg-brand-50 hover:text-brand-700'
  }`

const Navbar = () => {
  const { user } = useAuth()
  const { count } = useCart()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const handleSearch = e => {
    e.preventDefault() // stop the browser from reloading the page
    navigate(`/products?search=${encodeURIComponent(search.trim())}`)
  }

  return (
    <header className="sticky top-0 z-20">
      <div className="bg-brand-soft py-2 text-center text-xs font-bold tracking-wide text-brand-800">
        🎉 Free shipping on orders above ₹500 · Easy 7-day returns
      </div>

      <div className="border-b border-brand-100 bg-blush/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
          <Link to="/" className="font-display text-2xl font-extrabold">
            🛍️ <span className="text-brand">ShopKart</span>
          </Link>

          <form onSubmit={handleSearch} className="order-last w-full sm:order-none sm:flex-1">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="🔍  Search for phones, shoes, watches…"
              className="w-full rounded-full border-2 border-brand-100 bg-white px-5 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
            />
          </form>

          <nav className="ml-auto flex items-center gap-1">
            <NavLink to="/products" className={linkClass}>Shop</NavLink>
            <NavLink to="/cart" className={linkClass}>
              🛒 Cart
              {count > 0 && <span className="bg-brand ml-1.5 rounded-full px-2 py-0.5 text-xs font-bold text-white">{count}</span>}
            </NavLink>

            {user ? (
              <UserMenu />
            ) : (
              <Link to="/login" className="bg-brand ml-2 rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-200 transition hover:scale-105">
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}

export default Navbar
