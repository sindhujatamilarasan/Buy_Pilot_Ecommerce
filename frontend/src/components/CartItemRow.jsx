import { Link } from 'react-router-dom'
import { useCart } from '../hooks/useCart'
import { formatPrice } from '../utils/format'
import QtyStepper from './QtyStepper'

const CartItemRow = ({ item }) => {
  const { setQty, removeItem, toggleSaveForLater } = useCart()
  const variantText = [item.color, item.size].filter(Boolean).join(' · ')

  return (
    <div className="flex gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-brand-100">
      <Link to={`/products/${item.slug}`} className="shrink-0 overflow-hidden rounded-2xl bg-brand-50">
        <img src={item.image} alt={item.name} className="h-24 w-24 object-contain p-2 mix-blend-multiply" />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex justify-between gap-3">
          <div className="min-w-0">
            <Link to={`/products/${item.slug}`} className="line-clamp-1 font-semibold text-ink-900 hover:text-brand-700">{item.name}</Link>
            {variantText && <p className="text-sm text-ink-500">{variantText}</p>}
            <p className="text-sm text-ink-500">{formatPrice(item.price)} each</p>
          </div>
          {/* Line total = price × qty */}
          <p className="shrink-0 font-display text-lg font-bold text-ink-900">{formatPrice(item.price * item.qty)}</p>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-3 text-sm">
          {!item.savedForLater && <QtyStepper value={item.qty} max={item.stock} onChange={qty => setQty(item.variantId, qty)} />}
          {!item.savedForLater && item.qty >= item.stock && (
            <span className="text-xs font-semibold text-mango-600">Max {item.stock} available</span>
          )}
          <button onClick={() => toggleSaveForLater(item.variantId)} className="font-semibold text-brand-700 hover:underline">
            {item.savedForLater ? 'Move to cart' : 'Save for later'}
          </button>
          <button onClick={() => removeItem(item.variantId)} className="font-semibold text-ink-400 hover:text-rose-600">
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}

export default CartItemRow
