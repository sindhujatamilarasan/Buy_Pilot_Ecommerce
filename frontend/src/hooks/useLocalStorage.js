// Custom hook: like useState, but the value is saved in localStorage
// (survives a refresh) and stays the same in every open tab.
//
// Usage:  const [recent, setRecent] = useLocalStorage('recentlyViewed', [])
import { useEffect, useRef, useState } from 'react'

const read = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key)
    return saved === null ? fallback : JSON.parse(saved)
  } catch {
    return fallback // broken JSON or storage blocked → use the default
  }
}

export const useLocalStorage = (key, initialValue) => {
  const [value, setValue] = useState(() => read(key, initialValue))
  const fallback = useRef(initialValue) // keep the first default (arrays are new on every render)

  // Save every change
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // storage full or blocked (private mode) – the value still works in memory
    }
  }, [key, value])

  // Another tab changed it → use the new value here too
  useEffect(() => {
    const onStorage = event => {
      if (event.key === key) setValue(read(key, fallback.current))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [key])

  return [value, setValue]
}
