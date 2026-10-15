import { useEffect, useReducer, useRef, useState } from 'react'
import { getSavedCart, mergeCart, saveCart } from '../api/cart'
import { useAuth } from '../hooks/useAuth'
import { CartContext } from './CartContext'
import { cartReducer } from './cartReducer'

const STORAGE_KEY = 'cart'
const EMPTY = { items: [], owner: null }

// Start from the cart saved in localStorage (guest cart survives a refresh)
const loadCart = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return saved?.items ? { items: saved.items, owner: saved.owner ?? null } : EMPTY
  } catch {
    return EMPTY // broken data → start empty
  }
}

export const CartProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth()
  const userId = user?.id ?? null
  const [state, dispatch] = useReducer(cartReducer, undefined, loadCart)
  const [syncedUserId, setSyncedUserId] = useState(null) // whose server cart we have loaded

  const latest = useRef(state) // newest cart, readable inside effects
  const syncingFor = useRef(null) // which user's login sync already started (stops double merges)
  const skipSave = useRef(false) // true → don't send back a cart we just RECEIVED

  // 1. Every change → localStorage (other tabs get a "storage" event from this)
  useEffect(() => {
    latest.current = state
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  // 2. Login / logout
  useEffect(() => {
    if (authLoading) return
    const current = latest.current

    if (userId === null) {
      syncingFor.current = null
      // Logged out → remove the account's cart from this device (a guest cart is kept)
      if (current.owner !== null) {
        skipSave.current = true
        dispatch({ type: 'REPLACE', items: [], owner: null })
      }
      return
    }

    if (syncingFor.current === userId) return // already syncing (React StrictMode runs effects twice)
    syncingFor.current = userId

    // Page refresh as the same user → the server copy is the truth.
    // Guest cart (owner null) → ADD it into the account cart = "merge after login".
    const request =
      current.owner === userId ? getSavedCart() : mergeCart(current.owner === null ? current.items : [])

    request
      .then(cart => {
        if (syncingFor.current !== userId) return // logged out meanwhile
        skipSave.current = true
        dispatch({ type: 'REPLACE', items: cart.items, owner: userId })
        setSyncedUserId(userId)
      })
      .catch(() => {
        syncingFor.current = null // offline → keep the local cart, try again next time
      })
  }, [userId, authLoading])

  // 3. Logged in → send every change to the server (waits 400 ms so fast clicks become one request)
  useEffect(() => {
    if (skipSave.current) {
      skipSave.current = false
      return
    }
    if (userId === null || state.owner !== userId || syncedUserId !== userId) return
    const timer = setTimeout(() => saveCart(state.items).catch(() => {}), 400)
    return () => clearTimeout(timer)
  }, [state, userId, syncedUserId])

  // 4. Another browser tab changed the cart → copy it here (cross-tab sync)
  useEffect(() => {
    const onStorage = event => {
      if (event.key !== STORAGE_KEY || !event.newValue) return
      try {
        const next = JSON.parse(event.newValue)
        skipSave.current = true // the other tab already saved it to the server
        dispatch({ type: 'REPLACE', items: next.items || [], owner: next.owner ?? null })
      } catch {
        // ignore broken data
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

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
