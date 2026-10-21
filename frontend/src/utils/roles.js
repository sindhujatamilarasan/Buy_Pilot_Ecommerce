// Admins and staff land in their console after login (customers land on the shop).
// From the console they open the shop with "View store"; from the shop, the navbar button brings them back.
export const PANEL = {
  superadmin: { to: '/admin', label: 'Super admin' },
  admin: { to: '/admin', label: 'Store admin' },
  staff: { to: '/staff/orders', label: 'Staff orders' },
}

export const homeForRole = role => PANEL[role]?.to || '/'

// Store admin or super admin → can open the admin panel
export const isAdmin = user => ['admin', 'superadmin'].includes(user?.role)

export const ROLE_LABEL = { superadmin: 'Super admin', admin: 'Store admin', staff: 'Staff', customer: 'Customer' }
