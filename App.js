import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ThemeProvider } from './src/lib/ThemeContext';

// --- DEINE SCREENS ---
import HomeScreen from './src/screens/HomeScreen';
import PracticeScreen from './src/screens/PracticeScreen';
import StatsScreen from './src/screens/StatsScreen';
// 👇 WICHTIG: Hier importieren!
import BibleBrowserScreen from './src/screens/BibleBrowserScreen';

const Stack = createNativeStackNavigator()
SplashScreen.preventAutoHideAsync()

export default function App() {
    // const [fontsLoaded] = useFonts({
    //     'SourceSerif4-Regular': require('./assets/fonts/SourceSerif4-Regular.ttf'),
    //     'SourceSerif4-Medium': require('./assets/fonts/SourceSerif4-Medium.ttf'),
    //     'SourceSerif4-Bold': require('./assets/fonts/SourceSerif4-Bold.ttf'),
    // })

    const [fontsLoaded] = useFonts({
        'CrimsonPro-Regular': require('./assets/fonts/CrimsonPro-Regular.ttf'),
        'CrimsonPro-Medium': require('./assets/fonts/CrimsonPro-Medium.ttf'),
        'CrimsonPro-SemiBold': require('./assets/fonts/CrimsonPro-SemiBold.ttf'),
        'CrimsonPro-Bold': require('./assets/fonts/CrimsonPro-Bold.ttf'),
        'Inter-Regular': require('./assets/fonts/Inter-Regular.ttf'),
        'Inter-Medium': require('./assets/fonts/Inter-Medium.ttf'),
        'Inter-Bold': require('./assets/fonts/Inter-Bold.ttf'),
    })

    useEffect(() => {
        if (fontsLoaded) {
            SplashScreen.hideAsync()
        }
    }, [fontsLoaded])

    if (!fontsLoaded) {
        return null
    }

    return (
        <ThemeProvider>
        <NavigationContainer>
            <Stack.Navigator
                initialRouteName="Home"
                screenOptions={{
                    headerShown: false,
                    animation: 'fade',
                    contentStyle: { backgroundColor: '#FFFFFF' }
                }}
            >
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="Practice" component={PracticeScreen} />
                <Stack.Screen name="Stats" component={StatsScreen} />

                <Stack.Screen
                    name="BibleBrowser"
                    component={BibleBrowserScreen}
                    options={{
                        // Vorher war hier: animation: 'slide_from_bottom'
                        // Ändere es zu:
                        animation: 'fade',

                        // Optional: Das macht den Übergang noch smoother
                        presentation: 'card',
                        headerShown: false
                    }}
                />
            </Stack.Navigator>
        </NavigationContainer>
        </ThemeProvider>
    )
}