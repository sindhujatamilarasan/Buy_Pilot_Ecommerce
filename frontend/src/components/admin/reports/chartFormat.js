// Small helpers shared by the report charts
export const compactRupees = value =>
  `₹${Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(value)}`

export const shortDate = iso =>
  new Date(`${iso}T00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

// One colour per slice / bar (emerald, mango, sky, violet, rose, teal, lime, slate)
export const PALETTE = ['#10b981', '#f59e0b', '#0ea5e9', '#8b5cf6', '#f43f5e', '#14b8a6', '#84cc16', '#64748b']

export const tooltipStyle = {
  borderRadius: 16,
  border: '1px solid #d1fae5',
  boxShadow: '0 12px 30px -16px rgba(4,120,87,.4)',
  fontSize: 13,
}
