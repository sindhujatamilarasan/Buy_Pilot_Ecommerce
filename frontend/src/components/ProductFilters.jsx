// Price range + minimum rating. Values come FROM the URL and are written BACK to the URL.
import { useEffect, useState } from 'react'
import { useDebounce } from '../hooks/useDebounce'

const RATINGS = [
  { value: '', label: 'Any rating' },
  { value: '4', label: '4★ & up' },
  { value: '3', label: '3★ & up' },
]

const inputClass =
  'w-full rounded-xl border-2 border-brand-100 bg-white px-3 py-2 text-sm font-semibold text-ink-700 outline-none focus:border-brand-400'

export const PriceFilter = ({ min = '', max = '', onChange }) => {
  const [range, setRange] = useState({ min, max }) // what is typed right now
  const debounced = useDebounce(range, 600)

  // Typing stopped → put the numbers in the URL (only if they really changed)
  useEffect(() => {
    if (debounced.min !== min || debounced.max !== max) onChange(debounced)
  }, [debounced, min, max, onChange])

  const update = e => setRange(r => ({ ...r, [e.target.name]: e.target.value.replace(/\D/g, '') }))

  return (
    <div>
      <h3 className="mb-3 text-sm font-bold text-ink-900">Price (₹)</h3>
      <div className="flex items-center gap-2">
        <input name="min" inputMode="numeric" placeholder="Min" value={range.min} onChange={update} className={inputClass} />
        <span className="text-ink-400">–</span>
        <input name="max" inputMode="numeric" placeholder="Max" value={range.max} onChange={update} className={inputClass} />
      </div>
    </div>
  )
}

export const RatingFilter = ({ value = '', onChange }) => (
  <div>
    <h3 className="mb-3 text-sm font-bold text-ink-900">Rating</h3>
    <div className="flex flex-wrap gap-2">
      {RATINGS.map(r => (
        <button
          key={r.value}
          onClick={() => onChange(r.value)}
          className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
            value === r.value ? 'bg-brand text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  </div>
)
