import client from './client'

export const sendChatMessage = async ({ message = '', action = null, cart = [] } = {}) => {
  const { data } = await client.post('/chat/', {
    message,
    action,
    cart: cart.map(i => ({
      variant_id: i.variantId || i.variant_id,
      name: i.name,
      price: i.price,
      qty: i.qty || 1,
    })),
  })
  return data
}
