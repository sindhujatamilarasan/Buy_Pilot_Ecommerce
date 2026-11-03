// Warehouses of my store. Store admins (and the super admin) add, edit, set the default, deactivate.
import { Plus, Star, Warehouse as WarehouseIcon } from 'lucide-react'
import { useState } from 'react'
import { getWarehouses, updateWarehouse } from '../../api/inventory'
import { adminCard } from '../../components/admin/adminStyles'
import PageHeader from '../../components/admin/PageHeader'
import WarehouseForm from '../../components/inventory/WarehouseForm'
import LoadError from '../../components/LoadError'
import Spinner from '../../components/Spinner'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../hooks/useAuth'
import { useConfirm } from '../../hooks/useConfirm'
import { getErrorMessage } from '../../utils/format'

const Warehouses = () => {
  const { user } = useAuth()
  const isAdmin = user.role !== 'warehouse'
  const [editing, setEditing] = useState(null) // 'new' | warehouse id
  const [version, setVersion] = useState(0)
  const { data, loading, error } = useApi(getWarehouses, undefined, version)
  const { confirm, notify, dialog } = useConfirm()
  const reload = () => { setEditing(null); setVersion(v => v + 1) }

  const change = async (warehouse, data, question) => {
    if (question && !(await confirm({ title: question, confirmLabel: 'Yes', tone: 'info' }))) return
    try {
      await updateWarehouse(warehouse.id, data)
      reload()
    } catch (err) {
      notify(getErrorMessage(err), `Could not update ${warehouse.name}`)
    }
  }

  if (loading) return <Spinner />
  if (error) return <LoadError what="warehouses" onRetry={reload} />

  return (
    <div className="space-y-5">
      <PageHeader title="Warehouses" subtitle={isAdmin ? 'Sales take stock from the default warehouse first' : 'Your store’s warehouses'}>
        {isAdmin && editing !== 'new' && <button onClick={() => setEditing('new')} className="bg-brand flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-md"><Plus size={16} /> Add warehouse</button>}
      </PageHeader>
      {editing === 'new' && <WarehouseForm onSaved={reload} onCancel={() => setEditing(null)} />}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.map(w => editing === w.id ? (
          <div key={w.id} className="md:col-span-2 xl:col-span-3"><WarehouseForm warehouse={w} onSaved={reload} onCancel={() => setEditing(null)} /></div>
        ) : (
          <div key={w.id} className={`${adminCard} p-5 ${w.is_active ? '' : 'opacity-60'}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><WarehouseIcon size={20} /></span>
                <div><p className="font-bold text-ink-900">{w.name}</p><p className="text-xs text-ink-400">{w.code}{w.city && ` · ${w.city}`}{user.role === 'superadmin' && ` · ${w.store_name}`}</p></div>
              </div>
              {w.is_default && <span className="rounded-full bg-brand-600 px-2.5 py-0.5 text-[11px] font-bold text-white">Default</span>}
              {!w.is_active && <span className="rounded-full bg-ink-300/20 px-2.5 py-0.5 text-[11px] font-bold text-ink-500">Inactive</span>}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[['Units', w.units], ['Products', w.skus], ['Low', w.low]].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-[#f6f8f7] py-2"><p className="font-display text-lg font-extrabold text-ink-900">{value}</p><p className="text-xs text-ink-500">{label}</p></div>
              ))}
            </div>
            {isAdmin && (
              <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
                <button onClick={() => setEditing(w.id)} className="text-brand-700">Edit</button>
                {!w.is_default && w.is_active && <button onClick={() => change(w, { is_default: true }, `Make ${w.name} the default warehouse?`)} className="flex items-center gap-1 text-ink-600"><Star size={14} /> Make default</button>}
                {!w.is_default && <button onClick={() => change(w, { is_active: !w.is_active }, w.is_active ? `Deactivate ${w.name}?` : null)} className="text-ink-400 hover:text-rose-600">{w.is_active ? 'Deactivate' : 'Activate'}</button>}
              </div>
            )}
          </div>
        ))}
      </div>
      {dialog}
    </div>
  )
}

export default Warehouses
