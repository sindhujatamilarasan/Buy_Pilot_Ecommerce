// Warehouse management API calls (warehouse managers, store admins, super admin)
import client from './client'

const get = async (url, params) => (await client.get(url, { params })).data
const post = async (url, data) => (await client.post(url, data)).data

export const getInventoryOverview = () => get('/inventory/overview/')

// Warehouses
export const getWarehouses = params => get('/inventory/warehouses/', params)
export const createWarehouse = data => post('/inventory/warehouses/', data)
export const updateWarehouse = async (id, data) => (await client.patch(`/inventory/warehouses/${id}/`, data)).data

// Stock levels + history
export const getStock = params => get('/inventory/stock/', params)
export const updateStockRow = async (id, data) => (await client.patch(`/inventory/stock/${id}/`, data)).data
export const createDraftProduct = data => post('/inventory/new-product/', data) // a product that is not in the system yet
export const searchVariants = search => get('/inventory/variants/', { search })
export const getMovements = params => get('/inventory/movements/', params)

// Operations
export const getReceipts = params => get('/inventory/receipts/', params)
export const createReceipt = data => post('/inventory/receipts/', data)
export const getAdjustments = params => get('/inventory/adjustments/', params)
export const createAdjustment = data => post('/inventory/adjustments/', data)
export const decideAdjustment = (id, action) => post(`/inventory/adjustments/${id}/${action}/`) // approve | reject
export const getTransferCounts = () => get('/inventory/transfers/counts/')
export const getTransfers = params => get('/inventory/transfers/', params)
export const createTransfer = data => post('/inventory/transfers/', data)
export const transferAction = (id, action) => post(`/inventory/transfers/${id}/${action}/`) // approve | reject | dispatch | receive | cancel

// Fulfilment
export const getOrdersToPick = () => get('/inventory/orders-to-pick/')
export const getPickList = orderId => get(`/inventory/pick-list/${orderId}/`)

// CSV export: the API needs our login token, so download through axios and save the file
export const downloadCsv = async (path, params, fileName) => {
  const response = await client.get(`/inventory/export/${path}`, { params, responseType: 'blob' })
  const url = URL.createObjectURL(response.data)
  const link = Object.assign(document.createElement('a'), { href: url, download: fileName })
  link.click()
  URL.revokeObjectURL(url)
}
