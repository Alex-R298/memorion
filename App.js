import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts } from 'expo-font'; // ← FEHLT!
import * as SplashScreen from 'expo-splash-screen'; // ← FEHLT!
import { useEffect } from 'react'; // ← FEHLT!

import CategoryScreen from './src/screens/CategoryScreen';
import HomeScreen from './src/screens/HomeScreen';
import PracticeScreen from './src/screens/PracticeScreen';
import StatsScreen from './src/screens/StatsScreen';

const Stack = createNativeStackNavigator()
SplashScreen.preventAutoHideAsync()  // ← FEHLT!

export default function App() {
    const [fontsLoaded] = useFonts({
        'Inter-Regular': require('./assets/fonts/Inter-Regular.ttf'),
        'Inter-Medium': require('./assets/fonts/Inter-Medium.ttf'),
        'Inter-Bold': require('./assets/fonts/Inter-Bold.ttf'),
    })

    // ← DAS FEHLT!
    useEffect(() => {
        if (fontsLoaded) {
            SplashScreen.hideAsync()
        }
    }, [fontsLoaded])

    // ← DAS FEHLT!
    if (!fontsLoaded) {
        return null
    }

    return (
        <NavigationContainer>
            <Stack.Navigator
                initialRouteName="Home"
                screenOptions={{
                    headerShown: true,
                    headerStyle: {
                        backgroundColor: '#fff',
                    },
                    headerTintColor: '#000',
                }}
            >
                <Stack.Screen
                    name="Home"
                    component={HomeScreen}
                    options={{ title: 'Memorion' }}
                />
                <Stack.Screen
                    name="Practice"
                    component={PracticeScreen}
                    options={{ title: 'Practice' }}
                />
                <Stack.Screen
                    name="Stats"
                    component={StatsScreen}
                    options={{ title: 'Statistics' }}
                />

                <Stack.Screen
                    name="Category"
                    component={CategoryScreen}
                    options={{ title: 'Kategorien' }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    )
}