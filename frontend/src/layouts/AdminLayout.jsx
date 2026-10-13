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
  `flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
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
    <div className="flex min-h-screen flex-col bg-slate-100 md:flex-row">
      <aside className="w-full bg-slate-900 p-4 md:w-64 md:shrink-0">
        <Link to="/" className="block px-3 py-2 text-xl font-extrabold text-white">🛍️ ShopKart</Link>
        <p className="px-3 text-xs uppercase tracking-wider text-slate-500">{user.role} panel</p>

        <nav className="mt-6 space-y-1">
          {items.map(item => (
            <NavLink key={item.to} to={item.to} end className={itemClass}>
              {item.label}
              {item.soon && <span className="rounded bg-slate-700 px-1.5 text-[10px] text-slate-300">soon</span>}
            </NavLink>
          ))}
        </nav>

        <div className="mt-8 border-t border-slate-800 px-3 pt-4 text-sm text-slate-400">
          <p>{user.name}</p>
          <p className="text-xs">{user.email}</p>
          <button onClick={handleLogout} className="mt-3 text-red-400 hover:underline">Logout</button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-8">
        <Outlet />
      </main>
    </div>
  )
}

export default AdminLayout
