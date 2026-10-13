// Where each role lands after login
export const homeForRole = role =>
  ({ admin: '/admin', staff: '/staff/orders' })[role] || '/'
