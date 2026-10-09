// One axios "client" for the whole app.
// Every API call uses this, so the base URL is set in ONE place (from .env).
import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

export default client
