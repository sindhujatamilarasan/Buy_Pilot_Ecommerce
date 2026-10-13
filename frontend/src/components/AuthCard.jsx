// Shared frame for the Login and Register forms
import { Link } from 'react-router-dom'

const AuthCard = ({ title, subtitle, error, children }) => (
  <div className="mx-auto max-w-md rounded-3xl bg-white p-8 shadow-xl">
    <Link to="/" className="text-lg font-extrabold text-indigo-600">🛍️ ShopKart</Link>
    <h1 className="mt-6 text-2xl font-bold text-slate-900">{title}</h1>
    <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
    <div className="mt-6">{children}</div>
  </div>
)

export const inputClass =
  'w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100'

export const buttonClass =
  'w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60'

export default AuthCard
