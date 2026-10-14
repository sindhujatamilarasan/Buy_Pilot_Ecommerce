import { Link } from 'react-router-dom'
import { formatPrice } from '../../utils/format'
import OrderStatusBadge from '../OrderStatusBadge'

const RecentOrders = ({ orders }) => (
  <div className="rounded-3xl bg-white shadow-sm ring-1 ring-ink-300/20">
    <div className="flex items-center justify-between px-6 pt-5">
      <h2 className="text-lg font-bold text-ink-900">Recent orders</h2>
      <Link to="/admin/orders" className="text-sm font-bold text-brand-700 hover:underline">View all →</Link>
    </div>
    {orders.length === 0 ? (
      <p className="px-6 py-10 text-center text-sm text-ink-400">No orders yet – they will show up here.</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="mt-3 w-full text-left text-sm">
          <thead className="text-xs font-semibold text-ink-400">
            <tr><th className="px-6 py-2">Order</th><th className="px-6 py-2">Customer</th><th className="hidden px-6 py-2 sm:table-cell">Items</th><th className="px-6 py-2">Total</th><th className="px-6 py-2">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-ink-300/20">
            {orders.map(o => (
              <tr key={o.id} className="hover:bg-[#f6f8f7]">
                <td className="px-6 py-3">
                  <p className="font-bold text-ink-900">#{o.id}</p>
                  <p className="text-xs text-ink-400">{new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                </td>
                <td className="px-6 py-3">
                  <p className="font-semibold text-ink-800">{o.customer}</p>
                  <p className="hidden text-xs text-ink-400 sm:block">{o.email}</p>
                </td>
                <td className="hidden px-6 py-3 text-ink-600 sm:table-cell">{o.items}</td>
                <td className="px-6 py-3 font-semibold text-ink-900">{formatPrice(o.total)}</td>
                <td className="px-6 py-3"><OrderStatusBadge status={o.status} label={o.status_label} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
)

export default RecentOrders
