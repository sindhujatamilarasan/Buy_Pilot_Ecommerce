// API calls are kept in src/api (project rule) – components never call axios directly.
import client from './client'

export const getHealth = async () => {
  const response = await client.get('/health/')
  return response.data
}
