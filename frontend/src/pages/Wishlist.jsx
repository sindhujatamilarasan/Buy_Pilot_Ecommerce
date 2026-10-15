import { Link } from 'react-router-dom'
import Message from '../components/Message'
import ProductCard from '../components/ProductCard'
import { useWishlist } from '../hooks/useWishlist'

const Wishlist = () => {
  const { products } = useWishlist()

  return (
    <div>
      <h1 className="text-3xl font-extrabold text-ink-900">My wishlist ❤️</h1>
      <p className="mt-1 text-ink-500">
        {products.length} saved {products.length === 1 ? 'product' : 'products'}. Tap the heart to remove one.
      </p>

      {products.length === 0 ? (
        <div className="mt-8">
          <Message icon="💔" title="Your wishlist is empty">
            Tap the ♡ on any product to save it here.{' '}
            <Link to="/products" className="font-bold text-brand-700">Start browsing →</Link>
          </Message>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
          {products.map(product => <ProductCard key={product.id} product={product} />)}
        </div>
      )}
    </div>
  )
}

export default Wishlist
