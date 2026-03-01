import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const usePlannerStore = create((set, get) => ({
  scheduleBlocks: [],
  dayPlan: null,
  loading: false,
  error: null,

  // Schedule blocks
  fetchSchedule: async (dayOfWeek) => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('user_schedules')
      .select('*')
      .eq('day_of_week', dayOfWeek)
      .order('start_time')

    if (error) {
      set({ loading: false, error: error.message })
      return
    }
    set({ scheduleBlocks: data || [], loading: false })
  },

  addBlock: async (block) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('user_schedules')
      .insert({
        user_id: user.id,
        day_of_week: block.dayOfWeek,
        block_name: block.name,
        start_time: block.startTime,
        end_time: block.endTime,
        is_available: block.isAvailable || false,
      })
      .select()
      .single()

    if (error) {
      set({ error: error.message })
      return
    }
    set((s) => ({ scheduleBlocks: [...s.scheduleBlocks, data] }))
  },

  removeBlock: async (id) => {
    const { error } = await supabase
      .from('user_schedules')
      .delete()
      .eq('id', id)

    if (error) {
      set({ error: error.message })
      return
    }
    set((s) => ({ scheduleBlocks: s.scheduleBlocks.filter((b) => b.id !== id) }))
  },

  applyPreset: async (preset) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // preset: { name, startTime, endTime, days: [0-6] }
    const inserts = preset.days.map((day) => ({
      user_id: user.id,
      day_of_week: day,
      block_name: preset.name,
      start_time: preset.startTime,
      end_time: preset.endTime,
      is_available: false,
    }))

    const { error } = await supabase
      .from('user_schedules')
      .insert(inserts)

    if (error) {
      set({ error: error.message })
      return
    }

    // Refresh current day
    const currentDay = get().scheduleBlocks[0]?.day_of_week
    if (currentDay !== undefined) {
      await get().fetchSchedule(currentDay)
    }
  },

  // Day plans
  fetchDayPlan: async (date) => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('day_plans')
      .select('*')
      .eq('plan_date', date)
      .maybeSingle()

    if (error) {
      set({ loading: false, error: error.message })
      return
    }
    set({ dayPlan: data, loading: false })
  },

  generatePlan: async (date) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase.functions.invoke('generate-day-plan', {
        body: { date },
      })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      set({ dayPlan: data.plan, loading: false })
    } catch (err) {
      set({ loading: false, error: err.message })
    }
  },

  acceptPlan: async () => {
    const plan = get().dayPlan
    if (!plan) return

    const { error } = await supabase
      .from('day_plans')
      .update({ accepted: true })
      .eq('id', plan.id)

    if (error) {
      set({ error: error.message })
      return
    }
    set({ dayPlan: { ...plan, accepted: true } })
  },

  clearError: () => set({ error: null }),
}))

export default usePlannerStore
