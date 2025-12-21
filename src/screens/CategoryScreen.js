import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { getCategories } from '../lib/supabaseQueries'

export default function CategoryScreen({ navigation }) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
  console.log('🔍 Loading categories...')
  setLoading(true)
  const data = await getCategories()
  console.log('📊 Categories received:', data)
  setCategories(data)
  setLoading(false)
}

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Lade Kategorien...</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Wähle eine Kategorie</Text>
        <Text style={styles.subtitle}>Übe Bibelverse nach Thema</Text>

        <View style={styles.categoryGrid}>
          {categories.map((category) => (
            <Pressable
              key={category.id}
              style={styles.categoryCard}
              onPress={() => navigation.navigate('Practice', { 
                categoryId: category.id,
                categoryName: category.name 
              })}
            >
              <Text style={styles.emoji}>{category.emoji}</Text>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryName}>{category.name}</Text>
                {category.description && (
                  <Text style={styles.categoryDescription}>{category.description}</Text>
                )}
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#9B9A97',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#37352F',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9B9A97',
    marginBottom: 32,
  },
  categoryGrid: {
    gap: 16,
  },
  categoryCard: {
    backgroundColor: '#F7F6F3',
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E3E2E0',
  },
  emoji: {
    fontSize: 32,
    marginRight: 16,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#37352F',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#9B9A97',
  },
})