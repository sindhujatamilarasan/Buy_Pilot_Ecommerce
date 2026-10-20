import { Search } from 'lucide-react'
import { useState } from 'react'
import { getUsers, setUserRole } from '../../api/manage'
import { adminCard, adminInput } from '../../components/admin/adminStyles'
import PageHeader from '../../components/admin/PageHeader'
import Spinner from '../../components/Spinner'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../hooks/useAuth'
import { getErrorMessage } from '../../utils/format'
import { useConfirm } from '../../hooks/useConfirm'

const ROLE_STYLE = { admin: 'bg-violet-100 text-violet-700', staff: 'bg-sky-100 text-sky-700', customer: 'bg-brand-100 text-brand-800' }

const Users = () => {
  const { user: me } = useAuth()
  const [role, setRole] = useState('')
  const [search, setSearch] = useState('')
  const [version, setVersion] = useState(0)
  const { data, loading } = useApi(getUsers, { role, search }, version)
  const { confirm, notify, dialog } = useConfirm()

  const changeRole = async (user, newRole) => {
    const ok = await confirm({ title: `Make this user ${newRole === 'admin' ? 'an' : 'a'} ${newRole}?`, message: `${user.email} will ${newRole === 'customer' ? 'lose access to the staff and admin pages' : `get ${newRole} access`} the next time they load a page.`, confirmLabel: `Make ${newRole}`, cancelLabel: 'Cancel', tone: newRole === 'customer' ? 'danger' : 'info' })
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
      <PageHeader title="Users" subtitle="Customers, staff and admins – give staff access to the orders page">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name or email…" className={`${adminInput} pl-9`} />
        </div>
        <select value={role} onChange={e => setRole(e.target.value)} className={adminInput}>
          <option value="">All roles</option>
          <option value="customer">Customers</option>
          <option value="staff">Staff</option>
          <option value="admin">Admins</option>
        </select>
      </PageHeader>

      {loading ? <Spinner /> : (
        <div className={`${adminCard} overflow-x-auto`}>
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f6f8f7] text-xs font-semibold uppercase tracking-wider text-ink-400">
              <tr><th className="px-5 py-3">User</th><th className="px-5 py-3">Joined</th><th className="px-5 py-3">Orders</th><th className="px-5 py-3">Role</th></tr>
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
                  <td className="px-5 py-3">
                    {user.id === me.id ? (
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${ROLE_STYLE[user.role]}`}>{user.role} (you)</span>
                    ) : (
                      <select value={user.role} onChange={e => changeRole(user, e.target.value)} className={`rounded-full px-3 py-1 text-xs font-bold outline-none ${ROLE_STYLE[user.role]}`}>
                        <option value="customer">customer</option>
                        <option value="staff">staff</option>
                        <option value="admin">admin</option>
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
