// Admins and staff land in their console after login (customers land on the shop).
// From the console they open the shop with "View store"; from the shop, the navbar button brings them back.
export const PANEL = {
  superadmin: { to: '/admin', label: 'Super admin' },
  admin: { to: '/admin', label: 'Store admin' },
  staff: { to: '/staff/orders', label: 'Staff orders' },
}

export const homeForRole = role => PANEL[role]?.to || '/'

// Where to go after login. `from` = the page that sent them to /login (e.g. /wishlist).
// Customers go back there. Admin / staff go back only if it is inside THEIR console, otherwise to the console.
// Returns a location: { pathname, state? }
export const pageAfterLogin = (role, from) => {
  const home = { pathname: homeForRole(role) }
  if (!from) return home
  const consolePrefix = home.pathname.split('/').slice(0, 2).join('/') // '/admin' or '/staff'
  const allowed = !PANEL[role] || from.pathname.startsWith(consolePrefix)
  return allowed ? from : home
}

// Store admin or super admin → can open the admin panel
export const isAdmin = user => ['admin', 'superadmin'].includes(user?.role)

export const ROLE_LABEL = { superadmin: 'Super admin', admin: 'Store admin', staff: 'Staff', customer: 'Customer' }
