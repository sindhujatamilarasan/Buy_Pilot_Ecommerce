// Protected page: you only get here when logged in (see App.jsx).
// The price shown here comes from the BACKEND (POST /api/cart/quote/), not from the browser.
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { quoteCart } from '../api/cart'
import Message from '../components/Message'
import PriceSummary from '../components/PriceSummary'
import Spinner from '../components/Spinner'
import { useApi } from '../hooks/useApi'
import { useAuth } from '../hooks/useAuth'
import { useCart } from '../hooks/useCart'
import { formatPrice } from '../utils/format'

// Server sends money as strings ("179.82") → numbers for the summary box
const toSummary = server => {
  const n = key => Number(server[key])
  const taxable = n('subtotal') - n('discount')
  const freeMin = n('free_shipping_min')
  return {
    subtotal: n('subtotal'),
    discount: n('discount'),
    tax: n('tax'),
    shipping: n('shipping'),
    total: n('total'),
    amountForFreeShipping: taxable > 0 && taxable < freeMin ? freeMin - taxable : 0,
  }
}

const Checkout = () => {
  const { user } = useAuth()
  const { cartItems, count } = useCart()

  // Only ids + quantities go to the server
  const payload = useMemo(
    () => ({ items: cartItems.map(i => ({ variant_id: i.variantId, qty: i.qty })) }),
    [cartItems],
  )
  const { data: quote, loading, error } = useApi(quoteCart, payload)

  if (cartItems.length === 0) {
    return (
      <Message icon="🛒" title="Your cart is empty">
        <Link to="/products" className="font-semibold text-brand-700">Browse products →</Link>
      </Message>
    )
  }
  if (loading) return <Spinner />
  if (error) return <Message type="error" icon="⚠️" title="Could not check your cart. Please try again." />

  const hasProblems = quote.problems.length > 0

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <h1 className="text-3xl font-extrabold text-ink-900">Checkout 🧾</h1>

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-brand-100">
          <p className="text-sm text-ink-500">Ordering as</p>
          <p className="font-semibold text-ink-900">{user.name} · {user.email}</p>
        </div>

        {hasProblems && (
          <div className="rounded-3xl bg-rose-50 p-5 text-sm text-rose-700 ring-1 ring-rose-200">
            <p className="font-bold">Some items need your attention:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {quote.problems.map(p => <li key={p.variant_id}>{p.message}</li>)}
            </ul>
            <Link to="/cart" className="mt-3 inline-block font-bold underline">Update cart</Link>
          </div>
        )}

        <div className="divide-y divide-brand-50 rounded-3xl bg-white px-6 shadow-sm ring-1 ring-brand-100">
          {quote.lines.map(line => (
            <div key={line.variant_id} className="flex justify-between gap-4 py-4 text-sm">
              <span className="text-ink-700">{line.name} <span className="text-ink-400">× {line.qty}</span></span>
              <span className="font-semibold text-ink-900">{formatPrice(line.line_total)}</span>
            </div>
          ))}
        </div>

        <p className="rounded-2xl bg-mango-100 px-4 py-3 text-sm text-ink-700">
          🚧 Saved addresses, coupons and Razorpay payment come in Week 2.
        </p>
      </div>

      <div className="lg:sticky lg:top-32">
        <PriceSummary summary={toSummary(quote.summary)} itemCount={count}>
          <p className="mt-4 rounded-2xl bg-brand-50 px-4 py-3 text-xs font-semibold text-brand-800">
            🔒 Price verified by the server
          </p>
          <button disabled className="bg-brand mt-4 w-full rounded-full py-3.5 font-bold text-white opacity-50">
            {hasProblems ? 'Fix cart to continue' : 'Place order (Week 2)'}
          </button>
        </PriceSummary>
      </div>
    </div>
  )
}

export default Checkout
