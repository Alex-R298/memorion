import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { getVersesByCategoryId } from '../lib/supabaseQueries'

export default function PracticeScreen({ navigation, route }) {
  const { categoryId, categoryName } = route.params
  
  const [verses, setVerses] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0)
  const [selectedLetters, setSelectedLetters] = useState([])
  const [isFlipped, setIsFlipped] = useState(false)
  const [score, setScore] = useState({ correct: 0, incorrect: 0 })

  // Verse laden
  useEffect(() => {
    loadVerses()
  }, [])

  const loadVerses = async () => {
    setLoading(true)
    const data = await getVersesByCategoryId(categoryId)
    setVerses(data)
    setLoading(false)
  }

  // Loading State
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Lade Verse...</Text>
      </View>
    )
  }

  // Keine Verse gefunden
  if (verses.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Keine Verse in dieser Kategorie gefunden.</Text>
        <Pressable style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Zurück</Text>
        </Pressable>
      </View>
    )
  }

  const currentVerse = verses[currentVerseIndex]
  // ... REST BLEIBT GLEICH
  const words = currentVerse.text.split(' ')
  const hiddenWord = words[currentVerse.hiddenWordIndex].replace(/[.,!?]/g, '')
  
  // Erstelle Text mit Lücke
  const textWithGap = words.map((word, index) => 
    index === currentVerse.hiddenWordIndex ? '______' : word
  ).join(' ')

  // Buchstaben mischen
  const shuffleArray = (array) => {
    return array.sort(() => Math.random() - 0.5)
  }

  const getLetterButtons = () => {
    const letters = hiddenWord.split('')
    const extraLetters = ['a', 'e', 'i', 'n', 's', 't', 'r', 'h']
    const allLetters = [...letters, ...extraLetters.slice(0, Math.min(5, letters.length))]
    return shuffleArray(allLetters)
  }

  const [availableLetters] = useState(getLetterButtons())

  const handleLetterPress = (letter, index) => {
    setSelectedLetters([...selectedLetters, { letter, index }])
  }

  const handleRemoveLetter = (indexToRemove) => {
    setSelectedLetters(selectedLetters.filter((_, i) => i !== indexToRemove))
  }

  const flipCard = () => {
    setIsFlipped(true)
  }

  const handleKnew = () => {
    setScore({ ...score, correct: score.correct + 1 })
    nextVerse()
  }

  const handleDidntKnow = () => {
    setScore({ ...score, incorrect: score.incorrect + 1 })
    nextVerse()
  }

  const nextVerse = () => {
    if (currentVerseIndex < verses.length - 1) {
      setCurrentVerseIndex(currentVerseIndex + 1)
      setSelectedLetters([])
      setIsFlipped(false)
    } else {
      // Alle Verse fertig
      const total = score.correct + score.incorrect + 1
      const percentage = Math.round(((score.correct + (isFlipped ? 1 : 0)) / total) * 100)
      alert(`Fertig!\n\nGewusst: ${score.correct + (isFlipped ? 1 : 0)}\nNicht gewusst: ${score.incorrect + (isFlipped ? 0 : 1)}\n\nGenauigkeit: ${percentage}%`)
      navigation.goBack()
    }
  }

  const usedIndices = selectedLetters.map(l => l.index)
  const userAnswer = selectedLetters.map(l => l.letter).join('')

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.reference}>{currentVerse.reference}</Text>
          <Text style={styles.progress}>
            {currentVerseIndex + 1} / {verses.length}
          </Text>
        </View>

        {/* Score */}
        <View style={styles.scoreContainer}>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>✅ Gewusst</Text>
            <Text style={styles.scoreNumber}>{score.correct}</Text>
          </View>
          <View style={styles.scoreDivider} />
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>❌ Nicht gewusst</Text>
            <Text style={styles.scoreNumber}>{score.incorrect}</Text>
          </View>
        </View>

        {/* Card - Vorderseite */}
        {!isFlipped && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Vervollständige den Vers:</Text>
              <Text style={styles.verseText}>{textWithGap}</Text>
            </View>

            {/* Ausgewählte Buchstaben */}
            <View style={styles.answerContainer}>
              <Text style={styles.label}>Deine Antwort:</Text>
              <View style={styles.selectedLettersContainer}>
                {selectedLetters.map((item, index) => (
                  <Pressable
                    key={index}
                    style={styles.selectedLetter}
                    onPress={() => handleRemoveLetter(index)}
                  >
                    <Text style={styles.selectedLetterText}>{item.letter}</Text>
                  </Pressable>
                ))}
                {selectedLetters.length === 0 && (
                  <Text style={styles.placeholder}>Tippe auf Buchstaben...</Text>
                )}
              </View>
            </View>

            {/* Buchstaben-Buttons */}
            <View style={styles.lettersContainer}>
              <Text style={styles.label}>Verfügbare Buchstaben:</Text>
              <View style={styles.lettersGrid}>
                {availableLetters.map((letter, index) => (
                  <Pressable
                    key={index}
                    style={[
                      styles.letterButton,
                      usedIndices.includes(index) && styles.letterButtonUsed
                    ]}
                    onPress={() => !usedIndices.includes(index) && handleLetterPress(letter, index)}
                    disabled={usedIndices.includes(index)}
                  >
                    <Text style={[
                      styles.letterButtonText,
                      usedIndices.includes(index) && styles.letterButtonTextUsed
                    ]}>
                      {letter}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Flip Button */}
            <Pressable 
              style={styles.flipButton}
              onPress={flipCard}
            >
              <Text style={styles.flipButtonText}>🔄 Karte umdrehen</Text>
            </Pressable>
          </>
        )}

        {/* Card - Rückseite (nach Flip) */}
        {isFlipped && (
          <>
            <View style={[styles.card, styles.cardFlipped]}>
              <Text style={styles.cardLabel}>Deine Antwort:</Text>
              <View style={styles.userAnswerBox}>
                <Text style={styles.userAnswerText}>
                  {userAnswer || '(keine Antwort)'}
                </Text>
              </View>

              <View style={styles.divider} />

              <Text style={styles.cardLabel}>Kompletter Vers:</Text>
              <Text style={styles.fullVerseText}>{currentVerse.text}</Text>

              <View style={styles.correctAnswerBox}>
                <Text style={styles.correctAnswerLabel}>Gesuchtes Wort:</Text>
                <Text style={styles.correctAnswerText}>{hiddenWord}</Text>
              </View>
            </View>

            {/* Selbst-Bewertung */}
            <View style={styles.judgementContainer}>
              <Text style={styles.judgementTitle}>Hast du es gewusst?</Text>
              
              <Pressable 
                style={[styles.button, styles.incorrectButton]}
                onPress={handleDidntKnow}
              >
                <Text style={styles.buttonText}>❌ Nicht gewusst</Text>
              </Pressable>

              <Pressable 
                style={[styles.button, styles.correctButton]}
                onPress={handleKnew}
              >
                <Text style={styles.buttonText}>✅ Gewusst!</Text>
              </Pressable>
            </View>
          </>
        )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  reference: {
    fontSize: 18,
    fontWeight: '600',
    color: '#37352F',
  },
  progress: {
    fontSize: 16,
    color: '#9B9A97',
  },
  scoreContainer: {
    flexDirection: 'row',
    backgroundColor: '#F7F6F3',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  scoreItem: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#9B9A97',
    marginBottom: 4,
  },
  scoreNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#37352F',
  },
  scoreDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E3E2E0',
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#E3E2E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardFlipped: {
    backgroundColor: '#F7F6F3',
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9B9A97',
    marginBottom: 12,
  },
  verseText: {
    fontSize: 18,
    lineHeight: 28,
    color: '#37352F',
  },
  fullVerseText: {
    fontSize: 18,
    lineHeight: 28,
    color: '#37352F',
    marginBottom: 16,
  },
  userAnswerBox: {
    backgroundColor: '#E8F4FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  userAnswerText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#E3E2E0',
    marginVertical: 16,
  },
  correctAnswerBox: {
    backgroundColor: '#D1F4E0',
    padding: 12,
    borderRadius: 8,
  },
  correctAnswerLabel: {
    fontSize: 12,
    color: '#00A86B',
    marginBottom: 4,
  },
  correctAnswerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00A86B',
    textAlign: 'center',
  },
  answerContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9B9A97',
    marginBottom: 8,
  },
  selectedLettersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    minHeight: 50,
    backgroundColor: '#F7F6F3',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E3E2E0',
  },
  selectedLetter: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedLetterText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    color: '#9B9A97',
    fontSize: 16,
  },
  lettersContainer: {
    marginBottom: 24,
  },
  lettersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  letterButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 50,
    alignItems: 'center',
  },
  letterButtonUsed: {
    backgroundColor: '#E3E2E0',
  },
  letterButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  letterButtonTextUsed: {
    color: '#9B9A97',
  },
  flipButton: {
    backgroundColor: '#5856D6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  flipButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  judgementContainer: {
    gap: 12,
  },
  judgementTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#37352F',
    textAlign: 'center',
    marginBottom: 8,
  },
  button: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  correctButton: {
    backgroundColor: '#34C759',
  },
  incorrectButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#9B9A97',
    marginBottom: 24,
    textAlign: 'center',
  },
})