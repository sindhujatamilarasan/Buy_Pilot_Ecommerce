import { useState } from 'react'
import { createCoupon } from '../../api/manage'
import { getErrorMessage } from '../../utils/format'
import { adminInput } from './adminStyles'

const EMPTY = { code: '', type: 'percent', value: '', min_order: 0, expires_at: '', is_active: true }

const CouponForm = ({ onCreated }) => {
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const submit = async e => {
    e.preventDefault()
    setError('')
    try {
      // "2026-12-31" → end of that day; empty → never expires
      const expires_at = form.expires_at ? `${form.expires_at}T23:59:59` : null
      onCreated(await createCoupon({ ...form, expires_at }))
      setForm(EMPTY)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:items-end">
      <label className="text-xs font-bold text-ink-500">Code
        <input required value={form.code} onChange={e => set('code', e.target.value)} placeholder="FESTIVE20" className={`${adminInput} mt-1 w-full uppercase`} />
      </label>
      <label className="text-xs font-bold text-ink-500">Type
        <select value={form.type} onChange={e => set('type', e.target.value)} className={`${adminInput} mt-1 w-full`}>
          <option value="percent">% off</option>
          <option value="flat">₹ off</option>
        </select>
      </label>
      <label className="text-xs font-bold text-ink-500">Value
        <input required type="number" min="1" value={form.value} onChange={e => set('value', e.target.value)} className={`${adminInput} mt-1 w-full`} />
      </label>
      <label className="text-xs font-bold text-ink-500">Min order ₹
        <input type="number" min="0" value={form.min_order} onChange={e => set('min_order', e.target.value)} className={`${adminInput} mt-1 w-full`} />
      </label>
      <label className="text-xs font-bold text-ink-500">Expires on
        <input type="date" value={form.expires_at} onChange={e => set('expires_at', e.target.value)} className={`${adminInput} mt-1 w-full`} />
      </label>
      <button className="bg-brand rounded-full py-2.5 text-sm font-bold text-white">+ Create</button>
      {error && <p className="text-sm font-semibold text-rose-600 sm:col-span-3 lg:col-span-6">{error}</p>}
    </form>
  )
}

export default CouponForm
