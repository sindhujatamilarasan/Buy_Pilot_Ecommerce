import { IndianRupee, Plus, ReceiptText, Truck, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getDashboard } from '../../api/admin'
import LowStockList from '../../components/admin/LowStockList'
import RecentOrders from '../../components/admin/RecentOrders'
import SalesChart from '../../components/admin/SalesChart'
import CategoryBars from '../../components/CategoryBars'
import Message from '../../components/Message'
import Spinner from '../../components/Spinner'
import StatCard from '../../components/StatCard'
import StockHealth from '../../components/StockHealth'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../hooks/useAuth'
import { formatPrice } from '../../utils/format'

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

  const { stats, sales, recent_orders: recentOrders, categories, low_stock_items: lowStock } = data

  return (
    <div className="space-y-6">
      {/* Header + quick actions */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-brand-700">{now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="mt-1 text-3xl font-extrabold text-ink-900">{greeting(now)}, {user.name}</h1>
          <p className="text-sm text-ink-500">Here’s what’s happening in <span className="font-bold text-brand-700">{data.store}</span>.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/orders" className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-ink-700 shadow-sm ring-1 ring-ink-300/30 hover:bg-[#f6f8f7]"><ReceiptText size={16} /> Orders</Link>
          <Link to="/admin/products/new" className="bg-brand flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-md"><Plus size={16} /> Add product</Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard icon={IndianRupee} label="Revenue" value={formatPrice(stats.revenue)} hint="All paid orders" tone="brand" />
        <StatCard icon={ReceiptText} label="Orders" value={stats.orders} hint="Paid + cancelled" tone="sky" />
        <StatCard icon={Truck} label="To ship" value={stats.to_ship} hint="Placed or packed" tone="mango" />
        <StatCard icon={UserRound} label="Customers" value={stats.customers} hint={`${stats.staff} staff members`} tone="violet" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2"><SalesChart sales={sales} /></div>
        <StockHealth inStock={stats.in_stock} low={stats.low_stock} out={stats.out_of_stock} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2"><RecentOrders orders={recentOrders} /></div>
        <LowStockList items={lowStock} total={stats.low_stock} />
      </div>

      <CategoryBars categories={categories} />
    </div>
  )
}

export default Dashboard
