// Avatar button in the navbar → dropdown with account links
import { ChevronDown, LayoutDashboard, LogOut, MapPin, ReceiptText, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const UserMenu = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Close when clicking anywhere outside the menu
  useEffect(() => {
    const close = e => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const links = [
    ...(['admin', 'superadmin'].includes(user.role) ? [{ to: '/admin', label: user.role === 'superadmin' ? 'Super admin console' : 'Store dashboard', icon: LayoutDashboard }] : []),
    ...(user.role === 'staff' ? [{ to: '/staff/orders', label: 'Staff orders', icon: LayoutDashboard }] : []),
    { to: '/account', label: 'My account', icon: UserRound },
    { to: '/orders', label: 'My orders', icon: ReceiptText },
    { to: '/account/addresses', label: 'Addresses', icon: MapPin },
  ]

  const handleLogout = async () => {
    setOpen(false)
    await logout()
    navigate('/')
  }

  return (
    <div ref={ref} className="relative ml-2">
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-brand-50" aria-expanded={open}>
        <span className="bg-brand flex h-9 w-9 items-center justify-center rounded-full font-bold text-white">{user.name?.[0]?.toUpperCase()}</span>
        <span className="hidden max-w-[120px] truncate text-sm font-semibold text-ink-800 lg:block">{user.name}</span>
        <ChevronDown size={16} className={`text-ink-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-ink-300/20">
          <div className="bg-brand-soft px-4 py-3">
            <p className="truncate font-bold text-ink-900">{user.name}</p>
            <p className="truncate text-xs text-ink-500">{user.email}</p>
          </div>
          <div className="p-1.5">
            {links.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-[#f6f8f7]">
                <Icon size={17} className="text-ink-400" /> {label}
              </Link>
            ))}
            <button onClick={handleLogout} className="mt-1 flex w-full items-center gap-3 rounded-xl border-t border-ink-300/20 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50">
              <LogOut size={17} /> Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserMenu
