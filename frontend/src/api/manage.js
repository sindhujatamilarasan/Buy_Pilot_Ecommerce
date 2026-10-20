// Admin panel API calls (the backend checks the role on every call)
import client from './client'

const get = async (url, params) => (await client.get(url, { params })).data

// Products
export const getAdminProducts = params => get('/manage/products/', params)
export const getAdminProduct = id => get(`/manage/products/${id}/`)
export const createProduct = async data => (await client.post('/manage/products/', data)).data
export const updateProduct = async (id, data) => (await client.put(`/manage/products/${id}/`, data)).data
export const deleteProduct = async id => client.delete(`/manage/products/${id}/`)
export const uploadImage = async file => {
  const form = new FormData()
  form.append('file', file)
  return (await client.post('/manage/uploads/', form)).data // { path, url }
}

// Coupons
export const getCoupons = () => get('/manage/coupons/')
export const createCoupon = async data => (await client.post('/manage/coupons/', data)).data
export const updateCoupon = async (id, data) => (await client.patch(`/manage/coupons/${id}/`, data)).data
export const deleteCoupon = async id => client.delete(`/manage/coupons/${id}/`)

// Orders (staff + admin)
export const getManageOrders = params => get('/manage/orders/', params)
export const nextOrderStatus = async id => (await client.post(`/manage/orders/${id}/next-status/`)).data
export const adminCancelOrder = async id => (await client.post(`/manage/orders/${id}/cancel/`)).data

// Users
export const getUsers = params => get('/manage/users/', params)
export const setUserRole = async (id, role) => (await client.patch(`/manage/users/${id}/role/`, { role })).data

// Stores (super admin)
export const getStores = () => get('/manage/stores/')
export const createStore = async data => (await client.post('/manage/stores/', data)).data
export const updateStore = async (id, data) => (await client.patch(`/manage/stores/${id}/`, data)).data
export const addStoreAdmin = async (storeId, data) => (await client.post(`/manage/stores/${storeId}/admins/`, data)).data

// Reports (admin)
export const getSalesReport = days => get('/manage/reports/sales/', { days })
