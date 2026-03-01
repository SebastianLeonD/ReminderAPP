import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import usePlannerStore from '../stores/usePlannerStore'
import useCategoryStore from '../stores/useCategoryStore'
import ReminderDetail from '../components/ReminderDetail'
import useReminderStore from '../stores/useReminderStore'

const TYPE_COLORS = {
  fixed: 'var(--text-muted)',
  task: 'var(--primary)',
  break: 'var(--success)',
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
}

export default function DayPlannerPage() {
  const navigate = useNavigate()
  const { dayPlan, loading, error, fetchDayPlan, generatePlan, acceptPlan, clearError } = usePlannerStore()
  const { getAllCategories, fetchCategories, categories } = useCategoryStore()
  const { reminders, fetchReminders } = useReminderStore()
  const [selectedReminder, setSelectedReminder] = useState(null)

  const today = new Date().toISOString().split('T')[0]
  const [selectedDate, setSelectedDate] = useState(today)

  useEffect(() => {
    fetchDayPlan(selectedDate)
    if (categories.length === 0) fetchCategories()
    if (reminders.length === 0) fetchReminders()
  }, [selectedDate, fetchDayPlan, fetchCategories, fetchReminders, categories.length, reminders.length])

  const getTomorrow = () => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  }

  const handleBlockTap = (block) => {
    if (block.type === 'task' && block.reminder_id) {
      const reminder = reminders.find((r) => r.id === block.reminder_id)
      if (reminder) setSelectedReminder(reminder)
    }
  }

  const getCategoryColor = (reminderId) => {
    const reminder = reminders.find((r) => r.id === reminderId)
    if (!reminder) return 'var(--primary)'
    const cat = getAllCategories().find((c) => c.value === reminder.category)
    return cat?.color || 'var(--primary)'
  }

  const getCategoryIcon = (reminderId) => {
    const reminder = reminders.find((r) => r.id === reminderId)
    if (!reminder) return ''
    const cat = getAllCategories().find((c) => c.value === reminder.category)
    return cat?.icon || ''
  }

  const planBlocks = dayPlan?.plan_data || []

  return (
    <div className="page">
      <div className="page-header">
        <h1>Day Planner</h1>
      </div>

      <div className="page-content">
        {/* Date selector */}
        <div className="planner-date-selector">
          <button
            className={`filter-chip ${selectedDate === today ? 'active' : ''}`}
            onClick={() => setSelectedDate(today)}
          >
            Today
          </button>
          <button
            className={`filter-chip ${selectedDate === getTomorrow() ? 'active' : ''}`}
            onClick={() => setSelectedDate(getTomorrow())}
          >
            Tomorrow
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="planner-date-input"
          />
        </div>

        <div className="planner-date-label">{formatDate(selectedDate)}</div>

        {error && (
          <div className="auth-error" style={{ margin: '0 0 12px' }}>
            {error}
            <button className="toast-close" onClick={clearError}>&times;</button>
          </div>
        )}

        {/* Generate button */}
        <button
          className="btn btn-primary"
          onClick={() => generatePlan(selectedDate)}
          disabled={loading}
          style={{ marginBottom: 16 }}
        >
          {loading ? (
            <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Generating plan...</>
          ) : dayPlan ? (
            'Regenerate Plan'
          ) : (
            'Generate Plan'
          )}
        </button>

        {/* Schedule link */}
        <button
          className="btn btn-ghost"
          style={{ marginBottom: 16, fontSize: 14 }}
          onClick={() => navigate('/schedule')}
        >
          Edit Weekly Schedule
        </button>

        {/* Timeline view */}
        {planBlocks.length === 0 && !loading ? (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <h3>No Plan Yet</h3>
            <p>Generate an AI-powered daily schedule</p>
          </div>
        ) : (
          <div className="planner-timeline">
            {planBlocks.map((block, i) => {
              const isTask = block.type === 'task'
              const blockColor = isTask && block.reminder_id
                ? getCategoryColor(block.reminder_id)
                : TYPE_COLORS[block.type] || 'var(--text-muted)'

              return (
                <div
                  key={i}
                  className={`planner-block planner-block-${block.type}`}
                  style={{ '--block-color': blockColor }}
                  onClick={() => handleBlockTap(block)}
                >
                  <div className="planner-block-time">
                    {block.start} - {block.end}
                  </div>
                  <div className="planner-block-content">
                    {isTask && block.reminder_id && (
                      <span className="planner-block-icon">{getCategoryIcon(block.reminder_id)}</span>
                    )}
                    <span className="planner-block-title">{block.title}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Accept plan button */}
        {dayPlan && !dayPlan.accepted && planBlocks.length > 0 && (
          <button
            className="btn btn-primary"
            onClick={acceptPlan}
            style={{ marginTop: 16 }}
          >
            Accept Plan
          </button>
        )}

        {dayPlan?.accepted && (
          <div className="planner-accepted-badge">Plan accepted</div>
        )}
      </div>

      {selectedReminder && (
        <ReminderDetail reminder={selectedReminder} onClose={() => setSelectedReminder(null)} />
      )}
    </div>
  )
}
