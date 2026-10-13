import { Link } from 'react-router-dom'
import { formatPrice } from '../utils/format'

const ProductCard = ({ product }) => {
  const outOfStock = product.total_stock === 0

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative aspect-square overflow-hidden bg-slate-100">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        {outOfStock && (
          <span className="absolute left-3 top-3 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-semibold text-white">
            Out of stock
          </span>
        )}
      </div>

      <div className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
          {product.category.name}
        </p>
        <h3 className="mt-1 line-clamp-1 font-semibold text-slate-900">{product.name}</h3>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-lg font-bold text-slate-900">
            <span className="text-xs font-normal text-slate-500">from </span>
            {formatPrice(product.min_price)}
          </span>
          <span className="rounded-md bg-green-600 px-2 py-0.5 text-xs font-bold text-white">
            {product.rating} ★
          </span>
        </div>
      </div>
    </Link>
  )
}

export default ProductCard
