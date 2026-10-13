const tones = {
  gold: 'bg-gold-50 text-gold-700 ring-gold-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-rose-50 text-rose-700 ring-rose-200',
}

const StatCard = ({ icon, label, value, tone = 'gold' }) => (
  <div className="rounded-2xl border border-ink-100 bg-sand-50 p-5 shadow-sm">
    <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl text-lg ring-1 ${tones[tone]}`}>{icon}</div>
    <p className="mt-4 font-serif text-3xl font-semibold text-ink-900">{value}</p>
    <p className="text-sm text-ink-500">{label}</p>
  </div>
)

export default StatCard
