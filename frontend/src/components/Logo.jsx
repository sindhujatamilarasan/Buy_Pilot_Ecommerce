// Brand lockup: the Buy Pilot bag-and-plane mark + the name stacked in italics (green "Buy", gold "Pilot").
// Used in the shop header, footer and login pages. `className` sets the size (text-*).
import { Link } from 'react-router-dom'

const Logo = ({ className = 'text-2xl' }) => (
  <Link to="/" className={`inline-flex items-center gap-2 font-display font-extrabold italic ${className}`}>
    <img src="/logo-mark.svg" alt="" className="h-[1.9em] w-auto" />
    <span className="flex flex-col leading-[0.85] tracking-tight">
      <span className="text-brand-700">Buy</span>
      <span className="text-mango-500">Pilot</span>
    </span>
  </Link>
)

export default Logo
