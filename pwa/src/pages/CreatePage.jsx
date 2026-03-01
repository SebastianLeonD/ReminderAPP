import { useState, useRef, useCallback, useEffect } from 'react'
import useReminderStore from '../stores/useReminderStore'
import useCategoryStore from '../stores/useCategoryStore'
import { CUSTOM_ICON_OPTIONS, CUSTOM_COLOR_OPTIONS } from '../utils/categories'

const PRIORITIES = [
  { value: 'low', label: 'Low', color: '#10b981' },
  { value: 'medium', label: 'Medium', color: '#f59e0b' },
  { value: 'high', label: 'High', color: '#ef4444' },
]

export default function CreatePage() {
  const { createReminder } = useReminderStore()
  const { categories, fetchCategories, addCategory, getAllCategories } = useCategoryStore()
  const [text, setText] = useState('')
  const [category, setCategory] = useState(null)
  const [priority, setPriority] = useState(null)
  const [dateTime, setDateTime] = useState('')
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)
  const [recording, setRecording] = useState(false)
  const [showNewCategory, setShowNewCategory] = useState(false)
  const recognitionRef = useRef(null)

  const [newCatName, setNewCatName] = useState('')
  const [newCatIcon, setNewCatIcon] = useState(CUSTOM_ICON_OPTIONS[0])
  const [newCatColor, setNewCatColor] = useState(CUSTOM_COLOR_OPTIONS[0])

  useEffect(() => {
    if (categories.length === 0) fetchCategories()
  }, [categories.length, fetchCategories])

  const allCategories = getAllCategories()

  const speechSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const startRecording = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setText(transcript)
    }

    recognition.onerror = () => setRecording(false)
    recognition.onend = () => setRecording(false)

    recognitionRef.current = recognition
    recognition.start()
    setRecording(true)
  }, [])

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setRecording(false)
  }, [])

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return
    const value = newCatName.trim().toLowerCase().replace(/\s+/g, '_')

    if (allCategories.some((c) => c.value === value)) return

    try {
      await addCategory({
        value,
        label: newCatName.trim(),
        icon: newCatIcon,
        color: newCatColor,
      })

      setCategory(value)
      setNewCatName('')
      setNewCatIcon(CUSTOM_ICON_OPTIONS[0])
      setNewCatColor(CUSTOM_COLOR_OPTIONS[0])
      setShowNewCategory(false)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleSend = async () => {
    if (!text.trim() || sending) return
    setSending(true)
    setError(null)

    try {
      await createReminder({
        text: text.trim(),
        overrides: {
          category: category || undefined,
          priority: priority || undefined,
          eventTime: dateTime || undefined,
        },
      })
      setSending(false)
      setSuccess(true)
      setText('')
      setCategory(null)
      setPriority(null)
      setDateTime('')
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setSending(false)
      setError(err.message)
    }
  }

  const getMinDateTime = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
  }

  const selectedCat = allCategories.find((c) => c.value === category)

  return (
    <div className="page">
      <div className="create-header">
        <div className="icon">+</div>
        <h2>Create Reminder</h2>
        <p>Type or speak naturally — AI handles the rest</p>
      </div>

      <div className="text-area-wrapper">
        <label>What do you need to remember?</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'e.g. "Remind me to submit homework tomorrow at 3pm"\nor "Call mom at 5, high priority"'}
        />
      </div>

      <div className="voice-section">
        {speechSupported ? (
          <>
            <button
              className={`voice-btn ${recording ? 'recording' : 'idle'}`}
              onClick={recording ? stopRecording : startRecording}
            >
              {recording ? (
                <>{'\u25A0'} Stop Recording</>
              ) : (
                <>{'\u{1F3A4}'} Tap to Speak</>
              )}
            </button>
            {recording && (
              <div className="recording-indicator">
                <div className="recording-dot" />
                <span>Listening...</span>
              </div>
            )}
          </>
        ) : (
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--warning)' }}>
            Voice input not supported in this browser
          </p>
        )}
      </div>

      <div className="create-section">
        <label className="create-section-label">Category (optional — AI will guess)</label>
        <div className="category-grid">
          {allCategories.map((cat) => (
            <button
              key={cat.value}
              className={`category-pill ${category === cat.value ? 'active' : ''}`}
              style={{ '--pill-color': cat.color }}
              onClick={() => setCategory(category === cat.value ? null : cat.value)}
            >
              <span className="category-pill-icon">{cat.icon}</span>
              <span className="category-pill-label">{cat.label}</span>
            </button>
          ))}
          <button
            className={`category-pill add-new ${showNewCategory ? 'active' : ''}`}
            onClick={() => setShowNewCategory(!showNewCategory)}
          >
            <span className="category-pill-icon">{showNewCategory ? '\u2715' : '+'}</span>
            <span className="category-pill-label">New</span>
          </button>
        </div>

        {showNewCategory && (
          <div className="new-category-form">
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Category name"
              className="new-cat-input"
              maxLength={20}
            />

            <div className="picker-row">
              <span className="picker-label">Icon</span>
              <div className="icon-picker">
                {CUSTOM_ICON_OPTIONS.map((icon) => (
                  <button
                    key={icon}
                    className={`icon-option ${newCatIcon === icon ? 'active' : ''}`}
                    onClick={() => setNewCatIcon(icon)}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="picker-row">
              <span className="picker-label">Color</span>
              <div className="color-picker">
                {CUSTOM_COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    className={`color-option ${newCatColor === color ? 'active' : ''}`}
                    style={{ background: color }}
                    onClick={() => setNewCatColor(color)}
                  />
                ))}
              </div>
            </div>

            <button
              className="btn btn-primary"
              style={{ marginTop: 8, padding: '10px 14px', fontSize: 14 }}
              disabled={!newCatName.trim()}
              onClick={handleAddCategory}
            >
              Add Category
            </button>
          </div>
        )}
      </div>

      <div className="create-section">
        <label className="create-section-label">Priority (optional — AI will guess)</label>
        <div className="priority-selector">
          {PRIORITIES.map((p) => (
            <button
              key={p.value}
              className={`priority-option ${priority === p.value ? 'active' : ''}`}
              style={{ '--priority-color': p.color }}
              onClick={() => setPriority(priority === p.value ? null : p.value)}
            >
              <span className="priority-dot-lg" style={{ background: p.color }} />
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="create-section">
        <label className="create-section-label">When (optional — AI will parse from text)</label>
        <input
          type="datetime-local"
          value={dateTime}
          onChange={(e) => setDateTime(e.target.value)}
          min={getMinDateTime()}
          className="datetime-input"
        />
      </div>

      {(category || priority || dateTime) && (
        <div className="create-preview">
          {selectedCat && (
            <span className="preview-tag" style={{ background: selectedCat.color + '18', color: selectedCat.color }}>
              {selectedCat.icon} {selectedCat.label}
            </span>
          )}
          {priority && (
            <span
              className="preview-tag"
              style={{
                background: PRIORITIES.find((p) => p.value === priority).color + '18',
                color: PRIORITIES.find((p) => p.value === priority).color,
              }}
            >
              {priority.charAt(0).toUpperCase() + priority.slice(1)} priority
            </span>
          )}
          {dateTime && (
            <span className="preview-tag" style={{ background: 'var(--primary-bg)', color: 'var(--primary)' }}>
              {new Date(dateTime).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>
      )}

      {success && (
        <div className="toast success">
          <span className="toast-message">Reminder created!</span>
          <button className="toast-close" onClick={() => setSuccess(false)}>&times;</button>
        </div>
      )}

      {error && (
        <div className="toast error">
          <span className="toast-message">{error}</span>
          <button className="toast-close" onClick={() => setError(null)}>&times;</button>
        </div>
      )}

      <div style={{ padding: '0 16px', marginTop: 'auto' }}>
        <button
          className="btn btn-primary"
          disabled={!text.trim() || sending}
          onClick={handleSend}
        >
          {sending ? (
            <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> AI is creating...</>
          ) : (
            <>{'\u2728'} Create Reminder</>
          )}
        </button>
      </div>
    </div>
  )
}
