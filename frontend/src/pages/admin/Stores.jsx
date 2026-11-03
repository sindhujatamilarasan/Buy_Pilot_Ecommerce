// Super admin: all stores on the marketplace – create stores, add store admins, open / close stores
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { createStore, getStores, updateStore } from '../../api/manage'
import { adminCard, adminInput } from '../../components/admin/adminStyles'
import PageHeader from '../../components/admin/PageHeader'
import StoreCard from '../../components/admin/StoreCard'
import Spinner from '../../components/Spinner'
import { useApi } from '../../hooks/useApi'
import { useConfirm } from '../../hooks/useConfirm'
import { getErrorMessage } from '../../utils/format'

const Stores = () => {
  const [version, setVersion] = useState(0)
  const { data: stores, loading } = useApi(getStores, version)
  const { confirm, notify, dialog } = useConfirm()
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })
  const [message, setMessage] = useState('')
  const reload = () => setVersion(v => v + 1)

  const create = async e => {
    e.preventDefault()
    try {
      await createStore(form)
      setMessage(`Store “${form.name}” created. Now add its store admin.`)
      setForm({ name: '', description: '' })
      setCreating(false)
      reload()
    } catch (error) {
      notify(getErrorMessage(error), 'Could not create the store')
    }
  }

  const toggleActive = async store => {
    if (store.is_active) {
      const ok = await confirm({
        title: `Close ${store.name}?`,
        message: 'Its products disappear from the shop. Existing orders and data are kept, and you can open it again any time.',
        confirmLabel: 'Close store', cancelLabel: 'Keep open',
      })
      if (!ok) return
    }
    await updateStore(store.id, { is_active: !store.is_active })
    reload()
  }

  return (
    <div className="space-y-6">
      {dialog}
      <PageHeader title="Stores" subtitle="Every seller on Shopora. Each store admin manages only their own store.">
        <button onClick={() => setCreating(c => !c)} className="bg-brand flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-md"><Plus size={16} /> New store</button>
      </PageHeader>

      {message && <p role="status" className="rounded-2xl bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-800">✓ {message}</p>}

      {creating && (
        <form onSubmit={create} className={`${adminCard} grid gap-3 p-5 sm:grid-cols-[1fr_2fr_auto] sm:items-end`}>
          <label className="text-xs font-semibold text-ink-600">Store name
            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={`${adminInput} mt-1 w-full`} />
          </label>
          <label className="text-xs font-semibold text-ink-600">Short description
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={`${adminInput} mt-1 w-full`} />
          </label>
          <button className="bg-brand rounded-full px-5 py-2.5 text-sm font-bold text-white">Create store</button>
        </form>
      )}

      {loading ? <Spinner /> : (
        <div className="grid gap-5 lg:grid-cols-2">
          {stores.map(store => (
            <StoreCard key={store.id} store={store} onToggleActive={toggleActive} onAdminAdded={text => { setMessage(text); reload() }} />
          ))}
        </div>
      )}
    </div>
  )
}

export default Stores
