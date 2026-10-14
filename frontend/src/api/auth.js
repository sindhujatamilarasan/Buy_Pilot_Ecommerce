import client from './client'

export const registerUser = async data => (await client.post('/auth/register/', data)).data
export const loginUser = async data => (await client.post('/auth/login/', data)).data
export const logoutUser = async () => client.post('/auth/logout/')
export const getMe = async () => (await client.get('/auth/me/')).data
export const updateMe = async data => (await client.patch('/auth/me/', data)).data
export const changePassword = async data => (await client.post('/auth/change-password/', data)).data
