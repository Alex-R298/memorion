import { Feather } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { useCallback, useState } from 'react'
import { Dimensions, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native'
import { supabase } from '../lib/supabase'
// import { getUserId } from '../lib/userSession'

const { width } = Dimensions.get('window')

// EDLE WARM-TÖNE PALETTE (Identisch zum Home Screen)
const COLORS = {
  bg: { primary: '#D4C4B0', secondary: '#C9B8A8' },
  glass: { light: 'rgba(255,255,255,0.7)', medium: 'rgba(255,255,255,0.5)' },
  accent: { primary: '#C97848', secondary: '#8B7355', tertiary: '#A68B6F' },
  text: { primary: '#2C2420', secondary: '#6B5D52', tertiary: '#9B8B7E' }
}

export default function StatsScreen({ navigation }) {
  const [stats, setStats] = useState({
    totalVerses: 0,
    streak: 0,
    accuracy: 0
  })

  // Lädt die Daten jedes Mal neu, wenn man auf den Screen kommt
  useFocusEffect(
    useCallback(() => {
      fetchStats()
    }, [])
  )

  const fetchStats = async () => {
    try {
      const userId = await getUserId()

      // 1. Hole Anzahl der Verse
      const { count } = await supabase
        .from('verses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      // 2. Hole Streak Daten (falls vorhanden)
      const { data: userStats } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single()

      // 3. (Optional) Hole Lern-Logs für Genauigkeit (Hier Dummy-Logik, bis wir Logs speichern)
      // Wir simulieren hier eine hohe Genauigkeit für die Motivation ;)
      
      setStats({
        totalVerses: count || 0,
        streak: userStats?.current_streak || 0,
        accuracy: 85 // Später aus echten Daten berechnen
      })

    } catch (e) {
      console.log("Fehler beim Laden der Stats:", e)
    }
  }

  // Dummy Daten für das Diagramm (Aktivität letzte 7 Tage)
  // Das könnte man später aus einer 'practice_logs' Tabelle füllen
  const activityData = [0.2, 0.4, 0.8, 0.3, 1.0, 0.6, 0.2] 
  const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* HINTERGRUND (Gleich wie Home) */}
      <View style={styles.background}>
        <LinearGradient
          colors={['#D4C4B0', '#C9B8A8', '#BEA999', '#C9B8A8', '#D4C4B0']}
          locations={[0, 0.25, 0.5, 0.75, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.noiseOverlay} />
      </View>

      {/* HEADER */}
      <View style={styles.header}>
        <Pressable 
            style={({pressed}) => [styles.backButton, pressed && styles.pressed]}
            onPress={() => navigation.goBack()}
        >
            <BlurView intensity={80} tint="light" style={styles.iconBlur}>
                <Feather name="arrow-left" size={24} color={COLORS.text.primary} />
            </BlurView>
        </Pressable>
        <Text style={styles.headerTitle}>DEINE STATISTIK</Text>
        <View style={{width: 44}} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* --- HERO CARD (Total Verse) --- */}
        <View style={styles.heroCard}>
            <BlurView intensity={90} tint="light" style={styles.glassContainer}>
                <LinearGradient colors={['rgba(255,255,255,0.7)', 'rgba(255,255,255,0.3)']} style={StyleSheet.absoluteFill} />
                
                <View style={styles.heroContent}>
                    <View style={styles.heroHeader}>
                        <View style={styles.iconCircle}>
                             <Feather name="book" size={20} color={COLORS.accent.primary} />
                        </View>
                        <Text style={styles.heroLabel}>BIBELVERSE GESPEICHERT</Text>
                    </View>
                    
                    <Text style={styles.heroValue}>{stats.totalVerses}</Text>
                    
                    <View style={styles.badgeRow}>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>Top 10%</Text>
                        </View>
                        <Text style={styles.heroSub}>Weiter so, du baust einen Schatz auf.</Text>
                    </View>
                </View>
            </BlurView>
        </View>

        {/* --- GRID STATS (Streak & Score) --- */}
        <View style={styles.grid}>
            {/* Streak Card */}
            <View style={styles.statCard}>
                <BlurView intensity={80} tint="light" style={styles.glassContainer}>
                    <LinearGradient colors={['rgba(255,255,255,0.6)', 'rgba(255,255,255,0.2)']} style={StyleSheet.absoluteFill} />
                    <View style={styles.statContent}>
                        <View style={[styles.statIcon, {backgroundColor: 'rgba(201,120,72,0.15)'}]}>
                            <Feather name="zap" size={20} color={COLORS.accent.primary} />
                        </View>
                        <Text style={styles.statValue}>{stats.streak} <Text style={{fontSize: 16}}>Tage</Text></Text>
                        <Text style={styles.statLabel}>Aktueller Streak</Text>
                    </View>
                </BlurView>
            </View>

            {/* Score Card */}
            <View style={styles.statCard}>
                <BlurView intensity={80} tint="light" style={styles.glassContainer}>
                    <LinearGradient colors={['rgba(255,255,255,0.6)', 'rgba(255,255,255,0.2)']} style={StyleSheet.absoluteFill} />
                    <View style={styles.statContent}>
                         <View style={[styles.statIcon, {backgroundColor: 'rgba(139,115,85,0.15)'}]}>
                            <Feather name="target" size={20} color={COLORS.accent.secondary} />
                        </View>
                        <Text style={styles.statValue}>{stats.accuracy}%</Text>
                        <Text style={styles.statLabel}>Genauigkeit</Text>
                    </View>
                </BlurView>
            </View>
        </View>

        {/* --- ACTIVITY CHART --- */}
        <Text style={styles.sectionTitle}>AKTIVITÄT (WOCHE)</Text>
        <View style={styles.chartCard}>
             <BlurView intensity={80} tint="light" style={styles.glassContainer}>
                <LinearGradient colors={['rgba(255,255,255,0.7)', 'rgba(255,255,255,0.3)']} style={StyleSheet.absoluteFill} />
                
                <View style={styles.chartContent}>
                    <View style={styles.chartContainer}>
                        {activityData.map((value, index) => {
                            const barHeight = Math.floor(Math.max(10, value * 100));
                            // Aktueller Tag (Beispiel: Freitag) hervorheben
                            const isToday = index === 4; 
                            return (
                                <View key={index} style={styles.barGroup}>
                                    <View style={styles.barBackground}>
                                        <LinearGradient
                                            colors={isToday ? [COLORS.accent.primary, COLORS.accent.tertiary] : [COLORS.accent.secondary, '#A68B6F']}
                                            style={[styles.barFill, { height: barHeight, opacity: isToday ? 1 : 0.5 }]} 
                                        />
                                    </View>
                                    <Text style={[styles.dayLabel, isToday && {color: COLORS.accent.primary, fontFamily: 'CrimsonPro-Bold'}]}>
                                        {days[index]}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </View>
             </BlurView>
        </View>

      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#D4C4B0' },
  background: { ...StyleSheet.absoluteFillObject },
  noiseOverlay: { ...StyleSheet.absoluteFillObject, opacity: 0.03, backgroundColor: 'rgba(0,0,0,0.02)' },
  
  // GLOBAL GLASS STYLE
  glassContainer: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.8)',
    overflow: 'hidden',
  },

  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44, height: 44, borderRadius: 14, overflow: 'hidden',
  },
  iconBlur: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)'
  },
  headerTitle: {
    fontFamily: 'CrimsonPro-Bold', fontSize: 14, color: COLORS.text.secondary, letterSpacing: 1.5,
  },

  scrollContent: { paddingHorizontal: 24, paddingBottom: 50 },

  // HERO CARD
  heroCard: { height: 180, marginBottom: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16 },
  heroContent: { padding: 24, flex: 1, justifyContent: 'space-between' },
  heroHeader: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.5)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  heroLabel: { fontFamily: 'CrimsonPro-SemiBold', fontSize: 11, color: COLORS.text.tertiary, letterSpacing: 1.5 },
  heroValue: { fontFamily: 'CrimsonPro-Bold', fontSize: 56, color: COLORS.text.primary, letterSpacing: -1 },
  badgeRow: { flexDirection: 'row', alignItems: 'center' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: COLORS.accent.primary, borderRadius: 8, marginRight: 12 },
  badgeText: { fontFamily: 'CrimsonPro-Bold', fontSize: 11, color: '#FFF' },
  heroSub: { fontFamily: 'CrimsonPro-Medium', fontSize: 13, color: COLORS.text.secondary },

  // GRID
  grid: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  statCard: { flex: 1, height: 140, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
  statContent: { flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' },
  statIcon: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statValue: { fontFamily: 'CrimsonPro-Bold', fontSize: 24, color: COLORS.text.primary, marginBottom: 4 },
  statLabel: { fontFamily: 'CrimsonPro-Medium', fontSize: 13, color: COLORS.text.tertiary },

  // CHART
  sectionTitle: { fontFamily: 'CrimsonPro-SemiBold', fontSize: 12, color: COLORS.text.tertiary, marginBottom: 16, letterSpacing: 1.5 },
  chartCard: { height: 180, marginBottom: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
  chartContent: { flex: 1, padding: 24, justifyContent: 'center' },
  chartContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 100 },
  barGroup: { alignItems: 'center', flex: 1 },
  barBackground: { width: 6, height: 100, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 3, justifyContent: 'flex-end', overflow: 'hidden', marginBottom: 8 },
  barFill: { width: '100%', borderRadius: 3 },
  dayLabel: { fontFamily: 'CrimsonPro-Medium', fontSize: 11, color: COLORS.text.tertiary },

  pressed: { opacity: 0.7, transform: [{scale: 0.98}] },
})