// One axios "client" for the whole app.
// Every API call uses this, so the base URL is set in ONE place (from .env).
import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

// Interceptor = runs before EVERY request.
// If we have a saved login token, attach it so Django knows who we are.
client.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Token ${token}`
  }
  return config
})

export default client
