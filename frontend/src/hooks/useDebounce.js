// Debounce: wait until the value stops changing for `delay` ms, then return it.
// Used for the price boxes – the URL (and the API call) updates only when you stop typing.
import { useEffect, useState } from 'react'

export const useDebounce = (value, delay = 500) => {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer) // value changed again → cancel the old timer
  }, [value, delay])

  return debounced
}
