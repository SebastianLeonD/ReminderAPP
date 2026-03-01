import { useEffect, useState } from 'react'
import useReminderStore from '../stores/useReminderStore'
import ReminderCard from '../components/ReminderCard'
import FilterBar from '../components/FilterBar'
import ReminderDetail from '../components/ReminderDetail'

export default function AllRemindersPage() {
  const { isLoading, reminders, fetchReminders, getFiltered, searchQuery, setSearchQuery } = useReminderStore()
  const [selected, setSelected] = useState(null)

  const filtered = getFiltered()

  useEffect(() => {
    if (reminders.length === 0) fetchReminders()
  }, [fetchReminders, reminders.length])

  return (
    <div className="page">
      <div className="page-header">
        <h1>All Reminders</h1>
      </div>

      <div className="search-bar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search reminders..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <FilterBar />

      <div className="page-content">
        {isLoading && reminders.length === 0 ? (
          <div className="loading"><div className="spinner" /> Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            <h3>No Reminders Found</h3>
            <p>Try adjusting your filters</p>
          </div>
        ) : (
          filtered.map((r) => (
            <ReminderCard key={r.id} reminder={r} onTap={setSelected} />
          ))
        )}
      </div>

      {selected && <ReminderDetail reminder={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
