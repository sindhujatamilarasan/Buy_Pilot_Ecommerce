// 2999 → "₹2,999"   ·   179.82 → "₹179.82"
export const formatPrice = value => {
  const amount = Number(value)
  const decimals = Number.isInteger(amount) ? 0 : 2
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: 2 })}`
}

// Find the first text message inside Django's error JSON (it can be nested: {variants: [{sku: ['…']}]})
const firstMessage = value => {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(firstMessage).find(Boolean)
  if (value && typeof value === 'object') return Object.values(value).map(firstMessage).find(Boolean)
  return null
}

// Turn axios errors into one readable message for the UI
export const getErrorMessage = error => {
  const data = error?.response?.data
  if (!data) return 'Cannot reach the server. Is the backend running?'
  return firstMessage(data.detail ?? data) || 'Something went wrong.'
}
