import { create } from 'zustand'
import * as api from '../api/categories'

const useCategoryStore = create((set, get) => ({
  categories: [],
  loading: false,

  fetchCategories: async () => {
    set({ loading: true })
    try {
      const categories = await api.fetchCategories()
      set({ categories, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  addCategory: async (category) => {
    const created = await api.createCategory(category)
    set((s) => ({ categories: [...s.categories, created] }))
    return created
  },

  deleteCategory: async (id) => {
    await api.deleteCategory(id)
    set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }))
  },

  // Helper to get all categories as the old format
  getAllCategories: () => {
    return get().categories.map((c) => ({
      value: c.value,
      label: c.label,
      icon: c.icon,
      color: c.color,
      id: c.id,
      isDefault: c.is_default,
    }))
  },
}))

export default useCategoryStore
