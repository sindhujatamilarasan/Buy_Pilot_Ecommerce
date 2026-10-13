import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import CartItemRow from '../components/CartItemRow'
import Message from '../components/Message'
import PriceSummary from '../components/PriceSummary'
import { useCart } from '../hooks/useCart'
import { calculateSummary } from '../utils/pricing'

const Cart = () => {
  const { cartItems, savedItems, count } = useCart()
  const navigate = useNavigate()

  // useMemo: only recalculate the price when the cart items change
  const summary = useMemo(() => calculateSummary(cartItems), [cartItems])

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-extrabold text-ink-900">Your cart 🛒</h1>

      {cartItems.length === 0 ? (
        <Message icon="🛒" title="Your cart is empty">
          <Link to="/products" className="font-semibold text-brand-700">Start shopping →</Link>
        </Message>
      ) : (
        <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            {cartItems.map(item => <CartItemRow key={item.variantId} item={item} />)}
          </div>

          <div className="lg:sticky lg:top-32">
            <PriceSummary summary={summary} itemCount={count}>
              {/* /checkout is protected → guests are sent to login first */}
              <button onClick={() => navigate('/checkout')} className="bg-brand mt-6 w-full rounded-full py-3.5 font-bold text-white shadow-lg shadow-brand-200 transition hover:scale-[1.02]">
                Proceed to checkout →
              </button>
              <p className="mt-3 text-center text-xs text-ink-400">Final price is confirmed at checkout.</p>
            </PriceSummary>
          </div>
        </div>
      )}

      {savedItems.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold text-ink-900">Saved for later ({savedItems.length})</h2>
          <div className="space-y-4 lg:max-w-[calc(100%-392px)]">
            {savedItems.map(item => <CartItemRow key={item.variantId} item={item} />)}
          </div>
        </section>
      )}
    </div>
  )
}

export default Cart
