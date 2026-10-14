// Shared Tailwind classes + helpers for admin forms (kept out of component files for fast refresh)
export const adminInput =
  'rounded-xl border border-ink-300/40 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100'

export const adminCard = 'rounded-3xl bg-white shadow-sm ring-1 ring-ink-300/20'

// A new empty variant row (key = id for React lists, before the server gives a real id)
export const newVariant = () => ({ key: crypto.randomUUID(), size: '', color: '', sku: '', price: '', stock: 0 })
