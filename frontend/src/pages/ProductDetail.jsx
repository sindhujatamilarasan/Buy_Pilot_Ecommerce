import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getProduct } from '../api/products'
import Message from '../components/Message'
import Spinner from '../components/Spinner'
import VariantPicker from '../components/VariantPicker'
import { useApi } from '../hooks/useApi'
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
  const inStock = variant.stock > 0
  const style = categoryStyle(product.category.slug)

  // Ordering needs login → /checkout is a protected route
  const buyNow = () => navigate('/checkout', { state: { product, variant } })

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
        <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800"><span className="text-amber-500">★</span> {product.rating}</span>

        {/* Price and stock come from the SELECTED variant */}
        <p className="mt-6 font-display text-4xl font-extrabold text-ink-900">{formatPrice(variant.price)}</p>
        <p className={`mt-1 text-sm font-medium ${inStock ? 'text-emerald-700' : 'text-rose-600'}`}>
          {!inStock ? 'Out of stock' : variant.stock <= 2 ? `Only ${variant.stock} left – hurry!` : 'In stock'}
        </p>

        <div className="mt-6">
          <VariantPicker variants={product.variants} selected={variant} onSelect={setVariant} />
        </div>

        <div className="mt-8 flex gap-3">
          <button disabled title="Cart comes on Day 5" className="flex-1 rounded-full border-2 border-brand-300 py-3.5 font-bold text-brand-600 disabled:opacity-50">
            Add to cart
          </button>
          <button disabled={!inStock} onClick={buyNow} className="bg-brand flex-1 rounded-full py-3.5 font-bold text-white shadow-lg shadow-brand-200 transition hover:scale-[1.02] disabled:bg-none disabled:bg-ink-300 disabled:shadow-none">
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
