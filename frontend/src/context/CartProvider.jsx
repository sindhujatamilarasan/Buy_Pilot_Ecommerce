import { useEffect, useReducer } from 'react'
import { CartContext } from './CartContext'
import { cartReducer } from './cartReducer'

const STORAGE_KEY = 'cart'

// Start from the cart saved in localStorage (guest cart survives a refresh)
const loadCart = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { items: [] }
  } catch {
    return { items: [] } // broken data → start empty
  }
}

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, undefined, loadCart)

  // Every time the cart changes, save it
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const cartItems = state.items.filter(i => !i.savedForLater)
  const savedItems = state.items.filter(i => i.savedForLater)

  // Returns how many were really added (can be less because of the stock limit)
  const addItem = (item, qty = 1) => {
    const inCart = state.items.find(i => i.variantId === item.variantId)?.qty || 0
    const added = Math.max(0, Math.min(qty, item.stock - inCart))
    if (added > 0) dispatch({ type: 'ADD', item, qty: added })
    return added
  }

  const value = {
    cartItems,
    savedItems,
    count: cartItems.reduce((sum, i) => sum + i.qty, 0),
    quantityOf: variantId => state.items.find(i => i.variantId === variantId)?.qty || 0,
    addItem,
    setQty: (variantId, qty) => dispatch({ type: 'SET_QTY', variantId, qty }),
    removeItem: variantId => dispatch({ type: 'REMOVE', variantId }),
    toggleSaveForLater: variantId => dispatch({ type: 'TOGGLE_SAVE_FOR_LATER', variantId }),
    clearCart: () => dispatch({ type: 'CLEAR' }),
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
