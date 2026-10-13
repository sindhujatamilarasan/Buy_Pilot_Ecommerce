import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const linkClass = ({ isActive }) =>
  `text-sm font-semibold tracking-wide transition ${isActive ? 'text-gold-700' : 'text-ink-600 hover:text-ink-900'}`

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
    <header className="sticky top-0 z-20">
      {/* Announcement bar */}
      <div className="bg-ink-950 py-2 text-center text-xs font-medium tracking-[0.2em] text-gold-300 uppercase">
        Free shipping on orders above ₹500 · Easy 7-day returns
      </div>

      <div className="border-b border-ink-100 bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-6 px-4 py-4">
          <Link to="/" className="font-serif text-2xl font-semibold text-ink-900">
            Shop<span className="text-gold-600">Kart</span>
          </Link>

          <form onSubmit={handleSearch} className="order-last w-full sm:order-none sm:flex-1">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search the collection…"
              className="w-full rounded-full border border-ink-200 bg-white px-5 py-2.5 text-sm outline-none transition focus:border-gold-500 focus:ring-4 focus:ring-gold-100"
            />
          </form>

          <nav className="ml-auto flex items-center gap-6">
            <NavLink to="/products" className={linkClass}>Shop</NavLink>
            <NavLink to="/cart" className={linkClass}>Cart</NavLink>

            {user ? (
              <>
                {user.role === 'customer' && <NavLink to="/orders" className={linkClass}>Orders</NavLink>}
                {user.role === 'admin' && <NavLink to="/admin" className={linkClass}>Dashboard</NavLink>}
                {user.role === 'staff' && <NavLink to="/staff/orders" className={linkClass}>Orders</NavLink>}
                <span className="hidden items-center gap-2 text-sm text-ink-500 md:flex">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-900 font-semibold text-gold-300">
                    {user.name?.[0]?.toUpperCase()}
                  </span>
                  <span className="rounded-full bg-gold-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-gold-700 ring-1 ring-gold-200">
                    {user.role}
                  </span>
                </span>
                <button onClick={handleLogout} className="text-sm font-semibold text-ink-500 hover:text-rose-600">
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="rounded-full bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gold-600">
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
