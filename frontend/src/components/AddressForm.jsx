import { useState } from 'react'
import { createAddress } from '../api/orders'
import { getErrorMessage } from '../utils/format'

const EMPTY = { name: '', phone: '', address: '', city: '', pincode: '', is_default: false }
const input = 'w-full rounded-xl border-2 border-brand-100 px-3 py-2.5 text-sm outline-none focus:border-brand-400'

const AddressForm = ({ onSaved, onCancel }) => {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const change = e => {
    const { name, value, type, checked } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
  }

  const submit = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      onSaved(await createAddress(form))
    } catch (error) {
      setErrors(error.response?.data || { detail: getErrorMessage(error) })
    } finally {
      setSaving(false)
    }
  }

  const field = (name, placeholder, extra = {}) => (
    <div className={extra.wide ? 'sm:col-span-2' : ''}>
      <input name={name} value={form[name]} onChange={change} placeholder={placeholder} required className={input} {...extra.props} />
      {errors[name] && <p className="mt-1 text-xs text-rose-600">{errors[name][0]}</p>}
    </div>
  )

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-2xl bg-brand-50 p-4 sm:grid-cols-2">
      {field('name', 'Full name')}
      {field('phone', '10-digit mobile', { props: { inputMode: 'numeric', maxLength: 10 } })}
      {field('address', 'House no, street, area', { wide: true })}
      {field('city', 'City')}
      {field('pincode', 'Pincode', { props: { inputMode: 'numeric', maxLength: 6 } })}
      <label className="flex items-center gap-2 text-sm text-ink-600 sm:col-span-2">
        <input type="checkbox" name="is_default" checked={form.is_default} onChange={change} className="accent-brand-600" />
        Make this my default address
      </label>
      {errors.detail && <p className="text-sm text-rose-600 sm:col-span-2">{errors.detail}</p>}
      <div className="flex gap-3 sm:col-span-2">
        <button disabled={saving} className="bg-brand rounded-full px-5 py-2.5 text-sm font-bold text-white">{saving ? 'Saving…' : 'Save address'}</button>
        {onCancel && <button type="button" onClick={onCancel} className="text-sm font-semibold text-ink-500">Cancel</button>}
      </div>
    </form>
  )
}

export default AddressForm
