// "Not in the list?" – add a brand-new product while receiving goods. It becomes a DRAFT (hidden from the shop)
// until the store admin adds photos + description and publishes it.
import { useState } from 'react'
import { createDraftProduct } from '../../api/inventory'
import { getCategories } from '../../api/products'
import { useApi } from '../../hooks/useApi'
import { getErrorMessage } from '../../utils/format'
import { adminInput } from '../admin/adminStyles'

const EMPTY = { name: '', category: '', price: '', sku: '', size: '', color: '' }

// onCreated(variant) → the receipt adds it as a line
const NewProductForm = ({ onCreated, onCancel }) => {
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const { data: categories } = useApi(getCategories)
  const set = field => e => setForm({ ...form, [field]: e.target.value })

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      onCreated(await createDraftProduct(form))
    } catch (err) {
      setError(getErrorMessage(err))
      setSaving(false)
    }
  }

  const ready = form.name.trim() && form.category && Number(form.price) >= 1
  return (
    <div className="space-y-3 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/40 p-4">
      <p className="text-sm font-bold text-ink-900">New product</p>
      <p className="text-xs text-ink-500">It stays hidden from the shop until the store admin adds photos and publishes it.</p>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-xs font-semibold text-ink-600 md:col-span-2">Product name
          <input maxLength={200} value={form.name} onChange={set('name')} className={`${adminInput} mt-1 w-full`} />
        </label>
        <label className="text-xs font-semibold text-ink-600">Category
          <select value={form.category} onChange={set('category')} className={`${adminInput} mt-1 w-full`}>
            <option value="">Choose…</option>
            {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-ink-600">Selling price (₹)
          <input type="number" min="1" step="0.01" value={form.price} onChange={set('price')} className={`${adminInput} mt-1 w-full`} />
        </label>
        <label className="text-xs font-semibold text-ink-600">Size <span className="font-normal text-ink-400">(optional)</span>
          <input maxLength={20} value={form.size} onChange={set('size')} className={`${adminInput} mt-1 w-full`} />
        </label>
        <label className="text-xs font-semibold text-ink-600">Colour <span className="font-normal text-ink-400">(optional)</span>
          <input maxLength={30} value={form.color} onChange={set('color')} className={`${adminInput} mt-1 w-full`} />
        </label>
        <label className="text-xs font-semibold text-ink-600">SKU <span className="font-normal text-ink-400">(blank = made from the name)</span>
          <input maxLength={64} value={form.sku} onChange={set('sku')} className={`${adminInput} mt-1 w-full`} />
        </label>
      </div>
      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-full px-4 py-2 text-sm font-bold text-ink-600 hover:bg-white">Cancel</button>
        <button type="button" onClick={save} disabled={!ready || saving} className="bg-brand rounded-full px-5 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Adding…' : 'Add to this receipt'}</button>
      </div>
    </div>
  )
}

export default NewProductForm
