import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getProduct } from '../api/products'
import HeartButton from '../components/HeartButton'
import Message from '../components/Message'
import QtyStepper from '../components/QtyStepper'
import Spinner from '../components/Spinner'
import VariantPicker from '../components/VariantPicker'
import { useApi } from '../hooks/useApi'
import { useCart } from '../hooks/useCart'
import { useRecentlyViewed } from '../hooks/useRecentlyViewed'
import { categoryStyle } from '../utils/categoryStyle'
import { formatPrice } from '../utils/format'

const ProductDetail = () => {
  const { slug } = useParams() // from the URL /products/:slug
  const { data: product, loading, error } = useApi(getProduct, slug)

  if (loading) return <Spinner />
  if (error) return <Message type="error" icon="😕" title="Product not found" />

  // key={product.id}: a new product → fresh state (selected image / variant)
  return <ProductView key={product.id} product={product} />
}

const ProductView = ({ product }) => {
  const navigate = useNavigate()
  const [imageIndex, setImageIndex] = useState(0)
  // Start with the first variant that is in stock
  const [variant, setVariant] = useState(
    () => product.variants.find(v => v.stock > 0) || product.variants[0],
  )
  const [qty, setQty] = useState(1)
  const [notice, setNotice] = useState(null) // message after "Add to cart"
  const { addItem, quantityOf } = useCart()
  const { remember } = useRecentlyViewed()

  // Opening a product adds it to "Recently viewed" – runs once, because neither
  // `product` (same object while this page is open) nor `remember` (useCallback) changes
  useEffect(() => {
    remember(product)
  }, [product, remember])

  const style = categoryStyle(product.category.slug)
  const inCart = quantityOf(variant.id)
  const canAdd = variant.stock - inCart // stock limit: what is left after what is already in the cart
  const inStock = variant.stock > 0

  const selectVariant = next => {
    setVariant(next)
    setQty(1)
    setNotice(null)
  }

  // What we store in the cart for this variant
  const cartItem = () => ({
    variantId: variant.id,
    slug: product.slug,
    name: product.name,
    image: product.images[0]?.path,
    size: variant.size,
    color: variant.color,
    price: Number(variant.price),
    stock: variant.stock,
  })

  const addToCart = () => {
    const added = addItem(cartItem(), qty)
    setNotice(
      added === 0
        ? { type: 'warn', text: `You already have all ${variant.stock} in your cart.` }
        : added < qty
          ? { type: 'warn', text: `Only ${added} more could be added (stock limit).` }
          : { type: 'ok', text: `Added ${added} to your cart ✓` },
    )
    setQty(1)
  }

  // Buy now = add to cart, then checkout (protected → login first if needed)
  const buyNow = () => {
    if (canAdd > 0) addItem(cartItem(), qty)
    navigate('/checkout')
  }

  return (
    <div className="grid gap-10 md:grid-cols-2">
      <div>
        <div className={`overflow-hidden rounded-3xl ${style.soft}`}>
        <img src={product.images[imageIndex]?.path} alt={product.name} className="aspect-square w-full object-contain p-8 mix-blend-multiply" />
        </div>
        <div className="mt-3 flex gap-3">
          {product.images.map((image, index) => (
            <button key={image.id} onClick={() => setImageIndex(index)} className={`overflow-hidden rounded-2xl border-2 ${index === imageIndex ? 'border-brand-500' : 'border-transparent'}`}>
              <img src={image.path} alt="" className={`h-20 w-20 object-contain p-1 mix-blend-multiply ${style.soft}`} />
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className={`text-sm font-bold ${style.text}`}>{style.emoji} {product.category.name}</p>
        <h1 className="mt-2 text-4xl font-extrabold text-ink-900">{product.name}</h1>
        <div className="mt-3 flex items-center gap-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800"><span className="text-amber-500">★</span> {product.rating}</span>
          <HeartButton product={product} className="ring-1 ring-ink-300/30" />
        </div>

        {/* Price and stock come from the SELECTED variant */}
        <p className="mt-6 font-display text-4xl font-extrabold text-ink-900">{formatPrice(variant.price)}</p>
        <p className={`mt-1 text-sm font-medium ${inStock ? 'text-emerald-700' : 'text-rose-600'}`}>
          {!inStock ? 'Out of stock' : variant.stock <= 2 ? `Only ${variant.stock} left – hurry!` : 'In stock'}
        </p>

        <div className="mt-6">
          <VariantPicker variants={product.variants} selected={variant} onSelect={selectVariant} />
        </div>

        {inStock && (
          <div className="mt-6 flex items-center gap-3 text-sm">
            <span className="font-semibold text-ink-700">Quantity</span>
            <QtyStepper value={qty} max={Math.max(1, canAdd)} onChange={setQty} />
            {inCart > 0 && <span className="text-ink-500">({inCart} already in cart)</span>}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button onClick={addToCart} disabled={!inStock || canAdd === 0} className="flex-1 rounded-full border-2 border-brand-300 bg-white py-3.5 font-bold text-brand-700 transition hover:bg-brand-50 disabled:opacity-50">
            Add to cart
          </button>
          <button disabled={!inStock} onClick={buyNow} className="bg-brand flex-1 rounded-full py-3.5 font-bold text-white shadow-lg shadow-brand-200 transition hover:scale-[1.02] disabled:bg-none disabled:bg-ink-300 disabled:shadow-none">
            Buy now
          </button>
        </div>

        {notice && (
          <p className={`mt-4 rounded-2xl px-4 py-3 text-sm font-semibold ${notice.type === 'ok' ? 'bg-brand-50 text-brand-800' : 'bg-mango-100 text-ink-700'}`}>
            {notice.text} <Link to="/cart" className="ml-1 underline">View cart →</Link>
          </p>
        )}

        <p className="mt-8 leading-relaxed text-ink-600">{product.description}</p>
        <p className="mt-2 text-xs text-ink-400">SKU: {variant.sku}</p>
      </div>
    </div>
  )
}

export default ProductDetail
