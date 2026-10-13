import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getProduct } from '../api/products'
import Message from '../components/Message'
import Spinner from '../components/Spinner'
import VariantPicker from '../components/VariantPicker'
import { useApi } from '../hooks/useApi'
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
  const inStock = variant.stock > 0

  // Ordering needs login → /checkout is a protected route
  const buyNow = () => navigate('/checkout', { state: { product, variant } })

  return (
    <div className="grid gap-10 md:grid-cols-2">
      <div>
        <img src={product.images[imageIndex]?.path} alt={product.name} className="aspect-square w-full rounded-2xl border border-ink-200 bg-white object-contain p-6" />
        <div className="mt-3 flex gap-3">
          {product.images.map((image, index) => (
            <button key={image.id} onClick={() => setImageIndex(index)} className={`overflow-hidden rounded-xl border-2 ${index === imageIndex ? 'border-gold-500' : 'border-ink-100'}`}>
              <img src={image.path} alt="" className="h-20 w-20 bg-white object-contain p-1" />
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-700">{product.category.name}</p>
        <h1 className="mt-2 text-4xl font-semibold text-ink-900">{product.name}</h1>
        <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-gold-50 px-3 py-1 text-sm font-semibold text-ink-800 ring-1 ring-gold-200"><span className="text-gold-500">★</span> {product.rating}</span>

        {/* Price and stock come from the SELECTED variant */}
        <p className="mt-6 font-serif text-3xl font-semibold text-ink-900">{formatPrice(variant.price)}</p>
        <p className={`mt-1 text-sm font-medium ${inStock ? 'text-emerald-700' : 'text-rose-600'}`}>
          {!inStock ? 'Out of stock' : variant.stock <= 2 ? `Only ${variant.stock} left – hurry!` : 'In stock'}
        </p>

        <div className="mt-6">
          <VariantPicker variants={product.variants} selected={variant} onSelect={setVariant} />
        </div>

        <div className="mt-8 flex gap-3">
          <button disabled title="Cart comes on Day 5" className="flex-1 rounded-full border border-ink-900 py-3.5 font-semibold text-ink-900 disabled:opacity-40">
            Add to cart
          </button>
          <button disabled={!inStock} onClick={buyNow} className="flex-1 rounded-full bg-ink-900 py-3.5 font-semibold text-white transition hover:bg-gold-600 disabled:bg-ink-300">
            Buy now
          </button>
        </div>

        <p className="mt-8 leading-relaxed text-ink-600">{product.description}</p>
        <p className="mt-2 text-xs text-ink-400">SKU: {variant.sku}</p>
      </div>
    </div>
  )
}

export default ProductDetail
