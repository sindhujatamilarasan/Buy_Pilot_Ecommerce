// Shown when a page's data could not be loaded (server down, no internet…) – with a retry button
import Message from './Message'

const LoadError = ({ what = 'this page', onRetry }) => (
  <Message type="error" icon="⚠️" title={`Could not load ${what}`}>
    <p>Check your internet connection or try again in a moment.</p>
    {onRetry && (
      <button onClick={onRetry} className="mt-3 rounded-full bg-white px-5 py-2 text-sm font-bold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50">
        Try again
      </button>
    )}
  </Message>
)

export default LoadError
