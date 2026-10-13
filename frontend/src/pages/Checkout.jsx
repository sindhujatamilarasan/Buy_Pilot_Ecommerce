// Protected page: you only get here when logged in (see App.jsx).
import { Link, useLocation } from 'react-router-dom'
import Message from '../components/Message'
import { useAuth } from '../hooks/useAuth'
import { formatPrice } from '../utils/format'

const Checkout = () => {
  const { user } = useAuth()
  const item = useLocation().state // { product, variant } sent from "Buy now"

  if (!item) {
    return (
      <Message icon="🛒" title="Nothing to check out yet">
        <Link to="/products" className="font-semibold text-indigo-600">Browse products →</Link>
      </Message>
    )
  }

  const { product, variant } = item

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Checkout</h1>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Ordering as</p>
        <p className="font-semibold text-slate-900">{user.name} · {user.email}</p>
      </div>

      <div className="flex gap-4 rounded-2xl bg-white p-6 shadow-sm">
        <img src={product.images[0]?.path} alt="" className="h-24 w-24 rounded-xl border border-slate-200 bg-white object-contain p-2" />
        <div className="flex-1">
          <p className="font-semibold text-slate-900">{product.name}</p>
          <p className="text-sm text-slate-500">{[variant.color, variant.size].filter(Boolean).join(' · ')} · Qty 1</p>
        </div>
        <p className="text-lg font-bold">{formatPrice(variant.price)}</p>
      </div>

      <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
        🚧 Addresses, price summary and Razorpay payment come in Week 2.
      </p>
    </div>
  )
}

export default Checkout
