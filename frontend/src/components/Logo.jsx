// Brand lockup: the Buy Pilot bag mark + the name in the logo's two colours. Used in the shop header, footer and login pages.
import { Link } from 'react-router-dom'

const Logo = ({ className = 'text-2xl' }) => (
  <Link to="/" className={`inline-flex items-center gap-2.5 font-display font-extrabold ${className}`}>
    <img src="/logo-mark.png" alt="" className="h-[1.7em] w-auto" />
    <span><span className="text-brand-700">Buy</span> <span className="text-mango-500">Pilot</span></span>
  </Link>
)

export default Logo
