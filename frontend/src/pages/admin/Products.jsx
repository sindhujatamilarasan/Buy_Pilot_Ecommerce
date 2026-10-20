import { Package, Pencil, Plus, Search, Trash } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { deleteProduct, getAdminProducts } from '../../api/manage'
import { getCategories } from '../../api/products'
import { adminCard, adminInput } from '../../components/admin/adminStyles'
import PageHeader from '../../components/admin/PageHeader'
import Spinner from '../../components/Spinner'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../hooks/useAuth'
import { formatPrice, getErrorMessage } from '../../utils/format'
import { useConfirm } from '../../hooks/useConfirm'

const stockStyle = stock =>
  stock === 0 ? 'bg-rose-50 text-rose-700' : stock <= 5 ? 'bg-mango-100 text-mango-600' : 'bg-brand-50 text-brand-700'

const priceRange = variants => {
  const prices = variants.map(v => Number(v.price))
  const [min, max] = [Math.min(...prices), Math.max(...prices)]
  return min === max ? formatPrice(min) : `${formatPrice(min)} – ${formatPrice(max)}`
}

const Products = () => {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const [version, setVersion] = useState(0) // bump to reload the list
  const categories = useApi(getCategories)
  const { user } = useAuth()
  const isSuper = user.role === 'superadmin'
  const [searchParams, setSearchParams] = useSearchParams()
  const store = searchParams.get('store') || '' // super admin: ?store=urban-threads (link from the Stores page)
  const { data, loading } = useApi(getAdminProducts, { search, category, page, store }, version)

  const pick = slug => {
    setCategory(slug)
    setPage(1)
  }

  const { confirm, notify, dialog } = useConfirm()

  const remove = async product => {
    const ok = await confirm({ title: 'Delete this product?', message: `"${product.name}" and all its variants and images will be deleted. This cannot be undone. Tip: hide it instead to keep its history.`, confirmLabel: 'Delete product', cancelLabel: 'Keep it' })
    if (!ok) return
    try {
      await deleteProduct(product.id)
      setVersion(v => v + 1)
    } catch (error) {
      notify(getErrorMessage(error), 'Could not delete the product')
    }
  }

  return (
    <div className="space-y-5">
      {dialog}
      <PageHeader title="Products" subtitle={data ? `${data.count} products${store ? ` · store: ${store}` : user.store_name ? ` in ${user.store_name}` : ''}` : ' '}>
        {store && <button onClick={() => setSearchParams({})} className="rounded-full bg-brand-50 px-3 py-2 text-xs font-bold text-brand-800">✕ All stores</button>}
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search name or SKU…" className={`${adminInput} pl-9`} />
        </div>
        <Link to="/admin/products/new" className="bg-brand flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-md"><Plus size={16} /> Add product</Link>
      </PageHeader>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[{ slug: '', name: 'All' }, ...(categories.data || [])].map(c => (
          <button key={c.slug} onClick={() => pick(c.slug)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${category === c.slug ? 'bg-ink-900 text-white' : 'bg-white text-ink-600 ring-1 ring-ink-300/30 hover:bg-[#f6f8f7]'}`}>
            {c.name}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : (
        <div className={`${adminCard} overflow-x-auto`}>
          {data.results.length === 0 ? (
            <div className="p-12 text-center text-ink-500"><Package className="mx-auto text-ink-300" size={40} /><p className="mt-2 font-semibold">No products found</p></div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f6f8f7] text-xs font-semibold uppercase tracking-wider text-ink-400">
                <tr><th className="px-5 py-3">Product</th>{isSuper && <th className="px-5 py-3">Store</th>}<th className="px-5 py-3">Price</th><th className="px-5 py-3">Variants</th><th className="px-5 py-3">Stock</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-ink-300/20">
                {data.results.map(product => (
                  <tr key={product.id} className="hover:bg-[#f6f8f7]">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <img src={product.images[0]?.url} alt="" className="h-12 w-12 shrink-0 rounded-xl bg-[#f6f8f7] object-contain p-1 mix-blend-multiply" />
                        <div className="min-w-0">
                          <p className="max-w-[260px] truncate font-semibold text-ink-900">{product.name}</p>
                          <p className="text-xs text-ink-400">{product.category_name}</p>
                        </div>
                      </div>
                    </td>
                    {isSuper && <td className="whitespace-nowrap px-5 py-3 text-xs font-semibold text-ink-600">{product.store_name}</td>}
                    <td className="whitespace-nowrap px-5 py-3 font-semibold text-ink-800">{priceRange(product.variants)}</td>
                    <td className="px-5 py-3 text-ink-600">{product.variants.length}</td>
                    <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${stockStyle(product.total_stock)}`}>{product.total_stock === 0 ? 'Sold out' : `${product.total_stock} in stock`}</span></td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${product.is_active ? 'text-brand-700' : 'text-ink-400'}`}>
                        <span className={`h-2 w-2 rounded-full ${product.is_active ? 'bg-brand-500' : 'bg-ink-300'}`} />{product.is_active ? 'Active' : 'Hidden'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <Link to={`/admin/products/${product.id}`} title="Edit" className="rounded-lg p-2 text-ink-500 hover:bg-brand-50 hover:text-brand-700"><Pencil size={17} /></Link>
                        <button onClick={() => remove(product)} title="Delete" className="rounded-lg p-2 text-ink-400 hover:bg-rose-50 hover:text-rose-600"><Trash size={17} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="flex items-center justify-between gap-3 border-t border-ink-300/20 px-5 py-3 text-sm">
            <span className="text-ink-500">Page {page} of {Math.max(1, Math.ceil((data.count || 0) / 12))}</span>
            <div className="flex gap-2">
              <button disabled={!data.previous} onClick={() => setPage(p => p - 1)} className="rounded-full px-4 py-1.5 font-semibold text-ink-700 ring-1 ring-ink-300/30 disabled:opacity-40">Previous</button>
              <button disabled={!data.next} onClick={() => setPage(p => p + 1)} className="rounded-full px-4 py-1.5 font-semibold text-ink-700 ring-1 ring-ink-300/30 disabled:opacity-40">Next</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Products
