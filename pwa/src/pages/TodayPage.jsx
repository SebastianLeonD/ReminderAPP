import { useEffect, useState, useCallback } from 'react'
import useReminderStore from '../stores/useReminderStore'
import ReminderCard from '../components/ReminderCard'
import ReminderDetail from '../components/ReminderDetail'

export default function TodayPage() {
  const { isLoading, reminders, fetchReminders, getTodaysReminders, getOverdueReminders } = useReminderStore()
  const [selected, setSelected] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const todaysReminders = getTodaysReminders()
  const overdueReminders = getOverdueReminders()

  useEffect(() => {
    fetchReminders()
  }, [fetchReminders])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchReminders()
    setRefreshing(false)
  }, [fetchReminders])

  // Pull-to-refresh
  const [pullStart, setPullStart] = useState(null)
  const handleTouchStart = (e) => {
    if (e.currentTarget.scrollTop <= 0) {
      setPullStart(e.touches[0].clientY)
    }
  }
  const handleTouchEnd = (e) => {
    if (pullStart !== null) {
      if (e.changedTouches[0].clientY - pullStart > 80) handleRefresh()
      setPullStart(null)
    }
  }

  if (isLoading && reminders.length === 0) {
    return (
      <div className="page">
        <div className="page-header"><h1>Today</h1></div>
        <div className="loading"><div className="spinner" /><span>Loading...</span></div>
      </div>
    )
  }

  const hasContent = todaysReminders.length > 0 || overdueReminders.length > 0

  return (
    <div className="page" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div className="page-header">
        <h1>Today</h1>
      </div>

      {refreshing && <div className="ptr-indicator">Refreshing...</div>}

      <div className="page-content">
        {/* Overdue */}
        {overdueReminders.length > 0 && (
          <>
            <div className="section-header overdue">
              &#9888;&#65039; Overdue
              <span className="count-badge danger">{overdueReminders.length}</span>
            </div>
            {overdueReminders.map((r) => (
              <ReminderCard key={r.id} reminder={r} onTap={setSelected} />
            ))}
          </>
        )}

        {/* Today */}
        <div className="section-header">
          &#9728;&#65039; Today
          {todaysReminders.length > 0 && (
            <span className="count-badge">{todaysReminders.length}</span>
          )}
        </div>

        {!hasContent ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <h3>All Caught Up</h3>
            <p>No reminders for today</p>
          </div>
        ) : (
          todaysReminders.map((r) => (
            <ReminderCard key={r.id} reminder={r} onTap={setSelected} />
          ))
        )}
      </div>

      {selected && <ReminderDetail reminder={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
