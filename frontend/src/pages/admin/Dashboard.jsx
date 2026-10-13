import { useState } from 'react'
import { getDashboard } from '../../api/admin'
import CategoryBars from '../../components/CategoryBars'
import Message from '../../components/Message'
import Spinner from '../../components/Spinner'
import StatCard from '../../components/StatCard'
import StockHealth from '../../components/StockHealth'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../hooks/useAuth'

const greeting = date => {
  const hour = date.getHours()
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
}

const Dashboard = () => {
  const { user } = useAuth()
  const { data, loading, error } = useApi(getDashboard)
  // Read the clock once when the page opens (components must give the same output on every render)
  const [now] = useState(() => new Date())

  if (loading) return <Spinner />
  if (error) return <Message type="error" icon="⚠️" title="Could not load the dashboard" />

  const { stats, categories, low_stock_items: lowStock } = data

  return (
    <div className="space-y-8">
      {/* Greeting banner */}
      <div className="bg-brand relative overflow-hidden rounded-3xl p-8 text-white">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/15 blur-2xl" />
        <p className="text-sm font-semibold text-white/80">{now.toDateString()}</p>
        <h1 className="mt-1 text-3xl font-extrabold">{greeting(now)}, {user.name} 👋</h1>
        <p className="mt-2 text-white/85">
          You have <b>{stats.low_stock}</b> variants running low and <b>{stats.out_of_stock}</b> sold out.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard icon="📦" label="Products" value={stats.products} hint={`${stats.categories} categories`} tone="violet" />
        <StatCard icon="🎨" label="Variants" value={stats.variants} hint="sizes & storage" tone="indigo" />
        <StatCard icon="✅" label="Healthy stock" value={stats.in_stock} hint="3+ in stock" tone="emerald" />
        <StatCard icon="⚠️" label="Low stock" value={stats.low_stock} hint="1–2 left" tone="amber" />
        <StatCard icon="⛔" label="Sold out" value={stats.out_of_stock} hint="needs restock" tone="rose" />
        <StatCard icon="👤" label="Customers" value={stats.customers} hint={`${stats.staff} staff`} tone="sky" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <StockHealth inStock={stats.in_stock} low={stats.low_stock} out={stats.out_of_stock} />
        <CategoryBars categories={categories} />
      </div>

      <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-brand-100">
        <div className="flex items-center justify-between px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-ink-900">🔥 Low stock alert</h2>
            <p className="text-sm text-ink-500">Restock these soon</p>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">{stats.low_stock} items</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-50 text-xs font-bold uppercase tracking-wider text-brand-700">
              <tr>
                <th className="px-6 py-3">Product</th>
                <th className="px-6 py-3">Variant</th>
                <th className="px-6 py-3">SKU</th>
                <th className="px-6 py-3 text-right">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {lowStock.map(item => (
                <tr key={item.sku} className="hover:bg-brand-50/50">
                  <td className="px-6 py-3 font-semibold text-ink-900">{item.product}</td>
                  <td className="px-6 py-3 text-ink-600">{[item.color, item.size].filter(Boolean).join(' · ') || 'Standard'}</td>
                  <td className="px-6 py-3 font-mono text-xs text-ink-400">{item.sku}</td>
                  <td className="px-6 py-3 text-right">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.stock === 1 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                      {item.stock} left
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
