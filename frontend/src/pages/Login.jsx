import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthCard, { buttonClass, inputClass } from '../components/AuthCard'
import { useAuth } from '../hooks/useAuth'
import { getErrorMessage } from '../utils/format'
import { homeForRole } from '../utils/roles'

const Login = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from // the page ProtectedRoute sent us away from

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // One handler for all inputs: uses the input's name to update the right field
  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const user = await login(form)
      // Go back to where they were going (e.g. /checkout), or their role's home page
      navigate(from?.pathname || homeForRole(user.role), { replace: true, state: from?.state })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle={from ? 'Please log in to continue with your order.' : 'Log in to your account.'}
      error={error}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <input name="email" type="email" required placeholder="Email" value={form.email} onChange={handleChange} className={inputClass} />
        <input name="password" type="password" required placeholder="Password" value={form.password} onChange={handleChange} className={inputClass} />
        <button disabled={submitting} className={buttonClass}>{submitting ? 'Logging in…' : 'Log in'}</button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        New here?{' '}
        <Link to="/register" state={{ from }} className="font-semibold text-indigo-600">Create an account</Link>
      </p>
    </AuthCard>
  )
}

export default Login
