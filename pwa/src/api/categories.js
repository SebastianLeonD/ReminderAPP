import { supabase } from '../lib/supabase'

export async function fetchCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}

export async function createCategory(category) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('categories')
    .insert({
      user_id: user.id,
      value: category.value,
      label: category.label,
      icon: category.icon,
      color: category.color,
      is_default: false,
      sort_order: category.sort_order || 100,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteCategory(id) {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}
