import { Search } from 'lucide-react'
import { useState } from 'react'
import { getUsers, setUserRole } from '../../api/manage'
import { adminCard, adminInput } from '../../components/admin/adminStyles'
import PageHeader from '../../components/admin/PageHeader'
import Spinner from '../../components/Spinner'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../hooks/useAuth'
import { getErrorMessage } from '../../utils/format'
import { ROLE_LABEL } from '../../utils/roles'
import { useConfirm } from '../../hooks/useConfirm'

const ROLE_STYLE = {
  superadmin: 'bg-ink-900 text-white', admin: 'bg-violet-100 text-violet-700', staff: 'bg-sky-100 text-sky-700', customer: 'bg-brand-100 text-brand-800',
}

const Users = () => {
  const { user: me } = useAuth()
  const [role, setRole] = useState('')
  const [search, setSearch] = useState('')
  const [version, setVersion] = useState(0)
  const { data, loading } = useApi(getUsers, { role, search }, version)
  const { confirm, notify, dialog } = useConfirm()

  const changeRole = async (user, newRole) => {
    const removing = newRole === 'customer'
    const ok = await confirm({
      title: removing ? `Remove ${ROLE_LABEL[user.role].toLowerCase()} access?` : `Make ${user.email} staff?`,
      message: removing
        ? `${user.email} becomes a normal customer and loses access to the admin pages the next time they load a page.`
        : `They will see and update ${me.store_name}’s orders. They cannot change products, prices or users.`,
      confirmLabel: removing ? 'Remove access' : 'Make staff', cancelLabel: 'Cancel', tone: removing ? 'danger' : 'info',
    })
    if (!ok) return
    try {
      await setUserRole(user.id, newRole)
      setVersion(v => v + 1)
    } catch (error) {
      notify(getErrorMessage(error), 'Could not change the role')
    }
  }

  return (
    <div className="space-y-6">
      {dialog}
      <PageHeader title="Users" subtitle={me.role === 'superadmin' ? 'Everyone on ShopKart – add store admins on the Stores page' : `Customers and the staff of ${me.store_name} – give staff access to your orders page`}>
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name or email…" className={`${adminInput} pl-9`} />
        </div>
        <select value={role} onChange={e => setRole(e.target.value)} className={adminInput}>
          <option value="">All roles</option>
          <option value="customer">Customers</option>
          <option value="staff">Staff</option>
          {me.role === 'superadmin' && <option value="admin">Store admins</option>}
        </select>
      </PageHeader>

      {loading ? <Spinner /> : (
        <div className={`${adminCard} overflow-x-auto`}>
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f6f8f7] text-xs font-semibold uppercase tracking-wider text-ink-400">
              <tr><th className="px-5 py-3">User</th><th className="px-5 py-3">Joined</th><th className="px-5 py-3">Orders</th><th className="px-5 py-3">Store</th><th className="px-5 py-3">Role</th></tr>
            </thead>
            <tbody className="divide-y divide-ink-300/20">
              {data.results.map(user => (
                <tr key={user.id} className="hover:bg-[#f6f8f7]">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="bg-brand flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white">{(user.name || user.email)[0].toUpperCase()}</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-ink-900">{user.name || '—'}</p>
                        <p className="text-xs text-ink-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-ink-600">{new Date(user.date_joined).toLocaleDateString('en-IN')}</td>
                  <td className="px-5 py-3 text-ink-600">{user.orders}</td>
                  <td className="px-5 py-3 text-xs font-semibold text-ink-600">{user.store_name || '—'}</td>
                  <td className="px-5 py-3">
                    {user.id === me.id || user.role === 'superadmin' || (me.role === 'superadmin' && user.role === 'customer') ? (
                      // Nothing to change here (the super admin adds store admins on the Stores page)
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${ROLE_STYLE[user.role]}`}>{ROLE_LABEL[user.role]}{user.id === me.id && ' (you)'}</span>
                    ) : me.role === 'superadmin' ? (
                      <span className="flex items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${ROLE_STYLE[user.role]}`}>{ROLE_LABEL[user.role]}</span>
                        <button onClick={() => changeRole(user, 'customer')} className="text-xs font-semibold text-ink-400 hover:text-rose-600">Remove access</button>
                      </span>
                    ) : (
                      // Store admin: customer ⇄ staff of their own store only
                      <select value={user.role} onChange={e => changeRole(user, e.target.value)} className={`rounded-full px-3 py-1 text-xs font-bold outline-none ${ROLE_STYLE[user.role]}`}>
                        <option value="customer">Customer</option>
                        <option value="staff">Staff</option>
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default Users
