// Protected page (login needed). Prices shown here come from the BACKEND quote,
// and the order is created + paid through the backend.
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { quoteCart } from '../api/cart'
import { createOrder, getAddresses, getPaymentOptions } from '../api/orders'
import AddressPicker from '../components/AddressPicker'
import CouponBox from '../components/CouponBox'
import Message from '../components/Message'
import PriceSummary from '../components/PriceSummary'
import Spinner from '../components/Spinner'
import { useApi } from '../hooks/useApi'
import { useCart } from '../hooks/useCart'
import { usePaymentFlow } from '../hooks/usePaymentFlow'
import { formatPrice, getErrorMessage } from '../utils/format'
import { toSummary } from '../utils/serverSummary'

const Checkout = () => {
  const navigate = useNavigate()
  const { cartItems, count, clearCart } = useCart()
  const saved = useApi(getAddresses)
  const options = useApi(getPaymentOptions)
  const [method, setMethod] = useState('online') // 'online' | 'cod'
  const [newAddresses, setNewAddresses] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [coupon, setCoupon] = useState('')
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')

  // Only ids + quantities (+ coupon code) go to the server
  const payload = useMemo(
    () => ({ items: cartItems.map(i => ({ variant_id: i.variantId, qty: i.qty })), coupon_code: coupon }),
    [cartItems, coupon],
  )
  const quote = useApi(quoteCart, payload)

  const { startPayment, paymentModal, paying } = usePaymentFlow({
    onSuccess: order => {
      clearCart()
      navigate(`/orders/${order.id}`, { state: { placed: true } })
    },
    onFailure: (order, message) => navigate(`/orders/${order.id}`, { state: { paymentError: message } }),
  })

  const addresses = [...(saved.data || []), ...newAddresses]
  const addressId = selectedId ?? addresses.find(a => a.is_default)?.id ?? addresses[0]?.id

  if (cartItems.length === 0) {
    return (
      <Message icon="🛒" title="Your cart is empty">
        <Link to="/products" className="font-semibold text-brand-700">Browse products →</Link>
      </Message>
    )
  }
  if (saved.loading) return <Spinner />

  const placeOrder = async () => {
    setPlacing(true)
    setError('')
    try {
      const { order, payment } = await createOrder({
        address_id: addressId,
        items: payload.items,
        coupon_code: quote.data?.coupon?.code || '',
        payment_method: method,
      })
      if (payment.mode === 'cod') {
        clearCart()
        navigate(`/orders/${order.id}`, { state: { placed: true } })
        return
      }
      await startPayment(order, payment)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setPlacing(false)
    }
  }

  const problems = quote.data?.problems || []
  const total = quote.data?.summary.total
  const codOk = options.data?.cod && total <= options.data.cod_max
  const cod = method === 'cod' && codOk
  const canPay = addressId && quote.data && problems.length === 0 && !placing && !paying

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <h1 className="text-3xl font-extrabold text-ink-900">Checkout 🧾</h1>

        <AddressPicker
          addresses={addresses}
          selectedId={addressId}
          onSelect={setSelectedId}
          onAdded={address => {
            setNewAddresses(list => [...list, address])
            setSelectedId(address.id)
          }}
        />

        {problems.length > 0 && (
          <div className="rounded-3xl bg-rose-50 p-5 text-sm text-rose-700 ring-1 ring-rose-200">
            <p className="font-bold">Some items need your attention:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">{problems.map(p => <li key={p.variant_id ?? p.code}>{p.message}</li>)}</ul>
            <Link to="/cart" className="mt-3 inline-block font-bold underline">Update cart</Link>
          </div>
        )}

        <div className="divide-y divide-brand-50 rounded-3xl bg-white px-6 shadow-sm ring-1 ring-brand-100">
          {quote.data?.lines.map(line => (
            <div key={line.variant_id} className="flex items-center gap-4 py-4 text-sm">
              <img src={line.image} alt="" className="h-14 w-14 rounded-xl bg-brand-50 object-contain p-1 mix-blend-multiply" />
              <span className="flex-1 text-ink-700">
                {line.name} {line.variant_label && <span className="text-ink-400">({line.variant_label})</span>}
                <span className="text-ink-400"> × {line.qty}</span>
              </span>
              <span className="font-semibold text-ink-900">{formatPrice(line.line_total)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 lg:sticky lg:top-32">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-brand-100">
          <CouponBox applied={quote.data?.coupon?.code} error={quote.data?.coupon_error} onApply={setCoupon} onRemove={() => setCoupon('')} />
        </div>

        {quote.loading ? (
          <Spinner />
        ) : (
          <PriceSummary summary={toSummary(quote.data.summary)} itemCount={count}>
            <fieldset className="mt-4 space-y-2">
              <legend className="mb-1 text-sm font-bold text-ink-900">Payment method</legend>
              {[
                ['online', 'Pay online', 'UPI, cards, net banking, wallets'],
                ...(options.data?.cod ? [['cod', 'Cash on delivery', codOk ? 'Pay in cash when it arrives' : `Only for orders up to ${formatPrice(options.data.cod_max)}`]] : []),
              ].map(([key, title, hint]) => (
                <label key={key} className={`flex cursor-pointer items-start gap-3 rounded-2xl px-4 py-3 ring-1 transition ${(key === 'cod' ? cod : !cod) ? 'bg-brand-50 ring-brand-400' : 'ring-ink-300/30'} ${key === 'cod' && !codOk ? 'cursor-not-allowed opacity-60' : ''}`}>
                  <input type="radio" name="method" className="mt-1 accent-emerald-600" disabled={key === 'cod' && !codOk}
                    checked={key === 'cod' ? cod : !cod} onChange={() => setMethod(key)} />
                  <span><span className="block text-sm font-bold text-ink-900">{title}</span><span className="block text-xs text-ink-500">{hint}</span></span>
                </label>
              ))}
            </fieldset>
            <p className="mt-4 rounded-2xl bg-brand-50 px-4 py-3 text-xs font-semibold text-brand-800">🔒 Safe and secure payment</p>
            {error && <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p>}
            <button onClick={placeOrder} disabled={!canPay} className="bg-brand mt-4 w-full rounded-full py-3.5 font-bold text-white shadow-lg shadow-brand-200 transition hover:scale-[1.02] disabled:opacity-50">
              {placing || paying ? 'Processing…' : cod ? `Place order · ${formatPrice(total)}` : `Pay ${formatPrice(total)}`}
            </button>
            {!addressId && <p className="mt-2 text-center text-xs text-ink-500">Add a delivery address to continue.</p>}
          </PriceSummary>
        )}
      </div>

      {paymentModal}
    </div>
  )
}

export default Checkout
