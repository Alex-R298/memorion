import { Feather } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useRef } from 'react'
import { Animated, Dimensions, Easing, Image, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native'

const { width, height } = Dimensions.get('window')

// DEIN ICON
const APP_ICON = require('../../assets/img/icon-tran.png')

// FARBEN (aus deinem HomeScreen übernommen)
const COLORS = {
  bg: { primary: '#D4C4B0', secondary: '#C9B8A8' },
  accent: { primary: '#C97848', secondary: '#8B7355' },
  text: { primary: '#2C2420', secondary: '#6B5D52' },
}

export default function StartScreen({ navigation }) {
  // Animationen für Content (Fade In + Slide Up)
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(40)).current

  // Animationen für den Hintergrund-Blobs (Bewegung)
  // Wir nutzen 2 Blobs, die sich langsam bewegen
  const blob1Anim = useRef(new Animated.Value(0)).current
  const blob2Anim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // 1. Content Einblenden
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 30, useNativeDriver: true })
    ]).start()

    // 2. Hintergrund-Loop starten
    startBackgroundAnimation()
  }, [])

  const startBackgroundAnimation = () => {
    // Blob 1: Bewegt sich diagonal
    Animated.loop(
      Animated.sequence([
        Animated.timing(blob1Anim, {
            toValue: 1, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true
        }),
        Animated.timing(blob1Anim, {
            toValue: 0, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true
        })
      ])
    ).start();

    // Blob 2: Bewegt sich entgegengesetzt (etwas schneller)
    Animated.loop(
        Animated.sequence([
          Animated.timing(blob2Anim, {
              toValue: 1, duration: 6000, easing: Easing.inOut(Easing.quad), useNativeDriver: true
          }),
          Animated.timing(blob2Anim, {
              toValue: 0, duration: 6000, easing: Easing.inOut(Easing.quad), useNativeDriver: true
          })
        ])
      ).start();
  }

  // Interpolationen für die Blob-Bewegungen
  const blob1Translate = {
      transform: [
          { translateY: blob1Anim.interpolate({ inputRange: [0, 1], outputRange: [0, -height * 0.3] }) },
          { translateX: blob1Anim.interpolate({ inputRange: [0, 1], outputRange: [0, width * 0.2] }) }
      ]
  }
  const blob2Translate = {
    transform: [
        { translateY: blob2Anim.interpolate({ inputRange: [0, 1], outputRange: [0, height * 0.4] }) },
        { translateX: blob2Anim.interpolate({ inputRange: [0, 1], outputRange: [0, -width * 0.3] }) }
    ]
}


  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    navigation.replace('Home') 
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* --- LAYER 1: Statischer Basis-Gradient --- */}
      <LinearGradient
          colors={[COLORS.bg.primary, COLORS.bg.secondary, '#E0D5C8']}
          style={StyleSheet.absoluteFill}
          start={{x: 0, y: 0}} end={{x: 1, y: 1}}
      />

      {/* --- LAYER 2: Animierte Farb-Blobs (Performance-freundlich) --- */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {/* Blob 1 (Akzent Orange) */}
          <Animated.View style={[styles.blob, { 
              backgroundColor: COLORS.accent.primary, 
              top: height * 0.1, left: -width * 0.2,
              ...blob1Translate
          }]} />
           {/* Blob 2 (Akzent Braun) */}
          <Animated.View style={[styles.blob, { 
              backgroundColor: COLORS.accent.secondary, 
              bottom: height * 0.1, right: -width * 0.2,
              width: width * 1.2, height: width * 1.2, // Etwas größer
              ...blob2Translate
          }]} />
      </View>

      {/* --- LAYER 3: Der "Milchglas"-Weichzeichner über allem --- */}
      {/* Intensity hoch für starken Blur der Blobs */}
      <BlurView intensity={90} style={StyleSheet.absoluteFill} tint="light" />
      {/* Ein zweiter leichter Gradient für Tiefe */}
      <LinearGradient colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0.0)']} style={StyleSheet.absoluteFill} />


      {/* --- CONTENT LAYER (Vordergrund) --- */}
      <View style={styles.contentContainer}>
          
          {/* OBERER BEREICH: ICON & TEXT */}
          <Animated.View style={[styles.topSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            {/* DEIN ICON */}
            <View style={styles.iconWrapper}>
                <Image source={APP_ICON} style={styles.appIcon} resizeMode="contain" />
            </View>
            
            <Text style={styles.appName}>Memorion</Text>
            <Text style={styles.slogan}>
              Verankere das Wort{"\n"}in deinem Herzen.
            </Text>
          </Animated.View>

          {/* UNTERER BEREICH: BUTTONS (in Glass Card) */}
          <Animated.View style={[styles.bottomSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            {/* Die Glass-Karte für die Buttons */}
            <BlurView intensity={50} tint="light" style={styles.glassCard}>
              <LinearGradient colors={['rgba(255,255,255,0.7)', 'rgba(255,255,255,0.3)']} style={StyleSheet.absoluteFill} />
              
              {/* Button: Loslegen */}
              <Pressable 
                style={({pressed}) => [styles.primaryButton, pressed && {transform: [{scale: 0.98}]}]}
                onPress={handleStart}
              >
                <Text style={styles.primaryButtonText}>Kostenlos starten</Text>
                <Feather name="arrow-right" size={20} color="#FFF" />
              </Pressable>

              {/* Button: Login */}
              <Pressable onPress={() => Haptics.selectionAsync()} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Ich habe bereits einen Account</Text>
              </Pressable>

            </BlurView>
            
            <Text style={styles.footerText}>Bibeltexte nach Luther 1912</Text>
          </Animated.View>

        </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg.primary },
  
  // Die animierten Farbkreise im Hintergrund
  blob: {
      position: 'absolute',
      width: width * 1,
      height: width * 1,
      borderRadius: width, // Macht sie kreisförmig
      opacity: 0.6, // Nicht zu dominant
  },

  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 24,
    paddingTop: height * 0.15, // Genug Platz oben
    paddingBottom: 50,
  },

  // --- TOP SECTION ---
  topSection: { alignItems: 'center' },
  iconWrapper: {
      marginBottom: 24,
      // Optional: Ein leichter Schatten oder Glow um das Icon
      shadowColor: COLORS.accent.primary, shadowOffset: {width:0, height:10}, shadowOpacity: 0.2, shadowRadius: 20,
  },
  appIcon: {
    width: 120, // Größe anpassen falls nötig
    height: 120,
  },
  appName: {
    fontFamily: 'CrimsonPro-Bold',
    fontSize: 48,
    color: COLORS.text.primary,
    marginBottom: 12,
    letterSpacing: -1,
  },
  slogan: {
    fontFamily: 'CrimsonPro-Medium',
    fontSize: 20,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 30,
  },

  // --- BOTTOM SECTION ---
  bottomSection: { width: '100%' },
  glassCard: {
    borderRadius: 28,
    padding: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    // Schatten für die gesamte Karte, damit sie "schwebt"
    shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20,
    elevation: 10,
    backgroundColor: 'rgba(255,255,255,0.1)' // Fallback
  },
  
  primaryButton: {
    backgroundColor: COLORS.accent.primary, // Deine Akzentfarbe (Orange)
    height: 56,
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    // Innerer Schatten/Glow für den Button
    shadowColor: COLORS.accent.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12,
  },
  primaryButtonText: {
    fontFamily: 'CrimsonPro-Bold',
    fontSize: 18,
    color: '#FFF', // Weißer Text auf orangem Button
    marginRight: 8,
  },

  secondaryButton: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontFamily: 'CrimsonPro-SemiBold',
    fontSize: 15,
    color: COLORS.text.primary, // Dunkler Text
  },

  footerText: {
    marginTop: 24,
    textAlign: 'center',
    color: COLORS.text.tertiary,
    fontSize: 12,
    fontFamily: 'CrimsonPro-Regular',
  }
})