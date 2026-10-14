import { ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { changePassword } from '../../api/auth'
import { getErrorMessage } from '../../utils/format'

const input = 'mt-1 w-full rounded-xl border border-ink-300/40 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100'
const EMPTY = { old_password: '', new_password: '', confirm: '' }

const Security = () => {
  const [form, setForm] = useState(EMPTY)
  const [status, setStatus] = useState(null)
  const change = e => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async e => {
    e.preventDefault()
    if (form.new_password !== form.confirm) {
      setStatus({ ok: false, text: 'The new passwords do not match.' })
      return
    }
    try {
      await changePassword({ old_password: form.old_password, new_password: form.new_password })
      setForm(EMPTY)
      setStatus({ ok: true, text: 'Password changed successfully.' })
    } catch (error) {
      setStatus({ ok: false, text: getErrorMessage(error) })
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-extrabold text-ink-900">Password & security</h1>
      <p className="text-sm text-ink-500">Use at least 8 characters. Avoid common words and only numbers.</p>

      <form onSubmit={submit} className="mt-6 space-y-5">
        <label className="block text-sm font-bold text-ink-700">Current password
          <input type="password" name="old_password" value={form.old_password} onChange={change} required className={input} autoComplete="current-password" />
        </label>
        <label className="block text-sm font-bold text-ink-700">New password
          <input type="password" name="new_password" value={form.new_password} onChange={change} required minLength={8} className={input} autoComplete="new-password" />
        </label>
        <label className="block text-sm font-bold text-ink-700">Confirm new password
          <input type="password" name="confirm" value={form.confirm} onChange={change} required minLength={8} className={input} autoComplete="new-password" />
        </label>
        {status && (
          <p className={`rounded-xl px-4 py-3 text-sm font-semibold ${status.ok ? 'bg-brand-50 text-brand-800' : 'bg-rose-50 text-rose-700'}`}>{status.text}</p>
        )}
        <button className="bg-brand flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white">
          <ShieldCheck size={17} /> Change password
        </button>
      </form>
    </div>
  )
}

export default Security
