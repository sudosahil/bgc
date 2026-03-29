import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from './LoadingSpinner'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <LoadingSpinner fullScreen />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  return children
}
