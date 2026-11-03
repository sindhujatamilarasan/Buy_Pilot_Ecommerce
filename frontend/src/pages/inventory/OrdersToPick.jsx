// Orders the warehouse has to pick and pack: paid orders that take stock from MY warehouse, oldest first.
// Each order is packed from the warehouse closest to the customer (same city), so every location sees its own orders.
import { ClipboardList, Printer } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getOrdersToPick } from '../../api/inventory'
import { adminCard } from '../../components/admin/adminStyles'
import PageHeader from '../../components/admin/PageHeader'
import LoadError from '../../components/LoadError'
import Spinner from '../../components/Spinner'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../hooks/useAuth'

const OrdersToPick = () => {
  const { user } = useAuth()
  const { data, loading, error } = useApi(getOrdersToPick)

  if (loading) return <Spinner />
  if (error) return <LoadError what="the orders to pick" />

  return (
    <div className="space-y-6">
      <PageHeader title="Orders to pick" subtitle={user.warehouse_name ? `Packed from ${user.warehouse_name}` : 'Paid orders waiting to be packed, oldest first'} />
      {data.length === 0 ? (
        <div className={`${adminCard} flex flex-col items-center gap-2 p-12 text-center text-ink-500`}>
          <ClipboardList size={28} className="text-ink-300" />
          <p className="font-semibold text-ink-700">Nothing to pick right now</p>
          <p className="text-sm">New paid orders for this warehouse show up here.</p>
        </div>
      ) : (
        <div className={`${adminCard} overflow-x-auto`}>
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f6f8f7] text-xs font-semibold uppercase tracking-wider text-ink-400">
              <tr><th className="px-5 py-3">Order</th><th className="px-5 py-3">Placed</th><th className="px-5 py-3">Ship to</th><th className="px-5 py-3">Pick from</th><th className="px-5 py-3 text-right">Units</th><th className="px-5 py-3">Status</th><th className="px-5 py-3" /></tr>
            </thead>
            <tbody className="divide-y divide-ink-300/20">
              {data.map(order => (
                <tr key={order.order} className="hover:bg-[#f6f8f7]">
                  <td className="px-5 py-3 font-bold text-ink-900">#{order.order}</td>
                  <td className="px-5 py-3 text-ink-600">{new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td className="px-5 py-3 text-ink-600">{order.city} – {order.pincode}</td>
                  <td className="px-5 py-3 text-xs font-semibold text-ink-600">{order.warehouses.join(', ')}</td>
                  <td className="px-5 py-3 text-right font-bold text-ink-900">{order.units}</td>
                  <td className="px-5 py-3"><span className="rounded-full bg-mango-100 px-3 py-1 text-xs font-bold text-mango-600">{order.status_label}</span></td>
                  <td className="px-5 py-3 text-right">
                    <Link to={`/pick-list/${order.order}`} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-100"><Printer size={13} /> Pick list</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default OrdersToPick
