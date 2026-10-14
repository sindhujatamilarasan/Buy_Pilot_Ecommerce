// /account/* – profile card on the left, the chosen tab on the right
import { KeyRound, MapPin, ReceiptText, UserRound } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { getMyOrders } from '../../api/orders'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../hooks/useAuth'
import { formatPrice } from '../../utils/format'

const TABS = [
  { to: '/account', label: 'Profile', icon: UserRound, end: true },
  { to: '/account/addresses', label: 'Addresses', icon: MapPin },
  { to: '/orders', label: 'My orders', icon: ReceiptText },
  { to: '/account/security', label: 'Password & security', icon: KeyRound },
]

const tabClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
    isActive ? 'bg-brand-50 text-brand-800 ring-1 ring-brand-100' : 'text-ink-600 hover:bg-[#f6f8f7]'
  }`

const AccountLayout = () => {
  const { user } = useAuth()
  const { data: orders } = useApi(getMyOrders)
  const paid = (orders || []).filter(o => o.payment_status === 'paid')
  const spent = paid.reduce((sum, o) => sum + Number(o.total), 0)

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[300px_1fr]">
      <aside className="space-y-4 lg:sticky lg:top-32">
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-ink-300/20">
          <div className="bg-brand-soft h-20" />
          <div className="-mt-10 px-6 pb-6">
            <span className="bg-brand flex h-20 w-20 items-center justify-center rounded-full font-display text-3xl font-extrabold text-white ring-4 ring-white">
              {user.name?.[0]?.toUpperCase()}
            </span>
            <p className="mt-3 font-display text-xl font-extrabold text-ink-900">{user.name}</p>
            <p className="text-sm text-ink-500">{user.email}</p>
            <p className="mt-1 text-xs text-ink-400">
              Member since {new Date(user.date_joined).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#f6f8f7] p-3">
                <p className="font-display text-xl font-extrabold text-ink-900">{paid.length}</p>
                <p className="text-xs text-ink-500">{paid.length === 1 ? 'Order' : 'Orders'}</p>
              </div>
              <div className="rounded-2xl bg-[#f6f8f7] p-3">
                <p className="font-display text-xl font-extrabold text-ink-900">{formatPrice(spent)}</p>
                <p className="text-xs text-ink-500">Total spent</p>
              </div>
            </div>
          </div>
        </div>

        <nav className="space-y-1 rounded-3xl bg-white p-2 shadow-sm ring-1 ring-ink-300/20">
          {TABS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={tabClass}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <section className="min-w-0 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-ink-300/20 md:p-8">
        <Outlet />
      </section>
    </div>
  )
}

export default AccountLayout
