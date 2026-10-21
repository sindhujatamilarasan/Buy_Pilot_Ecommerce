// Everyone lands on the shop after login. Admins and staff open their panel from the navbar:
export const PANEL = {
  superadmin: { to: '/admin', label: 'Super admin' },
  admin: { to: '/admin', label: 'Store admin' },
  staff: { to: '/staff/orders', label: 'Staff orders' },
}

// Store admin or super admin → can open the admin panel
export const isAdmin = user => ['admin', 'superadmin'].includes(user?.role)

export const ROLE_LABEL = { superadmin: 'Super admin', admin: 'Store admin', staff: 'Staff', customer: 'Customer' }
