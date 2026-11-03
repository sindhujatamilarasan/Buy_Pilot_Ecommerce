// "Receive goods": stock arriving from a supplier goes UP in the chosen warehouse
import { useState } from 'react'
import { createReceipt } from '../../api/inventory'
import { getErrorMessage } from '../../utils/format'
import { adminInput } from '../admin/adminStyles'
import LinesEditor from './LinesEditor'
import WarehouseSelect from './WarehouseSelect'

const ReceiptForm = ({ warehouses, onDone, onCancel }) => {
  const [form, setForm] = useState({ warehouse: (warehouses.find(w => w.is_default) ?? warehouses[0])?.id ?? '', supplier: '', reference: '', note: '' })
  const [lines, setLines] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = field => e => setForm({ ...form, [field]: e.target.value })

  const submit = async e => {
    e.preventDefault()
    if (!lines.length) return setError('Add at least one product.')
    setSaving(true)
    setError('')
    try {
      const receipt = await createReceipt({ ...form, lines: lines.map(l => ({ variant: l.variant.id, qty: Number(l.qty) })) })
      onDone(receipt)
    } catch (err) {
      setError(getErrorMessage(err))
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-ink-300/20">
      <h2 className="text-lg font-bold text-ink-900">Receive goods</h2>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-xs font-semibold text-ink-600">Into warehouse
          <div className="mt-1"><WarehouseSelect warehouses={warehouses} value={form.warehouse} onChange={value => setForm({ ...form, warehouse: value })} /></div>
        </label>
        <label className="text-xs font-semibold text-ink-600">Supplier
          <input required maxLength={100} value={form.supplier} onChange={set('supplier')} placeholder="e.g. Nike India" className={`${adminInput} mt-1 w-full`} />
        </label>
        <label className="text-xs font-semibold text-ink-600">Invoice / delivery note no.
          <input maxLength={40} value={form.reference} onChange={set('reference')} placeholder="optional" className={`${adminInput} mt-1 w-full`} />
        </label>
      </div>
      <LinesEditor lines={lines} onChange={setLines} warehouseId={form.warehouse} />
      <input maxLength={200} value={form.note} onChange={set('note')} placeholder="Note (optional)" className={`${adminInput} w-full`} />
      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-full px-4 py-2 text-sm font-bold text-ink-600 hover:bg-[#f6f8f7]">Cancel</button>
        <button disabled={saving} className="bg-brand rounded-full px-6 py-2 text-sm font-bold text-white disabled:opacity-60">
          {saving ? 'Saving…' : `Receive ${lines.reduce((n, l) => n + Number(l.qty || 0), 0)} items`}
        </button>
      </div>
    </form>
  )
}

export default ReceiptForm
