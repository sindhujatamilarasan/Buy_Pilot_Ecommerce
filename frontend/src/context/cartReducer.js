// useReducer = all the ways the cart can change, in ONE pure function.
//   (state, action) → new state
// Components never edit the cart directly; they "dispatch" an action like { type: 'ADD', … }.
//
// A cart item: { variantId, slug, name, image, size, color, price, stock, qty, savedForLater }
// State: { items: [...], owner: null | userId }  – owner = whose cart this is (null = guest)

export const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD': {
      const { item, qty } = action
      const existing = state.items.find(i => i.variantId === item.variantId)

      if (existing) {
        // Already in the cart → increase qty, but never above the stock
        return {
          ...state,
          items: state.items.map(i =>
            i.variantId === item.variantId
              ? { ...i, ...item, qty: Math.min(i.qty + qty, item.stock), savedForLater: false }
              : i,
          ),
        }
      }
      return { ...state, items: [...state.items, { ...item, qty: Math.min(qty, item.stock), savedForLater: false }] }
    }

    case 'SET_QTY':
      return {
        ...state,
        items: state.items.map(i =>
          i.variantId === action.variantId
            ? { ...i, qty: Math.max(1, Math.min(action.qty, i.stock)) } // keep between 1 and stock
            : i,
        ),
      }

    case 'REMOVE':
      return { ...state, items: state.items.filter(i => i.variantId !== action.variantId) }

    case 'TOGGLE_SAVE_FOR_LATER':
      return {
        ...state,
        items: state.items.map(i =>
          i.variantId === action.variantId ? { ...i, savedForLater: !i.savedForLater } : i,
        ),
      }

    case 'CLEAR':
      // After a successful order: remove the bought items, keep "saved for later"
      return { ...state, items: state.items.filter(i => i.savedForLater) }

    case 'REPLACE':
      // Whole cart from the server (after login) or from another browser tab
      return { items: action.items, owner: action.owner }

    default:
      return state
  }
}
