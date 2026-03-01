import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import AuthGuard from './components/AuthGuard'
import TodayPage from './pages/TodayPage'
import AllRemindersPage from './pages/AllRemindersPage'
import CreatePage from './pages/CreatePage'
import SettingsPage from './pages/SettingsPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DayPlannerPage from './pages/DayPlannerPage'
import SchedulePage from './pages/SchedulePage'
import useReminderStore from './stores/useReminderStore'
import useAuthStore from './stores/useAuthStore'

export default function App() {
  const error = useReminderStore((s) => s.error)
  const clearError = useReminderStore((s) => s.clearError)
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    const unsubscribe = initialize()
    return () => unsubscribe?.()
  }, [initialize])

  return (
    <BrowserRouter>
      {error && (
        <div className="toast error">
          <span className="toast-message">{error}</span>
          <button className="toast-close" onClick={clearError}>&times;</button>
        </div>
      )}

      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Protected routes */}
        <Route path="/" element={<AuthGuard><TodayPage /></AuthGuard>} />
        <Route path="/all" element={<AuthGuard><AllRemindersPage /></AuthGuard>} />
        <Route path="/create" element={<AuthGuard><CreatePage /></AuthGuard>} />
        <Route path="/planner" element={<AuthGuard><DayPlannerPage /></AuthGuard>} />
        <Route path="/schedule" element={<AuthGuard><SchedulePage /></AuthGuard>} />
        <Route path="/settings" element={<AuthGuard><SettingsPage /></AuthGuard>} />
      </Routes>

      <BottomNav />
    </BrowserRouter>
  )
}
