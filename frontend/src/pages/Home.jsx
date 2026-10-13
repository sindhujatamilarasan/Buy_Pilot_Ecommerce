import { Link } from 'react-router-dom'
import { getCategories, getProducts } from '../api/products'
import ProductCard from '../components/ProductCard'
import Spinner from '../components/Spinner'
import { useApi } from '../hooks/useApi'

const PERKS = [
  { icon: '🚚', title: 'Free shipping', text: 'On every order above ₹500' },
  { icon: '🔒', title: 'Secure payments', text: 'Protected by Razorpay' },
  { icon: '↩️', title: 'Easy returns', text: '7-day hassle-free returns' },
]

const Home = () => {
  const categories = useApi(getCategories)
  const topRated = useApi(getProducts, { ordering: '-rating' }) // "-" = highest first
  const products = topRated.data?.results || []
  const heroImages = products.slice(0, 3)

  return (
    <div className="space-y-20">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[2rem] bg-ink-950 px-8 py-14 md:px-14 md:py-20">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-gold-500/20 blur-3xl" />
        <div className="relative grid items-center gap-12 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">The Festive Edit · 2026</p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight text-white md:text-6xl">
              Curated for the way <em className="text-gold-300">you</em> live.
            </h1>
            <p className="mt-5 max-w-md text-ink-300">
              Hand-picked fashion, technology and home essentials – crafted to last, priced to delight.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/products" className="rounded-full bg-gold-500 px-7 py-3.5 text-sm font-semibold text-ink-950 transition hover:bg-gold-400">
                Shop the collection
              </Link>
              <a href="#categories" className="rounded-full border border-ink-600 px-7 py-3.5 text-sm font-semibold text-white transition hover:border-gold-400 hover:text-gold-300">
                Explore categories
              </a>
            </div>
          </div>

          {/* Image collage from the top-rated products */}
          <div className="hidden grid-cols-2 gap-4 md:grid">
            {heroImages.map((product, index) => (
              <Link
                key={product.id}
                to={`/products/${product.slug}`}
                className={`rounded-2xl bg-white p-5 shadow-2xl transition hover:-translate-y-1 ${index === 0 ? 'row-span-2 flex items-center' : ''}`}
              >
                <img src={product.image} alt={product.name} className="w-full object-contain" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Perks */}
      <section className="grid gap-4 md:grid-cols-3">
        {PERKS.map(perk => (
          <div key={perk.title} className="flex items-center gap-4 rounded-2xl border border-ink-100 bg-white px-6 py-5">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-50 text-xl ring-1 ring-gold-200">{perk.icon}</span>
            <div>
              <p className="font-semibold text-ink-900">{perk.title}</p>
              <p className="text-sm text-ink-500">{perk.text}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Categories */}
      <section id="categories">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-700">Collections</p>
        <h2 className="mt-2 text-3xl font-semibold text-ink-900 md:text-4xl">Shop by category</h2>
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {categories.data?.map(category => (
            <Link
              key={category.id}
              to={`/products?category=${category.slug}`}
              className="group rounded-2xl border border-ink-100 bg-white p-6 transition hover:border-ink-900 hover:bg-ink-900"
            >
              <p className="font-serif text-lg font-semibold text-ink-900 group-hover:text-white">{category.name}</p>
              <p className="mt-6 text-sm font-semibold text-gold-700 group-hover:text-gold-300">Explore →</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Top rated */}
      <section>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-700">Loved by customers</p>
            <h2 className="mt-2 text-3xl font-semibold text-ink-900 md:text-4xl">Top rated</h2>
          </div>
          <Link to="/products?ordering=-rating" className="text-sm font-semibold text-ink-900 underline decoration-gold-400 underline-offset-4">
            View all
          </Link>
        </div>
        {topRated.loading ? (
          <Spinner />
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4">
            {products.slice(0, 8).map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default Home
