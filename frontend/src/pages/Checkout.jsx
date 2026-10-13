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
        <Link to="/products" className="font-semibold text-brand-600">Browse products →</Link>
      </Message>
    )
  }

  const { product, variant } = item

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-extrabold text-ink-900">Checkout 🛒</h1>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-brand-100">
        <p className="text-sm text-ink-500">Ordering as</p>
        <p className="font-semibold text-ink-900">{user.name} · {user.email}</p>
      </div>

      <div className="flex gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-brand-100">
        <img src={product.images[0]?.path} alt="" className="h-24 w-24 rounded-2xl bg-brand-50 object-contain p-2 mix-blend-multiply" />
        <div className="flex-1">
          <p className="font-semibold text-ink-900">{product.name}</p>
          <p className="text-sm text-ink-500">{[variant.color, variant.size].filter(Boolean).join(' · ')} · Qty 1</p>
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
