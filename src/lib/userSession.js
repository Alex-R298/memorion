import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'MEMORION_USER_ID';

export async function getUserId() {
  try {
    // 1. Prüfen ob ID existiert
    const existingId = await AsyncStorage.getItem(STORAGE_KEY);
    if (existingId) return existingId;

    // 2. Neue ID generieren (Einfache Zufalls-ID ohne externe Pakete)
    // Erzeugt so etwas wie: "user_k4l2m5n_1703456789"
    const newId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    
    await AsyncStorage.setItem(STORAGE_KEY, newId);
    return newId;

  } catch (e) {
    console.error("ID Fehler:", e);
    // Notfall-Fallback, damit die App nicht abstürzt
    return 'offline_user';
  }
}