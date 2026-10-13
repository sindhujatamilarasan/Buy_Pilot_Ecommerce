// Product list. Filters live in the URL (?search=&category=&ordering=&page=)
// so a filtered page can be refreshed, bookmarked or shared.
import { useSearchParams } from 'react-router-dom'
import { getCategories, getProducts } from '../api/products'
import Message from '../components/Message'
import ProductCard from '../components/ProductCard'
import Spinner from '../components/Spinner'
import { useApi } from '../hooks/useApi'

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
      <aside className="space-y-6">
        <div>
          <h3 className="mb-2 text-sm font-bold uppercase text-slate-500">Category</h3>
          <div className="flex flex-col items-start gap-1">
            <button onClick={() => updateParam('category', '')} className={!params.category ? 'font-semibold text-indigo-600' : 'text-slate-600'}>
              All
            </button>
            {categories.data?.map(c => (
              <button key={c.id} onClick={() => updateParam('category', c.slug)} className={params.category === c.slug ? 'font-semibold text-indigo-600' : 'text-slate-600 hover:text-slate-900'}>
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-bold uppercase text-slate-500">Sort by</h3>
          <select value={params.ordering || ''} onChange={e => updateParam('ordering', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </aside>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h1 className="text-2xl font-bold text-slate-900">
            {params.search ? `Results for "${params.search}"` : 'All products'}
          </h1>
          {data && <span className="text-sm text-slate-500">{data.count} products</span>}
        </div>

        {loading && <Spinner />}
        {error && <Message type="error" icon="⚠️" title="Could not load products" />}
        {data?.results.length === 0 && <Message icon="😕" title="No products found">Try a different search or category.</Message>}

        {data?.results.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {data.results.map(product => <ProductCard key={product.id} product={product} />)}
            </div>

            <div className="mt-8 flex items-center justify-center gap-4">
              <button disabled={!data.previous} onClick={() => updateParam('page', String(page - 1))} className="rounded-lg border bg-white px-4 py-2 text-sm disabled:opacity-40">← Prev</button>
              <span className="text-sm text-slate-600">Page {page} of {Math.ceil(data.count / 12)}</span>
              <button disabled={!data.next} onClick={() => updateParam('page', String(page + 1))} className="rounded-lg border bg-white px-4 py-2 text-sm disabled:opacity-40">Next →</button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

export default Products
