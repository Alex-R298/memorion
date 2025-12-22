import { Feather } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    UIManager,
    View
} from 'react-native'

const { width, height } = Dimensions.get('window');
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- CONFIG ---
const SETTINGS_KEY = 'MEMORION_PRACTICE_SETTINGS';
const SHOW_MODAL_KEY = 'MEMORION_SHOW_MODAL';

const NT_BOOKS = [
    "Matthäus", "Markus", "Lukas", "Johannes", "Apostelgeschichte", "Römer",
    "1 Korinther", "2 Korinther", "Galater", "Epheser", "Philipper", "Kolosser",
    "1 Thessalonicher", "2 Thessalonicher", "1 Timotheus", "2 Timotheus",
    "Titus", "Philemon", "Hebräer", "Jakobus", "1 Petrus", "2 Petrus",
    "1 Johannes", "2 Johannes", "3 Johannes", "Judas", "Offenbarung"
];

const AT_BOOKS = [
    "1 Mose", "2 Mose", "3 Mose", "4 Mose", "5 Mose", "Josua", "Richter", "Ruth",
    "1 Samuel", "2 Samuel", "1 Könige", "2 Könige", "1 Chronik", "2 Chronik",
    "Esra", "Nehemia", "Ester", "Hiob", "Psalm", "Sprüche", "Prediger", "Hohelied",
    "Jesaja", "Jeremia", "Klagelieder", "Hesekiel", "Daniel", "Hosea", "Joel",
    "Amos", "Obadja", "Jona", "Micha", "Nahum", "Habakuk", "Zefanja", "Haggai",
    "Sacharja", "Maleachi"
];

const COLORS = {
    bgGradient: ['#F2EDE4', '#EBE5CE', '#D4C4B0'],
    text: { primary: '#2C2420', secondary: '#6B5D52', tertiary: '#9B8B7E' },
    accent: { primary: '#C97848', secondary: '#8B7355' },
    success: '#059669',
    error: '#DC2626',
    glassBorder: 'rgba(255, 255, 255, 0.6)',
}

const CARD_HEIGHT = 320;

const WarmLiquidBackground = () => (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <LinearGradient colors={COLORS.bgGradient} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
        <View style={{ position: 'absolute', top: -height * 0.2, right: -width * 0.3, width: width * 1.5, height: width * 1.5, borderRadius: width * 0.75, backgroundColor: '#FFFFFF', opacity: 0.6 }} />
        <View style={{ position: 'absolute', bottom: -height * 0.1, left: -width * 0.2, width: width * 1.2, height: width * 1.2, borderRadius: width * 0.6, backgroundColor: '#C97848', opacity: 0.15 }} />
        <View style={{ ...StyleSheet.absoluteFillObject, opacity: 0.03, backgroundColor: 'black' }} />
        {Platform.OS === 'ios' ? <BlurView intensity={50} style={StyleSheet.absoluteFill} tint="light" /> : <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.3)' }} />}
    </View>
);

export default function PracticeScreen({ navigation, route }) {
    const params = route.params || {};
    const { categoryId } = params;

    // --- DATA STATE ---
    const [allUserVerses, setAllUserVerses] = useState([]);
    const [activeVerses, setActiveVerses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentVerseIndex, setCurrentVerseIndex] = useState(0);

    // --- SETTINGS STATE ---
    const [showSettingsModal, setShowSettingsModal] = useState(true);
    const [difficulty, setDifficulty] = useState('very_easy');
    const [activeTab, setActiveTab] = useState('NT');
    const [selectedBooks, setSelectedBooks] = useState([]);

    // --- GAME LOGIC STATE ---
    const [hiddenIndices, setHiddenIndices] = useState([]);
    const [activeGapIndex, setActiveGapIndex] = useState(0);
    const [selectedLetters, setSelectedLetters] = useState([]);
    const [selectedWords, setSelectedWords] = useState([]);
    const [availableItems, setAvailableItems] = useState([]);
    const [score, setScore] = useState({ correct: 0, attempts: 0 });
    const [answerStatus, setAnswerStatus] = useState('neutral');

    // --- ANIMATION RE-INSTATING ---
    const animatedValue = useRef(new Animated.Value(0)).current;
    const [val, setVal] = useState(0);
    const shakeAnimation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const listener = animatedValue.addListener(({ value }) => { setVal(value); });
        return () => animatedValue.removeListener(listener);
    }, []);

    // Definition der Interpolations für die Card Flip Animation (HIER WAR DER FEHLER)
    const frontInterpolate = animatedValue.interpolate({ inputRange: [0, 180], outputRange: ['0deg', '180deg'] });
    const backInterpolate = animatedValue.interpolate({ inputRange: [0, 180], outputRange: ['180deg', '360deg'] });
    const frontOpacity = animatedValue.interpolate({ inputRange: [89, 90], outputRange: [1, 0] });
    const backOpacity = animatedValue.interpolate({ inputRange: [89, 90], outputRange: [0, 1] });
    const isFlipped = val >= 90;

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (!showSettingsModal && activeVerses.length > 0) {
            setupRound();
        }
    }, [currentVerseIndex, showSettingsModal, activeVerses]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const savedSettings = await AsyncStorage.getItem(SETTINGS_KEY);
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                if (parsed.difficulty) setDifficulty(parsed.difficulty);
                if (parsed.selectedBooks) setSelectedBooks(parsed.selectedBooks);
            }

            const savedModalState = await AsyncStorage.getItem(SHOW_MODAL_KEY);
            if (savedModalState !== null) {
                setShowSettingsModal(JSON.parse(savedModalState));
            }

            // Load from local JSON file
            console.log('📚 Loading from local JSON...');
            const jsonData = require('../../assets/luther_1912.json');
            
            // Extract verses from JSON structure
            let verses = [];
            if (Array.isArray(jsonData)) {
                verses = jsonData;
            } else if (jsonData.verses && Array.isArray(jsonData.verses)) {
                // Luther Bible structure: { metadata, verses: [...] }
                verses = jsonData.verses;
            } else {
                verses = Object.values(jsonData);
            }
            
            console.log('📊 Raw JSON verses count:', verses.length);
            
            // Filter out verses without text and transform
            const transformedData = verses
                .filter(verse => verse.text && verse.text.trim().length > 0)
                .map(verse => {
                    const wordCount = verse.text.split(' ').length;
                    return {
                        book: verse.book_name,
                        chapter: verse.chapter,
                        verse: verse.verse,
                        text: verse.text,
                        reference: `${verse.book_name} ${verse.chapter}:${verse.verse}`,
                        hidden_word_index: Math.floor(Math.random() * wordCount)
                    };
                });
            
            console.log('✅ JSON loaded:', transformedData?.length || 0, 'verses');
            
            if (transformedData && transformedData.length > 0) {
                setAllUserVerses(transformedData);
                console.log('📖 Sample verse:', transformedData[0]);
            } else {
                console.warn('⚠️ No verses in JSON!');
            }
        } catch (e) { console.error('❌ Error loading:', e); }
        setLoading(false);
    }

    const availableBooks = useMemo(() => {
        const result = {
            NT: NT_BOOKS.sort(),
            AT: AT_BOOKS.sort()
        };
        return result;
    }, [allUserVerses]);

    const toggleBook = (book) => {
        setSelectedBooks(prev => {
            if (prev.includes(book)) return prev.filter(b => b !== book);
            return [...prev, book];
        });
    }

    const selectAllInTab = () => {
        const currentTabBooks = availableBooks[activeTab];
        const allSelected = currentTabBooks.every(b => selectedBooks.includes(b));
        if (allSelected) {
            setSelectedBooks(prev => prev.filter(b => !currentTabBooks.includes(b)));
        } else {
            setSelectedBooks(prev => [...new Set([...prev, ...currentTabBooks])]);
        }
    }

    const startGame = async () => {
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ difficulty, selectedBooks }));
        await AsyncStorage.setItem(SHOW_MODAL_KEY, JSON.stringify(false));
        
        console.log('🎮 Starting game with selectedBooks:', selectedBooks);
        console.log('📚 Available verses count:', allUserVerses.length);
        
        let filtered = selectedBooks.length === 0 ? allUserVerses : allUserVerses.filter(v => {
            const isIncluded = selectedBooks.includes(v.book);
            if (!isIncluded && selectedBooks.length > 0) {
                // Log first few mismatches for debugging
                if (Math.random() < 0.05) console.log('🔍 Verse book:', v.book, 'Not in selectedBooks:', selectedBooks);
            }
            return isIncluded;
        });

        console.log('✅ Filtered verses count:', filtered.length);
        
        if (filtered.length === 0) {
            Alert.alert("Hinweis", "Keine Verse für diese Auswahl gefunden.");
            return;
        }

        setActiveVerses(filtered.sort(() => Math.random() - 0.5));
        setCurrentVerseIndex(0);
        setScore({ correct: 0, attempts: 0 });
        setShowSettingsModal(false);
    }

    const setupRound = () => {
        if (!activeVerses[currentVerseIndex]) return;
        const verse = activeVerses[currentVerseIndex];
        const words = verse.text.split(' ');

        animatedValue.setValue(0);
        setSelectedLetters([]);
        setSelectedWords([]);
        setAnswerStatus('neutral');
        setHiddenIndices([]);
        setActiveGapIndex(0);

        let indicesToHide = [];
        let pool = [];

        if (difficulty === 'hard') {
            const countToHide = Math.min(words.length - 1, Math.max(4, Math.floor(words.length / 3)));
            let allIndices = words.map((_, i) => i).filter(i => !words[i].includes('.') && words[i].length > 2);
            indicesToHide = allIndices.sort(() => Math.random() - 0.5).slice(0, countToHide).sort((a, b) => a - b);
            pool = indicesToHide.map(i => ({ id: i, word: words[i].replace(/[.,!?":;]/g, '') }));
            pool = pool.sort(() => Math.random() - 0.5);
        } else if (difficulty === 'medium') {
            const countToHide = Math.min(words.length, 2);
            let allIndices = words.map((_, i) => i).filter(i => words[i].length > 2);
            indicesToHide = allIndices.sort(() => Math.random() - 0.5).slice(0, countToHide).sort((a, b) => a - b);
            let combinedText = indicesToHide.map(i => words[i].replace(/[.,!?":;]/g, '')).join('');
            let letters = combinedText.split('');
            const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
            for (let k = 0; k < 3; k++) letters.push(alphabet[Math.floor(Math.random() * alphabet.length)]);
            pool = letters.sort(() => Math.random() - 0.5);
        } else {
            let safeIndex = (verse.hidden_word_index >= 0 && verse.hidden_word_index < words.length) ? verse.hidden_word_index : Math.floor(Math.random() * words.length);
            indicesToHide = [safeIndex];
            let targetWord = words[safeIndex].replace(/[.,!?":;]/g, '');
            let letters = targetWord.split('');
            if (difficulty === 'easy') {
                const alphabet = "abcdefghijklmnopqrstuvwxyz";
                for (let k = 0; k < 4; k++) letters.push(alphabet[Math.floor(Math.random() * alphabet.length)]);
            }
            pool = letters.sort(() => Math.random() - 0.5);
        }
        setHiddenIndices(indicesToHide);
        setAvailableItems(pool);
    }

    const handleWordPress = (item) => {
        if (val >= 90 || answerStatus === 'correct') return;
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (answerStatus === 'wrong') setAnswerStatus('neutral');
        if (selectedWords.length < hiddenIndices.length) setSelectedWords([...selectedWords, item]);
    }

    const handleLetterPress = (letter, originalIndex) => {
        if (val >= 90 || answerStatus === 'correct') return;
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (answerStatus === 'wrong') setAnswerStatus('neutral');
        setSelectedLetters([...selectedLetters, { letter, index: originalIndex }]);
    }

    const handleBackspace = () => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setAnswerStatus('neutral');
        if (difficulty === 'hard') {
            const newSel = [...selectedWords];
            newSel.pop();
            setSelectedWords(newSel);
        } else {
            const newSel = [...selectedLetters];
            newSel.pop();
            setSelectedLetters(newSel);
        }
    }

    useEffect(() => {
        if (!activeVerses[currentVerseIndex] || showSettingsModal) return;
        if (val >= 90 || answerStatus === 'correct') return;
        const fullTextWords = activeVerses[currentVerseIndex].text.split(' ');

        if (difficulty === 'hard') {
            if (selectedWords.length === hiddenIndices.length) {
                let allCorrect = true;
                selectedWords.forEach((item, idx) => {
                    const targetIndex = hiddenIndices[idx];
                    const targetWord = fullTextWords[targetIndex].replace(/[.,!?":;]/g, '');
                    if (item.word !== targetWord) allCorrect = false;
                });
                if (allCorrect) handleSuccess();
                else handleFail();
            }
        } else {
            const userString = selectedLetters.map(l => l.letter).join('');
            const currentTargetIndex = hiddenIndices[activeGapIndex];
            if (typeof currentTargetIndex === 'undefined') return;
            const currentTargetWord = fullTextWords[currentTargetIndex].replace(/[.,!?":;]/g, '');
            let previousWordsLength = 0;
            for (let i = 0; i < activeGapIndex; i++) {
                previousWordsLength += fullTextWords[hiddenIndices[i]].replace(/[.,!?":;]/g, '').length;
            }
            const currentUserInputForWord = userString.slice(previousWordsLength);
            if (currentUserInputForWord.length === currentTargetWord.length) {
                if (currentUserInputForWord === currentTargetWord) {
                    if (activeGapIndex < hiddenIndices.length - 1) {
                        setActiveGapIndex(prev => prev + 1);
                        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    } else { handleSuccess(); }
                } else { handleFail(); }
            }
        }
    }, [selectedLetters, selectedWords]);

    const handleSuccess = () => {
        setAnswerStatus('correct');
        setScore(prev => ({ ...prev, correct: prev.correct + 1 }));
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        flipCard();
        setTimeout(() => nextVerse(), 2000);
    }

    const handleFail = () => {
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        shake();
        setAnswerStatus('wrong');
        setScore(prev => ({ ...prev, attempts: prev.attempts + 1 }));
    }

    const shake = () => {
        Animated.sequence([
            Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: USE_NATIVE_DRIVER }),
            Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: USE_NATIVE_DRIVER }),
            Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: USE_NATIVE_DRIVER }),
            Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: USE_NATIVE_DRIVER })
        ]).start();
    };

    const flipCard = () => {
        Animated.timing(animatedValue, {
            toValue: val >= 90 ? 0 : 180,
            duration: 300, easing: Easing.out(Easing.ease), useNativeDriver: USE_NATIVE_DRIVER
        }).start();
    };

    const nextVerse = () => {
        if (currentVerseIndex < activeVerses.length - 1) {
            setCurrentVerseIndex(currentVerseIndex + 1)
        } else {
            const percentage = activeVerses.length > 0 ? Math.round((score.correct / activeVerses.length) * 100) : 0
            Alert.alert("Fertig! 🎉", `Ergebnis: ${percentage}%`);
            navigation.goBack();
        }
    }

    const currentVerse = activeVerses[currentVerseIndex];
    const progressPercent = activeVerses.length > 0 ? ((currentVerseIndex + 1) / activeVerses.length) * 100 : 0;

    const renderVerseText = () => {
        if (!currentVerse) return null;
        const words = currentVerse.text.split(' ');
        return (
            <Text style={styles.verseText}>
                {words.map((word, index) => {
                    const cleanWord = word.replace(/[.,!?":;]/g, '');
                    const isHidden = hiddenIndices.includes(index);
                    if (isHidden) {
                        if (difficulty === 'hard') {
                            const positionInHidden = hiddenIndices.indexOf(index);
                            const filledWord = selectedWords[positionInHidden];
                            return <Text key={index} style={[styles.gapBox, filledWord ? styles.gapFilled : null]}>{filledWord ? filledWord.word : "________"}{" "}</Text>
                        } else {
                            let previousLength = 0;
                            for (let i = 0; i < hiddenIndices.length; i++) {
                                if (hiddenIndices[i] === index) break;
                                previousLength += words[hiddenIndices[i]].replace(/[.,!?":;]/g, '').length;
                            }
                            const userString = selectedLetters.map(l => l.letter).join('');
                            const myInput = userString.slice(previousLength, previousLength + cleanWord.length);
                            const isActive = index === hiddenIndices[activeGapIndex];
                            const isDone = index < hiddenIndices[activeGapIndex];
                            return (
                                <Text key={index} style={[styles.gapText, (myInput.length > 0 || isDone) && styles.gapTextActive, isActive && styles.gapTextHighlight, answerStatus === 'wrong' && isActive && styles.gapTextError]}>
                                    {myInput.padEnd(cleanWord.length, '_')}{word.replace(cleanWord, '')}{" "}
                                </Text>
                            )
                        }
                    }
                    return <Text key={index}>{word} </Text>
                })}
            </Text>
        )
    }

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.accent.primary} />
            </View>
        )
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <WarmLiquidBackground />

            <View style={styles.topBar}>
                <View style={styles.headerRow}>
                    <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
                        <BlurView intensity={80} tint="light" style={styles.iconBlur}><Feather name="arrow-left" size={24} color={COLORS.text.primary} /></BlurView>
                    </Pressable>
                    <View style={styles.headerInfo}>
                        <Text style={styles.categoryPill}>ÜBUNG</Text>
                        <Text style={styles.verseCounter}>{currentVerseIndex + 1} / {activeVerses.length}</Text>
                    </View>
                    <Pressable style={styles.backButton} onPress={() => setShowSettingsModal(true)}>
                        <BlurView intensity={80} tint="light" style={styles.iconBlur}><Feather name="settings" size={24} color={COLORS.text.primary} /></BlurView>
                    </Pressable>
                </View>
                <View style={styles.progressBarBg}><View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} /></View>
            </View>

            {currentVerse ? (
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.cardContainer}>
                        <Animated.View style={[styles.cardShadowWrapper, styles.cardFront, { transform: [{ rotateY: frontInterpolate }, { translateX: shakeAnimation }], opacity: frontOpacity }]}>
                            <BlurView intensity={95} tint="light" style={styles.glassCard}>
                                <View style={styles.innerBorder}>
                                    <Text style={styles.quoteIcon}>❝</Text>
                                    <Text style={styles.reference}>{currentVerse.reference}</Text>
                                    {renderVerseText()}
                                    <Pressable style={styles.helpIconBtn} onPress={flipCard}>
                                        <BlurView intensity={50} tint="light" style={styles.helpBlur}><Feather name="help-circle" size={24} color={COLORS.text.secondary} /></BlurView>
                                    </Pressable>
                                </View>
                            </BlurView>
                        </Animated.View>
                        <Animated.View style={[styles.cardShadowWrapper, styles.cardBack, { transform: [{ rotateY: backInterpolate }], opacity: backOpacity }]}>
                            <LinearGradient colors={[COLORS.accent.primary, COLORS.accent.secondary]} style={styles.solidCard}>
                                <View style={[styles.innerBorder, { borderColor: 'rgba(255,255,255,0.3)' }]}>
                                    <Text style={[styles.quoteIcon, { color: 'rgba(255,255,255,0.2)' }]}>❝</Text>
                                    <Text style={[styles.reference, { color: '#FFF' }]}>{currentVerse.reference}</Text>
                                    <Text style={[styles.verseText, { color: '#FFF' }]}>{currentVerse.text}</Text>
                                    <View style={styles.statusBadge}><Text style={styles.statusText}>Lösung</Text></View>
                                </View>
                            </LinearGradient>
                        </Animated.View>
                    </View>

                    {!isFlipped && (
                        <View style={styles.bottomSection}>
                            <View style={styles.toolBar}>
                                <Text style={styles.hintText}>{difficulty === 'hard' ? 'Wähle die Wörter' : 'Tippe die Buchstaben'}</Text>
                                <Pressable onPress={handleBackspace} style={styles.backspaceBtn}><Feather name="delete" size={22} color={COLORS.text.secondary} /></Pressable>
                            </View>
                            <View style={styles.keyboardGrid}>
                                {difficulty === 'hard' ? (
                                    availableItems.map((item, index) => {
                                        const isUsed = selectedWords.some(w => w.id === item.id);
                                        if (isUsed) return <View key={index} style={styles.wordPlaceholder} />;
                                        return <Pressable key={index} onPress={() => handleWordPress(item)} style={styles.wordChip}><BlurView intensity={70} tint="light" style={styles.glassWord}><Text style={styles.wordText}>{item.word}</Text></BlurView></Pressable>
                                    })
                                ) : (
                                    availableItems.map((letter, index) => {
                                        const isUsed = selectedLetters.some(l => l.index === index);
                                        if (isUsed) return <View key={index} style={styles.keyPlaceholder} />;
                                        return <Pressable key={index} onPress={() => handleLetterPress(letter, index)} style={styles.keyWrapper}><BlurView intensity={70} tint="light" style={styles.glassKey}><Text style={styles.keyText}>{letter}</Text></BlurView></Pressable>
                                    })
                                )}
                            </View>
                        </View>
                    )}
                </ScrollView>
            ) : (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                    <Text style={{ textAlign: 'center', fontFamily: 'CrimsonPro-Bold', fontSize: 18, color: COLORS.text.tertiary }}>Keine Verse ausgewählt.</Text>
                    <Pressable style={[styles.startBtn, { marginTop: 20 }]} onPress={() => setShowSettingsModal(true)}><Text style={styles.startBtnText}>Einstellungen öffnen</Text></Pressable>
                </View>
            )}

            <Modal visible={showSettingsModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.background}>
                        <LinearGradient colors={['rgba(212, 196, 176, 0.95)', 'rgba(201, 184, 168, 0.98)']} style={StyleSheet.absoluteFill} />
                        <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="light" />
                    </View>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Lern-Einstellungen</Text>
                        <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled={true} contentContainerStyle={{ paddingBottom: 100 }}>
                            <Text style={styles.sectionTitle}>SCHWIERIGKEIT</Text>
                            <View style={styles.diffContainer}>
                                {['very_easy', 'easy', 'medium', 'hard'].map((lvl) => (
                                    <Pressable key={lvl} onPress={() => setDifficulty(lvl)} style={[styles.diffChip, difficulty === lvl && styles.diffChipActive]}>
                                        <Text style={[styles.diffChipText, difficulty === lvl && { color: '#FFF' }]}>{lvl === 'very_easy' ? 'Sehr einfach' : lvl === 'easy' ? 'Einfach' : lvl === 'medium' ? 'Mittel' : 'Schwer'}</Text>
                                    </Pressable>
                                ))}
                            </View>
                            <Text style={styles.sectionTitle}>BIBEL BÜCHER</Text>
                            <View style={styles.tabContainer}>
                                <Pressable style={[styles.tabBtn, activeTab === 'AT' && styles.tabBtnActive]} onPress={() => setActiveTab('AT')}><Text style={[styles.tabText, activeTab === 'AT' && styles.tabTextActive]}>Altes Testament</Text></Pressable>
                                <Pressable style={[styles.tabBtn, activeTab === 'NT' && styles.tabBtnActive]} onPress={() => setActiveTab('NT')}><Text style={[styles.tabText, activeTab === 'NT' && styles.tabTextActive]}>Neues Testament</Text></Pressable>
                            </View>
                            <View style={styles.booksGrid}>
                                <Pressable onPress={selectAllInTab} style={[styles.bookChip, { borderColor: COLORS.accent.secondary, borderStyle: 'dashed' }]}><Text style={[styles.bookChipText, { color: COLORS.accent.secondary }]}>Alle markieren</Text></Pressable>
                                {availableBooks[activeTab].length > 0 ? (
                                    availableBooks[activeTab].map((book) => {
                                        const isSelected = selectedBooks.includes(book);
                                        return <Pressable key={book} onPress={() => toggleBook(book)} style={[styles.bookChip, isSelected && styles.bookChipActive]}><Text style={[styles.bookChipText, isSelected && { color: '#FFF' }]}>{book}</Text></Pressable>
                                    })
                                ) : <Text style={{ width: '100%', textAlign: 'center', marginVertical: 20, color: COLORS.text.tertiary }}>Keine Verse gefunden.</Text>}
                            </View>
                            <Pressable style={[styles.startBtn, {marginTop: 20, marginHorizontal: 0}]} onPress={startGame}><Text style={styles.startBtnText}>LOS GEHT'S</Text></Pressable>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#EBE5CE' },
    background: { ...StyleSheet.absoluteFillObject },
    topBar: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 10, paddingHorizontal: 24 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    backButton: { width: 44, height: 44, borderRadius: 14, overflow: 'hidden' },
    iconBlur: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.4)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)' },
    headerInfo: { alignItems: 'center', flex: 1 },
    categoryPill: { fontFamily: 'CrimsonPro-Bold', fontSize: 16, color: COLORS.text.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
    verseCounter: { fontFamily: 'CrimsonPro-Medium', fontSize: 13, color: COLORS.text.secondary },
    progressBarBg: { height: 4, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 2, width: '100%' },
    progressBarFill: { height: '100%', borderRadius: 2, backgroundColor: COLORS.accent.primary },
    scrollContent: { paddingHorizontal: 24, paddingBottom: 50 },
    cardContainer: { minHeight: CARD_HEIGHT, width: '100%', marginTop: 20, marginBottom: 20 },
    cardShadowWrapper: { width: '100%', minHeight: CARD_HEIGHT, borderRadius: 30, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 12 },
    cardFront: { zIndex: 2, backfaceVisibility: 'hidden' },
    cardBack: { zIndex: 1, backfaceVisibility: 'hidden', position: 'absolute' },
    glassCard: { flex: 1, borderRadius: 30, overflow: 'hidden', padding: 20, borderWidth: 1, borderColor: COLORS.glassBorder, backgroundColor: 'rgba(255,255,255,0.5)' },
    solidCard: { flex: 1, borderRadius: 30, padding: 20, minHeight: CARD_HEIGHT },
    innerBorder: { flex: 1, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', padding: 24, justifyContent: 'center', alignItems: 'flex-start' },
    quoteIcon: { position: 'absolute', top: 10, left: 10, fontSize: 80, color: 'rgba(44,36,32,0.05)', fontFamily: 'CrimsonPro-Bold', zIndex: -1 },
    reference: { fontFamily: 'CrimsonPro-Bold', fontSize: 14, color: COLORS.text.secondary, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 2 },
    verseText: { fontFamily: 'CrimsonPro-Regular', fontSize: 24, lineHeight: 40, color: COLORS.text.primary, textAlign: 'left' },
    gapText: { fontFamily: 'CrimsonPro-Medium', color: 'rgba(0,0,0,0.2)' },
    gapTextActive: { fontFamily: 'CrimsonPro-Bold', color: COLORS.accent.primary, textDecorationLine: 'underline', textDecorationColor: 'rgba(201,120,72,0.3)' },
    gapTextHighlight: { backgroundColor: 'rgba(201,120,72,0.1)', borderRadius: 4 },
    gapTextError: { color: COLORS.error },
    gapBox: { fontFamily: 'CrimsonPro-Bold', color: COLORS.accent.primary, textDecorationLine: 'underline' },
    gapFilled: { color: COLORS.text.primary },
    helpIconBtn: { position: 'absolute', bottom: 10, right: 10, borderRadius: 22, overflow: 'hidden', width: 44, height: 44 },
    helpBlur: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.4)' },
    statusBadge: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, alignSelf: 'center' },
    statusText: { fontFamily: 'CrimsonPro-Bold', color: '#FFF', fontSize: 14 },
    bottomSection: { width: '100%', zIndex: 100 },
    toolBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 10 },
    hintText: { fontFamily: 'CrimsonPro-Medium', color: COLORS.text.tertiary, fontSize: 14 },
    backspaceBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.4)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FFF' },
    keyboardGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
    keyPlaceholder: { width: 50, height: 60 },
    keyWrapper: { width: 50, height: 64, borderRadius: 16, overflow: 'hidden', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 4 },
    glassKey: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' },
    keyText: { fontFamily: 'CrimsonPro-Bold', fontSize: 24, color: COLORS.text.primary },
    wordChip: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, overflow: 'hidden', marginBottom: 8, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4 },
    glassWord: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.6)' },
    wordText: { fontFamily: 'CrimsonPro-Bold', fontSize: 18, color: COLORS.text.primary },
    wordPlaceholder: { width: 80, height: 40, margin: 4 },
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalContent: { height: '95%', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingTop: 32 },
    modalTitle: { fontFamily: 'CrimsonPro-Bold', fontSize: 28, color: COLORS.text.primary, marginBottom: 24, textAlign: 'center' },
    sectionTitle: { fontFamily: 'CrimsonPro-Bold', fontSize: 13, color: COLORS.text.tertiary, letterSpacing: 1.5, marginBottom: 12, marginTop: 12 },
    diffContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    diffChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.4)', borderWidth: 1, borderColor: COLORS.glassBorder },
    diffChipActive: { backgroundColor: COLORS.accent.primary, borderColor: COLORS.accent.primary },
    diffChipText: { fontFamily: 'CrimsonPro-SemiBold', fontSize: 14, color: COLORS.text.secondary },
    tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 12, padding: 4, marginBottom: 16 },
    tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    tabBtnActive: { backgroundColor: '#FFF' },
    tabText: { fontFamily: 'CrimsonPro-Medium', fontSize: 14, color: COLORS.text.tertiary },
    tabTextActive: { fontFamily: 'CrimsonPro-Bold', color: COLORS.text.primary },
    booksGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-start' },
    bookChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.4)', borderWidth: 1, borderColor: 'transparent', maxWidth: '48%' },
    bookChipActive: { backgroundColor: COLORS.accent.primary, borderColor: COLORS.accent.primary },
    bookChipText: { fontFamily: 'CrimsonPro-Medium', fontSize: 14, color: COLORS.text.secondary },
    modalFooter: { display: 'none' },
    startBtn: { backgroundColor: COLORS.accent.primary, paddingVertical: 18, borderRadius: 20, alignItems: 'center' },
    startBtnText: { fontFamily: 'CrimsonPro-Bold', color: '#FFF', fontSize: 18, letterSpacing: 1 },
});