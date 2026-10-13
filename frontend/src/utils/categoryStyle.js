// Each category gets its own emoji and pastel colour – makes the shop feel lively.
// Full class names are written out so Tailwind can find them.
const STYLES = {
  'mens-clothing': { emoji: '👔', tile: 'bg-sky-100 hover:bg-sky-200', soft: 'bg-sky-50', text: 'text-sky-700' },
  'womens-clothing': { emoji: '👗', tile: 'bg-pink-100 hover:bg-pink-200', soft: 'bg-pink-50', text: 'text-pink-700' },
  footwear: { emoji: '👟', tile: 'bg-orange-100 hover:bg-orange-200', soft: 'bg-orange-50', text: 'text-orange-700' },
  electronics: { emoji: '📱', tile: 'bg-violet-100 hover:bg-violet-200', soft: 'bg-violet-50', text: 'text-violet-700' },
  'home-kitchen': { emoji: '🏡', tile: 'bg-emerald-100 hover:bg-emerald-200', soft: 'bg-emerald-50', text: 'text-emerald-700' },
  'beauty-care': { emoji: '💄', tile: 'bg-rose-100 hover:bg-rose-200', soft: 'bg-rose-50', text: 'text-rose-700' },
  'sports-fitness': { emoji: '🏸', tile: 'bg-lime-100 hover:bg-lime-200', soft: 'bg-lime-50', text: 'text-lime-700' },
  'watches-accessories': { emoji: '⌚', tile: 'bg-amber-100 hover:bg-amber-200', soft: 'bg-amber-50', text: 'text-amber-700' },
}

const DEFAULT = { emoji: '🛍️', tile: 'bg-fuchsia-100 hover:bg-fuchsia-200', soft: 'bg-fuchsia-50', text: 'text-fuchsia-700' }

export const categoryStyle = slug => STYLES[slug] || DEFAULT

// Bar colours for the dashboard chart
export const CATEGORY_BAR = {
  'mens-clothing': 'bg-sky-400',
  'womens-clothing': 'bg-pink-400',
  footwear: 'bg-orange-400',
  electronics: 'bg-violet-400',
  'home-kitchen': 'bg-emerald-400',
  'beauty-care': 'bg-rose-400',
  'sports-fitness': 'bg-lime-400',
  'watches-accessories': 'bg-amber-400',
}
