import client from './client'

// Send only ids + quantities. The backend looks up the real prices and stock.
export const quoteCart = async payload => (await client.post('/cart/quote/', payload)).data
