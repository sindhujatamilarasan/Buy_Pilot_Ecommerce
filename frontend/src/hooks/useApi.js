// Custom hook: call an API function and track { data, error, loading }.
//
// Usage:  const { data, loading, error } = useApi(getProduct, slug)
// It calls the API again whenever the arguments change.
import { useEffect, useState } from 'react'

export const useApi = (apiFn, ...args) => {
  // The arguments as text, so React can tell when they really changed
  const key = JSON.stringify(args)
  const [result, setResult] = useState({ key: null, data: null, error: null })

  useEffect(() => {
    let ignore = false // if the args change before the answer arrives, ignore the old answer

    apiFn(...JSON.parse(key))
      .then(data => !ignore && setResult({ key, data, error: null }))
      .catch(error => !ignore && setResult({ key, data: null, error }))

    return () => {
      ignore = true // cleanup: runs when args change or the component closes
    }
  }, [apiFn, key])

  const isCurrent = result.key === key
  return {
    data: isCurrent ? result.data : null,
    error: isCurrent ? result.error : null,
    loading: !isCurrent,
  }
}
