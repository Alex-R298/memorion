// lib/ThemeContext.js
import AsyncStorage from '@react-native-async-storage/async-storage'; // Installieren: npx expo install @react-native-async-storage/async-storage
import { createContext, useContext, useEffect, useState } from 'react';
import { StatusBar } from 'react-native';

// --- FARBPALETTEN ---

const LightColors = {
  type: 'light',
  bg: { primary: '#D4C4B0', secondary: '#C9B8A8' },
  glass: { 
    tint: 'light', // Für BlurView
    primary: 'rgba(255,255,255,0.7)', 
    secondary: 'rgba(255,255,255,0.5)',
    border: 'rgba(255, 255, 255, 0.6)',
    card: 'rgba(255,255,255,0.6)',
    input: 'rgba(255,255,255,0.5)'
  },
  gradient: ['#D4C4B0', '#C9B8A8', '#BEA999', '#C9B8A8', '#D4C4B0'], // Hintergrundverlauf
  text: { primary: '#2C2420', secondary: '#6B5D52', tertiary: '#9B8B7E', inverse: '#FFF' },
  accent: { primary: '#C97848', secondary: '#8B7355' },
};

const DarkColors = {
  type: 'dark',
  bg: { primary: '#1C1917', secondary: '#292524' }, // Sehr dunkles Braun/Grau
  glass: { 
    tint: 'dark', // Wichtig für BlurView!
    primary: 'rgba(30, 30, 30, 0.6)', 
    secondary: 'rgba(40, 40, 40, 0.5)',
    border: 'rgba(255, 255, 255, 0.15)', // Subtiler heller Rand im Dunkeln
    card: 'rgba(0,0,0,0.4)',
    input: 'rgba(255,255,255,0.1)'
  },
  gradient: ['#1C1917', '#262220', '#1F1C1A', '#262220', '#1C1917'], // Dunkler Verlauf
  text: { primary: '#ECE0D1', secondary: '#A89F91', tertiary: '#756C65', inverse: '#1C1917' },
  accent: { primary: '#D98E63', secondary: '#A68B6F' }, // Etwas hellere Akzente für Kontrast
};

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  // Beim Start: Gespeicherte Einstellung laden
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('userTheme');
      if (savedTheme === 'dark') setIsDark(true);
    } catch (e) { console.log(e); }
  };

  const toggleTheme = async () => {
    const newVal = !isDark;
    setIsDark(newVal);
    try {
      await AsyncStorage.setItem('userTheme', newVal ? 'dark' : 'light');
    } catch (e) { console.log(e); }
  };

  const colors = isDark ? DarkColors : LightColors;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      {/* StatusBar passt sich automatisch an */}
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} /> 
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);