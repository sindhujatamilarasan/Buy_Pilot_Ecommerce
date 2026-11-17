import client from './client'

// Addresses
export const getAddresses = async () => (await client.get('/addresses/')).data
export const createAddress = async data => (await client.post('/addresses/', data)).data
export const updateAddress = async (id, data) => (await client.patch(`/addresses/${id}/`, data)).data
export const deleteAddress = async id => client.delete(`/addresses/${id}/`)

// Orders + payment
export const createOrder = async data => (await client.post('/orders/', data)).data
export const verifyPayment = async (orderId, data) => (await client.post(`/orders/${orderId}/pay/verify/`, data)).data
export const retryPayment = async orderId => (await client.post(`/orders/${orderId}/pay/`)).data
export const markPaymentFailed = async (orderId, reason) => client.post(`/orders/${orderId}/pay/failed/`, { reason })
export const getMyOrders = async () => (await client.get('/orders/')).data
export const getOrder = async id => (await client.get(`/orders/${id}/`)).data
export const cancelOrder = async id => (await client.post(`/orders/${id}/cancel/`)).data
export const getPaymentOptions = async () => (await client.get('/payments/options/')).data
