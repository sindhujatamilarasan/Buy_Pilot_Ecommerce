// Small helpers shared by the report charts
export const compactRupees = value =>
  `₹${Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(value)}`

export const shortDate = iso =>
  new Date(`${iso}T00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

import { shade } from '../../../utils/themes'

// One colour per slice / bar: the theme colour first, then mango, sky, violet, rose, teal, lime, slate
const OTHER_COLORS = ['#f59e0b', '#0ea5e9', '#8b5cf6', '#f43f5e', '#14b8a6', '#84cc16', '#64748b']
export const paletteFor = theme => {
  const main = shade(theme, 500)
  return [main, ...OTHER_COLORS.filter(color => color !== main)] // no colour twice (e.g. the Rose theme)
}

export const tooltipStyle = {
  borderRadius: 16,
  border: '1px solid var(--color-brand-100)', // HTML box, so the CSS variable works here
  boxShadow: '0 12px 30px -16px rgba(26,28,43,.35)',
  fontSize: 13,
}
