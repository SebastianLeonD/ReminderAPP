import useReminderStore from '../stores/useReminderStore'
import useCategoryStore from '../stores/useCategoryStore'

function formatFullDate(date) {
  return date.toLocaleDateString([], {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function ReminderDetail({ reminder, onClose }) {
  const { markComplete, deleteReminder } = useReminderStore()
  const { getAllCategories } = useCategoryStore()

  if (!reminder) return null

  const getCategoryInfo = (value) => {
    const cat = getAllCategories().find((c) => c.value === value)
    return cat || { icon: '\u{1F464}', color: '#10b981', label: value }
  }

  const handleComplete = async () => {
    await markComplete(reminder.id)
    onClose()
  }

  const handleDelete = async () => {
    await deleteReminder(reminder.id)
    onClose()
  }

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="handle" />
        <h2>{reminder.title}</h2>

        {reminder.description && (
          <p className="detail-description">{reminder.description}</p>
        )}

        <div className="detail-row">
          <span className="label">Category</span>
          <span className="value">
            {getCategoryInfo(reminder.category).icon}{' '}
            <span style={{ textTransform: 'capitalize' }}>{getCategoryInfo(reminder.category).label || reminder.category}</span>
          </span>
        </div>

        <div className="detail-row">
          <span className="label">Priority</span>
          <span className="value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className={`priority-dot priority-${reminder.priority}`} />
            <span style={{ textTransform: 'capitalize' }}>{reminder.priority}</span>
          </span>
        </div>

        <div className="detail-row">
          <span className="label">When</span>
          <span className="value">{formatFullDate(reminder.eventTime)}</span>
        </div>

        <div className="detail-row">
          <span className="label">Status</span>
          <span className="value">{reminder.sent ? 'Completed' : 'Pending'}</span>
        </div>

        <div className="detail-row">
          <span className="label">Created</span>
          <span className="value">{formatFullDate(reminder.createdAt)}</span>
        </div>

        <div className="detail-actions">
          {!reminder.sent && (
            <button className="btn btn-primary" onClick={handleComplete}>
              &#10003; Complete
            </button>
          )}
          <button className="btn btn-danger" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
