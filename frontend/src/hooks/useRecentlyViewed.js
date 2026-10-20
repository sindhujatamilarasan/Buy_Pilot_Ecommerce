// The last 8 products the user opened (newest first), kept in localStorage.
import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'

const MAX_ITEMS = 8

// Only what ProductCard needs – not the whole product with all images and variants
const toCardData = p => ({
  id: p.id, slug: p.slug, name: p.name, image: p.image, rating: p.rating,
  min_price: p.min_price, total_stock: p.total_stock, category: p.category,
})

export const useRecentlyViewed = () => {
  const [items, setItems] = useLocalStorage('recentlyViewed', [])

  // useCallback: `remember` stays the SAME function between renders,
  // so a useEffect that lists it as a dependency does not run again and again
  const remember = useCallback(
    product => setItems(list => [toCardData(product), ...list.filter(p => p.id !== product.id)].slice(0, MAX_ITEMS)),
    [setItems],
  )

  const clear = () => setItems([])

  return { items, remember, clear }
}
