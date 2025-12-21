import { supabase } from './supabase'

// Alle Kategorien laden
export async function getCategories() {
  try {
    console.log('🔌 Fetching from Supabase...')
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name')

    if (error) {
      console.error('❌ Supabase error:', error)
      throw error
    }
    
    console.log('✅ Data received:', data)
    return data
  } catch (error) {
    console.error('❌ Error fetching categories:', error)
    return []
  }
}

// Verse einer Kategorie laden
export async function getVersesByCategory(categorySlug) {
  try {
    const { data, error } = await supabase
      .from('verses')
      .select(`
        *,
        category:categories(name, emoji)
      `)
      .eq('categories.slug', categorySlug)
      .order('reference')

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching verses:', error)
    return []
  }
}

// Alternative: Verse direkt per category_id
export async function getVersesByCategoryId(categoryId) {
  try {
    const { data, error } = await supabase
      .from('verses')
      .select('*')
      .eq('category_id', categoryId)
      .order('reference')

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching verses:', error)
    return []
  }
}