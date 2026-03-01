import { create } from 'zustand'
import * as api from '../api/reminders'

const startOfDay = (date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

const useReminderStore = create((set, get) => ({
  reminders: [],
  isLoading: false,
  error: null,
  selectedCategory: null,
  selectedPriority: null,
  showCompletedOnly: false,
  searchQuery: '',

  // Computed-style getters
  getFiltered: () => {
    const { reminders, selectedCategory, selectedPriority, showCompletedOnly, searchQuery } = get()
    return reminders.filter((r) => {
      if (selectedCategory && r.category !== selectedCategory) return false
      if (selectedPriority && r.priority !== selectedPriority) return false
      if (showCompletedOnly && !r.sent) return false
      if (!showCompletedOnly && r.sent) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!r.title.toLowerCase().includes(q) && !r.description.toLowerCase().includes(q)) return false
      }
      return true
    })
  },

  getTodaysReminders: () => {
    const now = new Date()
    const tomorrow = new Date(startOfDay(now))
    tomorrow.setDate(tomorrow.getDate() + 1)
    return get().getFiltered().filter((r) => r.eventTime >= now && r.eventTime < tomorrow && !r.sent)
  },

  getOverdueReminders: () => {
    const now = new Date()
    return get().getFiltered().filter((r) => r.eventTime < now && !r.sent)
  },

  getUpcomingReminders: () => {
    const tomorrow = new Date(startOfDay(new Date()))
    tomorrow.setDate(tomorrow.getDate() + 1)
    return get().getFiltered().filter((r) => r.eventTime >= tomorrow && !r.sent)
  },

  // Actions
  fetchReminders: async () => {
    set({ isLoading: true, error: null })
    try {
      const reminders = await api.fetchReminders()
      set({ reminders: reminders.sort((a, b) => a.eventTime - b.eventTime), isLoading: false })
    } catch (err) {
      set({ isLoading: false, error: err.message })
    }
  },

  deleteReminder: async (id) => {
    set((s) => ({ reminders: s.reminders.filter((r) => r.id !== id) }))
    try {
      await api.deleteReminder(id)
    } catch {
      // API unavailable - keep local change
    }
  },

  markComplete: async (id) => {
    set((s) => ({
      reminders: s.reminders.map((r) => (r.id === id ? { ...r, sent: true } : r)),
    }))
    if (navigator.vibrate) navigator.vibrate(50)
    try {
      await api.markComplete(id)
    } catch {
      // API unavailable - keep local change
    }
  },

  updateReminder: async (id, updates) => {
    try {
      await api.updateReminder(id, updates)
      await get().fetchReminders()
    } catch (err) {
      set({ error: err.message })
    }
  },

  createReminder: async (data) => {
    try {
      await api.createReminder(data)
      await get().fetchReminders()
    } catch (err) {
      throw err
    }
  },

  setCategory: (category) => set({ selectedCategory: category }),
  setPriority: (priority) => set({ selectedPriority: priority }),
  setShowCompleted: (show) => set({ showCompletedOnly: show }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  clearError: () => set({ error: null }),
}))

export default useReminderStore
