import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthCard, { buttonClass, inputClass } from '../components/AuthCard'
import { useAuth } from '../hooks/useAuth'
import { getErrorMessage } from '../utils/format'

const Register = () => {
  const { register } = useAuth()
  const navigate = useNavigate()
  const from = useLocation().state?.from

  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await register(form) // new accounts are always customers
      navigate(from?.pathname || '/', { replace: true, state: from?.state })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthCard title="Create your account" subtitle="It takes less than a minute." error={error}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input name="name" required placeholder="Full name" value={form.name} onChange={handleChange} className={inputClass} />
        <input name="email" type="email" required placeholder="Email" value={form.email} onChange={handleChange} className={inputClass} />
        <input name="password" type="password" required minLength={8} placeholder="Password (min 8 characters)" value={form.password} onChange={handleChange} className={inputClass} />
        <button disabled={submitting} className={buttonClass}>{submitting ? 'Creating…' : 'Create account'}</button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-500">
        Already have an account?{' '}
        <Link to="/login" state={{ from }} className="font-semibold text-brand-600">Log in</Link>
      </p>
    </AuthCard>
  )
}

export default Register
