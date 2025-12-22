import { supabase } from './supabase'

// 1. Kategorien holen (bleibt)
export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true })
  
  if (error) return []
  return data
}

// 2. Verse nach Kategorie (bleibt)
export async function getVersesByCategoryId(categoryId) {
  const { data, error } = await supabase
    .from('verses')
    .select('*')
    .eq('category_id', categoryId)
  
  if (error) return []
  return data
}

// --- NEU: 3. Alle Verse holen (Dein Haupt-Lern-Stapel) ---
export async function getAllVerses() {
  const { data, error } = await supabase
    .from('verses')
    .select('*')
    // Neueste zuerst? Oder zufällig? Wir mischen später im Frontend.
  
  if (error) {
    console.log('Error fetching all verses:', error)
    return []
  }
  return data
}