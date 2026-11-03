// Inventory home: numbers, things waiting for someone, low-stock alerts
import { ArrowLeftRight, Boxes, CircleAlert, PackagePlus, SlidersHorizontal, Truck, Warehouse } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getInventoryOverview } from '../../api/inventory'
import { adminCard } from '../../components/admin/adminStyles'
import PageHeader from '../../components/admin/PageHeader'
import LoadError from '../../components/LoadError'
import Spinner from '../../components/Spinner'
import StatCard from '../../components/StatCard'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../hooks/useAuth'

const Overview = () => {
  const { user } = useAuth()
  const { data, loading, error } = useApi(getInventoryOverview)
  const isAdmin = user.role !== 'warehouse'

  if (loading) return <Spinner />
  if (error) return <LoadError what="the inventory overview" />
  const { stats, low_stock: low } = data

  // What needs doing – admins approve, the warehouse team dispatches and receives
  const todo = [
    { count: stats.pending_adjustments, label: isAdmin ? 'Adjustments to approve' : 'Adjustments waiting for approval', to: '/inventory/adjustments?status=pending', icon: SlidersHorizontal },
    { count: stats.pending_transfers, label: isAdmin ? 'Transfers to approve' : 'Transfers waiting for approval', to: '/inventory/transfers?status=requested', icon: ArrowLeftRight },
    { count: stats.ready_to_dispatch, label: 'Transfers ready to dispatch', to: '/inventory/transfers?status=approved', icon: Truck },
    { count: stats.in_transit, label: 'Transfers to receive', to: '/inventory/transfers?status=in_transit', icon: PackagePlus },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory" subtitle={user.role === 'superadmin' ? 'All stores' : user.warehouse_name ? `${user.warehouse_name} · ${user.store_name}` : `Warehouses of ${user.store_name}`}>
        <Link to="/inventory/receipts?new=1" className="bg-brand flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-md"><PackagePlus size={16} /> Receive goods</Link>
        <Link to="/inventory/transfers?new=1" className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-ink-700 ring-1 ring-ink-300/30"><ArrowLeftRight size={16} /> Transfer</Link>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard icon={Warehouse} label="Warehouses" value={stats.warehouses} hint="active" tone="violet" />
        <StatCard icon={Boxes} label="Units in stock" value={stats.units.toLocaleString('en-IN')} hint={`${stats.skus} products / variants`} tone="brand" />
        <StatCard icon={CircleAlert} label="Low stock" value={stats.low} hint="at or below reorder level" tone="mango" />
        <StatCard icon={CircleAlert} label="Out of stock" value={stats.out} hint="warehouse rows with 0" tone="rose" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {todo.map(({ count, label, to, icon: Icon }) => (
          <Link key={label} to={to} className={`${adminCard} flex items-center gap-4 p-5 transition hover:ring-brand-200 ${count ? '' : 'opacity-60'}`}>
            <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${count ? 'bg-mango-100 text-mango-600' : 'bg-ink-300/10 text-ink-400'}`}><Icon size={20} /></span>
            <span>
              <span className="block font-display text-2xl font-extrabold text-ink-900">{count}</span>
              <span className="text-sm text-ink-500">{label}</span>
            </span>
          </Link>
        ))}
      </div>

      <div className={`${adminCard} overflow-x-auto`}>
        <div className="flex items-center justify-between px-6 pt-5">
          <h2 className="text-lg font-bold text-ink-900">Reorder alerts</h2>
          <Link to="/inventory/stock?low=1" className="text-sm font-bold text-brand-700 hover:underline">All low stock →</Link>
        </div>
        {low.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-ink-400">Nothing is below its reorder level. 🎉</p>
        ) : (
          <table className="mt-3 w-full text-left text-sm">
            <thead className="bg-[#f6f8f7] text-xs font-semibold uppercase tracking-wider text-ink-400">
              <tr><th className="px-6 py-3">Product</th><th className="px-6 py-3">Warehouse</th><th className="px-6 py-3">In stock</th><th className="px-6 py-3">Reorder at</th></tr>
            </thead>
            <tbody className="divide-y divide-ink-300/20">
              {low.map(row => (
                <tr key={row.id}>
                  <td className="px-6 py-3"><p className="font-semibold text-ink-900">{row.product}</p><p className="text-xs text-ink-400">{row.sku} · {row.variant_label}</p></td>
                  <td className="px-6 py-3 text-ink-600">{row.warehouse_name}</td>
                  <td className="px-6 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${row.quantity === 0 ? 'bg-rose-50 text-rose-700' : 'bg-mango-100 text-mango-600'}`}>{row.quantity}</span></td>
                  <td className="px-6 py-3 text-ink-600">{row.reorder_level}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default Overview
