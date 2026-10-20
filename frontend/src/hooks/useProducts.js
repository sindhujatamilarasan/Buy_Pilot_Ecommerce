// Custom hook: products for a set of filters, in a shape pages can use directly.
//
// Usage:  const { products, count, hasNext, loading } = useProducts({ category: 'books', page: 2 })
import { getProducts } from '../api/products'
import { useApi } from './useApi'

export const useProducts = filters => {
  const { data, loading, error } = useApi(getProducts, filters)
  return {
    products: data?.results ?? [],
    count: data?.count ?? 0,
    hasNext: Boolean(data?.next),
    hasPrevious: Boolean(data?.previous),
    loading,
    error,
  }
}
