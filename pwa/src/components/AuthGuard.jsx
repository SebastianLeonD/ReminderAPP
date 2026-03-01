import { Navigate } from 'react-router-dom'
import useAuthStore from '../stores/useAuthStore'

export default function AuthGuard({ children }) {
  const { session, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="page">
        <div className="loading">
          <div className="spinner" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return children
}
