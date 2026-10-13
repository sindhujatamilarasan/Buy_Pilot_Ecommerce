import client from './client'

export const registerUser = async data => (await client.post('/auth/register/', data)).data
export const loginUser = async data => (await client.post('/auth/login/', data)).data
export const logoutUser = async () => client.post('/auth/logout/')
export const getMe = async () => (await client.get('/auth/me/')).data
