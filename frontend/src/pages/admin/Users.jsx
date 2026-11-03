import { Search, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { addStaff, getUsers, setUserRole } from '../../api/manage'
import { adminCard, adminInput } from '../../components/admin/adminStyles'
import PageHeader from '../../components/admin/PageHeader'
import Spinner from '../../components/Spinner'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../hooks/useAuth'
import { getErrorMessage } from '../../utils/format'
import { ROLE_LABEL } from '../../utils/roles'
import { useConfirm } from '../../hooks/useConfirm'
import LoadError from '../../components/LoadError'
import NewAccountForm from '../../components/admin/NewAccountForm'
import Pagination from '../../components/admin/Pagination'

const ROLE_STYLE = {
  superadmin: 'bg-ink-900 text-white', admin: 'bg-violet-100 text-violet-700', staff: 'bg-sky-100 text-sky-700', warehouse: 'bg-mango-100 text-mango-600', customer: 'bg-brand-100 text-brand-800',
}

const Users = () => {
  const { user: me } = useAuth()
  const [role, setRole] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [version, setVersion] = useState(0)
  const { data, loading, error } = useApi(getUsers, { role, search, page }, version)
  const { confirm, notify, dialog } = useConfirm()
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState('')

  // Staff / store admin → normal customer (customers themselves are never turned into staff)
  const removeAccess = async user => {
    const ok = await confirm({
      title: `Remove ${ROLE_LABEL[user.role].toLowerCase()} access?`,
      message: `${user.email} becomes a normal customer and loses access to the admin pages the next time they load a page.`,
      confirmLabel: 'Remove access', cancelLabel: 'Cancel', tone: 'danger',
    })
    if (!ok) return
    try {
      await setUserRole(user.id, 'customer')
      setVersion(v => v + 1)
    } catch (error) {
      notify(getErrorMessage(error), 'Could not change the role')
    }
  }

  return (
    <div className="space-y-6">
      {dialog}
      <PageHeader title="Users" subtitle={me.role === 'superadmin' ? 'Everyone on Shopora – add store admins on the Stores page' : `Customers and the team of ${me.store_name} – add staff for orders and warehouse managers for stock`}>
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Name or email…" className={`${adminInput} pl-9`} />
        </div>
        <select value={role} onChange={e => { setRole(e.target.value); setPage(1) }} className={adminInput}>
          <option value="">All roles</option>
          <option value="customer">Customers</option>
          <option value="staff">Staff</option>
          <option value="warehouse">Warehouse managers</option>
          {me.role === 'superadmin' && <option value="admin">Store admins</option>}
        </select>
        {me.role === 'admin' && (
          <button onClick={() => { setAdding(true); setAdded('') }} className="bg-brand flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white">
            <UserPlus size={16} /> Add staff
          </button>
        )}
      </PageHeader>

      {adding && (
        <NewAccountForm
          title={`New staff or warehouse-manager login for ${me.store_name}`}
          buttonLabel="Create login"
          roles={[['staff', 'Staff – handles orders'], ['warehouse', 'Warehouse manager – handles stock']]}
          onSave={addStaff}
          onCancel={() => setAdding(false)}
          onDone={email => { setAdding(false); setAdded(`${email} can now log in to ${me.store_name}.`); setVersion(v => v + 1) }}
        />
      )}
      {added && <p className="rounded-2xl bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-800">✓ {added}</p>}

      {loading ? <Spinner /> : error ? <LoadError what="users" onRetry={() => setVersion(v => v + 1)} /> : (
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
                    <span className="flex items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${ROLE_STYLE[user.role]}`}>{ROLE_LABEL[user.role]}{user.id === me.id && ' (you)'}</span>
                      {/* Remove access: super admin → any admin / staff; store admin → only their own staff (the API checks it too) */}
                      {user.id !== me.id && ['admin', 'staff', 'warehouse'].includes(user.role) && (me.role === 'superadmin' || user.role !== 'admin') && (
                        <button onClick={() => removeAccess(user)} className="text-xs font-semibold text-ink-400 hover:text-rose-600">Remove access</button>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={page} count={data.count} onChange={setPage} />}
    </div>
  )
}

export default Users
