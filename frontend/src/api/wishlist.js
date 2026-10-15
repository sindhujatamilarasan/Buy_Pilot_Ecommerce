import client from './client'

export const getWishlist = async () => (await client.get('/wishlist/')).data
export const addToWishlist = async productId => client.post('/wishlist/', { product_id: productId })
export const removeFromWishlist = async productId => client.delete(`/wishlist/${productId}/`)
