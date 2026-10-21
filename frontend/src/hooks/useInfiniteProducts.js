// Custom hook: products for the shop, loaded 12 at a time as the user scrolls.
//
//   const { products, count, hasNext, loading, loadingMore, error, loadMore } = useInfiniteProducts(filters)
//
// When the filters change, the list starts again from page 1.
import { useCallback, useEffect, useState } from 'react'
import { getProducts } from '../api/products'

const EMPTY = { key: null, items: [], page: 0, count: 0, hasNext: false, loadingMore: false, error: null }

export const useInfiniteProducts = filters => {
  const key = JSON.stringify(filters) // the filters as text → easy to compare
  const [state, setState] = useState(EMPTY)
  const current = state.key === key

  // Page 1 – whenever the filters change
  useEffect(() => {
    let ignore = false
    getProducts({ ...JSON.parse(key), page: 1 })
      .then(data => !ignore && setState({ ...EMPTY, key, items: data.results, page: 1, count: data.count, hasNext: Boolean(data.next) }))
      .catch(error => !ignore && setState({ ...EMPTY, key, error }))
    return () => {
      ignore = true // filters changed before the answer came → ignore it
    }
  }, [key])

  // Next page – called when the user scrolls near the bottom
  const loadMore = useCallback(() => {
    if (!current || !state.hasNext || state.loadingMore) return
    setState(s => ({ ...s, loadingMore: true }))
    getProducts({ ...JSON.parse(key), page: state.page + 1 })
      .then(data =>
        setState(s =>
          s.key !== key
            ? s // filters changed meanwhile – drop this old page
            : { ...s, items: [...s.items, ...data.results], page: s.page + 1, hasNext: Boolean(data.next), loadingMore: false },
        ),
      )
      .catch(error => setState(s => ({ ...s, loadingMore: false, error })))
  }, [current, key, state.hasNext, state.loadingMore, state.page])

  return {
    products: current ? state.items : [],
    count: current ? state.count : 0,
    hasNext: current && state.hasNext,
    loading: !current,
    loadingMore: state.loadingMore,
    error: current ? state.error : null,
    loadMore,
  }
}
