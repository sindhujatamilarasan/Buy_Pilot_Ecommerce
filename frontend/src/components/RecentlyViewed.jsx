// "Recently viewed" row on the home page – read from localStorage via useRecentlyViewed()
import { useRecentlyViewed } from '../hooks/useRecentlyViewed'
import ProductCard from './ProductCard'

const RecentlyViewed = () => {
  const { items, clear } = useRecentlyViewed()
  if (items.length === 0) return null // nothing viewed yet → show nothing

  return (
    <section>
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-ink-900">Recently viewed 👀</h2>
          <p className="mt-1 text-ink-500">Pick up where you left off.</p>
        </div>
        <button onClick={clear} className="rounded-full px-4 py-2 text-sm font-bold text-ink-500 hover:bg-rose-50 hover:text-rose-600">
          Clear
        </button>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-4">
        {items.slice(0, 4).map(product => <ProductCard key={product.id} product={product} />)}
      </div>
    </section>
  )
}

export default RecentlyViewed
