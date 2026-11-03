// Admin / staff frame: grouped sidebar + top bar. Menu items list which roles can see them.
import { ArrowLeftRight, Boxes, ChartColumn, FolderTree, ExternalLink, FileClock, LayoutDashboard, LogOut, Megaphone, Menu, Package, PackagePlus, ReceiptText, SlidersHorizontal, Store, Tag, Users, Warehouse } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { INVENTORY_ROLES, ROLE_LABEL } from '../utils/roles'

const ADMINS = ['admin', 'superadmin']
const EXACT = ['/admin', '/inventory'] // these menu items match only their own page, not sub-pages
const MENU = [
  { group: 'Overview', items: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, roles: ADMINS },
    { to: '/admin/reports', label: 'Reports', icon: ChartColumn, roles: ADMINS },
  ] },
  { group: 'Marketplace', items: [
    { to: '/admin/stores', label: 'Stores', icon: Store, roles: ['superadmin'] },
    { to: '/admin/coupons', label: 'Coupons', icon: Tag, roles: ['superadmin'] },
    { to: '/admin/site', label: 'Site content', icon: Megaphone, roles: ['superadmin'] },
  ] },
  { group: 'Catalog', items: [
    { to: '/admin/products', label: 'Products', icon: Package, roles: ADMINS },
    { to: '/admin/categories', label: 'Categories', icon: FolderTree, roles: ['superadmin'] },
  ] },
  { group: 'Inventory', items: [
    { to: '/inventory', label: 'Overview', icon: Boxes, roles: INVENTORY_ROLES },
    { to: '/inventory/stock', label: 'Stock levels', icon: Package, roles: INVENTORY_ROLES },
    { to: '/inventory/receipts', label: 'Goods receipts', icon: PackagePlus, roles: INVENTORY_ROLES },
    { to: '/inventory/transfers', label: 'Transfers', icon: ArrowLeftRight, roles: INVENTORY_ROLES },
    { to: '/inventory/adjustments', label: 'Adjustments', icon: SlidersHorizontal, roles: INVENTORY_ROLES },
    { to: '/inventory/movements', label: 'Stock history', icon: FileClock, roles: INVENTORY_ROLES },
    { to: '/inventory/warehouses', label: 'Warehouses', icon: Warehouse, roles: INVENTORY_ROLES },
  ] },
  { group: 'Sales', items: [
    { to: '/admin/orders', label: 'Orders', icon: ReceiptText, roles: ADMINS },
    { to: '/staff/orders', label: 'Orders', icon: ReceiptText, roles: ['staff'] },
  ] },
  { group: 'People', items: [{ to: '/admin/users', label: 'Users', icon: Users, roles: ADMINS }] },
]

const itemClass = ({ isActive }) =>
  `group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition ${
    isActive ? 'bg-brand-50 text-brand-800 ring-1 ring-brand-100' : 'text-ink-600 hover:bg-ink-300/10 hover:text-ink-900'
  }`

const AdminLayout = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const groups = MENU.map(g => ({ ...g, items: g.items.filter(i => i.roles.includes(user.role)) })).filter(g => g.items.length)
  const current = groups.flatMap(g => g.items).find(i => (EXACT.includes(i.to) ? pathname === i.to : pathname.startsWith(i.to)))

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-[#f6f8f7] md:flex">
      {/* Sidebar (slides in on mobile) */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-ink-300/20 bg-white transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 ${menuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <div className="flex items-center gap-2 px-5 py-5">
          <img src="/logo-mark.png" alt="" className="h-9 w-auto" />
          <div>
            <p className="font-display text-lg font-extrabold leading-none text-ink-900">Buy Pilot</p>
            <p className="mt-1 max-w-[150px] truncate text-[11px] font-semibold uppercase tracking-wider text-ink-400">
              {user.role === 'superadmin' ? 'All stores' : user.store_name || ROLE_LABEL[user.role]}
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
          {groups.map(group => (
            <div key={group.group}>
              <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-400">{group.group}</p>
              <div className="space-y-0.5">
                {group.items.map(({ icon: Icon, ...item }) => (
                  <NavLink key={item.to} to={item.to} end={EXACT.includes(item.to)} onClick={() => setMenuOpen(false)} className={itemClass}>
                    <Icon size={18} strokeWidth={2} className="shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.soon && <span className="rounded-md bg-mango-100 px-1.5 py-0.5 text-[10px] font-bold text-mango-600">Soon</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="m-3 rounded-2xl bg-[#f6f8f7] p-3">
          <div className="flex items-center gap-3">
            <span className="bg-brand flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold text-white">{user.name?.[0]?.toUpperCase()}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink-900">{user.name}</p>
              <p className="truncate text-xs text-ink-400">{user.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2 text-sm font-semibold text-ink-600 ring-1 ring-ink-300/30 hover:text-rose-600">
            <LogOut size={16} /> Log out
          </button>
        </div>
      </aside>
      {menuOpen && <button aria-label="Close menu" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-30 bg-ink-900/30 md:hidden" />}

      <div className="min-w-0 flex-1">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-ink-300/20 bg-white/85 px-4 py-3 backdrop-blur md:px-8">
          <button onClick={() => setMenuOpen(true)} aria-label="Open menu" className="rounded-lg p-2 text-ink-700 hover:bg-ink-300/10 md:hidden"><Menu size={22} /></button>
          <p className="min-w-0 truncate text-sm text-ink-400">
            <span className="hidden sm:inline">{ROLE_LABEL[user.role]}{user.store_name && <span className="font-semibold text-brand-700"> · {user.store_name}</span>} <span className="mx-1">/</span></span>
            <span className="font-semibold text-ink-800">{current?.label || 'Products'}</span>
          </p>
          <Link to="/" aria-label="View store" className="ml-auto flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50 sm:px-4">
            <span className="hidden sm:inline">View store</span> <ExternalLink size={15} />
          </Link>
        </header>

        <main className="mx-auto max-w-7xl p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
