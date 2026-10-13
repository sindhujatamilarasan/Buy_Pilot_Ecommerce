import client from './client'

export const getDashboard = async () => (await client.get('/admin/dashboard/')).data
