// Sidebar layout for admin and staff. Each menu item lists which roles can see it.
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const MENU = [
  { to: '/admin', label: '📊 Dashboard', roles: ['admin'] },
  { to: '/admin/products', label: '📦 Products', roles: ['admin'], soon: true },
  { to: '/admin/coupons', label: '🏷️ Coupons', roles: ['admin'], soon: true },
  { to: '/admin/orders', label: '🧾 Orders', roles: ['admin'], soon: true },
  { to: '/admin/users', label: '👥 Users', roles: ['admin'], soon: true },
  { to: '/admin/reports', label: '📈 Reports', roles: ['admin'], soon: true },
  { to: '/staff/orders', label: '🧾 Orders', roles: ['staff'] },
]

const itemClass = ({ isActive }) =>
  `flex items-center justify-between rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
    isActive ? 'bg-white text-brand-700 shadow-lg' : 'text-white/85 hover:bg-white/15 hover:text-white'
  }`

const AdminLayout = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const items = MENU.filter(item => item.roles.includes(user.role))

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className="flex min-h-screen flex-col bg-blush md:flex-row">
      <aside className="bg-brand w-full p-5 md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0">
        <Link to="/" className="block px-2 font-display text-2xl font-extrabold text-white">🛍️ ShopKart</Link>
        <span className="mx-2 mt-2 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
          {user.role} panel
        </span>

        <nav className="mt-8 space-y-1.5">
          {items.map(item => (
            <NavLink key={item.to} to={item.to} end className={itemClass}>
              {item.label}
              {item.soon && <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">soon</span>}
            </NavLink>
          ))}
        </nav>

        <div className="mt-10 rounded-2xl bg-white/15 p-4 text-sm text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white font-bold text-brand-700">
              {user.name?.[0]?.toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate font-bold">{user.name}</p>
              <p className="truncate text-xs text-white/75">{user.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="mt-3 w-full rounded-xl bg-white/20 py-2 font-semibold hover:bg-white/30">
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10">
        <Outlet />
      </main>
    </div>
  )
}

export default AdminLayout
