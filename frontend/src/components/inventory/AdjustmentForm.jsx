// Adjust stock in one warehouse: add (found) or remove (damaged / lost / count correction)
import { useState } from 'react'
import { createAdjustment } from '../../api/inventory'
import { getErrorMessage } from '../../utils/format'
import { adminInput } from '../admin/adminStyles'
import VariantPicker from './VariantPicker'
import WarehouseSelect from './WarehouseSelect'

const REASONS = [['damaged', 'Damaged'], ['lost', 'Lost / missing'], ['found', 'Found'], ['count', 'Stock-count correction'], ['other', 'Other']]

const AdjustmentForm = ({ warehouses, needsApproval, onDone, onCancel }) => {
  const [warehouse, setWarehouse] = useState(warehouses.find(w => w.is_default)?.id ?? '')
  const [variant, setVariant] = useState(null)
  const [direction, setDirection] = useState(-1) // -1 remove, +1 add
  const [qty, setQty] = useState(1)
  const [reason, setReason] = useState('damaged')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const submit = async e => {
    e.preventDefault()
    if (!variant) return setError('Choose a product.')
    setError('')
    try {
      onDone(await createAdjustment({ warehouse, variant: variant.id, change: direction * Number(qty), reason, note }))
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const toggle = value => `rounded-full px-4 py-2 text-sm font-bold ${direction === value ? 'bg-ink-900 text-white' : 'bg-[#f6f8f7] text-ink-600'}`

  return (
    <form onSubmit={submit} className="space-y-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-ink-300/20">
      <div>
        <h2 className="text-lg font-bold text-ink-900">Adjust stock</h2>
        <p className="text-sm text-ink-500">{needsApproval ? 'A store admin approves it before the stock changes.' : 'Applied straight away.'}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs font-semibold text-ink-600">Warehouse<div className="mt-1"><WarehouseSelect warehouses={warehouses} value={warehouse} onChange={setWarehouse} /></div></label>
        <div className="text-xs font-semibold text-ink-600">Product
          <div className="mt-1">
            {variant ? (
              <div className="flex items-center justify-between rounded-xl bg-[#f6f8f7] px-3 py-2 text-sm">
                <span><b className="text-ink-900">{variant.product}</b> <span className="text-ink-400">{variant.sku} · {variant.warehouses[warehouse] ?? 0} in this warehouse</span></span>
                <button type="button" onClick={() => setVariant(null)} className="font-semibold text-brand-700">Change</button>
              </div>
            ) : <VariantPicker onPick={setVariant} warehouseId={warehouse} />}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex gap-1"><button type="button" onClick={() => setDirection(-1)} className={toggle(-1)}>− Remove</button><button type="button" onClick={() => setDirection(1)} className={toggle(1)}>+ Add</button></div>
        <label className="text-xs font-semibold text-ink-600">Quantity<input type="number" min="1" required value={qty} onChange={e => setQty(e.target.value)} className={`${adminInput} mt-1 block w-24`} /></label>
        <label className="text-xs font-semibold text-ink-600">Reason
          <select value={reason} onChange={e => setReason(e.target.value)} className={`${adminInput} mt-1 block`}>{REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </label>
        <input maxLength={200} value={note} onChange={e => setNote(e.target.value)} placeholder="Note (e.g. box crushed in delivery)" className={`${adminInput} min-w-[200px] flex-1`} />
      </div>
      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-full px-4 py-2 text-sm font-bold text-ink-600 hover:bg-[#f6f8f7]">Cancel</button>
        <button className="bg-brand rounded-full px-6 py-2 text-sm font-bold text-white">{needsApproval ? 'Send for approval' : 'Apply adjustment'}</button>
      </div>
    </form>
  )
}

export default AdjustmentForm
