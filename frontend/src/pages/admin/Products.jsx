import { useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteProduct, getAdminProducts } from '../../api/manage'
import { adminCard, adminInput } from '../../components/admin/adminStyles'
import PageHeader from '../../components/admin/PageHeader'
import Spinner from '../../components/Spinner'
import { useApi } from '../../hooks/useApi'
import { getErrorMessage } from '../../utils/format'

const stockColour = stock => (stock === 0 ? 'bg-rose-100 text-rose-700' : stock <= 5 ? 'bg-mango-100 text-mango-600' : 'bg-brand-100 text-brand-800')

const Products = () => {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [version, setVersion] = useState(0) // bump to reload the list
  const { data, loading } = useApi(getAdminProducts, { search, page }, version)

  const remove = async product => {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return
    try {
      await deleteProduct(product.id)
      setVersion(v => v + 1)
    } catch (error) {
      window.alert(getErrorMessage(error))
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Products 📦" subtitle={data ? `${data.count} products` : ' '}>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search name or SKU…" className={adminInput} />
        <Link to="/admin/products/new" className="bg-brand rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-md">+ Add product</Link>
      </PageHeader>

      {loading ? <Spinner /> : (
        <div className={`${adminCard} overflow-x-auto`}>
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-50 text-xs font-bold uppercase tracking-wider text-brand-700">
              <tr><th className="px-5 py-3">Product</th><th className="px-5 py-3">Category</th><th className="px-5 py-3">Variants</th><th className="px-5 py-3">Stock</th><th className="px-5 py-3">Status</th><th className="px-5 py-3" /></tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {data.results.map(product => (
                <tr key={product.id} className="hover:bg-brand-50/40">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <img src={product.images[0]?.url} alt="" className="h-11 w-11 rounded-xl bg-brand-50 object-contain p-1 mix-blend-multiply" />
                      <span className="font-semibold text-ink-900">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-ink-600">{product.category_name}</td>
                  <td className="px-5 py-3 text-ink-600">{product.variants.length}</td>
                  <td className="px-5 py-3"><span className={`rounded-full px-3 py-1 text-xs font-bold ${stockColour(product.total_stock)}`}>{product.total_stock}</span></td>
                  <td className="px-5 py-3 text-xs font-bold">{product.is_active ? <span className="text-brand-700">● Active</span> : <span className="text-ink-400">● Hidden</span>}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-right">
                    <Link to={`/admin/products/${product.id}`} className="font-bold text-brand-700 hover:underline">Edit</Link>
                    <button onClick={() => remove(product)} className="ml-4 font-bold text-ink-400 hover:text-rose-600">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-end gap-3 p-4 text-sm">
            <button disabled={!data.previous} onClick={() => setPage(p => p - 1)} className="rounded-full px-4 py-1.5 font-bold text-brand-700 ring-1 ring-brand-200 disabled:opacity-40">← Prev</button>
            <span className="text-ink-500">Page {page}</span>
            <button disabled={!data.next} onClick={() => setPage(p => p + 1)} className="rounded-full px-4 py-1.5 font-bold text-brand-700 ring-1 ring-brand-200 disabled:opacity-40">Next →</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Products
