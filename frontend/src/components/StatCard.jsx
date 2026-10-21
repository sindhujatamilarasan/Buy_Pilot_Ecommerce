// KPI card: big number + caption + icon tile. `icon` is a lucide icon component.
const tones = {
  brand: 'bg-brand-50 text-brand-700',
  sky: 'bg-sky-50 text-sky-700',
  mango: 'bg-mango-100 text-mango-600',
  violet: 'bg-violet-50 text-violet-700',
  rose: 'bg-rose-50 text-rose-700',
}

const StatCard = ({ icon: Icon, label, value, hint, tone = 'brand' }) => (
  <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-ink-300/20">
    <div className="flex items-center justify-between">
      <p className="text-sm font-semibold text-ink-500">{label}</p>
      <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${tones[tone]}`}><Icon size={20} /></span>
    </div>
    <p className="mt-3 break-words font-display text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">{value}</p>
    {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
  </div>
)

export default StatCard
