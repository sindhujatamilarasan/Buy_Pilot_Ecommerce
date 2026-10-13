// A single stacked bar: how many variants are in stock / low / out of stock
const StockHealth = ({ inStock, low, out }) => {
  const total = inStock + low + out || 1
  const parts = [
    { label: 'In stock', value: inStock, bar: 'bg-emerald-400', dot: 'bg-emerald-400' },
    { label: 'Low (1–2 left)', value: low, bar: 'bg-amber-400', dot: 'bg-amber-400' },
    { label: 'Out of stock', value: out, bar: 'bg-rose-400', dot: 'bg-rose-400' },
  ]

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-brand-100">
      <h2 className="text-lg font-bold text-ink-900">📦 Stock health</h2>
      <p className="text-sm text-ink-500">All {total} product variants</p>

      <div className="mt-5 flex h-4 overflow-hidden rounded-full bg-brand-50">
        {parts.map(part => (
          <div key={part.label} className={`${part.bar} transition-all`} style={{ width: `${(part.value / total) * 100}%` }} />
        ))}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {parts.map(part => (
          <div key={part.label}>
            <p className="flex items-center gap-2 text-xs font-semibold text-ink-500">
              <span className={`h-2.5 w-2.5 rounded-full ${part.dot}`} /> {part.label}
            </p>
            <p className="mt-1 font-display text-2xl font-extrabold text-ink-900">
              {part.value} <span className="text-sm font-semibold text-ink-400">({Math.round((part.value / total) * 100)}%)</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default StockHealth
