import client from './client'

// Send only ids + quantities. The backend looks up the real prices and stock.
export const quoteCart = async payload => (await client.post('/cart/quote/', payload)).data

// Saved cart for logged-in users. Items: [{ variant_id, qty, saved_for_later }]
const toPayload = items =>
  items.map(i => ({ variant_id: i.variantId, qty: i.qty, saved_for_later: Boolean(i.savedForLater) }))

export const getSavedCart = async () => (await client.get('/cart/')).data
export const saveCart = async items => (await client.put('/cart/', { items: toPayload(items) })).data
export const mergeCart = async items => (await client.post('/cart/merge/', { items: toPayload(items) })).data
