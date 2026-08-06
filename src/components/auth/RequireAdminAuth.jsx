import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/context/AuthContext'

function RequireAdminAuth() {
  const { admin } = useAuth()
  const location = useLocation()

  if (!admin) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

export default RequireAdminAuth
