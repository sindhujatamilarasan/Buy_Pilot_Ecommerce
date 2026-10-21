// Colour theme choice: one card per preset with a small preview (button gradient + soft banner + shades)
import { Check } from 'lucide-react'
import { shade, THEMES } from '../../utils/themes'

const ThemePicker = ({ value, onChange }) => (
  <div role="radiogroup" aria-label="Theme" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
    {Object.entries(THEMES).map(([key, theme]) => {
      const selected = key === value
      return (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={selected}
          onClick={() => onChange(key)}
          className={`rounded-2xl p-3 text-left ring-2 transition ${selected ? 'ring-ink-900' : 'ring-ink-300/25 hover:ring-ink-300'}`}
        >
          {/* Mini preview: soft banner with a gradient button inside (inline styles = this theme, not the current one) */}
          <div className="flex h-16 items-end rounded-xl p-2" style={{ background: `linear-gradient(120deg, ${shade(theme, 100)}, ${shade(theme, 50)} 45%, #fef3c7)` }}>
            <span className="rounded-full px-3 py-1 text-[11px] font-bold text-white" style={{ background: `linear-gradient(120deg, ${shade(theme, 500)}, ${theme.alt})` }}>
              Shop now
            </span>
          </div>
          <div className="mt-2 flex gap-1">
            {[200, 400, 600, 800].map(n => <span key={n} className="h-2 flex-1 rounded-full" style={{ background: shade(theme, n) }} />)}
          </div>
          <p className="mt-2 flex items-center justify-between text-sm font-bold text-ink-900">
            {theme.label}
            {selected && <Check size={16} />}
          </p>
        </button>
      )
    })}
  </div>
)

export default ThemePicker
