// Used by admin (/admin/orders) and staff (/staff/orders). Staff can only move the status forward.
import { useState } from 'react'
import { adminCancelOrder, getManageOrders, nextOrderStatus } from '../../api/manage'
import { adminCard, adminInput } from '../../components/admin/adminStyles'
import PageHeader from '../../components/admin/PageHeader'
import OrderStatusBadge from '../../components/OrderStatusBadge'
import Spinner from '../../components/Spinner'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../hooks/useAuth'
import { formatPrice, getErrorMessage } from '../../utils/format'

const TABS = [
  ['', 'All'], ['placed', 'Placed'], ['packed', 'Packed'], ['shipped', 'Shipped'],
  ['delivered', 'Delivered'], ['cancelled', 'Cancelled'], ['pending_payment', 'Unpaid'],
]
const NEXT_LABEL = { placed: 'Mark packed 📦', packed: 'Mark shipped 🚚', shipped: 'Mark delivered 🏠' }

const Orders = () => {
  const { user } = useAuth()
  const [status, setStatus] = useState('placed')
  const [search, setSearch] = useState('')
  const [version, setVersion] = useState(0)
  const { data, loading } = useApi(getManageOrders, { status, search }, version)

  const act = async action => {
    try {
      await action()
      setVersion(v => v + 1)
    } catch (error) {
      window.alert(getErrorMessage(error))
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Orders 🧾" subtitle={user.role === 'staff' ? 'Pack, ship and deliver orders' : 'All customer orders'}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Order #, name or email…" className={adminInput} />
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        {TABS.map(([value, label]) => (
          <button key={value} onClick={() => setStatus(value)} className={`rounded-full px-4 py-2 text-sm font-bold transition ${status === value ? 'bg-brand text-white shadow-md' : 'bg-white text-ink-600 ring-1 ring-ink-300/30 hover:bg-[#f6f8f7]'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : (
        <div className="space-y-3">
          {data.results.length === 0 && <p className="text-ink-500">No orders here.</p>}
          {data.results.map(order => (
            <div key={order.id} className={`${adminCard} flex flex-wrap items-center gap-4 p-5`}>
              <div className="min-w-[140px]">
                <p className="font-display text-lg font-bold text-ink-900">#{order.id}</p>
                <p className="text-xs text-ink-500">{new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
              </div>
              <div className="min-w-[180px] flex-1 text-sm">
                <p className="font-semibold text-ink-900">{order.ship_name} <span className="font-normal text-ink-400">· {order.customer}</span></p>
                <p className="line-clamp-1 text-ink-500">{order.items.map(i => `${i.product_name} × ${i.qty}`).join(', ')}</p>
                <p className="text-xs text-ink-400">{order.ship_city} – {order.ship_pincode}</p>
              </div>
              <p className="font-display text-lg font-bold text-ink-900">{formatPrice(order.total)}</p>
              <OrderStatusBadge status={order.status} label={order.status_label} />
              <div className="flex gap-3 text-sm font-bold">
                {NEXT_LABEL[order.status] && (
                  <button onClick={() => act(() => nextOrderStatus(order.id))} className="bg-brand rounded-full px-4 py-2 text-white">{NEXT_LABEL[order.status]}</button>
                )}
                {user.role === 'admin' && order.can_cancel && (
                  <button onClick={() => window.confirm(`Cancel order #${order.id}? Stock goes back.`) && act(() => adminCancelOrder(order.id))} className="text-ink-400 hover:text-rose-600">Cancel</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Orders
