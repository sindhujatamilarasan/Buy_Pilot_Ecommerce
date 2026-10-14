import { Link } from 'react-router-dom'

const LowStockList = ({ items, total }) => (
  <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-ink-300/20">
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-bold text-ink-900">Low stock</h2>
      <span className="rounded-full bg-mango-100 px-2.5 py-0.5 text-xs font-bold text-mango-600">⚠️ {total}</span>
    </div>
    <ul className="mt-4 space-y-3">
      {items.slice(0, 6).map(item => (
        <li key={item.sku} className="flex items-center justify-between gap-3 text-sm">
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink-800">{item.product}</p>
            <p className="text-xs text-ink-400">{[item.color, item.size].filter(Boolean).join(' · ') || 'Standard'}</p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${item.stock === 1 ? 'bg-rose-50 text-rose-700' : 'bg-mango-100 text-mango-600'}`}>
            {item.stock} left
          </span>
        </li>
      ))}
    </ul>
    <Link to="/admin/products" className="mt-5 block rounded-xl bg-[#f6f8f7] py-2 text-center text-sm font-bold text-ink-700 hover:bg-brand-50">
      Manage stock →
    </Link>
  </div>
)

export default LowStockList
