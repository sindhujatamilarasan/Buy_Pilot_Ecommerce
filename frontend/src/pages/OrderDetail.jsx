import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { cancelOrder, getOrder, retryPayment } from '../api/orders'
import Message from '../components/Message'
import OrderStatusBadge from '../components/OrderStatusBadge'
import Spinner from '../components/Spinner'
import StatusTimeline from '../components/StatusTimeline'
import { useApi } from '../hooks/useApi'
import { usePaymentFlow } from '../hooks/usePaymentFlow'
import { formatPrice, getErrorMessage } from '../utils/format'

const OrderDetail = () => {
  const { id } = useParams()
  const location = useLocation()
  const { data, loading, error } = useApi(getOrder, id)
  const [updated, setUpdated] = useState(null) // newer copy after cancel / retry
  const [notice, setNotice] = useState(location.state?.paymentError || '')

  const { startPayment, paymentModal, paying } = usePaymentFlow({
    onSuccess: order => {
      setUpdated(order)
      setNotice('')
    },
    onFailure: (_, message) => setNotice(message),
  })

  if (loading) return <Spinner />
  if (error) return <Message type="error" icon="🔍" title="Order not found" />

  const order = updated || data
  const unpaid = order.status === 'pending_payment'

  const retry = async () => {
    try {
      await startPayment(order, await retryPayment(order.id))
    } catch (err) {
      setNotice(getErrorMessage(err))
    }
  }

  const cancel = async () => {
    if (!window.confirm('Cancel this order? The amount will be refunded.')) return
    try {
      setUpdated(await cancelOrder(order.id))
    } catch (err) {
      setNotice(getErrorMessage(err))
    }
  }

  const rows = [['Subtotal', order.subtotal], ['Discount', -order.discount], ['GST', order.tax], ['Shipping', order.shipping]]

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {location.state?.placed && !updated && (
        <div className="bg-brand-soft rounded-3xl p-6 text-center">
          <p className="text-4xl">🎉</p>
          <p className="mt-2 font-display text-2xl font-extrabold text-ink-900">Order placed successfully!</p>
          <p className="text-ink-600">Thank you for shopping with us.</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/orders" className="text-sm font-semibold text-brand-700">← My orders</Link>
          <h1 className="text-3xl font-extrabold text-ink-900">Order #{order.id}</h1>
        </div>
        <OrderStatusBadge status={order.status} label={order.status_label} />
      </div>

      {notice && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{notice}</p>}

      {unpaid ? (
        <div className="rounded-3xl bg-mango-100 p-5 text-sm text-ink-700">
          <p className="font-bold">💳 Payment {order.payment_status === 'failed' ? 'failed' : 'not completed'}</p>
          <p className="mt-1">Your items are not reserved until you pay.</p>
          <button onClick={retry} disabled={paying} className="bg-brand mt-3 rounded-full px-6 py-2.5 font-bold text-white">
            {paying ? 'Processing…' : `Retry payment · ${formatPrice(order.total)}`}
          </button>
        </div>
      ) : (
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-brand-100"><StatusTimeline order={order} /></div>
      )}

      <div className="divide-y divide-brand-50 rounded-3xl bg-white px-6 shadow-sm ring-1 ring-brand-100">
        {order.items.map(item => (
          <div key={item.id} className="flex items-center gap-4 py-4 text-sm">
            <img src={item.image} alt="" className="h-14 w-14 rounded-xl bg-brand-50 object-contain p-1 mix-blend-multiply" />
            <span className="flex-1">{item.product_name} <span className="text-ink-400">{item.variant_label} × {item.qty}</span></span>
            <span className="font-semibold">{formatPrice(item.line_total)}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-3xl bg-white p-6 text-sm shadow-sm ring-1 ring-brand-100">
          <h2 className="font-bold text-ink-900">📍 Delivering to</h2>
          <p className="mt-2 font-semibold">{order.ship_name} · {order.ship_phone}</p>
          <p className="text-ink-600">{order.ship_address}, {order.ship_city} – {order.ship_pincode}</p>
        </div>
        <div className="space-y-2 rounded-3xl bg-white p-6 text-sm shadow-sm ring-1 ring-brand-100">
          {rows.map(([label, value]) => (
            <p key={label} className="flex justify-between text-ink-600"><span>{label}</span><span>{Number(value) === 0 ? '—' : formatPrice(value)}</span></p>
          ))}
          <p className="flex justify-between border-t border-brand-100 pt-2 font-bold text-ink-900"><span>Total ({order.payment_status_label})</span><span>{formatPrice(order.total)}</span></p>
        </div>
      </div>

      {order.can_cancel && (
        <button onClick={cancel} className="w-full rounded-full border-2 border-rose-200 py-3 font-bold text-rose-600 hover:bg-rose-50">Cancel order</button>
      )}
      {paymentModal}
    </div>
  )
}

export default OrderDetail
