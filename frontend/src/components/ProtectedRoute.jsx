// Guards pages that need login (and optionally a role).
//
//   <Route element={<ProtectedRoute />}>                  → any logged-in user
//   <Route element={<ProtectedRoute roles={['admin']} />}> → admins only
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Spinner from './Spinner'

const ProtectedRoute = ({ roles }) => {
  const { user, loading } = useAuth()
  const location = useLocation()

  // Still checking the saved token → wait, don't redirect yet
  if (loading) return <Spinner />

  // Not logged in → go to login, and remember where they wanted to go
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />

  // Logged in, but wrong role (e.g. customer opens /admin)
  if (roles && !roles.includes(user.role)) return <Navigate to="/forbidden" replace />

  // Allowed → show the child route
  return <Outlet />
}

export default ProtectedRoute
