import { Feather } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFocusEffect } from '@react-navigation/native'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    Keyboard,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    UIManager,
    View
} from 'react-native'

// Lade das JSON mit allen Versen
const jsonData = require('../../assets/luther_1912.json');

const { width, height } = Dimensions.get('window');
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- CONFIG ---
const SESSIONS_KEY = 'MEMORION_SESSIONS';
const PROGRESS_KEY = 'MEMORION_USER_PROGRESS_V1';
const SESSION_STATE_KEY = 'MEMORION_SESSION_STATE'; // Speichert die aktuelle Reihenfolge der Verse in der Session

const NT_BOOKS = [
    "Matthäus", "Markus", "Lukas", "Johannes", "Apostelgeschichte", "Römer",
    "1. Korinther", "2. Korinther", "Galater", "Epheser", "Philipper", "Kolosser",
    "1. Thessalonicher", "2. Thessalonicher", "1. Timotheus", "2. Timotheus",
    "Titus", "Philemon", "Hebräer", "Jakobus", "1. Petrus", "2. Petrus",
    "1. Johannes", "2. Johannes", "3. Johannes", "Judas", "Offenbarung"
];

const AT_BOOKS = [
    "1. Mose", "2. Mose", "3. Mose", "4. Mose", "5. Mose", "Josua", "Richter", "Ruth",
    "1. Samuel", "2. Samuel", "1. Könige", "2. Könige", "1. Chronik", "2. Chronik",
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
    warning: '#D97706', // Orange für Wiederholung
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

export default function PracticeScreen({ navigation }) {

    // --- STATE ---
    const [mode, setMode] = useState('overview');
    const [sessions, setSessions] = useState([]);
    const [allUserVerses, setAllUserVerses] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fortschritt
    const [userProgress, setUserProgress] = useState({});
    const [totalPoints, setTotalPoints] = useState(0);

    // Active Session State
    const [activeVerses, setActiveVerses] = useState([]);
    const [currentSession, setCurrentSession] = useState(null); // Speichere die aktuelle Session
    const [initialVerseCount, setInitialVerseCount] = useState(0); // Speichere die ursprüngliche Anzahl
    const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
    const [currentDifficulty, setCurrentDifficulty] = useState('medium');

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [newSessionName, setNewSessionName] = useState('');
    const [tempDiff, setTempDiff] = useState('medium');
    const [tempBooks, setTempBooks] = useState([]);
    const [activeTab, setActiveTab] = useState('NT');
    const [tempVerseLimit, setTempVerseLimit] = useState('');
    const [includeSolved, setIncludeSolved] = useState(false);

    // Game Logic State
    const [hiddenIndices, setHiddenIndices] = useState([]);
    const [activeGapIndex, setActiveGapIndex] = useState(0);
    const [selectedLetters, setSelectedLetters] = useState([]);
    const [selectedWords, setSelectedWords] = useState([]);
    const [availableItems, setAvailableItems] = useState([]);
    const [score, setScore] = useState({ correct: 0, attempts: 0 });
    const [answerStatus, setAnswerStatus] = useState('neutral');
    const [solutionShown, setSolutionShown] = useState(false);

    // Animations
    const animatedValue = useRef(new Animated.Value(0)).current;
    const [val, setVal] = useState(0);
    const shakeAnimation = useRef(new Animated.Value(0)).current;
    const isProcessing = useRef(false); // Flag um zu prüfen dass nextVerse() nur einmal aufgerufen wird
    const isFlippingCard = useRef(false); // Flag um flipCard() zu schützen
    
    // Feedback Animations (Grün und Orange)
    const successAnim = useRef(new Animated.Value(0)).current;
    const successY = useRef(new Animated.Value(0)).current;
    const repeatAnim = useRef(new Animated.Value(0)).current;
    const repeatY = useRef(new Animated.Value(0)).current;

    // Interpolations
    const frontInterpolate = animatedValue.interpolate({ inputRange: [0, 180], outputRange: ['0deg', '180deg'] });
    const backInterpolate = animatedValue.interpolate({ inputRange: [0, 180], outputRange: ['180deg', '360deg'] });
    const frontOpacity = animatedValue.interpolate({ inputRange: [89, 90], outputRange: [1, 0] });
    const backOpacity = animatedValue.interpolate({ inputRange: [89, 90], outputRange: [0, 1] });
    const isFlipped = val >= 90;

    useEffect(() => {
        const listener = animatedValue.addListener(({ value }) => { setVal(value); });
        return () => animatedValue.removeListener(listener);
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadData();
            return () => { };
        }, [])
    );

    // START ROUND
    useEffect(() => {
        if (mode === 'practice' && activeVerses.length > 0 && currentVerseIndex < activeVerses.length) {
            setupRound();
        }
    }, [mode, currentVerseIndex]);

    useEffect(() => {
        setSolutionShown(false);
        setAnswerStatus('neutral'); // Reset für nächsten Vers
        // Reset both feedback animations
        successAnim.setValue(0);
        successY.setValue(0);
        repeatAnim.setValue(0);
        repeatY.setValue(0);
    }, [currentVerseIndex]);

    // REFRESH LOGIC
    useEffect(() => {
        if (mode === 'overview') {
            const refreshProgress = async () => {
                try {
                    const savedProgress = await AsyncStorage.getItem(PROGRESS_KEY);
                    if (savedProgress) {
                        const parsed = JSON.parse(savedProgress);
                        setUserProgress(parsed);
                        const points = Object.values(parsed).filter(val => val === 1).length;
                        setTotalPoints(points);
                    }
                } catch (e) {
                    console.error("Fehler beim Refresh:", e);
                }
            };
            refreshProgress();
        }
    }, [mode]);

    const triggerFeedbackAnim = (type) => {
        // Reset both animations
        successAnim.setValue(0);
        successY.setValue(0);
        repeatAnim.setValue(0);
        repeatY.setValue(0);

        const opacityAnim = type === 'success' ? successAnim : repeatAnim;
        const moveAnim = type === 'success' ? successY : repeatY;

        // Start animation
        opacityAnim.setValue(1);
        moveAnim.setValue(0);

        Animated.parallel([
            Animated.timing(opacityAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
            Animated.timing(moveAnim, { toValue: -40, duration: 1500, easing: Easing.out(Easing.ease), useNativeDriver: true })
        ]).start();
    }

    const loadData = async () => {
        try {
            setLoading(true);
            const savedProgress = await AsyncStorage.getItem(PROGRESS_KEY);
            let parsedProgress = {};
            if (savedProgress) {
                parsedProgress = JSON.parse(savedProgress);
                console.log('loadData - saved progress:', Object.keys(parsedProgress).length, 'items');
                setUserProgress(parsedProgress);
                const points = Object.values(parsedProgress).filter(v => v === 1).length;
                console.log('loadData - solved count:', points);
                setTotalPoints(points);
            } else {
                console.log('loadData - NO saved progress found');
            }
            const savedSessions = await AsyncStorage.getItem(SESSIONS_KEY);
            let loadedSessions = [];
            if (savedSessions) {
                loadedSessions = JSON.parse(savedSessions);
            }
            const customSessions = loadedSessions
                .filter(s => s.id !== 'default_merkliste')
                .map(s => ({ ...s, verseLimit: s.verseLimit || 0, includeSolved: s.includeSolved || false }));

            const defaultSession = {
                id: 'default_merkliste',
                name: 'Merkliste (Alle)',
                difficulty: 'medium',
                books: [],
                verseLimit: 0,
                includeSolved: false,
                isSystem: true
            };
            setSessions([defaultSession, ...customSessions]);

            const verses = jsonData.verses || [];
            const transformedVerses = verses
                .filter(verse => verse.text && verse.text.trim().length > 0)
                .map(verse => {
                    const words = verse.text.split(' ');
                    const refKey = `${verse.book_name} ${verse.chapter}:${verse.verse}`;
                    return {
                        id: refKey,
                        book: verse.book_name,
                        chapter: verse.chapter,
                        verse: verse.verse,
                        text: verse.text,
                        reference: refKey,
                        hidden_word_index: Math.floor(Math.random() * words.length)
                    };
                });
            setAllUserVerses(transformedVerses);
        } catch (e) { console.error(e) }
        setLoading(false);
    }

    const availableBooks = useMemo(() => {
        return { AT: AT_BOOKS.sort(), NT: NT_BOOKS.sort() };
    }, []);

    const countAvailableVerses = useMemo(() => {
        if (tempBooks.length === 0) return allUserVerses.length;
        return allUserVerses.filter(v => tempBooks.includes(v.book)).length;
    }, [tempBooks, allUserVerses]);

    // --- DASHBOARD LOGIK ---
    const calculateRemainingVerses = (session) => {
        let pool = [...allUserVerses];
        if (session.books && session.books.length > 0) {
            const normalizedBooks = session.books.map(b => b.replace(/(\d)\.(\s)/g, '$1$2'));
            pool = pool.filter(v => normalizedBooks.includes(v.book));
        }
        
        if (session.includeSolved) {
            const total = pool.length;
            if (session.verseLimit > 0) return Math.min(total, session.verseLimit);
            return total;
        }

        const totalInPool = pool.length;
        const solvedInPool = pool.filter(v => userProgress[v.id] === 1).length;
        
        if (session.verseLimit > 0) {
            const targetGoal = Math.min(totalInPool, session.verseLimit);
            return Math.max(0, targetGoal - solvedInPool);
        }
        return Math.max(0, totalInPool - solvedInPool);
    };

    const createSession = async () => {
        if (!newSessionName.trim()) {
            Alert.alert("Fehler", "Bitte gib der Session einen Namen.");
            return;
        }
        const limit = parseInt(tempVerseLimit);
        const finalLimit = isNaN(limit) || limit <= 0 ? 0 : limit;

        const newSession = {
            id: Date.now().toString(),
            name: newSessionName,
            difficulty: tempDiff,
            books: tempBooks,
            verseLimit: finalLimit,
            includeSolved: includeSolved,
            isSystem: false
        };

        const currentCustomSessions = sessions.filter(s => !s.isSystem);
        const updatedCustom = [...currentCustomSessions, newSession];

        await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(updatedCustom));
        setSessions([sessions[0], ...updatedCustom]);

        setShowModal(false);
        setNewSessionName('');
        setTempBooks([]);
        setTempVerseLimit('');
        setIncludeSolved(false);
    }

    const deleteSession = async (id) => {
        const sessionToDelete = sessions.find(s => s.id === id);
        if (sessionToDelete?.isSystem) {
            Alert.alert("Info", "Die Merkliste kann nicht gelöscht werden.");
            return;
        }
        Alert.alert("Löschen", "Möchtest du diese Session wirklich löschen?", [
            { text: "Abbrechen", style: "cancel" },
            {
                text: "Löschen", style: "destructive", onPress: async () => {
                    const currentCustomSessions = sessions.filter(s => !s.isSystem && s.id !== id);
                    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(currentCustomSessions));
                    setSessions([sessions[0], ...currentCustomSessions]);
                }
            }
        ]);
    }

    // --- START SESSION (FIX: Logik 1:1 wie Dashboard) ---
    const startSession = async (session) => {
        let pool = [...allUserVerses];
        const normalizedBooks = session.books.map(b => b.replace(/(\d)\.(\s)/g, '$1$2'));
        
        if (normalizedBooks.length > 0) {
            pool = pool.filter(v => normalizedBooks.includes(v.book));
        }

        let filtered = [];

        // 1. Zuerst filtern wir genau wie auf dem Dashboard
        if (session.includeSolved) {
             // Im Wiederholmodus nehmen wir alle
             filtered = pool;
        } else {
             // Im normalen Modus NUR ungelöste
             // userProgress ist immer aktuell durch useFocusEffect
             filtered = pool.filter(v => userProgress[v.id] !== 1);
        }

        if (filtered.length === 0) {
            Alert.alert("Fertig! 🎉", "Du hast alle offenen Verse dieser Session bereits gelöst!");
            return;
        }

        // 2. Prüfe ob diese Session bereits gestartet wurde (gespeicherte Reihenfolge)
        const savedStates = await AsyncStorage.getItem(SESSION_STATE_KEY);
        let sessionState = {};
        if (savedStates) {
            sessionState = JSON.parse(savedStates);
        }

        let shuffled;
        if (sessionState[session.id]) {
            // Session wurde bereits gestartet - lade die gespeicherte Reihenfolge
            // ABER: Filtere Verse raus die inzwischen gelöst wurden!
            const savedOrder = sessionState[session.id];
            shuffled = savedOrder.filter(v => {
                if (session.includeSolved) return true; // Keep all if repeating
                return userProgress[v.id] !== 1; // Remove if solved
            });
            console.log('Loaded saved session order:', savedOrder.length, 'verses total ->', shuffled.length, 'after filtering solved');
        } else {
            // Neue Session - erstelle neue Reihenfolge
            shuffled = filtered.sort(() => Math.random() - 0.5);

            if (session.verseLimit > 0) {
                shuffled = shuffled.slice(0, session.verseLimit);
            }

            // Speichere die Reihenfolge
            sessionState[session.id] = shuffled;
            await AsyncStorage.setItem(SESSION_STATE_KEY, JSON.stringify(sessionState));
        }

        setActiveVerses(shuffled);
        setCurrentSession(session); // Speichere die aktuelle Session
        // WICHTIG: initialVerseCount sollte GLEICH sein wie auf dem Dashboard!
        // Das ist die Anzahl die auf dem Dashboard angezeigt wird (calculateRemainingVerses)
        const dashboardCount = calculateRemainingVerses(session);
        setInitialVerseCount(dashboardCount);
        setCurrentDifficulty(session.difficulty || 'medium');
        setCurrentVerseIndex(0);
        setScore({ correct: 0, attempts: 0 });
        setMode('practice');
    }

    const toggleTempBook = (book) => {
        setTempBooks(prev => {
            if (prev.includes(book)) return prev.filter(b => b !== book);
            return [...prev, book];
        });
    }

    const selectAllInTab = () => {
        const currentTabBooks = availableBooks[activeTab];
        const allSelected = currentTabBooks.every(b => tempBooks.includes(b));
        if (allSelected) setTempBooks(prev => prev.filter(b => !currentTabBooks.includes(b)));
        else setTempBooks(prev => [...new Set([...prev, ...currentTabBooks])]);
    }

    // --- GAME LOGIC ---
    const setupRound = () => {
        const verse = activeVerses[currentVerseIndex];
        console.log('setupRound called:', {currentVerseIndex, verse: verse?.reference, val});
        if (!verse) return; // Safety check
        
        // WICHTIG: Reset solutionShown und animatedValue wenn neuer Vers geladen wird
        setSolutionShown(false);
        animatedValue.setValue(0); // Karte zurück zur Vorderseite!
        setVal(0); // Wichtig: Auch den State updaten damit UI sofort reagiert
        console.log('setupRound - animatedValue und val gesetzt auf 0');
        
        // WICHTIG: Erlauben neue Aufrufe
        isFlippingCard.current = false;
        isProcessing.current = false;
        
        const words = verse.text.split(' ');
        setSelectedLetters([]);
        setSelectedWords([]);
        setHiddenIndices([]);
        setActiveGapIndex(0);

        let indicesToHide = [];
        let pool = [];

        if (currentDifficulty === 'hard') {
            const countToHide = Math.min(words.length - 1, Math.max(4, Math.floor(words.length / 3)));
            let allIndices = words.map((_, i) => i).filter(i => !words[i].includes('.') && words[i].length > 2);
            indicesToHide = allIndices.sort(() => Math.random() - 0.5).slice(0, countToHide).sort((a, b) => a - b);
            pool = indicesToHide.map(i => ({ id: i, word: words[i].replace(/[.,!?":;]/g, '') }));
        } else if (currentDifficulty === 'medium') {
            const countToHide = Math.min(words.length, 2);
            let allIndices = words.map((_, i) => i).filter(i => words[i].length > 2);
            indicesToHide = allIndices.sort(() => Math.random() - 0.5).slice(0, countToHide).sort((a, b) => a - b);
            let combinedText = indicesToHide.map(i => words[i].replace(/[.,!?":;]/g, '')).join('');
            let letters = combinedText.split('');
            const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
            for (let k = 0; k < 3; k++) letters.push(alphabet[Math.floor(Math.random() * alphabet.length)]);
            pool = letters;
        } else {
            let safeIndex = (verse.hidden_word_index >= 0 && verse.hidden_word_index < words.length) ? verse.hidden_word_index : Math.floor(Math.random() * words.length);
            indicesToHide = [safeIndex];
            let targetWord = words[safeIndex].replace(/[.,!?":;]/g, '');
            let letters = targetWord.split('');
            if (currentDifficulty === 'easy') {
                const alphabet = "abcdefghijklmnopqrstuvwxyz";
                for (let k = 0; k < 4; k++) letters.push(alphabet[Math.floor(Math.random() * alphabet.length)]);
            }
            pool = letters;
        }
        pool = pool.sort(() => Math.random() - 0.5);
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
        if (currentDifficulty === 'hard') {
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
        if (mode !== 'practice' || !activeVerses[currentVerseIndex]) return;
        if (val >= 90 || answerStatus === 'correct') return;
        const fullTextWords = activeVerses[currentVerseIndex].text.split(' ');

        if (currentDifficulty === 'hard') {
            if (selectedWords.length === hiddenIndices.length) {
                let allCorrect = true;
                selectedWords.forEach((item, idx) => {
                    const targetIndex = hiddenIndices[idx];
                    const targetWord = fullTextWords[targetIndex].replace(/[.,!?":;]/g, '');
                    if (item.word !== targetWord) allCorrect = false;
                });
                if (allCorrect) handleSuccess(); else handleFail();
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

    const handleSuccess = async () => {
        setAnswerStatus('correct');
        console.log('handleSuccess called - BEFORE increment, score.correct:', score.correct);
        setScore(prev => {
            const newCorrect = prev.correct + 1;
            console.log('handleSuccess - incrementing score.correct from', prev.correct, 'to', newCorrect);
            return { ...prev, correct: newCorrect };
        });
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // --- ANIMATION -1 (GRÜN: Gelöst) ---
        triggerFeedbackAnim('success');

        const currentRef = activeVerses[currentVerseIndex].id;
        const wasAlreadySolved = userProgress[currentRef] === 1;
        const newProgress = { ...userProgress };
        newProgress[currentRef] = 1; 
        setUserProgress(newProgress);
        const solvedCount = Object.values(newProgress).filter(val => val === 1).length;
        setTotalPoints(solvedCount);
        console.log('handleSuccess - saved:', currentRef, 'was already solved:', wasAlreadySolved, 'solved count:', solvedCount);
        AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(newProgress)).catch(e => console.log('AsyncStorage error:', e));

        flipCard(true, true); // Pass (cardFlip, isSuccess)
        // Lass flipCard() das nextVerse() handling übernehmen!
    }

    const handleFail = () => {
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        shake();
        setAnswerStatus('wrong');
        setScore(prev => ({ ...prev, attempts: prev.attempts + 1 }));
        // flipCard wird später aufgerufen, wenn User auf Help klickt
    }

    const shake = () => {
        Animated.sequence([
            Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: USE_NATIVE_DRIVER }),
            Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: USE_NATIVE_DRIVER }),
            Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: USE_NATIVE_DRIVER }),
            Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: USE_NATIVE_DRIVER })
        ]).start();
    };

    const flipCard = (isSuccess = false, isCorrect = false) => {
        console.log('🔄 flipCard called:', {isSuccess, isCorrect, isFlipping: isFlippingCard.current, val, currentVerseIndex});
        if (isFlippingCard.current) {
            console.log('❌ flipCard BLOCKED - already flipping');
            return;
        }
        isFlippingCard.current = true;
        
        if (val < 90) {
            console.log('📝 Flipping to back (val < 90)');
            
            // Orange-Animation für nicht gelöst
            if (!isSuccess) {
                console.log('🟠 Triggering repeat animation');
                triggerFeedbackAnim('repeat');
                if (Platform.OS !== 'web') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                }
            }
            
            // Flip animation
            Animated.timing(animatedValue, {
                toValue: 180,
                duration: 300, 
                easing: Easing.out(Easing.ease), 
                useNativeDriver: USE_NATIVE_DRIVER
            }).start();
            
            setSolutionShown(true);
            
            // Nach 3 Sekunden: Reset
            setTimeout(() => {
                console.log('⏱️ 3 seconds passed, resetting');
                
                // Vers nach hinten schieben (nur wenn nicht korrekt)
                if (!isCorrect) {
                    console.log('🔃 Moving verse to end');
                    const currentV = activeVerses[currentVerseIndex];
                    const newVerses = [...activeVerses.slice(0, currentVerseIndex), ...activeVerses.slice(currentVerseIndex + 1), currentV];
                    setActiveVerses(newVerses);
                    
                    // Speichere in AsyncStorage
                    if (currentSession) {
                        AsyncStorage.getItem(SESSION_STATE_KEY).then(savedStates => {
                            let sessionState = savedStates ? JSON.parse(savedStates) : {};
                            sessionState[currentSession.id] = newVerses;
                            AsyncStorage.setItem(SESSION_STATE_KEY, JSON.stringify(sessionState));
                        });
                    }
                }
                
                // RESET: Alles zurücksetzen für nächsten Vers
                console.log('🔄 Resetting state for next verse');
                setSolutionShown(false);
                setAnswerStatus('neutral');
                
                // Karte zurück flippen
                Animated.timing(animatedValue, {
                    toValue: 0,
                    duration: 300, 
                    easing: Easing.out(Easing.ease), 
                    useNativeDriver: USE_NATIVE_DRIVER
                }).start();
                
                // Index erhöhen (triggert setupRound automatisch)
                setCurrentVerseIndex(prev => {
                    const nextIdx = prev + 1;
                    console.log('📊 Index:', prev, '->', nextIdx);
                    return nextIdx;
                });
                
                isFlippingCard.current = false;
            }, 3000);
        } else {
            console.log('📝 Flipping to front (val >= 90)');
            setSolutionShown(false);
            Animated.timing(animatedValue, {
                toValue: 0,
                duration: 300, 
                easing: Easing.out(Easing.ease), 
                useNativeDriver: USE_NATIVE_DRIVER
            }).start(() => {
                isFlippingCard.current = false;
            });
        }
    };

    const nextVerse = async (isCorrect = false) => {
        // WICHTIG: Prüfe dass nextVerse() nur einmal aufgerufen wird!
        console.log('nextVerse called:', {isCorrect, isProcessing: isProcessing.current, currentVerseIndex});
        if (isProcessing.current) {
            console.log('nextVerse BLOCKED');
            return;
        }
        isProcessing.current = true;
        console.log('nextVerse processing:', {isCorrect});

        if (!isCorrect) {
            // NICHT GELÖST: Verse wurden schon in flipCard() nach hinten geschoben
            console.log('nextVerse - nicht gelöst - verse bereits nach hinten');
            // Warte nur noch auf Animation bevor Index erhöht wird
            setTimeout(() => {
                // Index erhöht sich NICHT, weil Verse schon nach hinten
                console.log('nextVerse - nicht gelöst - currentVerseIndex bleibt:', currentVerseIndex);
                isProcessing.current = false;
            }, 500);
        } else {
            // GELÖST: Zum nächsten Vers
            // Reset State SOFORT
            setSolutionShown(false);
            setAnswerStatus('neutral');
            
            setCurrentVerseIndex(prev => {
                if (prev < activeVerses.length - 1) {
                    // Zum nächsten Vers
                    // WICHTIG: Halte die Flag noch 500ms länger, damit der neue Vers geladen ist
                    setTimeout(() => {
                        isProcessing.current = false;
                    }, 500);
                    return prev + 1;
                } else {
                    // Session vorbei
                    const percentage = activeVerses.length > 0 ? Math.round((score.correct / activeVerses.length) * 100) : 0;
                    setTimeout(() => {
                        Alert.alert("Session beendet! 🎉", `Ergebnis: ${percentage}%`);
                        setMode('overview');
                        // Lösche die Session-Daten wenn fertig
                        if (currentSession) {
                            AsyncStorage.getItem(SESSION_STATE_KEY).then(savedStates => {
                                if (savedStates) {
                                    const sessionState = JSON.parse(savedStates);
                                    delete sessionState[currentSession.id];
                                    AsyncStorage.setItem(SESSION_STATE_KEY, JSON.stringify(sessionState));
                                }
                            });
                        }
                        isProcessing.current = false;
                    }, 100);
                    return prev;
                }
            });
        }
    }

    const currentVerse = activeVerses[currentVerseIndex];
    // Progress für Balken
    const progressPercent = activeVerses.length > 0 ? ((currentVerseIndex + 1) / activeVerses.length) * 100 : 0;
    
    // --- COUNTDOWN: Basiert auf gelösten Versen, nicht auf Index! ---
    // initialVerseCount = 100, score.correct = 5 -> remainingCount = 95
    const remainingCount = initialVerseCount - score.correct;

    const renderVerseText = () => {
        if (!currentVerse) return null;
        const words = currentVerse.text.split(' ');
        return (
            <Text style={styles.verseText}>
                {words.map((word, index) => {
                    const cleanWord = word.replace(/[.,!?":;]/g, '');
                    const isHidden = hiddenIndices.includes(index);
                    if (isHidden) {
                        if (currentDifficulty === 'hard') {
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

    // --- RENDER MODES ---

    if (mode === 'overview') {
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
                            <Text style={styles.categoryPill}>DEINE SESSIONS</Text>
                            <Text style={styles.verseCounter}>{totalPoints} Verse gemeistert</Text>
                        </View>
                        <View style={{ width: 44 }} />
                    </View>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {sessions.map((session) => (
                        <Pressable 
                            key={session.id + JSON.stringify(userProgress)} 
                            style={({ pressed }) => [styles.sessionCard, pressed && { transform: [{ scale: 0.98 }] }]} 
                            onPress={() => startSession(session)}
                        >
                            <BlurView intensity={80} tint="light" style={styles.glassContainer}>
                                <LinearGradient colors={['rgba(255,255,255,0.7)', 'rgba(255,255,255,0.3)']} style={StyleSheet.absoluteFill} />
                                <View style={styles.sessionContent}>
                                    <View style={[styles.sessionIcon, session.isSystem && { backgroundColor: COLORS.accent.primary }]}>
                                        <Feather name={session.isSystem ? "bookmark" : "layers"} size={24} color={session.isSystem ? "#FFF" : COLORS.accent.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.sessionTitle}>{session.name}</Text>
                                        <View>
                                            <Text style={styles.sessionSub}>• {session.difficulty === 'very_easy' ? 'Sehr einfach' : session.difficulty === 'hard' ? 'Schwer' : 'Mittel'}</Text>
                                            <Text style={styles.sessionSub}>• {session.books.length > 0 ? `${session.books.length} Bücher` : 'Alle Bücher'}</Text>
                                            <Text style={[styles.sessionSub, { color: COLORS.accent.primary, fontFamily: 'CrimsonPro-Bold' }]}>
                                                • {session.includeSolved ? `Wiederholung: ${calculateRemainingVerses(session)}` : `${calculateRemainingVerses(session)} Verse offen`}
                                            </Text>
                                        </View>
                                    </View>

                                    {!session.isSystem && (
                                        <Pressable onPress={(e) => { e.stopPropagation(); deleteSession(session.id); }} style={{ padding: 8 }}>
                                            <Feather name="trash-2" size={18} color={COLORS.text.tertiary} />
                                        </Pressable>
                                    )}
                                </View>
                            </BlurView>
                        </Pressable>
                    ))}

                    <Pressable style={styles.createBtn} onPress={() => setShowModal(true)}>
                        <BlurView intensity={60} tint="light" style={styles.glassContainer}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 60 }}>
                                <Feather name="plus-circle" size={24} color={COLORS.text.secondary} style={{ marginRight: 8 }} />
                                <Text style={{ fontFamily: 'CrimsonPro-Bold', fontSize: 16, color: COLORS.text.secondary }}>Neue Session erstellen</Text>
                            </View>
                        </BlurView>
                    </Pressable>
                </ScrollView>

                {/* CREATE SESSION MODAL */}
                <Modal visible={showModal} transparent animationType="slide">
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.modalOverlay}>
                            <View style={styles.background}>
                                <LinearGradient colors={['rgba(212, 196, 176, 0.95)', 'rgba(201, 184, 168, 0.98)']} style={StyleSheet.absoluteFill} />
                                <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="light" />
                            </View>
                            <View style={styles.modalContent}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                    <Text style={styles.modalTitle}>Neue Session</Text>
                                    <Pressable onPress={() => setShowModal(false)}><Feather name="x" size={24} color={COLORS.text.primary} /></Pressable>
                                </View>

                                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                                    <Text style={styles.inputLabel}>NAME DER SESSION</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="z.B. Römerbrief lernen..."
                                        value={newSessionName}
                                        onChangeText={setNewSessionName}
                                        placeholderTextColor="rgba(0,0,0,0.3)"
                                    />

                                    <Text style={styles.sectionTitle}>SCHWIERIGKEIT</Text>
                                    <View style={styles.diffContainer}>
                                        {['very_easy', 'easy', 'medium', 'hard'].map((lvl) => (
                                            <Pressable key={lvl} onPress={() => setTempDiff(lvl)} style={[styles.diffChip, tempDiff === lvl && styles.diffChipActive]}>
                                                <Text style={[styles.diffChipText, tempDiff === lvl && { color: '#FFF' }]}>{lvl === 'very_easy' ? 'Sehr einfach' : lvl === 'easy' ? 'Einfach' : lvl === 'medium' ? 'Mittel' : 'Schwer'}</Text>
                                            </Pressable>
                                        ))}
                                    </View>

                                    <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12}}>
                                        <Text style={[styles.sectionTitle, {marginTop: 0, marginBottom: 0}]}>MAX. ANZAHL VERSE</Text>
                                        <Text style={{fontSize: 12, color: COLORS.text.tertiary, fontFamily: 'CrimsonPro-Medium'}}>Verfügbar: {countAvailableVerses}</Text>
                                    </View>
                                    <Text style={{fontSize: 12, color: COLORS.text.tertiary, marginBottom: 8, marginTop: 4}}>Leer lassen für alle verfügbaren Verse.</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="z.B. 50 (Optional)"
                                        value={tempVerseLimit}
                                        onChangeText={setTempVerseLimit}
                                        keyboardType="number-pad"
                                        placeholderTextColor="rgba(0,0,0,0.3)"
                                    />

                                    {/* --- SWITCH FÜR WIEDERHOLUNG --- */}
                                    <Pressable 
                                        onPress={() => setIncludeSolved(!includeSolved)} 
                                        style={{flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.4)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: includeSolved ? COLORS.accent.primary : 'transparent'}}
                                    >
                                        <View style={{
                                            width: 24, height: 24, borderRadius: 6, borderWidth: 2, 
                                            borderColor: includeSolved ? COLORS.accent.primary : COLORS.text.tertiary,
                                            backgroundColor: includeSolved ? COLORS.accent.primary : 'transparent',
                                            alignItems: 'center', justifyContent: 'center', marginRight: 12
                                        }}>
                                            {includeSolved && <Feather name="check" size={16} color="#FFF" />}
                                        </View>
                                        <View>
                                            <Text style={{fontFamily: 'CrimsonPro-Bold', color: COLORS.text.primary, fontSize: 16}}>
                                                Wiederholungs-Modus
                                            </Text>
                                            <Text style={{fontFamily: 'CrimsonPro-Medium', color: COLORS.text.tertiary, fontSize: 12}}>
                                                Auch bereits gelöste Verse abfragen
                                            </Text>
                                        </View>
                                    </Pressable>


                                    <Text style={styles.sectionTitle}>BÜCHER FILTERN (OPTIONAL)</Text>
                                    <View style={styles.tabContainer}>
                                        <Pressable style={[styles.tabBtn, activeTab === 'AT' && styles.tabBtnActive]} onPress={() => setActiveTab('AT')}><Text style={[styles.tabText, activeTab === 'AT' && styles.tabTextActive]}>Altes Testament</Text></Pressable>
                                        <Pressable style={[styles.tabBtn, activeTab === 'NT' && styles.tabBtnActive]} onPress={() => setActiveTab('NT')}><Text style={[styles.tabText, activeTab === 'NT' && styles.tabTextActive]}>Neues Testament</Text></Pressable>
                                    </View>
                                    <View style={styles.booksContainer}>
                                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.booksGrid}>
                                            <Pressable onPress={selectAllInTab} style={[styles.glassBookChip, { borderColor: COLORS.accent.secondary, borderStyle: 'dashed' }]}>
                                                <Text style={[styles.bookChipText, { color: COLORS.accent.secondary }]}>Alle markieren</Text>
                                            </Pressable>

                                            {availableBooks[activeTab].length > 0 ? (
                                                availableBooks[activeTab].map((book) => {
                                                    const isSelected = tempBooks.includes(book);
                                                    return (
                                                        <Pressable key={book} onPress={() => toggleTempBook(book)} style={[styles.glassBookChip, isSelected && styles.bookChipActive]}>
                                                            <BlurView intensity={isSelected ? 0 : 40} style={StyleSheet.absoluteFill} tint="light" />
                                                            <Text style={[styles.bookChipText, isSelected && { color: '#FFF' }]}>{book}</Text>
                                                        </Pressable>
                                                    )
                                                })
                                            ) : <Text style={{ width: '100%', textAlign: 'center', marginVertical: 20, color: COLORS.text.tertiary }}>Keine Verse gefunden.</Text>}
                                        </ScrollView>
                                    </View>
                                </ScrollView>
                                <View style={styles.modalFooter}><Pressable style={styles.startBtn} onPress={createSession}><Text style={styles.startBtnText}>ERSTELLEN</Text></Pressable></View>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>
            </View>
        )
    }

    // --- PRACTICE MODE ---
    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <WarmLiquidBackground />

            <View style={styles.topBar}>
                <View style={styles.headerRow}>
                    <Pressable style={styles.backButton} onPress={() => setMode('overview')}>
                        <BlurView intensity={80} tint="light" style={styles.iconBlur}><Feather name="x" size={24} color={COLORS.text.primary} /></BlurView>
                    </Pressable>
                    <View style={styles.headerInfo}>
                        <Text style={styles.categoryPill}>LERNEN</Text>
                        
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            {/* --- GRÜN: -1 (Gelöst) --- */}
                            <Animated.Text style={{
                                position: 'absolute', right: 120, 
                                opacity: successAnim, transform: [{ translateY: successY }],
                                color: COLORS.success, fontFamily: 'CrimsonPro-Bold', fontSize: 20
                            }}>
                                -1
                            </Animated.Text>

                             {/* --- ORANGE: REPEAT ICON (Nicht gelöst) --- */}
                             <Animated.Text style={{
                                position: 'absolute', right: 120, 
                                opacity: repeatAnim, transform: [{ translateY: repeatY }],
                                color: COLORS.warning, fontFamily: 'CrimsonPro-Bold', fontSize: 20
                            }}>
                                ↺
                            </Animated.Text>

                            <Text style={styles.verseCounter}>
                                {console.log('Counter render - initialVerseCount:', initialVerseCount, 'score.correct:', score.correct, 'remaining:', initialVerseCount - score.correct)}
                                Noch {initialVerseCount - score.correct} Verse
                            </Text>
                        </View>
                    </View>
                    <View style={{ width: 44 }} />
                </View>
                <View style={styles.progressBarBg}><View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} /></View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.cardContainer}>
                    <Animated.View style={[styles.cardShadowWrapper, styles.cardFront, { transform: [{ rotateY: frontInterpolate }, { translateX: shakeAnimation }], opacity: frontOpacity }]}>
                        <BlurView intensity={95} tint="light" style={styles.glassCard}>
                            <View style={styles.innerBorder}>
                                <Text style={styles.quoteIcon}>❝</Text>
                                <Text style={styles.reference}>{currentVerse?.reference}</Text>
                                {renderVerseText()}
                                <Pressable style={styles.helpIconBtn} onPress={() => flipCard(false, answerStatus === 'correct')}>
                                    <BlurView intensity={50} tint="light" style={styles.helpBlur}><Feather name="help-circle" size={24} color={COLORS.text.secondary} /></BlurView>
                                </Pressable>
                            </View>
                        </BlurView>
                    </Animated.View>
                    <Animated.View style={[styles.cardShadowWrapper, styles.cardBack, { transform: [{ rotateY: backInterpolate }], opacity: backOpacity }]}>
                        <LinearGradient colors={[COLORS.accent.primary, COLORS.accent.secondary]} style={styles.solidCard}>
                            <View style={[styles.innerBorder, { borderColor: 'rgba(255,255,255,0.3)' }]}>
                                <Text style={[styles.quoteIcon, { color: 'rgba(255,255,255,0.2)' }]}>❝</Text>
                                <Text style={[styles.reference, { color: '#FFF' }]}>{currentVerse?.reference}</Text>
                                <Text style={[styles.verseText, { color: '#FFF' }]}>{currentVerse?.text}</Text>
                                <View style={styles.statusBadge}><Text style={styles.statusText}>Lösung</Text></View>
                            </View>
                        </LinearGradient>
                    </Animated.View>
                </View>

                {!isFlipped && !solutionShown && (
                    <View style={styles.bottomSection}>
                        <View style={styles.toolBar}>
                            <Text style={styles.hintText}>{currentDifficulty === 'hard' ? 'Wähle die Wörter' : 'Tippe die Buchstaben'}</Text>
                            <Pressable onPress={handleBackspace} style={styles.backspaceBtn}><Feather name="delete" size={22} color={COLORS.text.secondary} /></Pressable>
                        </View>
                        <View style={styles.keyboardGrid}>
                            {currentDifficulty === 'hard' ? (
                                availableItems.map((item, index) => {
                                    const isUsed = selectedWords.some(w => w.id === item.id);
                                    if (isUsed) return <View key={index} style={styles.wordPlaceholder} />;
                                    return (
                                        <Pressable key={index} onPress={() => handleWordPress(item)} style={styles.glassWordWrapper}>
                                            <BlurView intensity={70} tint="light" style={styles.glassWord}>
                                                <Text style={styles.wordText}>{item.word}</Text>
                                            </BlurView>
                                        </Pressable>
                                    )
                                })
                            ) : (
                                availableItems.map((letter, index) => {
                                    const isUsed = selectedLetters.some(l => l.index === index);
                                    if (isUsed) return <View key={index} style={styles.keyPlaceholder} />;
                                    return (
                                        <Pressable key={index} onPress={() => handleLetterPress(letter, index)} style={styles.keyWrapper}><BlurView intensity={70} tint="light" style={styles.glassKey}><Text style={styles.keyText}>{letter}</Text></BlurView></Pressable>
                                    )
                                })
                            )}
                        </View>
                    </View>
                )}
            </ScrollView>
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

    // SESSION CARDS
    sessionCard: { marginBottom: 16, borderRadius: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8 },
    sessionContent: { flexDirection: 'row', alignItems: 'center', padding: 20 },
    sessionIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.5)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    sessionTitle: { fontFamily: 'CrimsonPro-Bold', fontSize: 18, color: COLORS.text.primary },
    sessionSub: { fontFamily: 'CrimsonPro-Medium', fontSize: 14, color: COLORS.text.tertiary, marginTop: 4 },
    createBtn: { marginTop: 10, borderRadius: 20, overflow: 'hidden' },

    // INPUTS & MODAL
    inputLabel: { fontFamily: 'CrimsonPro-Bold', fontSize: 12, color: COLORS.text.tertiary, letterSpacing: 1, marginBottom: 8 },
    textInput: { backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 12, padding: 16, fontSize: 16, fontFamily: 'CrimsonPro-Medium', color: COLORS.text.primary, marginBottom: 24 },
    glassBookChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', maxWidth: '48%', marginBottom: 8 },
    bookChipText: { fontFamily: 'CrimsonPro-Medium', fontSize: 14, color: COLORS.text.secondary },
    bookChipActive: { backgroundColor: COLORS.accent.primary, borderColor: COLORS.accent.primary },

    // CARD GAME STYLES
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

    // HARD MODE WORDS (GLASS STYLE)
    glassWordWrapper: { borderRadius: 16, overflow: 'hidden', marginBottom: 8, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4 },
    glassWord: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' },
    wordText: { fontFamily: 'CrimsonPro-Bold', fontSize: 18, color: COLORS.text.primary },
    wordPlaceholder: { width: 80, height: 40, margin: 4 },

    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalContent: { height: '95%', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingTop: 32 },
    modalTitle: { fontFamily: 'CrimsonPro-Bold', fontSize: 28, color: COLORS.text.primary, marginBottom: 0 },
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
    booksContainer: { height: 280, marginBottom: 16, borderRadius: 12, overflow: 'hidden' },
    booksGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-start', paddingRight: 8 },
    modalFooter: { position: 'absolute', bottom: 40, left: 24, right: 24 },
    startBtn: { backgroundColor: COLORS.accent.primary, paddingVertical: 18, borderRadius: 20, alignItems: 'center' },
    startBtnText: { fontFamily: 'CrimsonPro-Bold', color: '#FFF', fontSize: 18, letterSpacing: 1 },
    glassContainer: {
        flex: 1, borderRadius: 24, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.8)', overflow: 'hidden',
    },
});