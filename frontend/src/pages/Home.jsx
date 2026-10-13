import { Link } from 'react-router-dom'
import { getCategories, getProducts } from '../api/products'
import ProductCard from '../components/ProductCard'
import Spinner from '../components/Spinner'
import { useApi } from '../hooks/useApi'

const Home = () => {
  const categories = useApi(getCategories)
  const topRated = useApi(getProducts, { ordering: '-rating' }) // "-" = highest first

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 px-8 py-14 text-white">
        <p className="text-sm font-semibold uppercase tracking-widest text-indigo-100">Big Festive Sale</p>
        <h1 className="mt-3 max-w-xl text-4xl font-extrabold leading-tight md:text-5xl">
          Everything you love, delivered to your door.
        </h1>
        <p className="mt-4 max-w-lg text-indigo-100">
          100+ products across fashion, electronics, home and more. Free shipping above ₹500.
        </p>
        <Link to="/products" className="mt-8 inline-block rounded-full bg-white px-6 py-3 font-semibold text-indigo-700 hover:bg-indigo-50">
          Shop now →
        </Link>
      </section>

      {/* Categories */}
      <section>
        <h2 className="mb-4 text-2xl font-bold text-slate-900">Shop by category</h2>
        <div className="flex flex-wrap gap-3">
          {categories.data?.map(category => (
            <Link
              key={category.id}
              to={`/products?category=${category.slug}`}
              className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-700 hover:border-indigo-600 hover:text-indigo-600"
            >
              {category.name}
            </Link>
          ))}
        </div>
      </section>

      {/* Top rated */}
      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Top rated</h2>
          <Link to="/products?ordering=-rating" className="text-sm font-semibold text-indigo-600">View all →</Link>
        </div>
        {topRated.loading ? (
          <Spinner />
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {topRated.data?.results.slice(0, 8).map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default Home
