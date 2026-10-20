// Super admin: create a login (email + password) for a new store admin
import { useState } from 'react'
import { addStoreAdmin } from '../../api/manage'
import { getErrorMessage } from '../../utils/format'
import { adminInput } from './adminStyles'

const EMPTY = { name: '', email: '', password: '' }

const AddStoreAdminForm = ({ store, onDone, onCancel }) => {
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const change = e => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async e => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await addStoreAdmin(store.id, form)
      onDone(`${form.email} can now log in as the admin of ${store.name}.`)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 rounded-2xl bg-[#f6f8f7] p-4">
      <p className="text-sm font-bold text-ink-900">New admin for {store.name}</p>
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
      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-full px-4 py-2 text-sm font-bold text-ink-600 hover:bg-white">Cancel</button>
        <button disabled={saving} className="bg-brand rounded-full px-5 py-2 text-sm font-bold text-white disabled:opacity-60">{saving ? 'Creating…' : 'Create store admin'}</button>
      </div>
    </form>
  )
}

export default AddStoreAdminForm
