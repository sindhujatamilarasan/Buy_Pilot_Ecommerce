// Choose one of the saved addresses, or add a new one
import { useState } from 'react'
import AddressForm from './AddressForm'

const AddressPicker = ({ addresses, selectedId, onSelect, onAdded }) => {
  const [adding, setAdding] = useState(addresses.length === 0)

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-brand-100">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink-900">📍 Delivery address</h2>
        {!adding && <button onClick={() => setAdding(true)} className="text-sm font-bold text-brand-700">+ Add new</button>}
      </div>

      <div className="mt-4 space-y-3">
        {addresses.map(address => (
          <label key={address.id} className={`flex cursor-pointer gap-3 rounded-2xl border-2 p-4 transition ${selectedId === address.id ? 'border-brand-500 bg-brand-50' : 'border-brand-100 hover:border-brand-300'}`}>
            <input type="radio" name="address" checked={selectedId === address.id} onChange={() => onSelect(address.id)} className="mt-1 accent-brand-600" />
            <div className="text-sm">
              <p className="font-bold text-ink-900">
                {address.name} · {address.phone}
                {address.is_default && <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-[11px] text-brand-700">Default</span>}
              </p>
              <p className="text-ink-600">{address.address}, {address.city} – {address.pincode}</p>
            </div>
          </label>
        ))}

        {adding && (
          <AddressForm
            onSaved={address => {
              setAdding(false)
              onAdded(address)
            }}
            onCancel={addresses.length ? () => setAdding(false) : null}
          />
        )}
      </div>
    </div>
  )
}

export default AddressPicker
