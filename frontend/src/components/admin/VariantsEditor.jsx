// Editable table of variants: each row has its own size / colour / SKU / price / stock
import { Plus, X } from 'lucide-react'
import { adminInput, newVariant } from './adminStyles'

const cell = `${adminInput} w-full min-w-0`

const VariantsEditor = ({ variants, onChange }) => {
  const update = (key, field, value) => onChange(variants.map(v => (v.key === key ? { ...v, [field]: value } : v)))

  return (
    <div className="space-y-2">
      <div className="hidden grid-cols-[1fr_1fr_1.4fr_1fr_0.8fr_32px] gap-2 px-1 text-xs font-bold uppercase text-ink-400 md:grid">
        <span>Size</span><span>Colour</span><span>SKU *</span><span>Price ₹ *</span><span>Stock *</span><span />
      </div>
      {variants.map(v => (
        <div key={v.key} className="grid grid-cols-2 gap-2 rounded-2xl bg-brand-50/60 p-2 md:grid-cols-[1fr_1fr_1.4fr_1fr_0.8fr_32px] md:bg-transparent md:p-0">
          <input value={v.size} onChange={e => update(v.key, 'size', e.target.value)} placeholder="e.g. M / 128GB" className={cell} />
          <input value={v.color} onChange={e => update(v.key, 'color', e.target.value)} placeholder="e.g. Black" className={cell} />
          <input value={v.sku} onChange={e => update(v.key, 'sku', e.target.value)} placeholder="Unique code" required className={`${cell} uppercase`} />
          <input type="number" min="1" step="0.01" value={v.price} onChange={e => update(v.key, 'price', e.target.value)} placeholder="999" required className={cell} />
          <input type="number" min="0" value={v.stock} onChange={e => update(v.key, 'stock', e.target.value)} required className={cell} />
          <button
            type="button"
            disabled={variants.length === 1}
            onClick={() => onChange(variants.filter(x => x.key !== v.key))}
            title="Remove variant"
            className="flex items-center justify-center rounded-xl text-ink-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
          >
            <X size={18} />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...variants, newVariant()])} className="flex items-center gap-1 text-sm font-bold text-brand-700">
        <Plus size={16} /> Add variant
      </button>
    </div>
  )
}

export default VariantsEditor
