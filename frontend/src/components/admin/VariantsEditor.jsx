// Editable table of variants: each row has its own size / colour / SKU / price / stock
import { adminInput, newVariant } from './adminStyles'

const VariantsEditor = ({ variants, onChange }) => {
  const update = (key, field, value) => onChange(variants.map(v => (v.key === key ? { ...v, [field]: value } : v)))

  return (
    <div className="space-y-2">
      <div className="hidden grid-cols-[1fr_1fr_1.4fr_1fr_0.8fr_32px] gap-2 px-1 text-xs font-bold uppercase text-ink-400 md:grid">
        <span>Size</span><span>Colour</span><span>SKU *</span><span>Price ₹ *</span><span>Stock *</span><span />
      </div>
      {variants.map(v => (
        <div key={v.key} className="grid grid-cols-2 gap-2 rounded-2xl bg-brand-50/60 p-2 md:grid-cols-[1fr_1fr_1.4fr_1fr_0.8fr_32px] md:bg-transparent md:p-0">
          <input value={v.size} onChange={e => update(v.key, 'size', e.target.value)} placeholder="e.g. M / 128GB" className={adminInput} />
          <input value={v.color} onChange={e => update(v.key, 'color', e.target.value)} placeholder="e.g. Black" className={adminInput} />
          <input value={v.sku} onChange={e => update(v.key, 'sku', e.target.value)} placeholder="Unique code" required className={`${adminInput} uppercase`} />
          <input type="number" min="1" step="0.01" value={v.price} onChange={e => update(v.key, 'price', e.target.value)} placeholder="999" required className={adminInput} />
          <input type="number" min="0" value={v.stock} onChange={e => update(v.key, 'stock', e.target.value)} required className={adminInput} />
          <button
            type="button"
            disabled={variants.length === 1}
            onClick={() => onChange(variants.filter(x => x.key !== v.key))}
            title="Remove variant"
            className="rounded-xl text-lg text-ink-400 hover:text-rose-600 disabled:opacity-30"
          >
            ✕
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...variants, newVariant()])} className="text-sm font-bold text-brand-700">
        + Add variant
      </button>
    </div>
  )
}

export default VariantsEditor
