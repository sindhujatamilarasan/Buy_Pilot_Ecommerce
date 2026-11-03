// Brand lockup: the Shopora bag mark + the name. Used in the shop header, footer and login pages.
import { Link } from 'react-router-dom'

const Logo = ({ className = 'text-2xl' }) => (
  <Link to="/" className={`inline-flex items-center gap-2.5 font-display font-extrabold ${className}`}>
    <img src="/logo-mark.png" alt="" className="h-[1.55em] w-[1.55em] rounded-[0.4em] shadow-sm" />
    <span className="text-brand">Shopora</span>
  </Link>
)

export default Logo
