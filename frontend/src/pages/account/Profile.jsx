import { Check } from 'lucide-react'
import { useState } from 'react'
import { updateMe } from '../../api/auth'
import { useAuth } from '../../hooks/useAuth'
import { getErrorMessage } from '../../utils/format'

const input = 'mt-1 w-full rounded-xl border border-ink-300/40 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100'

const Profile = () => {
  const { user, setUser } = useAuth()
  const [name, setName] = useState(user.name)
  const [status, setStatus] = useState(null) // { ok, text }

  const save = async e => {
    e.preventDefault()
    try {
      setUser(await updateMe({ name })) // update the navbar avatar / name too
      setStatus({ ok: true, text: 'Profile saved' })
    } catch (error) {
      setStatus({ ok: false, text: getErrorMessage(error) })
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-extrabold text-ink-900">Profile</h1>
      <p className="text-sm text-ink-500">Your personal details.</p>

      <form onSubmit={save} className="mt-6 space-y-5">
        <label className="block text-sm font-bold text-ink-700">Full name
          <input value={name} onChange={e => setName(e.target.value)} required maxLength={150} className={input} />
        </label>
        <label className="block text-sm font-bold text-ink-700">Email
          <input value={user.email} disabled className={`${input} cursor-not-allowed bg-[#f6f8f7] text-ink-500`} />
          <span className="mt-1 block text-xs font-normal text-ink-400">Your email is your login and cannot be changed.</span>
        </label>
        <div className="flex items-center gap-4">
          <button disabled={name.trim() === user.name} className="bg-brand rounded-full px-6 py-3 text-sm font-bold text-white disabled:opacity-50">Save changes</button>
          {status && (
            <span className={`flex items-center gap-1 text-sm font-semibold ${status.ok ? 'text-brand-700' : 'text-rose-600'}`}>
              {status.ok && <Check size={16} />} {status.text}
            </span>
          )}
        </div>
      </form>
    </div>
  )
}

export default Profile
