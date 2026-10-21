import { MapPin, Pencil, Phone, Plus, Star, Trash } from 'lucide-react'
import { useState } from 'react'
import { deleteAddress, getAddresses, updateAddress } from '../../api/orders'
import AddressForm from '../../components/AddressForm'
import Spinner from '../../components/Spinner'
import { useApi } from '../../hooks/useApi'
import { useConfirm } from '../../hooks/useConfirm'
import LoadError from '../../components/LoadError'

const Addresses = () => {
  const [version, setVersion] = useState(0) // bump → reload the list
  const { data: addresses, loading, error } = useApi(getAddresses, version)
  const [editing, setEditing] = useState(null) // 'new' | address id | null
  const { confirm, dialog } = useConfirm()
  const reload = () => {
    setEditing(null)
    setVersion(v => v + 1)
  }

  const remove = async address => {
    const ok = await confirm({ title: 'Delete this address?', message: `${address.name}, ${address.city} – ${address.pincode} will be removed from your saved addresses.`, confirmLabel: 'Delete address', cancelLabel: 'Keep it' })
    if (!ok) return
    await deleteAddress(address.id)
    reload()
  }

  if (loading) return <Spinner />
  if (error) return <LoadError what="your addresses" onRetry={reload} />

  return (
    <div>
      {dialog}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">Addresses</h1>
          <p className="text-sm text-ink-500">Where we deliver your orders.</p>
        </div>
        {editing !== 'new' && (
          <button onClick={() => setEditing('new')} className="bg-brand flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white">
            <Plus size={16} /> Add address
          </button>
        )}
      </div>

      {editing === 'new' && <div className="mt-6"><AddressForm onSaved={reload} onCancel={() => setEditing(null)} /></div>}

      {addresses.length === 0 && editing !== 'new' && (
        <div className="mt-6 rounded-2xl border-2 border-dashed border-ink-300/30 p-10 text-center text-ink-500">
          <MapPin className="mx-auto text-ink-300" size={36} />
          <p className="mt-2 font-semibold">No saved addresses yet</p>
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {addresses.map(address =>
          editing === address.id ? (
            <div key={address.id} className="md:col-span-2"><AddressForm address={address} onSaved={reload} onCancel={() => setEditing(null)} /></div>
          ) : (
            <div key={address.id} className={`rounded-2xl p-5 ring-1 ${address.is_default ? 'bg-brand-50/60 ring-brand-200' : 'ring-ink-300/25'}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-ink-900">{address.name}</p>
                {address.is_default && <span className="rounded-full bg-brand-600 px-2.5 py-0.5 text-[11px] font-bold text-white">Default</span>}
              </div>
              <p className="mt-1 text-sm text-ink-600">{address.address}</p>
              <p className="text-sm text-ink-600">{address.city} – {address.pincode}</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-500"><Phone size={14} /> {address.phone}</p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">
                <button onClick={() => setEditing(address.id)} className="flex items-center gap-1 text-brand-700"><Pencil size={15} /> Edit</button>
                {!address.is_default && (
                  <button onClick={async () => { await updateAddress(address.id, { is_default: true }); reload() }} className="flex items-center gap-1 text-ink-600 hover:text-brand-700">
                    <Star size={15} /> Set default
                  </button>
                )}
                <button onClick={() => remove(address)} className="flex items-center gap-1 text-ink-400 hover:text-rose-600"><Trash size={15} /> Delete</button>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  )
}

export default Addresses
