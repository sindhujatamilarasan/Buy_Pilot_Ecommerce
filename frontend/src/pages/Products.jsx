// Product list. Filters live in the URL (?search=&category=&ordering=&page=)
// so a filtered page can be refreshed, bookmarked or shared.
import { useSearchParams } from 'react-router-dom'
import { getCategories, getProducts } from '../api/products'
import Message from '../components/Message'
import ProductCard from '../components/ProductCard'
import Spinner from '../components/Spinner'
import { useApi } from '../hooks/useApi'
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
  const { data, loading, error } = useApi(getProducts, params)

  // Change one filter, keep the others, go back to page 1
  const updateParam = (name, value) => {
    const next = { ...params, [name]: value }
    if (name !== 'page') delete next.page
    if (!value) delete next[name]
    setSearchParams(next)
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
          {data && <span className="text-sm text-ink-500">{data.count} products</span>}
        </div>

        {loading && <Spinner />}
        {error && <Message type="error" icon="⚠️" title="Could not load products" />}
        {data?.results.length === 0 && <Message icon="😕" title="No products found">Try a different search or category.</Message>}

        {data?.results.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-3">
              {data.results.map(product => <ProductCard key={product.id} product={product} />)}
            </div>

            <div className="mt-8 flex items-center justify-center gap-4">
              <button disabled={!data.previous} onClick={() => updateParam('page', String(page - 1))} className="rounded-full bg-white px-5 py-2 text-sm font-bold text-brand-600 shadow-sm ring-1 ring-brand-100 hover:bg-brand-50 disabled:opacity-40">← Prev</button>
              <span className="text-sm text-ink-600">Page {page} of {Math.ceil(data.count / 12)}</span>
              <button disabled={!data.next} onClick={() => updateParam('page', String(page + 1))} className="rounded-full bg-white px-5 py-2 text-sm font-bold text-brand-600 shadow-sm ring-1 ring-brand-100 hover:bg-brand-50 disabled:opacity-40">Next →</button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

export default Products
