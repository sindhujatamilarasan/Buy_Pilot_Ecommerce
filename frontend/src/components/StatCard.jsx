const tones = {
  indigo: 'bg-indigo-50 text-indigo-600',
  green: 'bg-green-50 text-green-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
}

const StatCard = ({ icon, label, value, tone = 'indigo' }) => (
  <div className="rounded-2xl bg-white p-5 shadow-sm">
    <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-lg ${tones[tone]}`}>{icon}</div>
    <p className="mt-4 text-3xl font-extrabold text-slate-900">{value}</p>
    <p className="text-sm text-slate-500">{label}</p>
  </div>
)

export default StatCard
