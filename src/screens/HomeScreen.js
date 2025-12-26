import { Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useRef, useState } from 'react'
import { Alert, Animated, Dimensions, Image, Modal, Pressable, ScrollView, Share, StatusBar, StyleSheet, Switch, Text, View } from 'react-native'
import bibleDataRaw from '../../assets/luther_1912.json'
import { supabase } from '../lib/supabase'
import { getUserId } from '../lib/userSession'

const { width, height } = Dimensions.get('window')

// --- STYLING ---
const COLORS = {
  bg: { primary: '#D4C4B0', secondary: '#C9B8A8' },
  glass: { light: 'rgba(255,255,255,0.7)', medium: 'rgba(255,255,255,0.5)' },
  accent: { primary: '#C97848', secondary: '#8B7355', tertiary: '#A68B6F' },
  text: { primary: '#2C2420', secondary: '#6B5D52', tertiary: '#9B8B7E' },
  glassBorder: 'rgba(255, 255, 255, 0.6)',
  activeBorder: '#C97848',
}

// BILDER FÜR VERS DES TAGES
const BACKGROUND_IMAGES = [
    require('../../assets/img/img-1.jpg'), 
    require('../../assets/img/img-2.jpg'), 
    require('../../assets/img/img-3.jpg'), 
    require('../../assets/img/img-4.jpg'),
    require('../../assets/img/img-5.jpg'),
    require('../../assets/img/img-6.jpg'),
    require('../../assets/img/img-7.jpg'),
    require('../../assets/img/img-8.jpg'),
    require('../../assets/img/img-9.jpg'),
    require('../../assets/img/img-10.jpg'),
]

const TOPICS = [
    { name: 'Ehe', icon: 'heart' },
    { name: 'Stress', icon: 'activity' },
    { name: 'Single', icon: 'user' },
    { name: 'Angst', icon: 'wind' },
    { name: 'Hoffnung', icon: 'sun' },
    { name: 'Trauer', icon: 'cloud-rain' },
    { name: 'Arbeit', icon: 'briefcase' },
    { name: 'Freude', icon: 'smile' },
    { name: 'Geduld', icon: 'clock' },
    { name: 'Wut', icon: 'zap' },
    { name: 'Frieden', icon: 'anchor' },
    { name: 'Glaube', icon: 'shield' },
]

// Animated BlurView erstellen für den Fade-In Effekt
const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

export default function HomeScreen({ navigation }) {
  const [verseOfDay, setVerseOfDay] = useState(null)
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [bgImage, setBgImage] = useState(BACKGROUND_IMAGES[0])
  
  // Features State
  const [recentVerses, setRecentVerses] = useState([])
  
  // RANG SYSTEM STATE
  const [userRank, setUserRank] = useState({ 
      title: 'Neuling', 
      iconName: 'sprout', 
      color: '#4CAF50' 
  })
  
  // Modal & Topics State
  const [topicsVisible, setTopicsVisible] = useState(false)
  const [selectedTopics, setSelectedTopics] = useState([])
  const [savedVersesVisible, setSavedVersesVisible] = useState(false)
  
  // Settings State
  const [settingsVisible, setSettingsVisible] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  // --- ANIMATION REF ---
  const scrollY = useRef(new Animated.Value(0)).current;

  // Initial Load
  useEffect(() => { 
      getVerseOfTheDay()
      loadUserData()
      setBgImage(BACKGROUND_IMAGES[Math.floor(Math.random() * BACKGROUND_IMAGES.length)])
  }, [])

  // Wenn man zurückkommt -> Aktualisieren
  useEffect(() => {
      const unsubscribe = navigation.addListener('focus', () => {
          loadUserData();
      });
      return unsubscribe;
  }, [navigation]);

  // Typewriter
  useEffect(() => {
    if (!verseOfDay || !isTyping) return
    const fullText = verseOfDay.text
    let currentIndex = 0
    setDisplayedText('')
    const typingInterval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setDisplayedText(fullText.slice(0, currentIndex))
        currentIndex++
      } else {
        clearInterval(typingInterval)
        setIsTyping(false)
      }
    }, 30) 
    return () => clearInterval(typingInterval)
  }, [verseOfDay, isTyping])

  // --- LADE LOGIK ---
  const loadUserData = async () => {
      try {
          const userId = await getUserId(); 
          if (!userId) return;

          // 1. ZULETZT HINZUGEFÜGT
          const { data: recents } = await supabase
              .from('verses')
              .select('*')
              .eq('user_id', userId)
              .order('created_at', { ascending: false }) 
              .limit(5); 
          
          if (recents && recents.length > 0) {
              setRecentVerses(recents);
          }

          // 2. RANG BERECHNEN
          const { count } = await supabase
              .from('verses')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', userId);
          
          const totalVerses = count || 0;
          
          if (totalVerses >= 50) {
              setUserRank({ title: 'Meister', iconName: 'trophy-award', color: '#D4AF37' }); 
          } else if (totalVerses >= 20) {
              setUserRank({ title: 'Wächter', iconName: 'shield-check', color: '#607D8B' }); 
          } else if (totalVerses >= 5) {
              setUserRank({ title: 'Entdecker', iconName: 'compass-outline', color: '#8D6E63' }); 
          } else {
              setUserRank({ title: 'Neuling', iconName: 'sprout', color: '#66BB6A' }); 
          }

      } catch (e) {
          console.log("Error loading user data", e);
      }
  }

  const getVerseOfTheDay = () => {
    try {
      const today = new Date()
      const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000)
      const dataObject = bibleDataRaw.default || bibleDataRaw
      const bibleArray = dataObject.verses 
      
      if (!Array.isArray(bibleArray) || bibleArray.length === 0) return
      
      const verseIndex = (dayOfYear * 7919) % bibleArray.length
      const selectedVerse = bibleArray[verseIndex]
      
      if (!selectedVerse) return
      
      setVerseOfDay({
        text: selectedVerse.text,
        reference: `${selectedVerse.book_name} ${selectedVerse.chapter}:${selectedVerse.verse}`,
        book: selectedVerse.book_name,
        chapter: selectedVerse.chapter.toString(),
        verse: selectedVerse.verse.toString()
      })
      setIsTyping(true)
    } catch (error) {
      console.error(error)
    }
  }

  const addVerseOfDay = async () => {
    if (!verseOfDay) return;
    try {
      const userId = await getUserId();
      const { data: existingVerse } = await supabase
        .from('verses')
        .select('id')
        .eq('user_id', userId)
        .eq('reference', verseOfDay.reference) 
        .maybeSingle();

      if (existingVerse) {
        Alert.alert("Bereits gemerkt", "Diesen Vers hast du schon in deiner Liste! 🤓");
        return; 
      }

      const { data: cats } = await supabase.from('categories').select('id').limit(1)
      const words = verseOfDay.text.split(' ')
      let hiddenIndex = 0
      if (words.length > 2) hiddenIndex = Math.floor(Math.random() * (words.length - 2)) + 1

      const { error } = await supabase.from('verses').insert({
        user_id: userId,
        category_id: cats?.[0]?.id, 
        reference: verseOfDay.reference,
        text: verseOfDay.text,
        book: verseOfDay.book,
        chapter: parseInt(verseOfDay.chapter),
        verse_number: parseInt(verseOfDay.verse),
        hidden_word_index: hiddenIndex,
        translation: 'Luther 1912'
      })

      if (error) throw error;
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Gespeichert", "Vers wurde erfolgreich hinzugefügt.");
      loadUserData(); 

    } catch (e) {
      console.log(e);
      Alert.alert("Fehler", "Konnte nicht gespeichert werden.");
    }
  }

  const shareVerse = async () => {
    if (!verseOfDay) return
    try {
      await Share.share({
        message: `"${verseOfDay.text}" - ${verseOfDay.reference} \n\nEntdeckt in der Memorion App.`,
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  const toggleTopic = (topic) => {
      const exists = selectedTopics.find(t => t.name === topic.name);
      if (exists) {
          setSelectedTopics(prev => prev.filter(t => t.name !== topic.name));
      } else {
          if (selectedTopics.length >= 4) {
              Alert.alert("Limit erreicht", "Du kannst maximal 4 Themen gleichzeitig anpinnen.");
              return;
          }
          setSelectedTopics(prev => [...prev, topic]);
      }
  }

  const handleChipPress = (topicName) => {
      const cleanName = topicName.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').trim();
      navigation.navigate('BibleBrowser', { initialSearch: cleanName });
  }

  // --- ANIMATIONS WERTE ---
  // Header Hintergrund Opacity: 0 am Anfang, 1 ab 50px Scroll
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });

  // NEU: Schatten-Intensität (für das "Hervorheben")
  const headerShadow = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, 0.15], // Von 0 auf 15% Schatten
    extrapolate: 'clamp'
  });

  // Header Border Opacity
  const borderOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Background */}
      <View style={styles.background}>
        <LinearGradient
          colors={['#D4C4B0', '#C9B8A8', '#BEA999', '#C9B8A8', '#D4C4B0']}
          locations={[0, 0.25, 0.5, 0.75, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.noiseOverlay} />
      </View>

      {/* --- STICKY NAVBAR HEADER --- */}
      <View style={styles.stickyHeaderContainer}>
          {/* Animierter Glass Hintergrund */}
          <AnimatedBlurView 
            intensity={90} 
            tint="light" 
            style={[StyleSheet.absoluteFill, { opacity: headerOpacity }]} 
          />
          
          {/* Animierter Hintergrund & Schatten */}
          <Animated.View style={[
              StyleSheet.absoluteFill, 
              { 
                  backgroundColor: 'rgba(255,255,255,0.4)',
                  borderBottomWidth: 1, 
                  borderBottomColor: 'rgba(255,255,255,0.5)',
                  opacity: borderOpacity,
                  // Schatten für 3D Effekt beim Scrollen
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 6 },
                  shadowRadius: 10,
                  shadowOpacity: headerShadow, 
              }
          ]} />

          {/* Header Inhalt */}
          <View style={styles.headerContent}>
             <View>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                    <Text style={styles.greeting}>GUTEN MORGEN</Text>
                    {/* Rang Badge */}
                    <View style={styles.rankBadge}>
                        <MaterialCommunityIcons 
                            name={userRank.iconName} 
                            size={12} 
                            color={userRank.color} 
                            style={{marginRight: 4}}
                        />
                        <Text style={[styles.rankText, {color: COLORS.text.secondary}]}>{userRank.title}</Text>
                    </View>
                </View>
                <Text style={styles.appName}>Memorion</Text>
             </View>
             
             {/* Rechte Seite: Streak & Settings */}
             <View style={styles.headerRightContainer}>
                  {/* STREAK */}
                  <View style={styles.streakContainer}>
                    <BlurView intensity={90} tint="light" style={styles.glassContainer}>
                      <LinearGradient colors={['rgba(255,255,255,0.6)', 'rgba(255,255,255,0.2)']} style={StyleSheet.absoluteFill} />
                      <View style={styles.streakContent}>
                        <View style={styles.fireIcon}>
                          <Feather name="zap" size={14} color="#C97848" />
                        </View>
                        <Text style={styles.streakNumber}>3</Text>
                      </View>
                    </BlurView>
                  </View>

                  {/* SETTINGS BUTTON */}
                  <Pressable 
                    style={styles.settingsButton}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSettingsVisible(true);
                    }}
                  >
                      <BlurView intensity={90} tint="light" style={styles.glassContainer}>
                          <LinearGradient colors={['rgba(255,255,255,0.6)', 'rgba(255,255,255,0.2)']} style={StyleSheet.absoluteFill} />
                          <View style={styles.settingsIconContent}>
                             <Feather name="settings" size={20} color={COLORS.text.secondary} />
                          </View>
                      </BlurView>
                  </Pressable>
             </View>
          </View>
      </View>

      {/* --- SCROLL CONTENT --- */}
      <Animated.ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
        )}
        scrollEventThrottle={16} 
      >
        
        {/* --- MERK-LISTE BUTTON --- */}
        <Pressable 
            style={({pressed}) => [styles.savedListCard, pressed && {transform: [{scale: 0.98}]}]}
            onPress={() => setSavedVersesVisible(true)}
        >
            <BlurView intensity={80} tint="light" style={styles.glassContainer}>
                <LinearGradient colors={['rgba(255,255,255,0.7)', 'rgba(255,255,255,0.3)']} style={StyleSheet.absoluteFill} />
                <View style={styles.savedListContent}>
                    <View style={styles.bookmarkCircle}>
                        <Feather name="bookmark" size={24} color="#FFF" />
                    </View>
                    <View style={{flex: 1, marginLeft: 16}}>
                        <Text style={styles.savedListTitle}>Deine Merkliste</Text>
                        <Text style={styles.savedListSub}>{recentVerses.length} Verse gespeichert</Text>
                    </View>
                    <Feather name="chevron-right" size={20} color={COLORS.text.tertiary} />
                </View>
            </BlurView>
        </Pressable>

        {/* CHALLENGE */}
        <View style={styles.challengeRow}>
           <View style={styles.challengeCard}>
              <BlurView intensity={90} tint="light" style={styles.glassContainer}>
                  <LinearGradient colors={['rgba(255,255,255,0.7)', 'rgba(255,255,255,0.3)']} style={StyleSheet.absoluteFill} />
                  <View style={styles.challengeInner}>
                    <Text style={styles.challengeLabel}>Heute lernen</Text>
                    <View style={styles.challengeContent}>
                        <Text style={styles.challengeNumber}>0<Text style={styles.challengeTotal}>/2</Text></Text>
                        <Feather name="plus-circle" size={18} color={COLORS.accent.primary} />
                    </View>
                    <View style={styles.progressBarBg}><View style={[styles.progressBarFill, {width: '10%'}]} /></View>
                  </View>
              </BlurView>
           </View>

           <View style={styles.challengeCard}>
              <BlurView intensity={90} tint="light" style={styles.glassContainer}>
                  <LinearGradient colors={['rgba(255,255,255,0.7)', 'rgba(255,255,255,0.3)']} style={StyleSheet.absoluteFill} />
                  <View style={styles.challengeInner}>
                    <Text style={styles.challengeLabel}>Wiederholen</Text>
                    <View style={styles.challengeContent}>
                        <Text style={styles.challengeNumber}>1<Text style={styles.challengeTotal}>/5</Text></Text>
                        <Feather name="rotate-cw" size={18} color={COLORS.accent.secondary} />
                    </View>
                    <View style={styles.progressBarBg}><View style={[styles.progressBarFill, {width: '20%', backgroundColor: COLORS.accent.secondary}]} /></View>
                  </View>
              </BlurView>
           </View>
        </View>

        {/* VERS DES TAGES */}
        {verseOfDay && (
          <View style={styles.verseOfDayCard}>
            <Image source={{uri: bgImage}} style={[StyleSheet.absoluteFill, {borderRadius: 24}]} />
            <View style={[StyleSheet.absoluteFill, {backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 24}]} />
            
            <BlurView intensity={30} tint="light" style={styles.glassContainer}>
              <LinearGradient colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.05)']} style={StyleSheet.absoluteFill} />
              
              <View style={styles.verseContent}>
                <View style={styles.verseLabelRow}>
                  <Feather name="sun" size={16} color="#FFF" />
                  <Text style={[styles.verseLabel, {color: '#FFF'}]}>IMPULS DES TAGES</Text>
                </View>
                <Text style={[styles.verseText, {color: '#FFF', textShadowColor: 'rgba(0,0,0,0.3)', textShadowRadius: 4}]}>
                  "{displayedText}"
                  {isTyping && <Text style={styles.cursor}>|</Text>}
                </Text>
                <Text style={[styles.verseReference, {color: 'rgba(255,255,255,0.9)'}]}>{verseOfDay.reference}</Text>
                <View style={styles.verseActions}>
                  <Pressable onPress={shareVerse} style={[styles.iconBtn, {borderColor: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(0,0,0,0.2)'}]}>
                      <Feather name="share" size={18} color="#FFF" />
                   </Pressable>
                  <View style={{flex:1}} />
                  <Pressable style={[styles.addButton, {backgroundColor: 'rgba(255,255,255,0.9)'}]} onPress={addVerseOfDay}>
                    <Feather name="bookmark" size={16} color={COLORS.text.primary} style={{marginRight: 6}} />
                    <Text style={[styles.addButtonText, {color: COLORS.text.primary}]}>Merken</Text>
                  </Pressable>
                </View>
              </View>
            </BlurView>
          </View>
        )}

        {/* THEMEN */}
        <Text style={styles.sectionLabel}>DEINE THEMEN (max 4)</Text>
        <Pressable 
            onLongPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setTopicsVisible(true);
            }}
            onPress={() => {
                if (selectedTopics.length === 0) setTopicsVisible(true);
            }}
            style={({pressed}) => [styles.topicContainerWrapper, pressed && {transform: [{scale: 0.99}]}]}
        >
            <BlurView intensity={80} tint="light" style={styles.glassContainer}>
                <LinearGradient colors={['rgba(255,255,255,0.6)', 'rgba(255,255,255,0.2)']} style={StyleSheet.absoluteFill} />
                
                {selectedTopics.length === 0 ? (
                    <View style={styles.emptyTopicContent}>
                        <View style={styles.plusCircle}>
                            <Feather name="plus" size={24} color="#FFF" />
                        </View>
                        <Text style={styles.topicTextEmpty}>Themen hinzufügen</Text>
                        <Feather name="chevron-right" size={20} color={COLORS.text.tertiary} />
                    </View>
                ) : (
                    <View style={styles.filledTopicGrid}>
                        {selectedTopics.map((topic, index) => (
                            <Pressable 
                                key={index} 
                                style={styles.homeTopicChip}
                                onPress={() => handleChipPress(topic.name)}
                            >
                                <BlurView intensity={50} tint="light" style={styles.chipBlur}>
                                    <Feather name={topic.icon} size={16} color={COLORS.text.primary} style={{marginRight: 6}} />
                                    <Text style={styles.chipText}>{topic.name}</Text>
                                </BlurView>
                            </Pressable>
                        ))}
                        <View style={{flex:1, alignItems: 'flex-end', justifyContent:'center'}}>
                             <Feather name="edit-2" size={14} color={COLORS.text.tertiary} />
                        </View>
                    </View>
                )}
            </BlurView>
        </Pressable>

        {/* HERO CARD */}
        <Pressable 
          style={({pressed}) => [styles.heroCard, pressed && { transform: [{scale: 0.98}] }]}
          onPress={() => navigation.navigate('Practice')}
        >
          <BlurView intensity={100} tint="light" style={styles.glassContainer}>
            <LinearGradient colors={['rgba(255,255,255,0.85)', 'rgba(255,255,255,0.45)']} style={StyleSheet.absoluteFill} />
            <View style={styles.heroContent}>
              <View style={styles.playButtonContainer}>
                <View style={styles.playButton}>
                  <Feather name="play" size={28} color="#2C2420" style={{marginLeft: 4}} />
                </View>
              </View>
              <View style={styles.heroText}>
                <Text style={styles.heroTitle}>Weiterlernen</Text>
                <Text style={styles.heroSub}>Starte deine Session</Text>
              </View>
              <Feather name="chevron-right" size={24} color={COLORS.text.tertiary} />
            </View>
          </BlurView>
        </Pressable>

        {/* ACTIONS GRID */}
        <View style={styles.actionsGrid}>
          <Pressable style={styles.actionCard} onPress={() => navigation.navigate('BibleBrowser')}>
            <BlurView intensity={90} tint="light" style={styles.glassContainer}>
              <LinearGradient colors={['rgba(255,255,255,0.7)', 'rgba(255,255,255,0.3)']} style={StyleSheet.absoluteFill} />
              <View style={styles.actionContent}>
                <Feather name="search" size={24} color="#8B7355" style={{marginBottom: 8}} />
                <Text style={styles.actionTitle}>Bibel</Text>
              </View>
            </BlurView>
          </Pressable>
           <Pressable style={styles.actionCard} onPress={() => navigation.navigate('Stats')}>
            <BlurView intensity={90} tint="light" style={styles.glassContainer}>
              <LinearGradient colors={['rgba(255,255,255,0.7)', 'rgba(255,255,255,0.3)']} style={StyleSheet.absoluteFill} />
              <View style={styles.actionContent}>
                <Feather name="bar-chart-2" size={24} color="#C97848" style={{marginBottom: 8}} />
                <Text style={styles.actionTitle}>Profil</Text>
              </View>
            </BlurView>
          </Pressable>
        </View>

        <View style={{height: 60}} />

      </Animated.ScrollView>

      {/* --- SETTINGS MODAL --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={settingsVisible}
        onRequestClose={() => setSettingsVisible(false)}
      >
          <View style={styles.modalContainer}>
              <View style={styles.background}>
                <LinearGradient colors={['rgba(212, 196, 176, 0.98)', 'rgba(201, 184, 168, 0.99)']} style={StyleSheet.absoluteFill} />
                <BlurView intensity={90} style={StyleSheet.absoluteFill} tint="light" />
              </View>

              <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Einstellungen</Text>
                      <Pressable onPress={() => setSettingsVisible(false)} style={styles.closeBtn}>
                          <Text style={styles.closeBtnText}>Fertig</Text>
                      </Pressable>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false}>
                      <Text style={styles.sectionLabel}>ERSCHEINUNGSBILD</Text>
                      
                      {/* Dark Mode */}
                      <View style={styles.settingItem}>
                        <BlurView intensity={60} tint="light" style={styles.glassContainerSmall}>
                           <View style={styles.settingRow}>
                               <View style={styles.settingLeft}>
                                   <View style={styles.settingIconBox}>
                                       <Feather name="moon" size={20} color={COLORS.text.secondary} />
                                   </View>
                                   <Text style={styles.settingText}>Dunkelmodus</Text>
                               </View>
                               <Switch 
                                   trackColor={{ false: "#767577", true: COLORS.accent.primary }}
                                   thumbColor={darkMode ? "#f4f3f4" : "#f4f3f4"}
                                   ios_backgroundColor="#3e3e3e"
                                   onValueChange={() => {
                                       Haptics.selectionAsync();
                                       setDarkMode(!darkMode);
                                   }}
                                   value={darkMode}
                               />
                           </View>
                        </BlurView>
                      </View>

                      {/* Font */}
                      <View style={styles.settingItem}>
                        <BlurView intensity={60} tint="light" style={styles.glassContainerSmall}>
                           <View style={styles.settingRow}>
                               <View style={styles.settingLeft}>
                                   <View style={styles.settingIconBox}>
                                       <Feather name="type" size={20} color={COLORS.text.secondary} />
                                   </View>
                                   <Text style={styles.settingText}>Schriftart</Text>
                               </View>
                               <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                   <Text style={{fontFamily: 'CrimsonPro-Regular', marginRight: 8, color: COLORS.text.tertiary}}>Crimson Pro</Text>
                                   <Feather name="chevron-right" size={16} color={COLORS.text.tertiary} />
                               </View>
                           </View>
                        </BlurView>
                      </View>

                      <View style={{height: 20}} />
                      <Text style={styles.sectionLabel}>ALLGEMEIN</Text>

                      <View style={styles.settingItem}>
                        <BlurView intensity={60} tint="light" style={styles.glassContainerSmall}>
                           <View style={styles.settingRow}>
                               <View style={styles.settingLeft}>
                                   <View style={styles.settingIconBox}>
                                       <Feather name="bell" size={20} color={COLORS.text.secondary} />
                                   </View>
                                   <Text style={styles.settingText}>Erinnerungen</Text>
                               </View>
                               <Feather name="chevron-right" size={16} color={COLORS.text.tertiary} />
                           </View>
                        </BlurView>
                      </View>
                        
                      <Pressable style={styles.settingItem}>
                        <BlurView intensity={60} tint="light" style={styles.glassContainerSmall}>
                           <View style={styles.settingRow}>
                               <View style={styles.settingLeft}>
                                   <View style={styles.settingIconBox}>
                                       <Feather name="info" size={20} color={COLORS.text.secondary} />
                                   </View>
                                   <Text style={styles.settingText}>Über Memorion</Text>
                               </View>
                               <Feather name="chevron-right" size={16} color={COLORS.text.tertiary} />
                           </View>
                        </BlurView>
                      </Pressable>

                      <View style={{height: 40}} />
                      <Text style={{textAlign: 'center', color: COLORS.text.tertiary, fontSize: 12, fontFamily: 'CrimsonPro-Medium'}}>Version 1.0.2</Text>

                  </ScrollView>
              </View>
          </View>
      </Modal>

      {/* --- MERK-LISTE MODAL --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={savedVersesVisible}
        onRequestClose={() => setSavedVersesVisible(false)}
      >
          <View style={styles.modalContainer}>
              <View style={styles.background}>
                <LinearGradient colors={['rgba(212, 196, 176, 0.95)', 'rgba(201, 184, 168, 0.98)']} style={StyleSheet.absoluteFill} />
                <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="light" />
              </View>

              <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Deine Verse</Text>
                      <Pressable onPress={() => setSavedVersesVisible(false)} style={styles.closeBtn}>
                          <Text style={styles.closeBtnText}>Schließen</Text>
                      </Pressable>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 40}}>
                      {recentVerses.length === 0 ? (
                          <Text style={{textAlign:'center', marginTop: 40, color: COLORS.text.tertiary, fontFamily: 'CrimsonPro-Medium'}}>
                              Noch keine Verse gemerkt.
                          </Text>
                      ) : (
                          recentVerses.map((verse, index) => (
                              <Pressable 
                                  key={index} 
                                  style={styles.savedVerseItem}
                                  onPress={() => {
                                      setSavedVersesVisible(false);
                                      navigation.navigate('Practice'); 
                                  }}
                              >
                                  <BlurView intensity={60} tint="light" style={styles.glassContainerSmall}>
                                      <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
                                          <View style={{flex: 1}}>
                                              <Text style={styles.itemReference}>{verse.book} {verse.chapter}:{verse.verse_number}</Text>
                                              <Text style={styles.itemText} numberOfLines={1}>{verse.text}</Text>
                                          </View>
                                          <Feather name="play-circle" size={24} color={COLORS.accent.primary} />
                                      </View>
                                  </BlurView>
                              </Pressable>
                          ))
                      )}
                  </ScrollView>
              </View>
          </View>
      </Modal>

      {/* TOPICS MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={topicsVisible}
        onRequestClose={() => setTopicsVisible(false)}
      >
          <View style={styles.modalContainer}>
              <View style={styles.background}>
                <LinearGradient
                  colors={['rgba(212, 196, 176, 0.9)', 'rgba(201, 184, 168, 0.95)']}
                  style={StyleSheet.absoluteFill}
                />
                <BlurView intensity={60} style={StyleSheet.absoluteFill} tint="light" />
              </View>

              <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                      <View>
                          <Text style={styles.modalTitle}>Was beschäftigt dich?</Text>
                          <Text style={styles.modalSub}>{selectedTopics.length}/4 ausgewählt</Text>
                      </View>
                      <Pressable onPress={() => setTopicsVisible(false)} style={styles.closeBtn}>
                          <Text style={styles.closeBtnText}>Fertig</Text>
                      </Pressable>
                  </View>

                  <ScrollView contentContainerStyle={styles.topicGrid} showsVerticalScrollIndicator={false}>
                      {TOPICS.map((topic, index) => {
                          const isSelected = selectedTopics.find(t => t.name === topic.name);
                          return (
                              <Pressable 
                                key={index} 
                                style={({pressed}) => [styles.topicTile, pressed && {transform: [{scale: 0.95}]}]}
                                onPress={() => toggleTopic(topic)}
                              >
                                  <BlurView intensity={80} tint="light" style={[
                                      styles.glassContainer, 
                                      isSelected && { borderColor: COLORS.accent.primary, borderWidth: 2 } 
                                  ]}>
                                      <LinearGradient 
                                        colors={isSelected ? ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)'] : ['rgba(255,255,255,0.6)', 'rgba(255,255,255,0.3)']} 
                                        style={StyleSheet.absoluteFill} 
                                      />
                                      <View style={styles.tileContent}>
                                          <View style={styles.tileIcon}>
                                              <Feather name={topic.icon} size={28} color={isSelected ? COLORS.accent.primary : COLORS.text.secondary} />
                                          </View>
                                          <Text style={[styles.tileText, isSelected && {color: COLORS.accent.primary}]}>{topic.name}</Text>
                                      </View>
                                      {isSelected && (
                                          <View style={styles.xBadge}>
                                              <Feather name="x" size={10} color="#FFF" />
                                          </View>
                                      )}
                                  </BlurView>
                              </Pressable>
                          )
                      })}
                  </ScrollView>
              </View>
          </View>
      </Modal>

    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#D4C4B0' },
  background: { ...StyleSheet.absoluteFillObject },
  noiseOverlay: { ...StyleSheet.absoluteFillObject, opacity: 0.03, backgroundColor: 'rgba(0,0,0,0.02)' },
  
  // WICHTIG: Erhöhtes Padding, damit Content unter den neuen größeren Header passt
  scrollContent: { padding: 24, paddingTop: 150 },

  glassContainer: {
    flex: 1, borderRadius: 24, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.8)', overflow: 'hidden',
  },
  glassContainerSmall: {
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.6)', overflow: 'hidden',
  },

  // --- STICKY HEADER STYLES ---
  stickyHeaderContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 130, // HÖHER als vorher (Notch Fix)
      zIndex: 100,
      justifyContent: 'flex-end',
      paddingBottom: 16,
      paddingHorizontal: 24,
      paddingTop: 60, // MEHR ABSTAND von oben für Kamera
  },
  headerContent: {
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'flex-end',
  },

  greeting: { fontFamily: 'CrimsonPro-SemiBold', fontSize: 10, color: COLORS.text.tertiary, letterSpacing: 2.5, marginBottom: 4 },
  appName: { fontFamily: 'CrimsonPro-Bold', fontSize: 28, color: COLORS.text.primary, letterSpacing: -1, lineHeight: 32 },
  
  rankBadge: { 
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8, 
      paddingVertical: 2, 
      backgroundColor: 'rgba(255,255,255,0.5)', 
      borderRadius: 12, 
      borderWidth: 1, 
      borderColor: 'rgba(255,255,255,0.6)', 
      marginBottom: 4 
  },
  rankText: { fontFamily: 'CrimsonPro-Bold', fontSize: 10 },

  headerRightContainer: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingBottom: 2 },

  streakContainer: { height: 40, minWidth: 55, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 8 },
  streakContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flex: 1, paddingHorizontal: 10 },
  fireIcon: { marginRight: 4 },
  streakNumber: { fontFamily: 'CrimsonPro-Bold', fontSize: 16, color: COLORS.text.primary },

  settingsButton: { width: 40, height: 40, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
  settingsIconContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  settingItem: { marginBottom: 12 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingLeft: { flexDirection: 'row', alignItems: 'center' },
  settingIconBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.5)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  settingText: { fontFamily: 'CrimsonPro-SemiBold', fontSize: 16, color: COLORS.text.primary },

  challengeRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  challengeCard: { flex: 1, height: 110, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 15, shadowOffset: {height:6, width:0} },
  challengeInner: { flex: 1, padding: 16, justifyContent: 'space-between' },
  challengeLabel: { fontFamily: 'CrimsonPro-Medium', fontSize: 12, color: COLORS.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  challengeContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  challengeNumber: { fontFamily: 'CrimsonPro-Bold', fontSize: 28, color: COLORS.text.primary },
  challengeTotal: { fontSize: 16, color: 'rgba(0,0,0,0.3)' },
  progressBarBg: { height: 4, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 2, marginTop: 8 },
  progressBarFill: { height: 4, backgroundColor: COLORS.accent.primary, borderRadius: 2 },

  topicContainerWrapper: { minHeight: 80, marginBottom: 32, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: {width: 0, height: 4} },
  emptyTopicContent: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 20 },
  plusCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.accent.primary, justifyContent: 'center', alignItems: 'center', marginRight: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  topicTextEmpty: { flex: 1, fontFamily: 'CrimsonPro-Bold', fontSize: 18, color: COLORS.text.primary },
  filledTopicGrid: { padding: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  homeTopicChip: { borderRadius: 16, overflow: 'hidden', shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4 },
  chipBlur: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  chipText: { fontFamily: 'CrimsonPro-SemiBold', fontSize: 14, color: COLORS.text.primary },

  modalContainer: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { height: '80%', backgroundColor: 'transparent', padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontFamily: 'CrimsonPro-Bold', fontSize: 24, color: COLORS.text.primary },
  modalSub: { fontFamily: 'CrimsonPro-Medium', fontSize: 14, color: COLORS.text.tertiary, marginTop: 4 },
  closeBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: COLORS.text.primary, borderRadius: 20 },
  closeBtnText: { color: '#FFF', fontFamily: 'CrimsonPro-SemiBold' },
  topicGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  topicTile: { width: '48%', height: 130, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: {width:0, height:4} },
  tileContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 10 },
  tileIcon: { marginBottom: 12 },
  tileText: { fontFamily: 'CrimsonPro-Bold', fontSize: 16, color: COLORS.text.secondary },
  xBadge: { position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.accent.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FFF' },

  verseOfDayCard: { marginBottom: 32, shadowColor: "#000", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 12 },
  verseContent: { padding: 24 },
  verseLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  verseLabel: { fontFamily: 'CrimsonPro-SemiBold', fontSize: 10, color: COLORS.accent.primary, letterSpacing: 2, marginLeft: 8 },
  verseText: { fontFamily: 'CrimsonPro-Regular', fontSize: 19, lineHeight: 30, color: COLORS.text.primary, marginBottom: 16 },
  cursor: { opacity: 0.7, fontWeight: '300' },
  verseReference: { fontFamily: 'CrimsonPro-SemiBold', fontSize: 14, color: COLORS.text.secondary, marginBottom: 24 },
  verseActions: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.4)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', marginRight: 12 },
  addButton: { paddingHorizontal: 20, height: 44, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.accent.primary, borderRadius: 14 },
  addButtonText: { fontFamily: 'CrimsonPro-SemiBold', fontSize: 14, color: '#FFF' },

  heroCard: { height: 100, marginBottom: 32, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 20 },
  heroContent: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  playButtonContainer: { marginRight: 16 },
  playButton: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: '#FFF' },
  heroText: { flex: 1 },
  heroTitle: { fontFamily: 'CrimsonPro-Bold', fontSize: 18, color: COLORS.text.primary, marginBottom: 4 },
  heroSub: { fontFamily: 'CrimsonPro-Medium', fontSize: 13, color: COLORS.text.secondary },

  sectionLabel: { fontFamily: 'CrimsonPro-SemiBold', fontSize: 10, color: COLORS.text.tertiary, letterSpacing: 2.5, marginBottom: 16 },

  actionsGrid: { flexDirection: 'row', gap: 12 },
  actionCard: { flex: 1, height: 110, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10 },
  actionContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  actionTitle: { fontFamily: 'CrimsonPro-Bold', fontSize: 14, color: COLORS.text.secondary },

  savedListCard: { height: 80, marginBottom: 24, borderRadius: 20, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: {width:0, height:4} },
  savedListContent: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  bookmarkCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.accent.primary, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.accent.primary, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: {width:0, height:4} },
  savedListTitle: { fontFamily: 'CrimsonPro-Bold', fontSize: 18, color: COLORS.text.primary },
  savedListSub: { fontFamily: 'CrimsonPro-Medium', fontSize: 14, color: COLORS.text.tertiary },

  savedVerseItem: { marginBottom: 12, borderRadius: 16 },
  itemReference: { fontFamily: 'CrimsonPro-Bold', fontSize: 16, color: COLORS.text.primary, marginBottom: 4 },
  itemText: { fontFamily: 'CrimsonPro-Regular', fontSize: 14, color: COLORS.text.secondary },
})