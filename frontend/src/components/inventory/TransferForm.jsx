// New stock transfer between two warehouses of the same store
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { createTransfer } from '../../api/inventory'
import { useAuth } from '../../hooks/useAuth'
import { getErrorMessage } from '../../utils/format'
import { adminInput } from '../admin/adminStyles'
import LinesEditor from './LinesEditor'
import WarehouseSelect from './WarehouseSelect'

const TransferForm = ({ warehouses, needsApproval, onDone, onCancel }) => {
  const { user } = useAuth()
  // A manager tied to one warehouse can only send FROM it, but TO any warehouse of the store
  const sources = user.warehouse ? warehouses.filter(w => w.id === user.warehouse) : warehouses
  const [from, setFrom] = useState(user.warehouse ? String(user.warehouse) : '')
  const [to, setTo] = useState('')
  const [note, setNote] = useState('')
  const [lines, setLines] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async e => {
    e.preventDefault()
    if (!lines.length) return setError('Add at least one product.')
    setSaving(true)
    setError('')
    try {
      onDone(await createTransfer({ from_warehouse: from, to_warehouse: to, note, lines: lines.map(l => ({ variant: l.variant.id, qty: Number(l.qty) })) }))
    } catch (err) {
      setError(getErrorMessage(err))
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-ink-300/20">
      <div>
        <h2 className="text-lg font-bold text-ink-900">New transfer</h2>
        <p className="text-sm text-ink-500">{needsApproval ? 'A store admin approves it, then you dispatch it.' : 'Approved straight away – dispatch it when it leaves.'}</p>
      </div>
      <div className="grid items-end gap-3 md:grid-cols-[1fr_auto_1fr]">
        <label className="text-xs font-semibold text-ink-600">From<div className="mt-1"><WarehouseSelect warehouses={sources} value={from} onChange={setFrom} exclude={to} /></div></label>
        <ArrowRight className="mx-auto mb-2 hidden text-ink-400 md:block" size={20} />
        <label className="text-xs font-semibold text-ink-600">To<div className="mt-1"><WarehouseSelect warehouses={warehouses} value={to} onChange={setTo} exclude={from} /></div></label>
      </div>
      {from ? <LinesEditor lines={lines} onChange={setLines} warehouseId={from} showAvailable /> : <p className="text-sm text-ink-400">Choose the "from" warehouse to add products.</p>}
      <input maxLength={200} value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional)" className={`${adminInput} w-full`} />
      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-full px-4 py-2 text-sm font-bold text-ink-600 hover:bg-[#f6f8f7]">Cancel</button>
        <button disabled={saving} className="bg-brand rounded-full px-6 py-2 text-sm font-bold text-white disabled:opacity-60">{saving ? 'Saving…' : needsApproval ? 'Request transfer' : 'Create transfer'}</button>
      </div>
    </form>
  )
}

export default TransferForm
