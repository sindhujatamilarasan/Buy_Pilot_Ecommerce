// Shared frame for the Login and Register forms
import Logo from './Logo'

const AuthCard = ({ title, subtitle, error, children }) => (
  <div className="mx-auto max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl shadow-brand-100">
    <div className="bg-brand h-2" />
    <div className="p-10">
      <Logo className="text-3xl" />
      <h1 className="mt-8 text-3xl font-bold text-ink-900">{title}</h1>
      <p className="mt-1 text-sm text-ink-500">{subtitle}</p>
      {error && <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      <div className="mt-6">{children}</div>
    </div>
  </div>
)

export const inputClass =
  'w-full rounded-xl border-2 border-brand-100 px-4 py-3 text-sm outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100'

export const buttonClass =
  'bg-brand w-full rounded-full py-3.5 font-bold text-white shadow-lg shadow-brand-200 transition hover:scale-[1.02] disabled:opacity-60'

export default AuthCard
