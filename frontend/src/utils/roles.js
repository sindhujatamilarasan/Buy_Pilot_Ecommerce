// Where each role lands after login
export const homeForRole = role =>
  ({ superadmin: '/admin', admin: '/admin', staff: '/staff/orders' })[role] || '/'

// Store admin or super admin → can open the admin panel
export const isAdmin = user => ['admin', 'superadmin'].includes(user?.role)

export const ROLE_LABEL = { superadmin: 'Super admin', admin: 'Store admin', staff: 'Staff', customer: 'Customer' }
