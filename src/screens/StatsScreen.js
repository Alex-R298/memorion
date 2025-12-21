import { Pressable, StyleSheet, Text, View } from 'react-native'

export default function StatsScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Statistics</Text>
      <Text style={styles.stat}>🔥 Current Streak: 0 days</Text>
      <Text style={styles.stat}>📊 Verses Mastered: 0</Text>
      <Text style={styles.stat}>⭐ Total Score: 0</Text>
      
      <Pressable 
        style={styles.button}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.buttonText}>Back</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontFamily: 'Inter-Bold',  // ← Deine lokale Font
    fontSize: 48,
    color: '#333',
    marginBottom: 32,
  },
  stat: {
    fontFamily: 'Inter-Regular',  // ← Deine lokale Font
    fontSize: 20,
    color: '#666',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 32,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
})