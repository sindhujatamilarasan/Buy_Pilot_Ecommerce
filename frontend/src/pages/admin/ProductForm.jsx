import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createProduct, getAdminProduct, updateProduct } from '../../api/manage'
import { getCategories } from '../../api/products'
import ImagesEditor from '../../components/admin/ImagesEditor'
import { adminCard, adminInput, newVariant } from '../../components/admin/adminStyles'
import PageHeader from '../../components/admin/PageHeader'
import VariantsEditor from '../../components/admin/VariantsEditor'
import Spinner from '../../components/Spinner'
import { useApi } from '../../hooks/useApi'
import { getErrorMessage } from '../../utils/format'

const noProduct = () => Promise.resolve(null)

// Route /admin/products/new  or  /admin/products/:id
const ProductForm = () => {
  const { id } = useParams()
  const product = useApi(id ? getAdminProduct : noProduct, id)
  const categories = useApi(getCategories)

  if (product.loading || categories.loading) return <Spinner />
  return <ProductFormView key={id || 'new'} product={product.data} categories={categories.data} />
}

// Server data → form state (rows get a "key" so React can track them)
const toForm = product => ({
  name: product?.name || '',
  category: product?.category || '',
  description: product?.description || '',
  is_active: product?.is_active ?? true,
  variants: product ? product.variants.map(v => ({ ...v, key: String(v.id), size: v.size, color: v.color })) : [newVariant()],
  images: product ? product.images.map(i => ({ ...i, key: String(i.id) })) : [],
})

const ProductFormView = ({ product, categories }) => {
  const navigate = useNavigate()
  const [form, setForm] = useState(() => toForm(product))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const submit = async e => {
    e.preventDefault()
    setSaving(true)
    setError('')
    // Remove the UI-only "key" / "url" fields before sending
    const payload = {
      ...form,
      variants: form.variants.map(({ key, ...v }) => ({ ...v, stock: Number(v.stock) })), // eslint-disable-line no-unused-vars
      images: form.images.map(({ id, path }) => (id ? { id, path } : { path })),
    }
    try {
      await (product ? updateProduct(product.id, payload) : createProduct(payload))
      navigate('/admin/products')
    } catch (err) {
      setError(getErrorMessage(err))
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <PageHeader title={product ? `Edit: ${product.name}` : 'New product ✨'}>
        <Link to="/admin/products" className="text-sm font-bold text-ink-500">Cancel</Link>
        <button disabled={saving} className="bg-brand rounded-full px-6 py-2.5 text-sm font-bold text-white shadow-md">{saving ? 'Saving…' : 'Save product'}</button>
      </PageHeader>
      {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}

      <div className={`${adminCard} grid gap-4 p-6 md:grid-cols-2`}>
        <label className="text-sm font-bold text-ink-700">Name *
          <input required value={form.name} onChange={e => set('name', e.target.value)} className={`${adminInput} mt-1 w-full`} />
        </label>
        <label className="text-sm font-bold text-ink-700">Category *
          <select required value={form.category} onChange={e => set('category', Number(e.target.value))} className={`${adminInput} mt-1 w-full`}>
            <option value="">Choose…</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold text-ink-700 md:col-span-2">Description
          <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} className={`${adminInput} mt-1 w-full`} />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink-700">
          <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="h-4 w-4 accent-brand-600" />
          Show in shop (active)
        </label>
      </div>

      <div className={`${adminCard} p-6`}>
        <h2 className="mb-4 text-lg font-bold text-ink-900">🖼️ Photos</h2>
        <ImagesEditor images={form.images} onChange={images => set('images', images)} />
      </div>

      <div className={`${adminCard} p-6`}>
        <h2 className="mb-1 text-lg font-bold text-ink-900">🎨 Variants, price & stock</h2>
        <p className="mb-4 text-sm text-ink-500">Each size / colour has its own price and stock.</p>
        <VariantsEditor variants={form.variants} onChange={variants => set('variants', variants)} />
      </div>
    </form>
  )
}

export default ProductForm
