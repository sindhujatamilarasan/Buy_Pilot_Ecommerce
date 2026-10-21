// Category dropdown for the product form + "New category" when none of the existing ones fits
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { createCategory } from '../../api/manage'
import { getErrorMessage } from '../../utils/format'
import { adminInput } from './adminStyles'

const CategoryPicker = ({ categories, value, onChange }) => {
  const [list, setList] = useState(categories) // grows when a new category is added here
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const add = async () => {
    if (!name.trim()) return
    setSaving(true)
    setError('')
    try {
      const category = await createCategory(name)
      setList(l => [...l, category].sort((a, b) => a.name.localeCompare(b.name)))
      onChange(category.id) // select the new one straight away
      setAdding(false)
      setName('')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  // Inside the product <form>: Enter must add the category, not submit the whole product
  const onKeyDown = e => {
    if (e.key === 'Enter') {
      e.preventDefault()
      add()
    }
  }

  return (
    <div className="mt-4">
      <label className="block text-sm font-semibold text-ink-700">Category
        <select required value={value} onChange={e => onChange(Number(e.target.value))} className={`${adminInput} mt-1 w-full`}>
          <option value="">Choose…</option>
          {list.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>

      {adding ? (
        <div className="mt-2 rounded-2xl bg-[#f6f8f7] p-3">
          <input autoFocus value={name} onChange={e => setName(e.target.value)} onKeyDown={onKeyDown} maxLength={100} placeholder="New category name, e.g. Toys" aria-label="New category name" className={`${adminInput} w-full`} />
          {error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}
          <div className="mt-2 flex gap-3 text-sm font-bold">
            <button type="button" onClick={add} disabled={saving || !name.trim()} className="text-brand-700 disabled:opacity-50">{saving ? 'Adding…' : 'Add category'}</button>
            <button type="button" onClick={() => { setAdding(false); setError('') }} className="text-ink-400">Cancel</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="mt-2 flex items-center gap-1 text-sm font-bold text-brand-700">
          <Plus size={15} /> Not in the list? New category
        </button>
      )}
    </div>
  )
}

export default CategoryPicker
