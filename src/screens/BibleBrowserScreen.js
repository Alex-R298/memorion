import { Feather } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { useMemo, useState } from 'react'
import {
    Alert,
    Dimensions,
    FlatList,
    Platform,
    Pressable,
    StatusBar,
    StyleSheet, Text,
    TextInput,
    View
} from 'react-native'
import { supabase } from '../lib/supabase'
// import { getUserId } from '../lib/userSession'

// Pfad zu deiner Datei
import bibleData from '../../assets/luther_1912.json'

const { width, height } = Dimensions.get('window')

// FARBPALETTE (Konsistent mit Home/Practice)
const COLORS = {
  bgGradient: ['#F2EDE4', '#EBE5CE', '#D4C4B0'], 
  text: { primary: '#2C2420', secondary: '#6B5D52', tertiary: '#9B8B7E' },
  accent: { primary: '#C97848', secondary: '#8B7355' },
  glassBorder: 'rgba(255, 255, 255, 0.6)',
}

// --- BACKGROUND: Warm + Liquid Blur ---
const WarmLiquidBackground = () => {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
       <LinearGradient
          colors={COLORS.bgGradient}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
       <View style={{
          position: 'absolute', top: -height * 0.2, right: -width * 0.3,
          width: width * 1.5, height: width * 1.5, borderRadius: width * 0.75,
          backgroundColor: '#FFFFFF', opacity: 0.6,
       }} />
       <View style={{
          position: 'absolute', bottom: -height * 0.1, left: -width * 0.2,
          width: width * 1.2, height: width * 1.2, borderRadius: width * 0.6,
          backgroundColor: '#C97848', opacity: 0.15,
       }} />
       <View style={{...StyleSheet.absoluteFillObject, opacity: 0.03, backgroundColor: 'black'}} />
       {Platform.OS === 'ios' ? (
           <BlurView intensity={50} style={StyleSheet.absoluteFill} tint="light" />
       ) : (
           <View style={{...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.3)'}} />
       )}
    </View>
  );
};

// Buchnamen einmalig laden
const ALL_BOOK_NAMES = [...new Set(bibleData.verses.map(v => v.book_name))];

export default function BibleBrowserScreen({ navigation }) {
  const [searchText, setSearchText] = useState('')

  const filteredVerses = useMemo(() => {
    if (!searchText || searchText.trim().length < 2) return [] 

    const rawSearch = searchText.toLowerCase().trim()
    const cleanSearch = rawSearch.replace('.', '') 

    const matchingBookName = ALL_BOOK_NAMES.find(name => {
        const n = name.toLowerCase().replace('.', '')
        return n.startsWith(cleanSearch)
    })

    const results = []
    const allVerses = bibleData.verses
    const LIMIT = 50

    if (matchingBookName) {
        // BUCH-SUCHE
        for (let i = 0; i < allVerses.length; i++) {
            const v = allVerses[i]
            const bookLower = v.book_name.toLowerCase().replace('.', '')
            
            if (bookLower.startsWith(cleanSearch)) {
                if (cleanSearch.includes(' ')) {
                     const ref = `${bookLower} ${v.chapter}`
                     if (ref.startsWith(cleanSearch) || `${ref}:${v.verse}`.startsWith(cleanSearch)) {
                         results.push(v)
                     }
                } else {
                    results.push(v)
                }
            }
            if (results.length >= LIMIT) break
        }
    } else {
        // TEXT-SUCHE
        for (let i = 0; i < allVerses.length; i++) {
            const v = allVerses[i]
            if (v.text.toLowerCase().includes(rawSearch)) {
                results.push(v)
            }
            if (results.length >= LIMIT) break
        }
    }
    return results
  }, [searchText])

  const addToPractice = async (item) => {
    const reference = `${item.book_name} ${item.chapter}:${item.verse}`
    
    Alert.alert(
      "Vers lernen?",
      `Möchtest du "${reference}" hinzufügen?`,
      [
        { text: "Abbrechen", style: "cancel" },
        { 
          text: "Ja, speichern", 
          onPress: async () => {
             const userId = await getUserId();
             const { data: cats } = await supabase.from('categories').select('id').limit(1)
             
             const words = item.text.split(' ')
             let hiddenIndex = 0
             if (words.length > 2) {
                hiddenIndex = Math.floor(Math.random() * (words.length - 2)) + 1
             }

             const { error } = await supabase.from('verses').insert({
               user_id: userId,
               category_id: cats?.[0]?.id,
               reference: reference,
               text: item.text,
               book: item.book_name,
               chapter: item.chapter,
               verse_number: item.verse,
               hidden_word_index: hiddenIndex,
               translation: 'Luther 1912'
             })

             if (!error) {
               Alert.alert("Gespeichert!", "Vers wurde hinzugefügt.")
             } else {
               Alert.alert("Fehler", error.message)
             }
          }
        }
      ]
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <WarmLiquidBackground />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                <BlurView intensity={80} tint="light" style={styles.iconBlur}>
                    <Feather name="arrow-left" size={24} color={COLORS.text.primary} />
                </BlurView>
            </Pressable>
            <Text style={styles.title}>BIBEL BROWSER</Text>
            <View style={{width: 44}} />
        </View>

        {/* Suchfeld mit Glas-Effekt */}
        <BlurView intensity={80} tint="light" style={styles.searchBoxBlur}>
           <Feather name="search" size={20} color={COLORS.text.tertiary} style={{marginRight: 10}} />
           <TextInput 
             style={styles.input}
             placeholder="Suche (z.B. 'Joh' oder 'Liebe')"
             placeholderTextColor={COLORS.text.tertiary}
             value={searchText}
             onChangeText={setSearchText}
             autoCorrect={false}
           />
           {searchText.length > 0 && (
             <Pressable onPress={() => setSearchText('')}>
               <Feather name="x" size={20} color={COLORS.text.secondary} />
             </Pressable>
           )}
        </BlurView>
      </View>

      <FlatList
        data={filteredVerses}
        keyExtractor={(item, index) => `${item.book_name}-${item.chapter}-${item.verse}-${index}`}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={15}
        
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="book-open" size={40} color={COLORS.accent.secondary} style={{marginBottom: 16, opacity: 0.5}} />
            <Text style={styles.emptyText}>
              {searchText.trim().length < 2 
                ? "Suche einen Vers..." 
                : "Keine Verse gefunden."}
            </Text>
            <Text style={styles.emptySub}>
               Tipp: "Joh" findet Johannes.{"\n"}
               "Liebe" findet Verse mit dem Wort Liebe.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable 
            style={({pressed}) => [styles.cardContainer, pressed && styles.pressed]}
            onPress={() => addToPractice(item)}
          >
            <BlurView intensity={80} tint="light" style={styles.verseCard}>
                <View style={styles.verseHeader}>
                  <Text style={styles.verseRef}>
                    {item.book_name} {item.chapter}:{item.verse}
                  </Text>
                  <View style={styles.addIcon}>
                      <Feather name="plus" size={18} color="#FFF" />
                  </View>
                </View>
                <Text style={styles.verseText}>{item.text}</Text>
            </BlurView>
          </Pressable>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#D4C4B0' },
  
  header: {
    paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  
  backButton: { width: 44, height: 44, borderRadius: 14, overflow: 'hidden' },
  iconBlur: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.4)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)'
  },
  
  title: { fontFamily: 'CrimsonPro-Bold', fontSize: 16, color: COLORS.text.primary, letterSpacing: 1 },
  
  searchBoxBlur: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 16, paddingHorizontal: 16, height: 50,
    borderWidth: 1, borderColor: COLORS.glassBorder, overflow: 'hidden'
  },
  input: { flex: 1, fontFamily: 'CrimsonPro-Medium', fontSize: 16, color: COLORS.text.primary, height: '100%' },
  
  // CARD STYLING
  cardContainer: {
      marginBottom: 12, borderRadius: 20, overflow: 'hidden',
      shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8
  },
  verseCard: {
    padding: 20, backgroundColor: 'rgba(255,255,255,0.4)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)'
  },
  verseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  verseRef: { fontFamily: 'CrimsonPro-Bold', fontSize: 16, color: COLORS.text.primary },
  
  addIcon: {
      width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.accent.primary,
      justifyContent: 'center', alignItems: 'center'
  },
  
  verseText: { fontFamily: 'CrimsonPro-Regular', fontSize: 16, color: COLORS.text.secondary, lineHeight: 24 },
  
  emptyState: { marginTop: 100, alignItems: 'center' },
  emptyText: { fontFamily: 'CrimsonPro-Bold', color: COLORS.text.primary, fontSize: 18, marginBottom: 8 },
  emptySub: { fontFamily: 'CrimsonPro-Regular', color: COLORS.text.tertiary, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  
  pressed: { opacity: 0.9, transform: [{scale: 0.99}] }
})