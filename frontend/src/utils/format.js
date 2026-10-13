// 2999 → "₹2,999"   ·   179.82 → "₹179.82"
export const formatPrice = value => {
  const amount = Number(value)
  const decimals = Number.isInteger(amount) ? 0 : 2
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: 2 })}`
}

// Turn axios errors into one readable message for the UI
export const getErrorMessage = error => {
  const data = error?.response?.data
  if (!data) return 'Cannot reach the server. Is the backend running?'
  if (typeof data.detail === 'string') return data.detail
  const first = Object.values(data)[0]
  return Array.isArray(first) ? first[0] : 'Something went wrong.'
}
