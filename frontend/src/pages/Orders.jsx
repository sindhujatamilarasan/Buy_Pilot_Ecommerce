import { Link } from 'react-router-dom'
import { getMyOrders } from '../api/orders'
import Message from '../components/Message'
import OrderStatusBadge from '../components/OrderStatusBadge'
import Spinner from '../components/Spinner'
import { useApi } from '../hooks/useApi'
import { formatPrice } from '../utils/format'

const Orders = () => {
  const { data: orders, loading, error } = useApi(getMyOrders)

  if (loading) return <Spinner />
  if (error) return <Message type="error" icon="⚠️" title="Could not load your orders" />

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">My orders</h1>
        <p className="text-sm text-ink-500">Track, cancel or pay for your orders.</p>
      </div>

      {orders.length === 0 && (
        <Message icon="📦" title="No orders yet">
          <Link to="/products" className="font-semibold text-brand-700">Start shopping →</Link>
        </Message>
      )}

      {orders.map(order => (
        <Link key={order.id} to={`/orders/${order.id}`} className="block rounded-2xl p-5 ring-1 ring-ink-300/25 transition hover:bg-[#f6f8f7] hover:ring-brand-200">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-display text-lg font-bold text-ink-900">Order #{order.id}</p>
              <p className="text-xs text-ink-500">{new Date(order.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p>
            </div>
            <OrderStatusBadge status={order.status} label={order.status_label} />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex -space-x-3">
              {order.items.slice(0, 4).map(item => (
                <img key={item.id} src={item.image} alt="" className="h-12 w-12 rounded-full bg-brand-50 object-contain p-1 ring-2 ring-white" />
              ))}
            </div>
            <p className="font-display text-lg font-bold text-ink-900">{formatPrice(order.total)}</p>
          </div>
          {order.payment_status === 'failed' && <p className="mt-3 text-xs font-bold text-rose-600">Payment failed – tap to retry</p>}
        </Link>
      ))}
    </div>
  )
}

export default Orders
