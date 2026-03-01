import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useReminderStore from '../stores/useReminderStore'
import useAuthStore from '../stores/useAuthStore'
import useCategoryStore from '../stores/useCategoryStore'
import { supabase } from '../lib/supabase'
import { isPushSupported, getSubscriptionStatus, subscribeToPush, unsubscribeFromPush } from '../utils/pushSubscription'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuthStore()
  const { categories, fetchCategories, deleteCategory } = useCategoryStore()
  const { reminders } = useReminderStore()
  const pendingCount = reminders.filter((r) => !r.sent).length

  // Profile state
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [timezone, setTimezone] = useState('America/New_York')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  // Push notification state
  const [pushSupported, setPushSupported] = useState(false)
  const [pushSubscribed, setPushSubscribed] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [pushError, setPushError] = useState(null)
  const [remindNowSending, setRemindNowSending] = useState(false)
  const [remindNowDone, setRemindNowDone] = useState(false)

  useEffect(() => {
    setPushSupported(isPushSupported())
    getSubscriptionStatus().then((sub) => setPushSubscribed(!!sub))

    if (categories.length === 0) fetchCategories()

    // Load profile
    if (user) {
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setDisplayName(data.display_name || '')
            setEmail(data.email || user.email || '')
            setTimezone(data.timezone || 'America/New_York')
          }
        })
    }
  }, [user, categories.length, fetchCategories])

  const handleSaveProfile = async () => {
    if (!user) return
    setProfileSaving(true)
    await supabase
      .from('profiles')
      .update({ display_name: displayName, timezone })
      .eq('id', user.id)
    setProfileSaving(false)
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2000)
  }

  const handleTogglePush = async () => {
    setPushLoading(true)
    setPushError(null)
    try {
      if (pushSubscribed) {
        await unsubscribeFromPush()
        setPushSubscribed(false)
      } else {
        await subscribeToPush()
        setPushSubscribed(true)
      }
    } catch (err) {
      setPushError(err.message)
    } finally {
      setPushLoading(false)
    }
  }

  const handleRemindMeNow = async () => {
    setRemindNowSending(true)
    setRemindNowDone(false)

    if (Notification.permission === 'default') {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        setPushError('Notification permission denied')
        setRemindNowSending(false)
        return
      }
    }
    if (Notification.permission !== 'granted') {
      setPushError('Notifications are blocked. Enable them in browser settings.')
      setRemindNowSending(false)
      return
    }

    const pending = reminders.filter((r) => !r.sent)
    if (pending.length === 0) {
      setPushError('No pending reminders to send')
      setRemindNowSending(false)
      return
    }

    const registration = await navigator.serviceWorker?.ready
    for (const r of pending) {
      const timeStr = r.eventTime.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
      const opts = {
        body: `${r.description || r.title}\n${timeStr}`,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: `remind-now-${r.id}`,
        vibrate: [200, 100, 200],
      }
      if (registration) {
        registration.showNotification(`⏰ ${r.title}`, opts)
      } else {
        new Notification(`⏰ ${r.title}`, opts)
      }
    }

    setRemindNowSending(false)
    setRemindNowDone(true)
    setTimeout(() => setRemindNowDone(false), 3000)
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  const handleDeleteCategory = async (cat) => {
    if (cat.is_default) return
    await deleteCategory(cat.id)
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      <div className="page-content">
        {/* Profile Section */}
        <div className="settings-section">
          <h3>Profile</h3>
          <div className="settings-group">
            <div className="settings-field">
              <label>Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="settings-field">
              <label>Email</label>
              <div style={{ fontSize: 15, color: 'var(--text-muted)', padding: '10px 0' }}>{email}</div>
            </div>
            <div className="settings-field">
              <label>Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="settings-select"
              >
                <option value="America/New_York">Eastern (New York)</option>
                <option value="America/Chicago">Central (Chicago)</option>
                <option value="America/Denver">Mountain (Denver)</option>
                <option value="America/Los_Angeles">Pacific (Los Angeles)</option>
                <option value="Europe/London">London</option>
                <option value="Europe/Paris">Paris</option>
                <option value="Asia/Tokyo">Tokyo</option>
              </select>
            </div>
          </div>
          <div style={{ padding: '12px 0 0' }}>
            <button className="btn btn-primary" onClick={handleSaveProfile} disabled={profileSaving}>
              {profileSaving ? 'Saving...' : profileSaved ? 'Saved!' : 'Save Profile'}
            </button>
          </div>
        </div>

        {/* Schedule link */}
        <div className="settings-section">
          <h3>Schedule</h3>
          <div className="settings-group">
            <div className="settings-field" style={{ cursor: 'pointer' }} onClick={() => navigate('/schedule')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>My Weekly Schedule</span>
                <span style={{ color: 'var(--text-muted)' }}>&#8250;</span>
              </div>
            </div>
          </div>
        </div>

        {/* Categories Section */}
        <div className="settings-section">
          <h3>Categories</h3>
          <div className="settings-group">
            {categories.map((cat) => (
              <div key={cat.id} className="settings-field" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{cat.icon}</span>
                  <span style={{ fontSize: 15, fontWeight: 500 }}>{cat.label}</span>
                  {cat.is_default && <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-input)', padding: '2px 6px', borderRadius: 4 }}>Default</span>}
                </span>
                {!cat.is_default && (
                  <button
                    className="btn-sm btn-danger"
                    onClick={() => handleDeleteCategory(cat)}
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Notifications Section */}
        <div className="settings-section">
          <h3>Notifications</h3>
          <div className="settings-group">
            <div className="settings-field">
              <div className="push-row">
                <div className="push-info">
                  <label>Push Notifications</label>
                  <div className="push-status">
                    <span className={`status-dot ${pushSubscribed ? 'active' : ''}`} />
                    <span className="status-text">
                      {!pushSupported
                        ? 'Not supported — install app to home screen'
                        : pushSubscribed
                        ? 'Enabled'
                        : 'Disabled'}
                    </span>
                  </div>
                </div>
                {pushSupported && (
                  <button
                    className={`btn btn-sm ${pushSubscribed ? 'btn-danger' : 'btn-primary'}`}
                    onClick={handleTogglePush}
                    disabled={pushLoading}
                  >
                    {pushLoading ? '...' : pushSubscribed ? 'Disable' : 'Enable'}
                  </button>
                )}
              </div>
            </div>

            {pushError && (
              <div className="push-error">{pushError}</div>
            )}

            <div className="settings-field">
              <label>Test Notifications</label>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Send a notification for all {pendingCount} pending reminders.
              </div>
              <button
                className="btn btn-remind-now"
                onClick={handleRemindMeNow}
                disabled={remindNowSending || pendingCount === 0}
              >
                {remindNowSending
                  ? 'Sending...'
                  : remindNowDone
                  ? 'Sent!'
                  : `Remind Me Now (${pendingCount})`}
              </button>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="settings-section">
          <h3>About</h3>
          <div className="settings-group">
            <div className="settings-field">
              <label>Version</label>
              <div style={{ fontSize: 15, color: 'var(--text)', padding: '10px 0' }}>2.0.0</div>
            </div>
            <div className="settings-field">
              <label>Install as App</label>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', padding: '8px 0', lineHeight: 1.5 }}>
                Tap the share button in your browser and select "Add to Home Screen" to install this app.
              </div>
            </div>
          </div>
        </div>

        {/* Logout */}
        <div style={{ padding: '8px 0 40px' }}>
          <button className="btn btn-danger" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
