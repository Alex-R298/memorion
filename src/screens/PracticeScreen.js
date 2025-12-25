import { Feather } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFocusEffect } from '@react-navigation/native'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

// --- LAYOUT BERECHNUNG FÜR TASTATUR ---
const KEYBOARD_PADDING = 8;
const KEY_GAP = 5;
const MAX_KEYS_PER_ROW = 10;
const KEY_WIDTH = (width - (KEYBOARD_PADDING * 2) - ((MAX_KEYS_PER_ROW - 1) * KEY_GAP)) / MAX_KEYS_PER_ROW;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- CONFIG ---
const SESSIONS_KEY = 'MEMORION_SESSIONS';
const PROGRESS_KEY = 'MEMORION_USER_PROGRESS_V1';
const SESSION_STATE_KEY = 'MEMORION_SESSION_STATE';

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

const KEYBOARD_ROWS = [
    ["Q", "W", "E", "R", "T", "Z", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["Y", "X", "C", "V", "B", "N", "M"]
];

const COLORS = {
    bgGradient: ['#F2EDE4', '#EBE5CE', '#D4C4B0'],
    text: { primary: '#2C2420', secondary: '#6B5D52', tertiary: '#9B8B7E' },
    accent: { primary: '#C97848', secondary: '#8B7355' },
    success: '#059669',
    error: '#DC2626',
    warning: '#D97706',
    glassBorder: 'rgba(255, 255, 255, 0.6)',
}

const CARD_HEIGHT = 320;

// --- Helper Component: Typewriter Animation ---
// UPDATE: reportY prop hinzugefügt für das Scrolling
const PopWord = React.memo(({ word, isSolved, isTarget, displayMode, cleanWord, isError, resetKey, reportY }) => {
    const translateY = useRef(new Animated.Value(0)).current; 
    const opacityAnim = useRef(new Animated.Value(1)).current; 
    const colorAnim = useRef(new Animated.Value(0)).current; 
    const [hadError, setHadError] = useState(false); 

    // Layout reporting für Auto-Scroll
    const onLayout = (event) => {
        if (isTarget && reportY) {
            const layout = event.nativeEvent.layout;
            // Wir melden die Y-Position an den Parent
            reportY(layout.y);
        }
    };

    // Trigger onLayout auch wenn sich isTarget ändert (wichtig!)
    useEffect(() => {
        // Da onLayout nur bei Render feuert, müssen wir bei Zustandsänderung
        // sicherstellen, dass wir scrollen, falls wir Target werden.
        // Das wird im Parent über den State-Wechsel getriggert, aber wir brauchen die layout info.
        // React Native Views feuern onLayout oft nur bei Änderungen der Größe/Position.
    }, [isTarget]);

    useEffect(() => {
        if (isSolved) {
            translateY.setValue(-10); 
            opacityAnim.setValue(0);  
            Animated.parallel([
                Animated.spring(translateY, { toValue: 0, friction: 8, tension: 100, useNativeDriver: true }),
                Animated.timing(opacityAnim, { toValue: 1, duration: 150, useNativeDriver: true })
            ]).start();
        } else {
            translateY.setValue(0);
            opacityAnim.setValue(1);
        }
    }, [isSolved]);

    useEffect(() => {
        if (isError) {
            setHadError(true); 
            colorAnim.setValue(1); 
        } else if (!isError && !hadError) {
            colorAnim.setValue(0); 
        }
    }, [isError, hadError]);

    useEffect(() => {
        setHadError(false);
        colorAnim.setValue(0);
    }, [resetKey]);

    const textColorInterp = colorAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [
            hadError ? COLORS.error : (isSolved ? COLORS.text.primary : (displayMode === 'hidden' ? COLORS.accent.primary : COLORS.text.tertiary)), 
            COLORS.error 
        ]
    });

    let content = word;
    if (!isSolved) {
        if (displayMode === 'hidden') {
            content = "_".repeat(cleanWord.length); 
            const punctuation = word.replace(cleanWord, '');
            content += punctuation;
        } 
    }

    return (
        <Animated.View 
            onLayout={onLayout}
            style={{ transform: [{ translateY: translateY }], opacity: opacityAnim }}
        >
            <Animated.Text style={[
                styles.verseText,
                { 
                    color: textColorInterp,
                    opacity: (isError || isSolved) ? 1 : (displayMode === 'ghost' ? 0.3 : 0.6),
                    textDecorationLine: (isTarget && !isSolved) ? 'underline' : 'none'
                }
            ]}>
                {content}{" "}
            </Animated.Text>
        </Animated.View>
    );
});

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

    const [userProgress, setUserProgress] = useState({});
    const [totalPoints, setTotalPoints] = useState(0);

    const [activeVerses, setActiveVerses] = useState([]);
    const [currentSession, setCurrentSession] = useState(null);
    const [initialVerseCount, setInitialVerseCount] = useState(0);
    const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
    const [currentDifficulty, setCurrentDifficulty] = useState('medium');

    const [showModal, setShowModal] = useState(false);
    const [newSessionName, setNewSessionName] = useState('');
    const [tempDiff, setTempDiff] = useState('medium');
    const [tempBooks, setTempBooks] = useState([]);
    const [activeTab, setActiveTab] = useState('NT');
    const [tempVerseLimit, setTempVerseLimit] = useState('');
    const [includeSolved, setIncludeSolved] = useState(false);

    // --- GAME LOGIC STATE ---
    const [verseWords, setVerseWords] = useState([]);
    const [targetWordIndex, setTargetWordIndex] = useState(0);
    const [score, setScore] = useState({ correct: 0, attempts: 0 });
    const [answerStatus, setAnswerStatus] = useState('neutral');
    const [solutionShown, setSolutionShown] = useState(false);
    
    const [errorWordIndex, setErrorWordIndex] = useState([]);
    const [currentWordMistakes, setCurrentWordMistakes] = useState(0);

    // --- SCROLL REF ---
    const scrollViewRef = useRef(null);

    // --- ANIMATION REFS ---
    const animatedPhase = useRef(new Animated.Value(0)).current; 
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const cardOpacity = useRef(new Animated.Value(1)).current;
    const checkMarkOpacity = useRef(new Animated.Value(0)).current;
    
    const frontOpacity = animatedPhase.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
    const backOpacity = animatedPhase.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
    
    const shakeAnimation = useRef(new Animated.Value(0)).current;
    const isFlippingCard = useRef(false);
    
    const successAnim = useRef(new Animated.Value(0)).current;
    const successY = useRef(new Animated.Value(0)).current;
    const repeatAnim = useRef(new Animated.Value(0)).current;
    const repeatY = useRef(new Animated.Value(0)).current;
    
    // Reset bei neuer Runde
    useEffect(() => {
        animatedPhase.setValue(0);
        scaleAnim.setValue(1);
        cardOpacity.setValue(1);
        checkMarkOpacity.setValue(0);
        
        // Scroll Reset
        if (scrollViewRef.current) {
            scrollViewRef.current.scrollTo({ y: 0, animated: false });
        }
    }, [currentVerseIndex]);

    useFocusEffect(
        useCallback(() => {
            loadData();
            return () => { };
        }, [])
    );

    useEffect(() => {
        if (mode === 'practice' && activeVerses.length > 0 && currentVerseIndex < activeVerses.length) {
            setupRound();
        }
    }, [mode, currentVerseIndex]);

    useEffect(() => {
        setSolutionShown(false);
        setAnswerStatus('neutral');
        setErrorWordIndex([]);
        setCurrentWordMistakes(0);
        
        successAnim.setValue(0);
        successY.setValue(0);
        repeatAnim.setValue(0);
        repeatY.setValue(0);
    }, [currentVerseIndex]);

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
                } catch (e) {}
            };
            refreshProgress();
        }
    }, [mode]);

    const triggerFeedbackAnim = (type) => {
        successAnim.setValue(0);
        successY.setValue(0);
        repeatAnim.setValue(0);
        repeatY.setValue(0);
        const opacityAnim = type === 'success' ? successAnim : repeatAnim;
        const moveAnim = type === 'success' ? successY : repeatY;
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
                setUserProgress(parsedProgress);
                const points = Object.values(parsedProgress).filter(v => v === 1).length;
                setTotalPoints(points);
            }
            const savedSessions = await AsyncStorage.getItem(SESSIONS_KEY);
            let loadedSessions = [];
            if (savedSessions) {
                const parsed = JSON.parse(savedSessions);
                loadedSessions = Array.isArray(parsed) ? parsed : [];
            }
            const customSessions = loadedSessions.filter(s => s.id !== 'default_merkliste').map(s => ({ ...s, verseLimit: s.verseLimit || 0, includeSolved: s.includeSolved || false }));
            const defaultSession = { id: 'default_merkliste', name: 'Merkliste (Alle)', difficulty: 'medium', books: [], verseLimit: 0, includeSolved: false, isSystem: true };
            setSessions([defaultSession, ...customSessions]);
            const verses = jsonData.verses || [];
            const transformedVerses = verses.filter(verse => verse.text && verse.text.trim().length > 0).map(verse => {
                const words = verse.text.split(' ');
                const refKey = `${verse.book_name} ${verse.chapter}:${verse.verse}`;
                return { id: refKey, book: verse.book_name, chapter: verse.chapter, verse: verse.verse, text: verse.text, reference: refKey };
            });
            setAllUserVerses(transformedVerses);
        } catch (e) { console.error(e) }
        setLoading(false);
    }

    const availableBooks = useMemo(() => { return { AT: AT_BOOKS.sort(), NT: NT_BOOKS.sort() }; }, []);
    const countAvailableVerses = useMemo(() => { if (tempBooks.length === 0) return allUserVerses.length; return allUserVerses.filter(v => tempBooks.includes(v.book)).length; }, [tempBooks, allUserVerses]);

    const calculateRemainingVerses = (session) => {
        let pool = [...allUserVerses];
        if (session.books && session.books.length > 0) {
            const normalizedBooks = session.books.map(b => b.replace(/(\d)\.(\s)/g, '$1 '));
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
        if (!newSessionName.trim()) { Alert.alert("Fehler", "Bitte gib der Session einen Namen."); return; }
        const limit = parseInt(tempVerseLimit);
        const finalLimit = isNaN(limit) || limit <= 0 ? 0 : limit;
        const newSession = { id: Date.now().toString(), name: newSessionName, difficulty: tempDiff, books: tempBooks, verseLimit: finalLimit, includeSolved: includeSolved, isSystem: false };
        const currentCustomSessions = sessions.filter(s => !s.isSystem);
        const updatedCustom = [...currentCustomSessions, newSession];
        await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(updatedCustom));
        setSessions([sessions[0], ...updatedCustom]);
        setShowModal(false); setNewSessionName(''); setTempBooks([]); setTempVerseLimit(''); setIncludeSolved(false);
    }

    const deleteSession = async (id) => {
        const sessionToDelete = sessions.find(s => s.id === id);
        if (sessionToDelete?.isSystem) { Alert.alert("Info", "Die Merkliste kann nicht gelöscht werden."); return; }
        Alert.alert("Löschen", "Möchtest du diese Session wirklich löschen?", [{ text: "Abbrechen", style: "cancel" }, { text: "Löschen", style: "destructive", onPress: async () => { const currentCustomSessions = sessions.filter(s => !s.isSystem && s.id !== id); await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(currentCustomSessions)); setSessions([sessions[0], ...currentCustomSessions]); } }]);
    }

    const startSession = async (session) => {
        let pool = [...allUserVerses];
        const normalizedBooks = (session.books || []).map(b => b.replace(/(\d)\.(\s)/g, '$1 '));
        if (normalizedBooks.length > 0) pool = pool.filter(v => normalizedBooks.includes(v.book));
        
        let filtered = [];
        if (session.includeSolved) {
            filtered = pool;
        } else {
            filtered = pool.filter(v => userProgress[v.id] !== 1);
        }

        if (filtered.length === 0) {
            if (pool.length > 0 && !session.includeSolved) {
                Alert.alert("Alles erledigt! 🎉", "Aktiviere den 'Wiederholungs-Modus' um diese Verse nochmal zu üben.");
            } else {
                Alert.alert("Keine Verse", "In den gewählten Büchern wurden keine Verse gefunden.");
            }
            return;
        }

        const savedStates = await AsyncStorage.getItem(SESSION_STATE_KEY);
        let sessionState = {}; 
        if (savedStates) { 
            try {
                const parsed = JSON.parse(savedStates);
                sessionState = (typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
            } catch (e) {
                sessionState = {};
            }
        }
        let shuffled;
        if (sessionState[session.id]) { 
            const savedOrder = sessionState[session.id]; 
            shuffled = savedOrder.filter(v => { if (session.includeSolved) return true; return userProgress[v.id] !== 1; }); 
        }
        else { 
            shuffled = filtered.sort(() => Math.random() - 0.5); 
            if (session.verseLimit > 0) shuffled = shuffled.slice(0, session.verseLimit); 
            sessionState[session.id] = shuffled; 
            await AsyncStorage.setItem(SESSION_STATE_KEY, JSON.stringify(sessionState)); 
        }
        
        setActiveVerses(shuffled); setCurrentSession(session); setInitialVerseCount(calculateRemainingVerses(session)); setCurrentDifficulty(session.difficulty || 'medium'); setCurrentVerseIndex(0); setScore({ correct: 0, attempts: 0 }); setMode('practice');
    }

    const toggleTempBook = (book) => { setTempBooks(prev => { if (prev.includes(book)) return prev.filter(b => b !== book); return [...prev, book]; }); }
    const selectAllInTab = () => { const currentTabBooks = availableBooks[activeTab]; if (!Array.isArray(currentTabBooks)) return; const allSelected = currentTabBooks.every(b => tempBooks.includes(b)); if (allSelected) setTempBooks(prev => prev.filter(b => !currentTabBooks.includes(b))); else setTempBooks(prev => Array.from(new Set([...prev, ...currentTabBooks]))); }

    const setupRound = () => {
        const verse = activeVerses[currentVerseIndex];
        if (!verse) return;
        if (typeof verse.text !== 'string' || verse.text.trim().length === 0) return;
        
        setSolutionShown(false);
        // Reset alle Animations
        animatedPhase.setValue(0);
        scaleAnim.setValue(1);
        cardOpacity.setValue(1);
        checkMarkOpacity.setValue(0);
        isFlippingCard.current = false;
        setErrorWordIndex([]);
        setCurrentWordMistakes(0);
        
        const rawWords = verse.text.split(' ');
        const preparedWords = rawWords.map(word => {
            if (typeof word !== 'string') return { word: '', cleanWord: '', firstChar: '', displayMode: 'ghost', isSolved: false };
            const clean = word.replace(/[.,!?":;]/g, '');
            const firstChar = clean.length > 0 ? clean.charAt(0).toLowerCase() : '';
            let mode = 'ghost'; 
            
            if (currentDifficulty === 'easy') { 
                mode = 'ghost'; 
            }
            else if (currentDifficulty === 'medium') { 
                const isHidden = (Math.random() < 0.32) && clean.length > 2; 
                mode = isHidden ? 'hidden' : 'ghost'; 
            }
            else { 
                mode = 'hidden'; 
            }
            return { word: word, cleanWord: clean, firstChar: firstChar, displayMode: mode, isSolved: false };
        });
        setVerseWords(preparedWords); setTargetWordIndex(0);
    }

    // --- NEUE AUTO-SCROLL FUNKTION ---
    // Wird von PopWord aufgerufen, wenn es das aktive Wort ist
    const scrollToActiveWord = useCallback((yPosition) => {
        if (scrollViewRef.current) {
            // Wir scrollen so, dass das Wort etwas unterhalb des oberen Randes ist (ca. 80px Puffer)
            // Aber nicht ins Negative
            const targetY = Math.max(0, yPosition - 80);
            
            // Nur scrollen, wenn wir nicht ganz oben sind (vermeidet zucken am Anfang)
            if (targetY > 20) {
                scrollViewRef.current.scrollTo({ y: targetY, animated: true });
            }
        }
    }, []);

    const handleKeyPress = (char) => {
        if (animatedPhase._value >= 0.5 || answerStatus === 'correct') return;
        const currentTarget = verseWords[targetWordIndex];
        if (currentTarget.cleanWord.length === 0) { setTargetWordIndex(prev => prev + 1); return; }
        
        if (char.toLowerCase() === currentTarget.firstChar) {
            // RICHTIG
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (answerStatus === 'wrong') setAnswerStatus('neutral');
            
            setErrorWordIndex([]);
            setCurrentWordMistakes(0);

            const updatedWords = [...verseWords]; 
            updatedWords[targetWordIndex].isSolved = true; 
            setVerseWords(updatedWords);
            
            if (targetWordIndex < verseWords.length - 1) { 
                setTargetWordIndex(prev => prev + 1); 
            } else { 
                handleSuccess(); 
            }
        } else {
            // FALSCH
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            
            const newMistakes = currentWordMistakes + 1;
            setErrorWordIndex(prev => Array.from(new Set([...prev, targetWordIndex])));
            setCurrentWordMistakes(newMistakes);
            
            const updatedWords = [...verseWords];
            updatedWords[targetWordIndex].isSolved = true;
            setVerseWords(updatedWords);
            
            if (newMistakes >= 3) { 
                handleFail(); 
            } else { 
                shake(); 
                setTimeout(() => {
                    if (targetWordIndex < verseWords.length - 1) {
                        setTargetWordIndex(prev => prev + 1);
                    } else {
                        handleFail();
                    }
                }, 300);
            }
        }
    }

    const handleBackspace = () => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }

    // --- RICHTIG: SCHNELL & NEUES GLASSMORPHISM OVERLAY ---
    const handleSuccess = async () => {
        if (isFlippingCard.current) return;
        isFlippingCard.current = true;

        setAnswerStatus('correct'); 
        setScore(prev => ({ ...prev, correct: prev.correct + 1 }));
        
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        triggerFeedbackAnim('success');
        
        const currentRef = activeVerses[currentVerseIndex].id; 
        const newProgress = { ...userProgress }; 
        newProgress[currentRef] = 1; 
        setUserProgress(newProgress);
        const solvedCount = Object.values(newProgress).filter(val => val === 1).length; 
        setTotalPoints(solvedCount);
        AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(newProgress)).catch(e => console.log(e));

        // 1. Success Overlay Einblenden & Karte verkleinern
        Animated.parallel([
            Animated.spring(scaleAnim, { toValue: 0.9, useNativeDriver: true, speed: 20 }),
            Animated.timing(checkMarkOpacity, { toValue: 1, duration: 150, useNativeDriver: true })
        ]).start(() => {
            
            // 2. DATEN TAUSCHEN (Verdeckt durch Overlay)
            setCurrentVerseIndex(prev => prev + 1);
            
            setErrorWordIndex([]);
            setCurrentWordMistakes(0);
            setAnswerStatus('neutral');

            // 3. Reset Overlay
            setTimeout(() => {
                Animated.parallel([
                    Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
                    Animated.timing(checkMarkOpacity, { toValue: 0, duration: 150, useNativeDriver: true })
                ]).start(() => {
                    isFlippingCard.current = false;
                });
            }, 600);
        });
    }

    const handleFail = () => {
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        shake(); setAnswerStatus('wrong'); setScore(prev => ({ ...prev, attempts: prev.attempts + 1 }));
        // Bei Fehler: Lösung anzeigen
        showSolutionAndMoveToNext(false);
    }

    const shake = () => { Animated.sequence([Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }), Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }), Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }), Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true })]).start(); };

    // --- FEHLER/HILFE: LÖSUNG ZEIGEN & ANS ENDE SCHIEBEN ---
    const showSolutionAndMoveToNext = (isCorrect = false) => {
        if (isFlippingCard.current) return;
        isFlippingCard.current = true;

        if (!isCorrect && animatedPhase._value < 0.5) triggerFeedbackAnim('repeat');

        // SCHRITT 1: Karte zur Lösung blenden
        Animated.parallel([
            Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true, speed: 20 }),
            Animated.timing(animatedPhase, { toValue: 1, duration: 250, useNativeDriver: true })
        ]).start(() => {
            setSolutionShown(true);
            Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }).start();

            // WARTEZEIT (Lesen der Lösung)
            setTimeout(() => {
                
                // SCHRITT 2: "VORHANG ZU" (Karte wird komplett unsichtbar)
                Animated.timing(cardOpacity, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true
                }).start(() => {

                    // SCHRITT 3: JETZT DATEN TAUSCHEN (im Dunkeln)
                    setSolutionShown(false);
                    setAnswerStatus('neutral');
                    setCurrentWordMistakes(0);
                    // Phase zurück auf Front setzen (unsichtbar)
                    animatedPhase.setValue(0);

                    // WICHTIG: Vers ans Ende schieben
                    if (!isCorrect) {
                        const currentV = activeVerses[currentVerseIndex];
                        if (currentV) {
                            // Kopie des Arrays
                            const newVerses = [...activeVerses];
                            // Den aktuellen Vers ans Ende pushen
                            newVerses.push(currentV);
                            
                            setActiveVerses(newVerses);
                            
                            // Session speichern
                            if (currentSession) {
                                AsyncStorage.getItem(SESSION_STATE_KEY).then(savedStates => {
                                    let sessionState = savedStates ? JSON.parse(savedStates) : {};
                                    sessionState[currentSession.id] = newVerses;
                                    AsyncStorage.setItem(SESSION_STATE_KEY, JSON.stringify(sessionState));
                                });
                            }
                        }
                    } 
                    
                    // IMMER zum nächsten Index gehen (der falsche ist ja jetzt am Ende)
                    setCurrentVerseIndex(prev => prev + 1);

                    // SCHRITT 4: "VORHANG AUF" (Neue Karte erscheint)
                    setTimeout(() => {
                        Animated.parallel([
                            Animated.timing(cardOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
                            Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true })
                        ]).start(() => {
                            isFlippingCard.current = false;
                        });
                    }, 50);
                });
            }, 2500); // Zeit zum Lesen
        });
    };

    const currentVerse = activeVerses[currentVerseIndex];
    const progressPercent = activeVerses.length > 0 && currentVerse ? ((currentVerseIndex + 1) / activeVerses.length) * 100 : 0;

    const renderVerseText = () => {
        if (!currentVerse || !Array.isArray(verseWords) || verseWords.length === 0) return null;
        return (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {verseWords.map((item, index) => {
                    const isTarget = index === targetWordIndex;
                    const isError = Array.isArray(errorWordIndex) && errorWordIndex.includes(index);
                    // Wir geben dem PopWord die Scroll-Funktion
                    return <PopWord key={`${currentVerse?.id}-${index}`} word={item.word} cleanWord={item.cleanWord} isSolved={item.isSolved} isTarget={isTarget} isError={isError} displayMode={item.displayMode} resetKey={currentVerse?.id} reportY={scrollToActiveWord} />;
                })}
            </View>
        )
    }

    if (loading) return <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={COLORS.accent.primary} /></View>

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
                        <View style={styles.headerInfo}><Text style={styles.categoryPill}>DEINE SESSIONS</Text><Text style={styles.verseCounter}>{totalPoints} Verse gemeistert</Text></View>
                        <View style={{ width: 44 }} />
                    </View>
                </View>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {sessions.map((session) => (
                        <Pressable key={session.id + JSON.stringify(userProgress)} style={({ pressed }) => [styles.sessionCard, pressed && { transform: [{ scale: 0.98 }] }]} onPress={() => startSession(session)}>
                            <BlurView intensity={80} tint="light" style={styles.glassContainer}>
                                <LinearGradient colors={['rgba(255,255,255,0.7)', 'rgba(255,255,255,0.3)']} style={StyleSheet.absoluteFill} />
                                <View style={styles.sessionContent}>
                                    <View style={[styles.sessionIcon, session.isSystem && { backgroundColor: COLORS.accent.primary }]}><Feather name={session.isSystem ? "bookmark" : "layers"} size={24} color={session.isSystem ? "#FFF" : COLORS.accent.primary} /></View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.sessionTitle}>{session.name}</Text>
                                        <View>
                                            <Text style={styles.sessionSub}>• {session.difficulty === 'easy' ? 'Einfach' : session.difficulty === 'hard' ? 'Schwer' : 'Mittel'}</Text>
                                            <Text style={styles.sessionSub}>• {session.books.length > 0 ? `${session.books.length} Bücher` : 'Alle Bücher'}</Text>
                                            <Text style={[styles.sessionSub, { color: COLORS.accent.primary, fontFamily: 'CrimsonPro-Bold' }]}>• {session.includeSolved ? `Wiederholung: ${calculateRemainingVerses(session)}` : `${calculateRemainingVerses(session)} Verse offen`}</Text>
                                        </View>
                                    </View>
                                    {!session.isSystem && (<Pressable onPress={(e) => { e.stopPropagation(); deleteSession(session.id); }} style={{ padding: 8 }}><Feather name="trash-2" size={18} color={COLORS.text.tertiary} /></Pressable>)}
                                </View>
                            </BlurView>
                        </Pressable>
                    ))}
                    <Pressable style={styles.createBtn} onPress={() => setShowModal(true)}>
                        <BlurView intensity={60} tint="light" style={styles.glassContainer}><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 60 }}><Feather name="plus-circle" size={24} color={COLORS.text.secondary} style={{ marginRight: 8 }} /><Text style={{ fontFamily: 'CrimsonPro-Bold', fontSize: 16, color: COLORS.text.secondary }}>Neue Session erstellen</Text></View></BlurView>
                    </Pressable>
                </ScrollView>
                <Modal visible={showModal} transparent animationType="slide">
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.modalOverlay}>
                            <View style={styles.background}><LinearGradient colors={['rgba(212, 196, 176, 0.95)', 'rgba(201, 184, 168, 0.98)']} style={StyleSheet.absoluteFill} /><BlurView intensity={80} style={StyleSheet.absoluteFill} tint="light" /></View>
                            <View style={styles.modalContent}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}><Text style={styles.modalTitle}>Neue Session</Text><Pressable onPress={() => setShowModal(false)}><Feather name="x" size={24} color={COLORS.text.primary} /></Pressable></View>
                                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                                    <Text style={styles.inputLabel}>NAME DER SESSION</Text>
                                    <TextInput style={styles.textInput} placeholder="z.B. Römerbrief lernen..." value={newSessionName} onChangeText={setNewSessionName} placeholderTextColor="rgba(0,0,0,0.3)" />
                                    <Text style={styles.sectionTitle}>SCHWIERIGKEIT</Text>
                                    <View style={styles.diffContainer}>
                                        {['easy', 'medium', 'hard'].map((lvl) => (
                                            <Pressable key={lvl} onPress={() => setTempDiff(lvl)} style={[styles.diffChip, tempDiff === lvl && styles.diffChipActive]}><Text style={[styles.diffChipText, tempDiff === lvl && { color: '#FFF' }]}>{lvl === 'easy' ? 'Einfach' : lvl === 'medium' ? 'Mittel' : 'Schwer'}</Text></Pressable>
                                        ))}
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}><Text style={[styles.sectionTitle, { marginTop: 0, marginBottom: 0 }]}>MAX. ANZAHL VERSE</Text><Text style={{ fontSize: 12, color: COLORS.text.tertiary, fontFamily: 'CrimsonPro-Medium' }}>Verfügbar: {countAvailableVerses}</Text></View>
                                    <Text style={{ fontSize: 12, color: COLORS.text.tertiary, marginBottom: 8, marginTop: 4 }}>Leer lassen für alle verfügbaren Verse.</Text>
                                    <TextInput style={styles.textInput} placeholder="z.B. 50 (Optional)" value={tempVerseLimit} onChangeText={setTempVerseLimit} keyboardType="number-pad" placeholderTextColor="rgba(0,0,0,0.3)" />
                                    <Pressable onPress={() => setIncludeSolved(!includeSolved)} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.4)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: includeSolved ? COLORS.accent.primary : 'transparent' }}>
                                        <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: includeSolved ? COLORS.accent.primary : COLORS.text.tertiary, backgroundColor: includeSolved ? COLORS.accent.primary : 'transparent', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>{includeSolved && <Feather name="check" size={16} color="#FFF" />}</View>
                                        <View><Text style={{ fontFamily: 'CrimsonPro-Bold', color: COLORS.text.primary, fontSize: 16 }}>Wiederholungs-Modus</Text><Text style={{ fontFamily: 'CrimsonPro-Medium', color: COLORS.text.tertiary, fontSize: 12 }}>Auch bereits gelöste Verse abfragen</Text></View>
                                    </Pressable>
                                    <Text style={styles.sectionTitle}>BÜCHER FILTERN (OPTIONAL)</Text>
                                    <View style={styles.tabContainer}>
                                        <Pressable style={[styles.tabBtn, activeTab === 'AT' && styles.tabBtnActive]} onPress={() => setActiveTab('AT')}><Text style={[styles.tabText, activeTab === 'AT' && styles.tabTextActive]}>Altes Testament</Text></Pressable>
                                        <Pressable style={[styles.tabBtn, activeTab === 'NT' && styles.tabBtnActive]} onPress={() => setActiveTab('NT')}><Text style={[styles.tabText, activeTab === 'NT' && styles.tabTextActive]}>Neues Testament</Text></Pressable>
                                    </View>
                                    <View style={styles.booksContainer}>
                                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.booksGrid}>
                                            <Pressable onPress={selectAllInTab} style={[styles.glassBookChip, { borderColor: COLORS.accent.secondary, borderStyle: 'dashed' }]}><Text style={[styles.bookChipText, { color: COLORS.accent.secondary }]}>Alle markieren</Text></Pressable>
                                            {(availableBooks[activeTab] && availableBooks[activeTab].length > 0) ? (availableBooks[activeTab].map((book) => { const isSelected = tempBooks.includes(book); return (<Pressable key={book} onPress={() => toggleTempBook(book)} style={[styles.glassBookChip, isSelected && styles.bookChipActive]}><BlurView intensity={isSelected ? 0 : 40} style={StyleSheet.absoluteFill} tint="light" /><Text style={[styles.bookChipText, isSelected && { color: '#FFF' }]}>{book}</Text></Pressable>) })) : <Text style={{ width: '100%', textAlign: 'center', marginVertical: 20, color: COLORS.text.tertiary }}>Keine Verse gefunden.</Text>}
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

            {/* HEADER */}
            <View style={styles.topBar}>
                <View style={styles.headerRow}>
                    <Pressable style={styles.backButton} onPress={() => setMode('overview')}>
                        <BlurView intensity={80} tint="light" style={styles.iconBlur}><Feather name="x" size={24} color={COLORS.text.primary} /></BlurView>
                    </Pressable>
                    <View style={styles.headerInfo}>
                        <Text style={styles.categoryPill}>LERNEN</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Animated.Text style={{ position: 'absolute', right: 120, opacity: successAnim, transform: [{ translateY: successY }], color: COLORS.success, fontFamily: 'CrimsonPro-Bold', fontSize: 20 }}>-1</Animated.Text>
                            <Animated.Text style={{ position: 'absolute', right: 120, opacity: repeatAnim, transform: [{ translateY: repeatY }], color: COLORS.warning, fontFamily: 'CrimsonPro-Bold', fontSize: 20 }}>↺</Animated.Text>
                            <Text style={styles.verseCounter}>Noch {initialVerseCount - score.correct} Verse</Text>
                        </View>
                    </View>
                    <View style={{ width: 44 }} />
                </View>
                <View style={styles.progressBarBg}><View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} /></View>
            </View>

            {/* MAIN CONTENT (SCROLLABLE) */}
            <View style={{ flex: 1 }}>
                <ScrollView 
                    ref={scrollViewRef}
                    contentContainerStyle={styles.scrollContent} 
                    showsVerticalScrollIndicator={false}
                    style={{ flex: 1 }}
                >
                    <View style={styles.cardContainer}>
                        {/* Wir nutzen cardOpacity, um die gesamte Karte unsichtbar zu machen, 
                            wenn wir "heimlich" den Text tauschen.
                        */}
                        <Animated.View style={{ flex: 1, opacity: cardOpacity, transform: [{ scale: scaleAnim }, { translateX: shakeAnimation }] }}>
                            
                            {/* VORDERSEITE */}
                            <Animated.View style={[styles.cardShadowWrapper, styles.glassCard, { position: 'absolute', width: '100%', opacity: frontOpacity, zIndex: 1 }]}>
                                 <BlurView intensity={95} tint="light" style={{flex: 1}}>
                                    <View style={styles.innerBorder}>
                                        <Text style={styles.quoteIcon}>❝</Text>
                                        <Text style={styles.reference}>{currentVerse?.reference}</Text>
                                        
                                        {renderVerseText()}
                                        
                                        {currentDifficulty !== 'easy' && (
                                            <Pressable style={styles.helpIconBtn} onPress={() => { 
                                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); 
                                                // Bei Hilfe -> showSolutionAndMoveToNext(false)
                                                showSolutionAndMoveToNext(false); 
                                            }}>
                                                <BlurView intensity={50} tint="light" style={styles.helpBlur}><Feather name="help-circle" size={24} color={COLORS.text.secondary} /></BlurView>
                                            </Pressable>
                                        )}
                                    </View>
                                </BlurView>
                            </Animated.View>

                            {/* SUCCESS OVERLAY (NEUES DESIGN: Glassmorphism Haken) */}
                            <Animated.View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', zIndex: 10, opacity: checkMarkOpacity }]} pointerEvents="none">
                                <BlurView intensity={40} tint="light" style={{ paddingHorizontal: 40, paddingVertical: 20, borderRadius: 30, overflow: 'hidden', alignItems: 'center' }}>
                                    <View style={{ backgroundColor: 'rgba(255,255,255,0.5)', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
                                    <Feather name="check-circle" size={54} color={COLORS.success} style={{ marginBottom: 10 }} />
                                    <Text style={{ fontFamily: 'CrimsonPro-Bold', fontSize: 22, color: COLORS.text.primary }}>Fantastisch!</Text>
                                </BlurView>
                            </Animated.View>

                            {/* RÜCKSEITE (Lösung) */}
                            <Animated.View style={[styles.cardShadowWrapper, { position: 'absolute', width: '100%', opacity: backOpacity, zIndex: 2 }]}>
                                <LinearGradient colors={[COLORS.accent.primary, COLORS.accent.secondary]} style={styles.solidCard}>
                                    <View style={[styles.innerBorder, { borderColor: 'rgba(255,255,255,0.3)' }]}>
                                        <Text style={[styles.quoteIcon, { color: 'rgba(255,255,255,0.2)' }]}>❝</Text>
                                        <Text style={[styles.reference, { color: '#FFF' }]}>{currentVerse?.reference}</Text>
                                        <Text style={[styles.verseText, { color: '#FFF' }]}>{currentVerse?.text}</Text>
                                        <View style={styles.statusBadge}><Text style={styles.statusText}>Lösung</Text></View>
                                    </View>
                                </LinearGradient>
                            </Animated.View>

                        </Animated.View>
                    </View>
                </ScrollView>
            </View>

            {/* KEYBOARD (FIXED AT BOTTOM) */}
            {!solutionShown && (
                <View style={styles.bottomSectionFixed}>
                    <View style={styles.keyboardBgDarken}>
                        <BlurView intensity={80} tint="light" style={styles.keyboardBlur}>
                             <View style={styles.toolBar}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.hintText}>Tippe die Anfangsbuchstaben</Text>
                                    <Text style={[styles.hintText, { fontSize: 12, marginTop: 4, color: currentWordMistakes >= 2 ? COLORS.error : COLORS.text.tertiary }]}>
                                        Fehler: {currentWordMistakes}/3
                                    </Text>
                                </View>
                                <Pressable onPress={handleBackspace} style={styles.backspaceBtn}><Feather name="delete" size={22} color={COLORS.text.secondary} /></Pressable>
                            </View>
                            
                            <View style={{ gap: KEY_GAP }}>
                                {KEYBOARD_ROWS.map((row, rIndex) => (
                                    <View key={rIndex} style={{ flexDirection: 'row', justifyContent: 'center', gap: KEY_GAP }}>
                                        {row.map((letter) => (
                                            <Pressable 
                                                key={letter} 
                                                onPress={() => handleKeyPress(letter)} 
                                                style={({ pressed }) => [
                                                    styles.keyWrapper, 
                                                    { width: KEY_WIDTH, height: 50 }, 
                                                    pressed && { transform: [{ scale: 0.92 }] }
                                                ]}
                                            >
                                                {({ pressed }) => (
                                                    <View style={[styles.solidKey, pressed && { backgroundColor: 'rgba(255,255,255,0.7)' }]}>
                                                        <Text style={[styles.keyText, { fontSize: 18 }]}>{letter}</Text>
                                                    </View>
                                                )}
                                            </Pressable>
                                        ))}
                                    </View>
                                ))}
                            </View>
                        </BlurView>
                    </View>
                </View>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#EBE5CE' },
    background: { ...StyleSheet.absoluteFillObject },
    topBar: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 10, paddingHorizontal: 24, zIndex: 10 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    backButton: { width: 44, height: 44, borderRadius: 14, overflow: 'hidden' },
    iconBlur: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.4)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)' },
    headerInfo: { alignItems: 'center', flex: 1 },
    categoryPill: { fontFamily: 'CrimsonPro-Bold', fontSize: 16, color: COLORS.text.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
    verseCounter: { fontFamily: 'CrimsonPro-Medium', fontSize: 13, color: COLORS.text.secondary },
    progressBarBg: { height: 4, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 2, width: '100%' },
    progressBarFill: { height: '100%', borderRadius: 2, backgroundColor: COLORS.accent.primary },
    
    // SCROLL CONTENT
    // WICHTIG: Padding unten, damit der letzte Text über der Tastatur sichtbar ist
    scrollContent: { paddingHorizontal: 24, paddingBottom: 400 }, 

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
    glassCard: { flex: 1, borderRadius: 30, overflow: 'hidden', padding: 20, borderWidth: 1, borderColor: COLORS.glassBorder, backgroundColor: 'rgba(255,255,255,0.5)' },
    solidCard: { flex: 1, borderRadius: 30, padding: 20, minHeight: CARD_HEIGHT },
    innerBorder: { flex: 1, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', padding: 24, justifyContent: 'center', alignItems: 'flex-start' },
    quoteIcon: { position: 'absolute', top: 10, left: 10, fontSize: 80, color: 'rgba(44,36,32,0.05)', fontFamily: 'CrimsonPro-Bold', zIndex: -1 },
    reference: { fontFamily: 'CrimsonPro-Bold', fontSize: 14, color: COLORS.text.secondary, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 2 },
    verseText: { fontFamily: 'CrimsonPro-Regular', fontSize: 24, lineHeight: 40, color: COLORS.text.primary, textAlign: 'left' },
    helpIconBtn: { position: 'absolute', bottom: 10, right: 10, borderRadius: 22, overflow: 'hidden', width: 44, height: 44 },
    helpBlur: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.4)' },
    statusBadge: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, alignSelf: 'center' },
    statusText: { fontFamily: 'CrimsonPro-Bold', color: '#FFF', fontSize: 14 },
    
    // --- KEYBOARD STYLES ---
    bottomSectionFixed: { 
        width: '100%', 
        position: 'absolute', 
        bottom: 0, 
        borderTopLeftRadius: 24, 
        borderTopRightRadius: 24, 
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
    },
    keyboardBgDarken: { 
        backgroundColor: 'rgba(235, 230, 215, 0.98)' 
    }, 
    keyboardBlur: { 
        paddingHorizontal: KEYBOARD_PADDING, 
        paddingTop: 15, 
        paddingBottom: Platform.OS === 'ios' ? 75 : 50, 
    },
    
    toolBar: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 15, 
        paddingHorizontal: 10 
    },
    hintText: { 
        fontFamily: 'CrimsonPro-Medium', 
        color: COLORS.text.tertiary, 
        fontSize: 14 
    },
    backspaceBtn: { 
        width: 44, 
        height: 44, 
        borderRadius: 12, 
        backgroundColor: 'rgba(255,255,255,0.4)', 
        justifyContent: 'center', 
        alignItems: 'center', 
        borderWidth: 1, 
        borderColor: 'rgba(255,255,255,0.5)' 
    },
    keyWrapper: { 
        borderRadius: 8, 
        overflow: 'hidden', 
        shadowColor: "#000", 
        shadowOffset: { width: 0, height: 1 }, 
        shadowOpacity: 0.3, 
        shadowRadius: 1, 
        elevation: 2 
    },
    solidKey: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: 'rgba(255, 255, 255, 0.9)', 
    },
    keyText: { 
        fontFamily: 'CrimsonPro-Bold', 
        fontSize: 22, 
        color: '#000' 
    },

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
    glassContainer: { flex: 1, borderRadius: 24, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.8)', overflow: 'hidden' },
});