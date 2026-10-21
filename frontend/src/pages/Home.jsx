import { Link } from 'react-router-dom'
import { getCategories } from '../api/products'
import LoadError from '../components/LoadError'
import Message from '../components/Message'
import ProductCard from '../components/ProductCard'
import RecentlyViewed from '../components/RecentlyViewed'
import Spinner from '../components/Spinner'
import { useApi } from '../hooks/useApi'
import { useProducts } from '../hooks/useProducts'
import { useSite } from '../hooks/useSite'
import { categoryStyle } from '../utils/categoryStyle'

// Perk texts come from Super admin → Site content; the colours repeat in this order
const PERK_COLORS = ['bg-brand-100', 'bg-violet-100', 'bg-mango-100']

// Tilt the collage photos a little for a playful look
const TILTS = ['-rotate-6', 'rotate-3', '-rotate-2']

const Home = () => {
  const categories = useApi(getCategories)
  const topRated = useProducts({ ordering: '-rating' }) // "-" = highest first
  const { products } = topRated
  const { site } = useSite()

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="bg-brand-soft relative overflow-hidden rounded-[2rem] px-8 py-14 md:px-14 md:py-16">
        <div className="pointer-events-none absolute -left-10 -top-10 h-56 w-56 rounded-full bg-white/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 right-10 h-72 w-72 rounded-full bg-mango-400/30 blur-3xl" />

        <div className="relative grid items-center gap-10 md:grid-cols-2">
          <div>
            {site.hero_badge && (
              <span className="mb-6 inline-block rounded-full bg-white/80 px-4 py-1.5 text-sm font-bold text-brand-700 shadow-sm">{site.hero_badge}</span>
            )}
            <h1 className="text-4xl font-extrabold leading-tight text-ink-900 md:text-6xl">
              {site.hero_title}
              {site.hero_highlight && <><br /> <span className="text-brand">{site.hero_highlight}</span></>}
            </h1>
            {site.hero_subtitle && <p className="mt-4 max-w-md text-lg text-ink-600">{site.hero_subtitle}</p>}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/products" className="bg-brand rounded-full px-7 py-3.5 font-bold text-white shadow-lg shadow-brand-200 transition hover:scale-105">
                Start shopping →
              </Link>
              <a href="#categories" className="rounded-full border-2 border-brand-300 bg-white/60 px-7 py-3.5 font-bold text-brand-700 transition hover:bg-white">
                Browse categories
              </a>
            </div>
          </div>

          {/* Playful tilted photo collage from top-rated products */}
          <div className="hidden justify-center gap-4 md:flex">
            {products.slice(0, 3).map((product, index) => (
              <Link
                key={product.id}
                to={`/products/${product.slug}`}
                className={`w-40 rounded-3xl bg-white p-4 shadow-xl shadow-brand-200/60 transition hover:rotate-0 hover:scale-110 ${TILTS[index]} ${index === 1 ? 'mt-10' : ''}`}
              >
                <img src={product.image} alt={product.name} className="aspect-square w-full object-contain" />
                <p className="mt-2 line-clamp-1 text-xs font-bold text-ink-800">{product.name}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Perks */}
      {site.perks.length > 0 && (
        <section className="grid gap-4 md:grid-cols-3">
          {site.perks.map((perk, index) => (
            <div key={index} className={`flex items-center gap-4 rounded-3xl px-6 py-5 ${PERK_COLORS[index % PERK_COLORS.length]}`}>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">{perk.icon}</span>
              <div>
                <p className="font-display font-bold text-ink-900">{perk.title}</p>
                <p className="text-sm text-ink-600">{perk.text}</p>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Categories */}
      <section id="categories">
        <h2 className="text-3xl font-extrabold text-ink-900">Shop by category 🛍️</h2>
        <p className="mt-1 text-ink-500">Pick a world and start exploring.</p>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {categories.data?.map(category => {
            const style = categoryStyle(category.slug)
            return (
              <Link
                key={category.id}
                to={`/products?category=${category.slug}`}
                className={`group flex flex-col items-center rounded-3xl p-6 text-center transition hover:-translate-y-1 hover:shadow-lg ${style.tile}`}
              >
                <span className="text-5xl transition group-hover:scale-125 group-hover:rotate-6">{style.emoji}</span>
                <p className="mt-3 font-display font-bold text-ink-900">{category.name}</p>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Top rated */}
      <section>
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-extrabold text-ink-900">Top rated ⭐</h2>
            <p className="mt-1 text-ink-500">Our customers can’t stop loving these.</p>
          </div>
          <Link to="/products?ordering=-rating" className="rounded-full bg-brand-100 px-4 py-2 text-sm font-bold text-brand-700 hover:bg-brand-200">
            View all →
          </Link>
        </div>
        {topRated.loading ? (
          <Spinner />
        ) : topRated.error ? (
          <div className="mt-6"><LoadError what="products" /></div>
        ) : products.length === 0 ? (
          <div className="mt-6"><Message icon="🛍️" title="No products yet">New products are coming soon – check back later.</Message></div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-4">
            {products.slice(0, 8).map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      <RecentlyViewed />
    </div>
  )
}

export default Home
