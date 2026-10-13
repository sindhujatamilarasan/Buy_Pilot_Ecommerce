import { Link } from 'react-router-dom'
import { formatPrice } from '../utils/format'

const ProductCard = ({ product }) => {
  const outOfStock = product.total_stock === 0

  return (
    <Link to={`/products/${product.slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-sand-50 ring-1 ring-sand-200 transition duration-300 group-hover:shadow-[0_20px_40px_-20px_rgba(19,21,34,0.35)]">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-contain p-6 mix-blend-multiply transition duration-700 group-hover:scale-105"
        />
        {outOfStock && (
          <span className="absolute left-3 top-3 rounded-full bg-ink-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">
            Sold out
          </span>
        )}
        <span className="absolute right-3 top-3 rounded-full bg-ink-900 px-2.5 py-1 text-xs font-semibold text-white">
          <span className="text-gold-500">★</span> {product.rating}
        </span>
      </div>

      <div className="mt-4 px-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-700">
          {product.category.name}
        </p>
        <h3 className="mt-1 line-clamp-1 font-medium text-ink-900 group-hover:text-gold-700">{product.name}</h3>
        <p className="mt-1 font-serif text-lg font-semibold text-ink-900">
          {formatPrice(product.min_price)}
        </p>
      </div>
    </Link>
  )
}

export default ProductCard
