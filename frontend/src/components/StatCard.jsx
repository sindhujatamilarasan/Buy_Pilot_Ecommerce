// One number on the dashboard, with a coloured icon bubble
const tones = {
  violet: 'bg-violet-100 text-violet-700',
  sky: 'bg-sky-100 text-sky-700',
  amber: 'bg-amber-100 text-amber-700',
  rose: 'bg-rose-100 text-rose-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  indigo: 'bg-indigo-100 text-indigo-700',
}

const StatCard = ({ icon, label, value, hint, tone = 'violet' }) => (
  <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-brand-100 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-100">
    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${tones[tone]}`}>{icon}</div>
    <p className="mt-4 font-display text-3xl font-extrabold text-ink-900">{value}</p>
    <p className="text-sm font-semibold text-ink-600">{label}</p>
    {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
  </div>
)

export default StatCard
