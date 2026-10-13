// Shared frame for the Login and Register forms
import { Link } from 'react-router-dom'

const AuthCard = ({ title, subtitle, error, children }) => (
  <div className="mx-auto max-w-md rounded-3xl border border-ink-100 bg-white p-10 shadow-[0_30px_60px_-30px_rgba(19,21,34,0.35)]">
    <Link to="/" className="font-serif text-2xl font-semibold text-ink-900">Shop<span className="text-gold-600">Kart</span></Link>
    <h1 className="mt-8 text-3xl font-semibold text-ink-900">{title}</h1>
    <p className="mt-1 text-sm text-ink-500">{subtitle}</p>
    {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
    <div className="mt-6">{children}</div>
  </div>
)

export const inputClass =
  'w-full rounded-xl border border-ink-300 px-4 py-3 text-sm outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-100'

export const buttonClass =
  'w-full rounded-full bg-ink-900 py-3.5 font-semibold text-white transition hover:bg-gold-600 disabled:opacity-60'

export default AuthCard
