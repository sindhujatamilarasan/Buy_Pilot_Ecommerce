// The price breakdown box (used on Cart and Checkout)
import { FREE_SHIPPING_MIN, GST_PERCENT } from '../utils/pricing'
import { formatPrice } from '../utils/format'

const Row = ({ label, value, highlight }) => (
  <div className={`flex justify-between text-sm ${highlight ? 'font-semibold text-brand-700' : 'text-ink-600'}`}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
)

const PriceSummary = ({ summary, itemCount, children }) => {
  const progress = Math.min(100, ((FREE_SHIPPING_MIN - summary.amountForFreeShipping) / FREE_SHIPPING_MIN) * 100)

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-brand-100">
      <h2 className="text-xl font-bold text-ink-900">Price details</h2>

      <div className="mt-5 space-y-3">
        <Row label={`Subtotal (${itemCount} item${itemCount === 1 ? '' : 's'})`} value={formatPrice(summary.subtotal)} />
        <Row label="Discount" value={summary.discount > 0 ? `− ${formatPrice(summary.discount)}` : '—'} highlight={summary.discount > 0} />
        <Row label={`GST (${GST_PERCENT}%)`} value={formatPrice(summary.tax)} />
        <Row label="Shipping" value={summary.shipping === 0 ? 'FREE' : formatPrice(summary.shipping)} highlight={summary.shipping === 0 && summary.subtotal > 0} />
      </div>

      {summary.amountForFreeShipping > 0 && (
        <div className="mt-4 rounded-2xl bg-mango-100 p-3 text-xs font-semibold text-ink-700">
          Add <b>{formatPrice(summary.amountForFreeShipping)}</b> more for FREE shipping 🚚
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-mango-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <div className="mt-5 flex items-baseline justify-between border-t-2 border-dashed border-brand-100 pt-4">
        <span className="font-bold text-ink-900">Total</span>
        <span className="font-display text-2xl font-extrabold text-ink-900">{formatPrice(summary.total)}</span>
      </div>

      {children}
    </div>
  )
}

export default PriceSummary
