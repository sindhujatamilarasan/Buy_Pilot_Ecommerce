// Product list. Filters live in the URL (?search=&category=&min_price=&max_price=&min_rating=&ordering=&page=)
// so a filtered page can be refreshed, bookmarked or shared.
import { useCallback, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getCategories } from '../api/products'
import Message from '../components/Message'
import ProductCard from '../components/ProductCard'
import { PriceFilter, RatingFilter } from '../components/ProductFilters'
import Spinner from '../components/Spinner'
import { useApi } from '../hooks/useApi'
import { useProducts } from '../hooks/useProducts'
import { categoryStyle } from '../utils/categoryStyle'

const SORT_OPTIONS = [
  { value: '', label: 'Name (A–Z)' },
  { value: 'min_price', label: 'Price: low to high' },
  { value: '-min_price', label: 'Price: high to low' },
  { value: '-rating', label: 'Top rated' },
]

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const params = Object.fromEntries(searchParams) // URL → { search: 'mug', page: '2' }
  const page = Number(params.page || 1)

  const categories = useApi(getCategories)
  const { products, count, hasNext, hasPrevious, loading, error } = useProducts(params)

  const [resetKey, setResetKey] = useState(0) // changes → the price boxes start empty again

  // Change some filters, keep the others, go back to page 1
  const updateParams = useCallback(
    changes =>
      setSearchParams(current => {
        const next = Object.fromEntries(current)
        Object.entries(changes).forEach(([name, value]) => {
          if (value) next[name] = value
          else delete next[name]
        })
        if (!('page' in changes)) delete next.page
        return next
      }),
    [setSearchParams],
  )
  const updateParam = (name, value) => updateParams({ [name]: value })
  const updatePrice = useCallback(({ min, max }) => updateParams({ min_price: min, max_price: max }), [updateParams])

  const hasFilters = ['category', 'min_price', 'max_price', 'min_rating', 'search'].some(name => params[name])
  const clearFilters = () => {
    setSearchParams(params.ordering ? { ordering: params.ordering } : {})
    setResetKey(k => k + 1)
  }

  return (
    <div className="grid gap-8 md:grid-cols-[220px_1fr]">
      <aside className="h-fit space-y-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-brand-100 md:sticky md:top-32">
        <div>
          <h3 className="mb-3 text-sm font-bold text-ink-900">Category</h3>
          <div className="flex flex-col gap-1.5 text-sm">
            <button onClick={() => updateParam('category', '')} className={`rounded-xl px-3 py-2 text-left font-semibold transition ${!params.category ? 'bg-brand text-white' : 'text-ink-600 hover:bg-brand-50'}`}>
              All
            </button>
            {categories.data?.map(c => (
              <button key={c.id} onClick={() => updateParam('category', c.slug)} className={`rounded-xl px-3 py-2 text-left font-semibold transition ${params.category === c.slug ? 'bg-brand text-white' : `text-ink-600 ${categoryStyle(c.slug).tile}`}`}>
                {categoryStyle(c.slug).emoji} {c.name}
              </button>
            ))}
          </div>
        </div>

        <PriceFilter key={resetKey} min={params.min_price} max={params.max_price} onChange={updatePrice} />
        <RatingFilter value={params.min_rating} onChange={value => updateParam('min_rating', value)} />

        <div>
          <h3 className="mb-3 text-sm font-bold text-ink-900">Sort by</h3>
          <select value={params.ordering || ''} onChange={e => updateParam('ordering', e.target.value)} className="w-full rounded-xl border-2 border-brand-100 bg-white px-3 py-2 text-sm font-semibold text-ink-700 outline-none focus:border-brand-400">
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </aside>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h1 className="text-3xl font-extrabold text-ink-900">
            {params.search ? `Results for "${params.search}"` : 'All products'}
          </h1>
          <div className="flex items-center gap-3">
            {!loading && <span className="text-sm text-ink-500">{count} products</span>}
            {hasFilters && (
              <button onClick={clearFilters} className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600 hover:bg-rose-100">
                ✕ Clear filters
              </button>
            )}
          </div>
        </div>

        {loading && <Spinner />}
        {error && <Message type="error" icon="⚠️" title="Could not load products" />}
        {!loading && !error && products.length === 0 && <Message icon="😕" title="No products found">Try a different search, price or category.</Message>}

        {!loading && products.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-3">
              {products.map(product => <ProductCard key={product.id} product={product} />)}
            </div>

            <div className="mt-8 flex items-center justify-center gap-4">
              <button disabled={!hasPrevious} onClick={() => updateParam('page', String(page - 1))} className="rounded-full bg-white px-5 py-2 text-sm font-bold text-brand-600 shadow-sm ring-1 ring-brand-100 hover:bg-brand-50 disabled:opacity-40">← Prev</button>
              <span className="text-sm text-ink-600">Page {page} of {Math.ceil(count / 12)}</span>
              <button disabled={!hasNext} onClick={() => updateParam('page', String(page + 1))} className="rounded-full bg-white px-5 py-2 text-sm font-bold text-brand-600 shadow-sm ring-1 ring-brand-100 hover:bg-brand-50 disabled:opacity-40">Next →</button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

export default Products
