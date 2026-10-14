// Revenue per day for the last 7 days – a simple accessible bar chart (no chart library).
// Each bar is a button: hover OR keyboard-focus shows its tooltip. "Table" shows the same data as text.
import { useState } from 'react'
import { formatPrice } from '../../utils/format'

const TICKS = 4
const compact = value => `₹${Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(value)}`
const dayLabel = iso => new Date(`${iso}T00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })

// Round the top of the axis to a clean number (e.g. 8,123 → 10,000) so the ticks are 0 / 2.5K / 5K…
const niceMax = max => {
  if (max <= 0) return 1000
  const rough = max / TICKS
  const power = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 2.5, 5, 10].map(m => m * power).find(s => s >= rough)
  return step * TICKS
}

const SalesChart = ({ sales }) => {
  const [active, setActive] = useState(null)
  const [showTable, setShowTable] = useState(false)
  const rows = sales.map(d => ({ ...d, revenue: Number(d.revenue) }))
  const top = niceMax(Math.max(...rows.map(d => d.revenue)))
  const best = rows.reduce((a, b) => (b.revenue > a.revenue ? b : a), rows[0])
  const weekTotal = rows.reduce((sum, d) => sum + d.revenue, 0)
  const weekOrders = rows.reduce((sum, d) => sum + d.orders, 0)

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-ink-300/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-ink-500">Revenue · last 7 days</h2>
          <p className="mt-1 font-display text-3xl font-extrabold text-ink-900">{formatPrice(weekTotal)}</p>
          <p className="text-xs text-ink-400">{weekOrders} paid orders</p>
        </div>
        <button onClick={() => setShowTable(t => !t)} className="rounded-full px-3 py-1.5 text-xs font-bold text-ink-600 ring-1 ring-ink-300/40 hover:bg-ink-300/10">
          {showTable ? 'Chart' : 'Table'}
        </button>
      </div>

      {showTable ? (
        <table className="mt-5 w-full text-sm">
          <thead className="text-left text-xs text-ink-400"><tr><th className="py-2">Day</th><th>Orders</th><th className="text-right">Revenue</th></tr></thead>
          <tbody className="divide-y divide-ink-300/20">
            {rows.map(d => (
              <tr key={d.date}><td className="py-2 text-ink-700">{dayLabel(d.date)}</td><td className="text-ink-700">{d.orders}</td><td className="text-right font-semibold text-ink-900">{formatPrice(d.revenue)}</td></tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="relative mt-6 grid grid-cols-[44px_1fr] gap-2">
          {/* Y axis: clean ticks */}
          <div className="relative h-48 text-right text-[11px] text-ink-400">
            {Array.from({ length: TICKS + 1 }, (_, i) => (
              <span key={i} className="absolute right-0 -translate-y-1/2" style={{ top: `${(i / TICKS) * 100}%` }}>{compact(top - (top / TICKS) * i)}</span>
            ))}
          </div>

          <div className="relative h-48">
            {/* Hairline gridlines */}
            {Array.from({ length: TICKS + 1 }, (_, i) => (
              <div key={i} className="absolute inset-x-0 border-t border-ink-300/25" style={{ top: `${(i / TICKS) * 100}%` }} />
            ))}

            <div className="absolute inset-0 flex">
              {rows.map((d, i) => {
                const height = (d.revenue / top) * 100
                const label = `${dayLabel(d.date)}: ${formatPrice(d.revenue)}, ${d.orders} orders`
                return (
                  <button
                    key={d.date}
                    aria-label={label}
                    onMouseEnter={() => setActive(i)}
                    onMouseLeave={() => setActive(null)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                    className="relative flex flex-1 items-end justify-center outline-none"
                  >
                    {/* Direct label only on the best day (selective labels) */}
                    {d === best && d.revenue > 0 && active === null && (
                      <span className="absolute text-[11px] font-bold text-ink-700" style={{ bottom: `calc(${height}% + 6px)` }}>{compact(d.revenue)}</span>
                    )}
                    <span
                      className={`w-6 max-w-[60%] rounded-t-[4px] transition-colors ${active === i ? 'bg-brand-500' : 'bg-brand-600'}`}
                      style={{ height: `${height}%` }}
                    />
                    {active === i && (
                      <span className="pointer-events-none absolute z-10 -translate-y-2 whitespace-nowrap rounded-xl bg-white px-3 py-2 text-left shadow-lg ring-1 ring-ink-300/30" style={{ bottom: `${height}%` }}>
                        <span className="block font-display text-base font-bold text-ink-900">{formatPrice(d.revenue)}</span>
                        <span className="block text-xs text-ink-500">{d.orders} orders · {dayLabel(d.date)}</span>
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* X axis labels */}
          <div />
          <div className="flex text-center text-[11px] font-semibold text-ink-400">
            {rows.map(d => {
              const date = new Date(`${d.date}T00:00`)
              return (
                <span key={d.date} className="flex-1 leading-tight">
                  {date.toLocaleDateString('en-IN', { weekday: 'short' })}
                  <br />
                  <span className="font-normal">{date.getDate()}</span>
                </span>
              )
            })}
          </div>

          {weekTotal === 0 && (
            <p className="absolute inset-x-0 top-16 text-center text-sm font-semibold text-ink-400">No paid orders in the last 7 days yet</p>
          )}
        </div>
      )}
    </div>
  )
}

export default SalesChart
