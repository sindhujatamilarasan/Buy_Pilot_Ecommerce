// The items of a receipt or transfer: pick products, set quantities, remove lines.
// lines = [{ variant: {id, sku, product, label, warehouses}, qty }]
import { X } from 'lucide-react'
import { adminInput } from '../admin/adminStyles'
import VariantPicker from './VariantPicker'

const LinesEditor = ({ lines, onChange, warehouseId, showAvailable = false }) => {
  const add = variant => {
    if (lines.some(l => l.variant.id === variant.id)) return // already in the list
    onChange([...lines, { variant, qty: 1 }])
  }
  const setQty = (id, qty) => onChange(lines.map(l => (l.variant.id === id ? { ...l, qty } : l)))

  return (
    <div className="space-y-2">
      {lines.map(({ variant, qty }) => {
        const available = variant.warehouses?.[warehouseId] ?? 0
        const tooMany = showAvailable && Number(qty) > available
        return (
          <div key={variant.id} className="flex items-center gap-3 rounded-2xl bg-[#f6f8f7] px-3 py-2">
            <div className="min-w-0 flex-1 text-sm">
              <p className="truncate font-semibold text-ink-900">{variant.product}</p>
              <p className="text-xs text-ink-400">
                {variant.sku} · {variant.label}
                {showAvailable && <span className={tooMany ? 'font-bold text-rose-600' : ''}> · {available} available</span>}
              </p>
            </div>
            <input type="number" min="1" required value={qty} onChange={e => setQty(variant.id, e.target.value)}
              aria-label="Quantity" className={`${adminInput} w-24 ${tooMany ? 'border-rose-400' : ''}`} />
            <button type="button" onClick={() => onChange(lines.filter(l => l.variant.id !== variant.id))} title="Remove"
              className="rounded-lg p-1.5 text-ink-400 hover:bg-rose-50 hover:text-rose-600"><X size={16} /></button>
          </div>
        )
      })}
      <VariantPicker onPick={add} warehouseId={warehouseId} placeholder="+ Add a product: search name or SKU…" />
    </div>
  )
}

export default LinesEditor
