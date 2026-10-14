import client from './client'

// Addresses
export const getAddresses = async () => (await client.get('/addresses/')).data
export const createAddress = async data => (await client.post('/addresses/', data)).data

// Orders + payment
export const createOrder = async data => (await client.post('/orders/', data)).data
export const verifyPayment = async (orderId, data) => (await client.post(`/orders/${orderId}/pay/verify/`, data)).data
export const retryPayment = async orderId => (await client.post(`/orders/${orderId}/pay/`)).data
export const markPaymentFailed = async (orderId, reason) => client.post(`/orders/${orderId}/pay/failed/`, { reason })
export const getMyOrders = async () => (await client.get('/orders/')).data
export const getOrder = async id => (await client.get(`/orders/${id}/`)).data
export const cancelOrder = async id => (await client.post(`/orders/${id}/cancel/`)).data
