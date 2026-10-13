import { getDashboard } from '../../api/admin'
import Message from '../../components/Message'
import Spinner from '../../components/Spinner'
import StatCard from '../../components/StatCard'
import { useApi } from '../../hooks/useApi'

const Dashboard = () => {
  const { data, loading, error } = useApi(getDashboard)

  if (loading) return <Spinner />
  if (error) return <Message type="error" icon="⚠️" title="Could not load the dashboard" />

  const { stats, low_stock_items: lowStock } = data

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Store overview</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon="📦" label="Products" value={stats.products} />
        <StatCard icon="🎨" label={`Variants · ${stats.categories} categories`} value={stats.variants} tone="green" />
        <StatCard icon="⚠️" label="Low stock (1–2 left)" value={stats.low_stock} tone="amber" />
        <StatCard icon="⛔" label="Out of stock" value={stats.out_of_stock} tone="red" />
        <StatCard icon="👤" label="Customers" value={stats.customers} />
        <StatCard icon="🧑‍💼" label="Staff" value={stats.staff} tone="green" />
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="font-bold text-slate-900">⚠️ Low stock alert</h2>
          <p className="text-sm text-slate-500">Variants with only 1–2 items left</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3">Product</th>
                <th className="px-6 py-3">Variant</th>
                <th className="px-6 py-3">SKU</th>
                <th className="px-6 py-3 text-right">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lowStock.map(item => (
                <tr key={item.sku}>
                  <td className="px-6 py-3 font-medium text-slate-900">{item.product}</td>
                  <td className="px-6 py-3 text-slate-600">{[item.color, item.size].filter(Boolean).join(' · ') || '—'}</td>
                  <td className="px-6 py-3 font-mono text-xs text-slate-500">{item.sku}</td>
                  <td className="px-6 py-3 text-right">
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-semibold text-amber-700">{item.stock}</span>
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
