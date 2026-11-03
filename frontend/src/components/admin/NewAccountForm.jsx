// Create a NEW login (name + email + temporary password): a store admin (Stores page) or staff /
// warehouse manager (Users page). Pass `roles` = [[value, label], …] to show a role choice and
// `warehouses` = [{id, name, city}] to tie a warehouse manager to one location.
import { useState } from 'react'
import { getErrorMessage } from '../../utils/format'
import { adminInput } from './adminStyles'

const EMPTY = { name: '', email: '', password: '' }

// onSave(form) calls the API; onDone(message) runs after it worked
const NewAccountForm = ({ title, buttonLabel, roles, warehouses, onSave, onDone, onCancel }) => {
  const [form, setForm] = useState(roles ? { ...EMPTY, role: roles[0][0] } : EMPTY)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const change = e => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async e => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave(form)
      onDone(form.email)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 rounded-2xl bg-[#f6f8f7] p-4">
      <p className="text-sm font-bold text-ink-900">{title}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-semibold text-ink-600">Full name
          <input name="name" required value={form.name} onChange={change} className={`${adminInput} mt-1 w-full`} />
        </label>
        <label className="text-xs font-semibold text-ink-600">Email (login)
          <input name="email" type="email" required value={form.email} onChange={change} className={`${adminInput} mt-1 w-full`} />
        </label>
        <label className="text-xs font-semibold text-ink-600">Temporary password
          <input name="password" type="password" required minLength={8} value={form.password} onChange={change} className={`${adminInput} mt-1 w-full`} />
        </label>
      </div>
      {roles && (
        <div className="flex flex-wrap gap-2">
          {roles.map(([value, label]) => (
            <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ring-1 ${form.role === value ? 'bg-brand-50 text-brand-800 ring-brand-200' : 'bg-white text-ink-600 ring-ink-300/30'}`}>
              <input type="radio" name="role" value={value} checked={form.role === value} onChange={change} className="accent-brand-600" /> {label}
            </label>
          ))}
        </div>
      )}
      {warehouses && form.role === 'warehouse' && (
        <label className="block text-xs font-semibold text-ink-600">Works in which warehouse?
          <select name="warehouse" value={form.warehouse || ''} onChange={change} className={`${adminInput} mt-1 w-full sm:w-80`}>
            <option value="">All warehouses of the store</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}{w.city && ` – ${w.city}`}</option>)}
          </select>
          <span className="mt-1 block font-normal text-ink-500">A manager tied to one warehouse sees only its stock and the orders packed from it.</span>
        </label>
      )}
      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-full px-4 py-2 text-sm font-bold text-ink-600 hover:bg-white">Cancel</button>
        <button disabled={saving} className="bg-brand rounded-full px-5 py-2 text-sm font-bold text-white disabled:opacity-60">{saving ? 'Creating…' : buttonLabel}</button>
      </div>
    </form>
  )
}

export default NewAccountForm
