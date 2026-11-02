// Search box → list of matching products / variants of my store. Calls onPick(variant).
import { Search } from 'lucide-react'
import { useState } from 'react'
import { searchVariants } from '../../api/inventory'
import { useApi } from '../../hooks/useApi'
import { useDebounce } from '../../hooks/useDebounce'
import { adminInput } from '../admin/adminStyles'

const VariantPicker = ({ onPick, warehouseId, placeholder = 'Search product name or SKU…' }) => {
  const [text, setText] = useState('')
  const search = useDebounce(text.trim(), 300) // wait until typing stops, then search
  const { data, loading } = useApi(searchVariants, search)
  const open = search.length >= 2

  const pick = variant => {
    onPick(variant)
    setText('')
  }

  return (
    <div className="relative">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
      <input value={text} onChange={e => setText(e.target.value)} placeholder={placeholder} className={`${adminInput} w-full pl-9`} />
      {open && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-2xl bg-white p-1 shadow-xl ring-1 ring-ink-300/30">
          {loading && <li className="px-3 py-2 text-sm text-ink-400">Searching…</li>}
          {!loading && data?.length === 0 && <li className="px-3 py-2 text-sm text-ink-400">No products found</li>}
          {!loading && data?.map(v => (
            <li key={v.id}>
              <button type="button" onClick={() => pick(v)} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-[#f6f8f7]">
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-ink-900">{v.product}</span>
                  <span className="text-xs text-ink-400">{v.sku} · {v.label}</span>
                </span>
                <span className="shrink-0 text-xs font-semibold text-ink-500">
                  {warehouseId ? `${v.warehouses[warehouseId] ?? 0} here` : `${v.stock} total`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default VariantPicker
