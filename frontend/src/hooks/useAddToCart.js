// Custom hook for the product page: build the cart item and add it,
// respecting the stock limit AND the "one store per order" rule.
//
//   const { add, dialog } = useAddToCart(product, variant)
//   const added = await add(qty)   // number added, or null if the user said "no"
import { useConfirm } from './useConfirm'
import { useCart } from './useCart'

export const useAddToCart = (product, variant) => {
  const { addItem, cartStore, startNewCart } = useCart()
  const { confirm, dialog } = useConfirm()

  // What we store in the cart for this variant
  const item = {
    variantId: variant.id,
    slug: product.slug,
    name: product.name,
    image: product.images[0]?.path,
    size: variant.size,
    color: variant.color,
    price: Number(variant.price),
    stock: variant.stock,
    storeId: product.store.id,
    storeName: product.store.name,
  }

  const add = async qty => {
    const otherStore = cartStore && cartStore.id !== item.storeId
    if (!otherStore) return addItem(item, qty)

    const ok = await confirm({
      title: 'Start a new cart?',
      message: `Your cart has items from ${cartStore.name}. One order can only come from one store, so we’ll move them to “Saved for later” and start a new cart with ${item.storeName}.`,
      confirmLabel: 'Start new cart',
      cancelLabel: `Keep ${cartStore.name} cart`,
      tone: 'info',
    })
    if (!ok) return null
    startNewCart(item, qty)
    return Math.min(qty, item.stock)
  }

  return { add, dialog }
}
