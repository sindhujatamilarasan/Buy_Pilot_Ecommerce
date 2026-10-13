// "2999.00" → "₹2,999"
export const formatPrice = value =>
  `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

// Turn axios errors into one readable message for the UI
export const getErrorMessage = error => {
  const data = error?.response?.data
  if (!data) return 'Cannot reach the server. Is the backend running?'
  if (typeof data.detail === 'string') return data.detail
  const first = Object.values(data)[0]
  return Array.isArray(first) ? first[0] : 'Something went wrong.'
}
