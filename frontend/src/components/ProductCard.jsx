import { Link } from 'react-router-dom'
import { categoryStyle } from '../utils/categoryStyle'
import { formatPrice } from '../utils/format'

const ProductCard = ({ product }) => {
  const style = categoryStyle(product.category.slug)
  const outOfStock = product.total_stock === 0
  const almostGone = !outOfStock && product.total_stock <= 2

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group block rounded-3xl bg-white p-3 shadow-sm ring-1 ring-brand-100 transition duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-brand-100"
    >
      {/* Pastel background in the category colour; the photo's white blends into it */}
      <div className={`relative aspect-square overflow-hidden rounded-2xl ${style.soft}`}>
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-contain p-5 mix-blend-multiply transition duration-500 group-hover:scale-110 group-hover:rotate-2"
        />
        {outOfStock && (
          <span className="absolute left-2 top-2 rounded-full bg-ink-500 px-2.5 py-1 text-[11px] font-bold text-white">Sold out</span>
        )}
        {almostGone && (
          <span className="absolute left-2 top-2 rounded-full bg-orange-500 px-2.5 py-1 text-[11px] font-bold text-white">🔥 Only few left</span>
        )}
        <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-1 text-xs font-bold text-ink-800 shadow-sm">
          <span className="text-amber-400">★</span> {product.rating}
        </span>
      </div>

      <div className="px-1 pb-1 pt-3">
        <p className={`text-xs font-bold ${style.text}`}>
          {style.emoji} {product.category.name}
        </p>
        <h3 className="mt-1 line-clamp-1 text-base font-semibold text-ink-900">{product.name}</h3>
        <div className="mt-2 flex items-center justify-between">
          <p className="font-display text-lg font-bold text-ink-900">{formatPrice(product.min_price)}</p>
          <span className="bg-brand rounded-full px-3 py-1 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100">
            View →
          </span>
        </div>
      </div>
    </Link>
  )
}

export default ProductCard
