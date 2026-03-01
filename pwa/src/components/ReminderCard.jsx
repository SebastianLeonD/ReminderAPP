import { useRef, useState } from 'react'
import useReminderStore from '../stores/useReminderStore'
import useCategoryStore from '../stores/useCategoryStore'

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function formatRelativeDate(date) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diff = Math.round((target - today) / (1000 * 60 * 60 * 24))

  if (diff === 0) return formatTime(date)
  if (diff === 1) return `Tomorrow, ${formatTime(date)}`
  if (diff === -1) return `Yesterday, ${formatTime(date)}`
  if (diff > 1 && diff <= 7) {
    return `${date.toLocaleDateString([], { weekday: 'short' })}, ${formatTime(date)}`
  }
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${formatTime(date)}`
}

export default function ReminderCard({ reminder, onTap }) {
  const { deleteReminder, markComplete } = useReminderStore()
  const { getAllCategories } = useCategoryStore()
  const startX = useRef(0)
  const [offset, setOffset] = useState(0)
  const [swiping, setSwiping] = useState(false)
  const didSwipe = useRef(false)

  const THRESHOLD = 80

  const getCategoryInfo = (value) => {
    const cat = getAllCategories().find((c) => c.value === value)
    return cat || { icon: '\u{1F464}', color: '#10b981' }
  }

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX
    setSwiping(true)
    didSwipe.current = false
  }

  const handleTouchMove = (e) => {
    if (!swiping) return
    const dx = e.touches[0].clientX - startX.current
    if (Math.abs(dx) > 5) didSwipe.current = true
    setOffset(Math.max(-150, Math.min(150, dx)))
  }

  const handleTouchEnd = () => {
    setSwiping(false)
    if (offset > THRESHOLD) {
      markComplete(reminder.id)
    } else if (offset < -THRESHOLD) {
      deleteReminder(reminder.id)
    }
    setOffset(0)
  }

  const handleClick = () => {
    if (!didSwipe.current) onTap?.(reminder)
  }

  const showComplete = offset > 30
  const showDelete = offset < -30

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 'var(--radius)',
        marginBottom: 8,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--success)',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 20,
          color: 'white',
          fontWeight: 600,
          fontSize: 13,
          opacity: showComplete ? 1 : 0,
          transition: 'opacity 0.15s',
        }}
      >
        &#10003; Complete
      </div>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--danger)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingRight: 20,
          color: 'white',
          fontWeight: 600,
          fontSize: 13,
          opacity: showDelete ? 1 : 0,
          transition: 'opacity 0.15s',
        }}
      >
        Delete &#128465;
      </div>

      <div
        className="reminder-card"
        style={{
          transform: `translateX(${offset}px)`,
          transition: swiping ? 'none' : 'transform 0.25s ease',
          marginBottom: 0,
          position: 'relative',
          zIndex: 1,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
      >
        <div className="reminder-card-inner">
          <div
            className="reminder-icon"
            style={{ background: getCategoryInfo(reminder.category).color }}
          >
            {getCategoryInfo(reminder.category).icon}
          </div>
          <div className="reminder-body">
            <div className="reminder-title">{reminder.title}</div>
            <div className="reminder-meta">
              <span className={`priority-dot priority-${reminder.priority}`} />
              <span>{reminder.priority}</span>
              <span>&middot;</span>
              <span>{formatRelativeDate(reminder.eventTime)}</span>
            </div>
          </div>
          <span className="reminder-chevron">&#8250;</span>
        </div>
      </div>
    </div>
  )
}
