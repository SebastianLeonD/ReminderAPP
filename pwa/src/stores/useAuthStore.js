import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const useAuthStore = create((set) => ({
  user: null,
  session: null,
  loading: true,
  error: null,

  initialize: () => {
    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ session, user: session?.user ?? null, loading: false })
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null, loading: false })
    })

    return () => subscription.unsubscribe()
  },

  signUp: async (email, password, displayName) => {
    set({ error: null })
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
      },
    })
    if (error) {
      set({ error: error.message })
      throw error
    }
    return data
  },

  signIn: async (email, password) => {
    set({ error: null })
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) {
      set({ error: error.message })
      throw error
    }
    return data
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      set({ error: error.message })
      throw error
    }
    set({ user: null, session: null })
  },

  clearError: () => set({ error: null }),
}))

export default useAuthStore
