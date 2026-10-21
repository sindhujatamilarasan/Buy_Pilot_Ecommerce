// Infinite scroll: an invisible line under the list. When it comes near the screen,
// IntersectionObserver calls onVisible() → the next page loads.
// The "Load more" button is a backup (keyboard users, very tall screens).
import { useEffect, useRef } from 'react'

const LoadMoreTrigger = ({ onVisible, loading, hasMore, shown, total }) => {
  const ref = useRef(null)

  useEffect(() => {
    const line = ref.current
    if (!line || !hasMore) return
    const observer = new IntersectionObserver(
      entries => entries[0].isIntersecting && onVisible(),
      { rootMargin: '400px' }, // start loading a bit BEFORE the user reaches the end
    )
    observer.observe(line)
    return () => observer.disconnect() // cleanup when the list changes or the page closes
  }, [onVisible, hasMore])

  return (
    <div ref={ref} className="mt-8 flex flex-col items-center gap-3 text-sm text-ink-500">
      {hasMore ? (
        <button onClick={onVisible} disabled={loading} className="rounded-full bg-white px-6 py-2.5 font-bold text-brand-700 shadow-sm ring-1 ring-brand-100 hover:bg-brand-50 disabled:opacity-60">
          {loading ? 'Loading more…' : 'Load more'}
        </button>
      ) : (
        <p>You’ve seen all {total} products ✨</p>
      )}
      <p aria-live="polite">Showing {shown} of {total}</p>
    </div>
  )
}

export default LoadMoreTrigger
