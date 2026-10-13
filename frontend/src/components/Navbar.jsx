import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const linkClass = ({ isActive }) =>
  `text-sm font-semibold tracking-wide transition ${isActive ? 'text-gold-300' : 'text-ink-300 hover:text-white'}`

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
      <div className="bg-gold-500 py-2 text-center text-xs font-semibold tracking-[0.2em] text-ink-950 uppercase">
        Free shipping on orders above ₹500 · Easy 7-day returns
      </div>

      <div className="border-b border-ink-800 bg-ink-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-6 px-4 py-4">
          <Link to="/" className="font-serif text-2xl font-semibold text-white">
            Shop<span className="text-gold-400">Kart</span>
          </Link>

          <form onSubmit={handleSearch} className="order-last w-full sm:order-none sm:flex-1">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search the collection…"
              className="w-full rounded-full border border-ink-700 bg-ink-900 px-5 py-2.5 text-sm text-white outline-none transition placeholder:text-ink-400 focus:border-gold-500 focus:ring-4 focus:ring-gold-500/20"
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
                <span className="hidden items-center gap-2 text-sm md:flex">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-500 font-semibold text-ink-950">
                    {user.name?.[0]?.toUpperCase()}
                  </span>
                  <span className="rounded-full bg-ink-800 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-gold-300 ring-1 ring-ink-700">
                    {user.role}
                  </span>
                </span>
                <button onClick={handleLogout} className="text-sm font-semibold text-ink-300 hover:text-rose-400">
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="rounded-full bg-gold-500 px-5 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-gold-400">
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
