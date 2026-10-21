// Wishlist for the logged-in user, shared by every page (hearts, navbar count, /wishlist page).
import { useEffect, useState } from 'react'
import { addToWishlist, getWishlist, removeFromWishlist } from '../api/wishlist'
import { useAuth } from '../hooks/useAuth'
import { WishlistContext } from './WishlistContext'

export const WishlistProvider = ({ children }) => {
  const { user, loading } = useAuth()
  const userId = user?.id ?? null
  // Remember WHOSE list this is, so after logout we simply show nothing
  const [list, setList] = useState({ userId: null, products: [] })

  // Load the list when someone logs in
  useEffect(() => {
    if (loading || userId === null) return
    let ignore = false
    getWishlist()
      .then(products => !ignore && setList({ userId, products }))
      .catch(() => {})
    return () => {
      ignore = true
    }
  }, [userId, loading])

  const products = userId !== null && list.userId === userId ? list.products : []
  const isSaved = productId => products.some(p => p.id === productId)

  const without = (items, productId) => items.filter(p => p.id !== productId)

  // OPTIMISTIC UI: change the screen first, call the API, undo if the API fails.
  const toggle = async product => {
    const saved = isSaved(product.id)
    const apply = add =>
      setList(prev => ({
        userId,
        products: add ? [product, ...without(prev.products, product.id)] : without(prev.products, product.id),
      }))

    apply(!saved)
    try {
      if (saved) await removeFromWishlist(product.id)
      else await addToWishlist(product.id)
      return true
    } catch {
      apply(saved) // undo
      return false
    }
  }

  return (
    <WishlistContext.Provider value={{ products, count: products.length, isSaved, toggle, loading: userId !== null && list.userId !== userId }}>
      {children}
    </WishlistContext.Provider>
  )
}
