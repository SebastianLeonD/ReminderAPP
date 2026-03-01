import { useState, useEffect } from 'react'
import usePlannerStore from '../stores/usePlannerStore'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const PRESETS = [
  { label: 'School 8-4 Weekdays', name: 'School', startTime: '08:00', endTime: '16:00', days: [1, 2, 3, 4, 5] },
  { label: 'Work 9-5 Weekdays', name: 'Work', startTime: '09:00', endTime: '17:00', days: [1, 2, 3, 4, 5] },
  { label: 'Sleep 10pm-7am Daily', name: 'Sleep', startTime: '22:00', endTime: '07:00', days: [0, 1, 2, 3, 4, 5, 6] },
]

export default function SchedulePage() {
  const { scheduleBlocks, loading, fetchSchedule, addBlock, removeBlock, applyPreset } = usePlannerStore()
  const [selectedDay, setSelectedDay] = useState(new Date().getDay())
  const [showForm, setShowForm] = useState(false)
  const [blockName, setBlockName] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')

  useEffect(() => {
    fetchSchedule(selectedDay)
  }, [selectedDay, fetchSchedule])

  const handleAdd = async () => {
    if (!blockName.trim()) return
    await addBlock({
      dayOfWeek: selectedDay,
      name: blockName.trim(),
      startTime,
      endTime,
    })
    setBlockName('')
    setShowForm(false)
  }

  const handlePreset = async (preset) => {
    await applyPreset(preset)
    fetchSchedule(selectedDay)
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>My Schedule</h1>
      </div>

      <div className="page-content">
        {/* Day tabs */}
        <div className="schedule-day-tabs">
          {DAYS.map((day, i) => (
            <button
              key={day}
              className={`schedule-day-tab ${selectedDay === i ? 'active' : ''}`}
              onClick={() => setSelectedDay(i)}
            >
              {day}
            </button>
          ))}
        </div>

        <div className="schedule-day-label">{FULL_DAYS[selectedDay]}</div>

        {/* Blocks list */}
        {loading ? (
          <div className="loading"><div className="spinner" /> Loading...</div>
        ) : scheduleBlocks.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <h3>No blocks set</h3>
            <p>Add time blocks for {FULL_DAYS[selectedDay]}</p>
          </div>
        ) : (
          <div className="schedule-blocks">
            {scheduleBlocks.map((block) => (
              <div key={block.id} className="schedule-block-card">
                <div className="schedule-block-info">
                  <span className="schedule-block-time">
                    {block.start_time?.slice(0, 5)} - {block.end_time?.slice(0, 5)}
                  </span>
                  <span className="schedule-block-name">{block.block_name}</span>
                </div>
                <button
                  className="schedule-block-delete"
                  onClick={() => removeBlock(block.id)}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add block form */}
        {showForm ? (
          <div className="schedule-form">
            <input
              type="text"
              value={blockName}
              onChange={(e) => setBlockName(e.target.value)}
              placeholder="Block name (e.g. School, Work)"
              className="new-cat-input"
              maxLength={30}
            />
            <div className="schedule-time-row">
              <div className="schedule-time-field">
                <label>Start</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="schedule-time-field">
                <label>End</label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={handleAdd} disabled={!blockName.trim()} style={{ flex: 1 }}>
                Add Block
              </button>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)} style={{ flex: 0, padding: '12px 20px' }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding: '12px 0' }}>
            <button className="btn btn-ghost" onClick={() => setShowForm(true)}>
              + Add Time Block
            </button>
          </div>
        )}

        {/* Quick presets */}
        <div className="schedule-presets">
          <label className="create-section-label">Quick Presets</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                className="btn btn-ghost"
                style={{ textAlign: 'left', justifyContent: 'flex-start', fontSize: 14 }}
                onClick={() => handlePreset(preset)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
