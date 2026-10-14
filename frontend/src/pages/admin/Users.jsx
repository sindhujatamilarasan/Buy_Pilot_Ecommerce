import { useState } from 'react'
import { getUsers, setUserRole } from '../../api/manage'
import { adminCard, adminInput } from '../../components/admin/adminStyles'
import PageHeader from '../../components/admin/PageHeader'
import Spinner from '../../components/Spinner'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../hooks/useAuth'
import { getErrorMessage } from '../../utils/format'

const ROLE_STYLE = { admin: 'bg-violet-100 text-violet-700', staff: 'bg-sky-100 text-sky-700', customer: 'bg-brand-100 text-brand-800' }

const Users = () => {
  const { user: me } = useAuth()
  const [role, setRole] = useState('')
  const [search, setSearch] = useState('')
  const [version, setVersion] = useState(0)
  const { data, loading } = useApi(getUsers, { role, search }, version)

  const changeRole = async (user, newRole) => {
    if (!window.confirm(`Make ${user.email} a ${newRole}?`)) return
    try {
      await setUserRole(user.id, newRole)
      setVersion(v => v + 1)
    } catch (error) {
      window.alert(getErrorMessage(error))
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Users 👥" subtitle="Give staff access to the orders page">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name or email…" className={adminInput} />
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
            <thead className="bg-brand-50 text-xs font-bold uppercase tracking-wider text-brand-700">
              <tr><th className="px-5 py-3">User</th><th className="px-5 py-3">Joined</th><th className="px-5 py-3">Orders</th><th className="px-5 py-3">Role</th></tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {data.results.map(user => (
                <tr key={user.id}>
                  <td className="px-5 py-3">
                    <p className="font-semibold text-ink-900">{user.name || '—'}</p>
                    <p className="text-xs text-ink-500">{user.email}</p>
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
