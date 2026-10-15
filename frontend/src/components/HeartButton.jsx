// ❤️ Save / un-save a product. Guests are sent to login first.
import { Heart } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useWishlist } from '../hooks/useWishlist'

const HeartButton = ({ product, className = '' }) => {
  const { user } = useAuth()
  const { isSaved, toggle } = useWishlist()
  const navigate = useNavigate()
  const location = useLocation()
  const saved = isSaved(product.id)

  const handleClick = e => {
    // The button sits inside a product <Link> – don't open the product page
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      navigate('/login', { state: { from: location } })
      return
    }
    toggle(product)
  }

  return (
    <button
      onClick={handleClick}
      title={saved ? 'Remove from wishlist' : 'Save to wishlist'}
      aria-pressed={saved}
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-sm transition hover:scale-110 ${className}`}
    >
      <Heart size={18} className={saved ? 'fill-rose-500 text-rose-500' : 'text-ink-500'} />
    </button>
  )
}

export default HeartButton
