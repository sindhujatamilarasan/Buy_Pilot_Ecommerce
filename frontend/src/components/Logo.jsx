// Brand logo (bag + plane + "Buy Pilot", emerald green and gold). Used in the shop header, footer and login pages.
// `className` sets the height (h-*); the image keeps its shape.
import { Link } from 'react-router-dom'

const Logo = ({ className = 'h-11' }) => (
  <Link to="/" className="inline-flex items-center" aria-label="Buy Pilot – home">
    <img src="/logo-full.png" alt="Buy Pilot" className={`${className} w-auto`} />
  </Link>
)

export default Logo
