// Used by admin (/admin/orders) and staff (/staff/orders). Staff can only move the status forward.
import { ChevronDown, ReceiptText, Search } from 'lucide-react'
import { Fragment, useState } from 'react'
import { adminCancelOrder, getManageOrders, nextOrderStatus } from '../../api/manage'
import { adminCard, adminInput } from '../../components/admin/adminStyles'
import PageHeader from '../../components/admin/PageHeader'
import OrderStatusBadge from '../../components/OrderStatusBadge'
import Spinner from '../../components/Spinner'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../hooks/useAuth'
import { formatPrice, getErrorMessage } from '../../utils/format'
import { useConfirm } from '../../hooks/useConfirm'
import LoadError from '../../components/LoadError'

const TABS = [
  ['placed', 'To pack'], ['packed', 'To ship'], ['shipped', 'Shipped'], ['delivered', 'Delivered'],
  ['cancelled', 'Cancelled'], ['pending_payment', 'Unpaid'], ['', 'All'],
]
const NEXT_LABEL = { placed: 'Mark packed', packed: 'Mark shipped', shipped: 'Mark delivered' }
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`
const PAYMENT_STYLE = { paid: 'text-brand-700', failed: 'text-rose-600', refund_pending: 'text-mango-600', pending: 'text-ink-400' }

const Orders = () => {
  const { user } = useAuth()
  const [status, setStatus] = useState('placed')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(null) // order id with details shown
  const [version, setVersion] = useState(0)
  const { data, loading, error } = useApi(getManageOrders, { status, search }, version)
  const { confirm, notify, dialog } = useConfirm()

  const act = async action => {
    try {
      await action()
      setVersion(v => v + 1)
    } catch (error) {
      notify(getErrorMessage(error), 'Could not update the order')
    }
  }

  return (
    <div className="space-y-5">
      {dialog}
      <PageHeader title="Orders" subtitle={user.role === 'superadmin' ? 'Orders of all stores' : `${user.store_name} · ${user.role === 'staff' ? 'pack, ship and deliver customer orders' : 'customer orders'}`}>
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Order #, name or email…" className={`${adminInput} pl-9`} />
        </div>
      </PageHeader>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(([value, label]) => (
          <button key={value} onClick={() => setStatus(value)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${status === value ? 'bg-ink-900 text-white' : 'bg-white text-ink-600 ring-1 ring-ink-300/30 hover:bg-[#f6f8f7]'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : error ? <LoadError what="orders" onRetry={() => setVersion(v => v + 1)} /> : (
        <div className={`${adminCard} overflow-x-auto`}>
          {data.results.length === 0 ? (
            <div className="p-12 text-center text-ink-500"><ReceiptText className="mx-auto text-ink-300" size={40} /><p className="mt-2 font-semibold">No orders here</p></div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f6f8f7] text-xs font-semibold uppercase tracking-wider text-ink-400">
                <tr><th className="px-5 py-3">Order</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Items</th><th className="px-5 py-3">Total</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-ink-300/20">
                {data.results.map(order => (
                  <Fragment key={order.id}>
                    <tr className="hover:bg-[#f6f8f7]">
                      <td className="px-5 py-3">
                        <button onClick={() => setOpen(open === order.id ? null : order.id)} className="flex items-center gap-1 font-bold text-ink-900">
                          #{order.id} <ChevronDown size={15} className={`text-ink-400 transition ${open === order.id ? 'rotate-180' : ''}`} />
                        </button>
                        <p className="text-xs text-ink-400">{new Date(order.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</p>
                        {user.role === 'superadmin' && <p className="mt-1 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-800">{order.store_name}</p>}
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-semibold text-ink-800">{order.ship_name}</p>
                        <p className="text-xs text-ink-400">{order.customer}</p>
                      </td>
                      <td className="max-w-[220px] px-5 py-3">
                        <p className="truncate text-ink-700">{order.items.map(i => i.product_name).join(', ')}</p>
                        <p className="text-xs text-ink-400">{plural(order.items.reduce((n, i) => n + i.qty, 0), 'item')}</p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <p className="font-semibold text-ink-900">{formatPrice(order.total)}</p>
                        <p className={`text-xs font-semibold ${PAYMENT_STYLE[order.payment_status]}`}>{order.payment_status_label}</p>
                      </td>
                      <td className="px-5 py-3"><OrderStatusBadge status={order.status} label={order.status_label} /></td>
                      <td className="whitespace-nowrap px-5 py-3 text-right">
                        {NEXT_LABEL[order.status] && (
                          <button onClick={() => act(() => nextOrderStatus(order.id))} className="bg-brand rounded-full px-4 py-2 text-xs font-bold text-white">{NEXT_LABEL[order.status]}</button>
                        )}
                        {['admin', 'superadmin'].includes(user.role) && order.can_cancel && (
                          <button onClick={async () => (await confirm({ title: `Cancel order #${order.id}?`, message: `The customer’s ${formatPrice(order.total)} will be marked for refund and the items go back into stock.`, confirmLabel: 'Cancel order', cancelLabel: 'Keep order' })) && act(() => adminCancelOrder(order.id))} className="ml-3 text-xs font-semibold text-ink-400 hover:text-rose-600">Cancel</button>
                        )}
                      </td>
                    </tr>
                    {open === order.id && (
                      <tr className="bg-[#f6f8f7]">
                        <td colSpan={6} className="px-5 py-4">
                          <div className="grid gap-4 text-sm md:grid-cols-2">
                            <div>
                              <p className="text-xs font-bold uppercase text-ink-400">Items</p>
                              {order.items.map(i => (
                                <p key={i.id} className="mt-1 text-ink-700">{i.product_name} {i.variant_label && `(${i.variant_label})`} × {i.qty} — {formatPrice(i.line_total)}</p>
                              ))}
                            </div>
                            <div>
                              <p className="text-xs font-bold uppercase text-ink-400">Deliver to</p>
                              <p className="mt-1 text-ink-700">{order.ship_name} · {order.ship_phone}</p>
                              <p className="text-ink-700">{order.ship_address}, {order.ship_city} – {order.ship_pincode}</p>
                              {order.coupon_code && <p className="mt-1 text-ink-500">Coupon {order.coupon_code} (−{formatPrice(order.discount)})</p>}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

export default Orders
