// Add or edit a warehouse (store admin / super admin). The super admin also picks the store.
import { useState } from 'react'
import { createWarehouse, updateWarehouse } from '../../api/inventory'
import { useAuth } from '../../hooks/useAuth'
import { getErrorMessage } from '../../utils/format'
import { adminInput } from '../admin/adminStyles'
import StoreSelect from '../admin/StoreSelect'

const WarehouseForm = ({ warehouse, onSaved, onCancel }) => {
  const { user } = useAuth()
  const [form, setForm] = useState({ name: warehouse?.name || '', code: warehouse?.code || '', city: warehouse?.city || '', address: warehouse?.address || '', store: '' })
  const [error, setError] = useState('')
  const set = field => e => setForm({ ...form, [field]: e.target.value })

  const submit = async e => {
    e.preventDefault()
    setError('')
    try {
      onSaved(warehouse ? await updateWarehouse(warehouse.id, form) : await createWarehouse(form))
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-ink-300/20">
      <h2 className="text-lg font-bold text-ink-900">{warehouse ? `Edit ${warehouse.name}` : 'New warehouse'}</h2>
      <div className="grid gap-3 md:grid-cols-4">
        <input required maxLength={100} value={form.name} onChange={set('name')} placeholder="Name, e.g. Chennai warehouse" className={`${adminInput} md:col-span-2`} />
        <input required maxLength={12} value={form.code} onChange={set('code')} placeholder="Code, e.g. CHN-1" className={`${adminInput} uppercase`} />
        <input maxLength={60} value={form.city} onChange={set('city')} placeholder="City (orders to this city ship from here)" title="Customers in this city get their orders packed from this warehouse" className={adminInput} />
        <input maxLength={200} value={form.address} onChange={set('address')} placeholder="Address (optional)" className={`${adminInput} md:col-span-3`} />
        {user.role === 'superadmin' && !warehouse && <StoreSelect value={form.store} onChange={store => setForm({ ...form, store })} />}
      </div>
      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-full px-4 py-2 text-sm font-bold text-ink-600 hover:bg-[#f6f8f7]">Cancel</button>
        <button className="bg-brand rounded-full px-6 py-2 text-sm font-bold text-white">{warehouse ? 'Save' : 'Add warehouse'}</button>
      </div>
    </form>
  )
}

export default WarehouseForm
