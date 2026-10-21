import { ArrowLeft, Save } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createProduct, getAdminProduct, updateProduct } from '../../api/manage'
import { getCategories } from '../../api/products'
import CategoryPicker from '../../components/admin/CategoryPicker'
import ImagesEditor from '../../components/admin/ImagesEditor'
import StoreSelect from '../../components/admin/StoreSelect'
import { adminCard, adminInput, newVariant } from '../../components/admin/adminStyles'
import VariantsEditor from '../../components/admin/VariantsEditor'
import Spinner from '../../components/Spinner'
import { useApi } from '../../hooks/useApi'
import { formatPrice, getErrorMessage } from '../../utils/format'

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
  store: product?.store || '',
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
    const { store, ...fields } = form
    const payload = {
      ...fields,
      ...(store ? { store } : {}), // only the super admin picks a store; the server ignores it for store admins
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

  const stock = form.variants.reduce((sum, v) => sum + Number(v.stock || 0), 0)
  const prices = form.variants.map(v => Number(v.price)).filter(Boolean)
  const card = `${adminCard} p-6`

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <Link to="/admin/products" className="flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-ink-800"><ArrowLeft size={16} /> Products</Link>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink-900">{product ? product.name : 'New product'}</h1>
      </div>
      {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-5">
          <div className={card}>
            <h2 className="text-base font-bold text-ink-900">Details</h2>
            <label className="mt-4 block text-sm font-semibold text-ink-700">Name
              <input required value={form.name} onChange={e => set('name', e.target.value)} className={`${adminInput} mt-1 w-full`} placeholder="e.g. Cotton T-Shirt" />
            </label>
            <label className="mt-4 block text-sm font-semibold text-ink-700">Description
              <textarea rows={4} value={form.description} onChange={e => set('description', e.target.value)} className={`${adminInput} mt-1 w-full`} placeholder="What makes it special?" />
            </label>
          </div>

          <div className={card}>
            <h2 className="text-base font-bold text-ink-900">Photos</h2>
            <p className="mb-4 text-sm text-ink-500">The first photo is the main one in the shop.</p>
            <ImagesEditor images={form.images} onChange={images => set('images', images)} />
          </div>

          <div className={card}>
            <h2 className="text-base font-bold text-ink-900">Variants, price & stock</h2>
            <p className="mb-4 text-sm text-ink-500">Each size / colour has its own price and stock.</p>
            <VariantsEditor variants={form.variants} onChange={variants => set('variants', variants)} />
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-5 lg:sticky lg:top-24">
          <div className={card}>
            <h2 className="text-base font-bold text-ink-900">Status</h2>
            <button type="button" onClick={() => set('is_active', !form.is_active)} className="mt-3 flex w-full items-center justify-between rounded-2xl bg-[#f6f8f7] px-4 py-3">
              <span className="text-sm font-semibold text-ink-700">{form.is_active ? 'Visible in shop' : 'Hidden from shop'}</span>
              <span className={`relative h-6 w-11 rounded-full transition ${form.is_active ? 'bg-brand-600' : 'bg-ink-300'}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${form.is_active ? 'left-[22px]' : 'left-0.5'}`} />
              </span>
            </button>
            <StoreSelect value={form.store} onChange={value => set('store', value)} />
            <CategoryPicker categories={categories} value={form.category} onChange={value => set('category', value)} />
          </div>

          <div className={card}>
            <h2 className="text-base font-bold text-ink-900">Summary</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-ink-500">Variants</dt><dd className="font-semibold text-ink-900">{form.variants.length}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-500">Total stock</dt><dd className="font-semibold text-ink-900">{stock}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-500">Price</dt><dd className="font-semibold text-ink-900">{prices.length ? (Math.min(...prices) === Math.max(...prices) ? formatPrice(prices[0]) : `${formatPrice(Math.min(...prices))} – ${formatPrice(Math.max(...prices))}`) : '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-500">Photos</dt><dd className="font-semibold text-ink-900">{form.images.length}</dd></div>
            </dl>
            <button disabled={saving} className="bg-brand mt-5 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-bold text-white shadow-md disabled:opacity-60">
              <Save size={16} /> {saving ? 'Saving…' : 'Save product'}
            </button>
            <Link to="/admin/products" className="mt-2 block text-center text-sm font-semibold text-ink-500">Cancel</Link>
          </div>
        </div>
      </div>
    </form>
  )
}

export default ProductForm
