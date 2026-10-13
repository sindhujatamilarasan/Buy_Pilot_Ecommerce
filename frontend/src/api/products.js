import client from './client'

// params example: { search: 'mug', category: 'books', ordering: 'min_price', page: 2 }
export const getProducts = async params => (await client.get('/products/', { params })).data
export const getProduct = async slug => (await client.get(`/products/${slug}/`)).data
export const getCategories = async () => (await client.get('/categories/')).data
