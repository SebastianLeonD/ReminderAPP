import { supabase } from '../lib/supabase'

export async function fetchReminders(filters = {}) {
  let query = supabase
    .from('reminders')
    .select('*')
    .order('event_time', { ascending: true })

  if (filters.category) query = query.eq('category', filters.category)
  if (filters.priority) query = query.eq('priority', filters.priority)
  if (filters.completed !== undefined) query = query.eq('completed', filters.completed)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data || []).map(parseReminder)
}

export async function getReminder(id) {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return parseReminder(data)
}

export async function createReminder({ text, overrides = {} }) {
  const { data, error } = await supabase.functions.invoke('parse-reminder', {
    body: { text, overrides },
  })
  if (error) throw new Error(error.message || 'Failed to create reminder')
  if (data?.error) throw new Error(data.error)
  return data
}

export async function updateReminder(id, updates) {
  const dbUpdates = {}
  if (updates.title !== undefined) dbUpdates.title = updates.title
  if (updates.description !== undefined) dbUpdates.description = updates.description
  if (updates.category !== undefined) dbUpdates.category = updates.category
  if (updates.priority !== undefined) dbUpdates.priority = updates.priority
  if (updates.eventTime !== undefined) {
    dbUpdates.event_time = updates.eventTime instanceof Date
      ? updates.eventTime.toISOString()
      : updates.eventTime
  }
  if (updates.completed !== undefined) {
    dbUpdates.completed = updates.completed
    if (updates.completed) dbUpdates.completed_at = new Date().toISOString()
  }
  if (updates.estimated_minutes !== undefined) dbUpdates.estimated_minutes = updates.estimated_minutes
  if (updates.notify_before_minutes !== undefined) dbUpdates.notify_before_minutes = updates.notify_before_minutes

  const { error } = await supabase
    .from('reminders')
    .update(dbUpdates)
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function deleteReminder(id) {
  const { error } = await supabase
    .from('reminders')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function markComplete(id) {
  const { error } = await supabase
    .from('reminders')
    .update({ completed: true, completed_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

// Map snake_case DB columns to camelCase frontend fields
function parseReminder(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    category: row.category || 'personal',
    priority: row.priority || 'medium',
    eventTime: new Date(row.event_time),
    estimatedMinutes: row.estimated_minutes || 30,
    sent: row.completed || false,
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
    notifyBeforeMinutes: row.notify_before_minutes || 15,
    createdAt: new Date(row.created_at),
  }
}
