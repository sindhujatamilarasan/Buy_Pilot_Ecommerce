// useReducer = all the ways the cart can change, in ONE pure function.
//   (state, action) → new state
// Components never edit the cart directly; they "dispatch" an action like { type: 'ADD', … }.
//
// A cart item: { variantId, slug, name, image, size, color, price, stock, qty, savedForLater }

export const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD': {
      const { item, qty } = action
      const existing = state.items.find(i => i.variantId === item.variantId)

      if (existing) {
        // Already in the cart → increase qty, but never above the stock
        return {
          items: state.items.map(i =>
            i.variantId === item.variantId
              ? { ...i, ...item, qty: Math.min(i.qty + qty, item.stock), savedForLater: false }
              : i,
          ),
        }
      }
      return { items: [...state.items, { ...item, qty: Math.min(qty, item.stock), savedForLater: false }] }
    }

    case 'SET_QTY':
      return {
        items: state.items.map(i =>
          i.variantId === action.variantId
            ? { ...i, qty: Math.max(1, Math.min(action.qty, i.stock)) } // keep between 1 and stock
            : i,
        ),
      }

    case 'REMOVE':
      return { items: state.items.filter(i => i.variantId !== action.variantId) }

    case 'TOGGLE_SAVE_FOR_LATER':
      return {
        items: state.items.map(i =>
          i.variantId === action.variantId ? { ...i, savedForLater: !i.savedForLater } : i,
        ),
      }

    case 'CLEAR':
      // After a successful order: remove the bought items, keep "saved for later"
      return { items: state.items.filter(i => i.savedForLater) }

    default:
      return state
  }
}
