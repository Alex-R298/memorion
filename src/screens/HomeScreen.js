import { Pressable, StyleSheet, Text, View } from 'react-native'

export default function HomeScreen({ navigation }) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Memorion</Text>
            <Text style={styles.subtitle}>Memorize Scripture Daily</Text>

            <Pressable
                style={styles.button}
                onPress={() => navigation.navigate('Category')}  // ← Geändert
            >
                <Text style={styles.buttonText}>Start Practice</Text>
            </Pressable>

            <Pressable
                style={[styles.button, styles.secondaryButton]}
                onPress={() => navigation.navigate('Stats')}
            >
                <Text style={styles.buttonText}>View Stats</Text>
            </Pressable>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 20,
    },
    title: {
        fontFamily: 'Inter-Bold',  // ← Deine lokale Font
        fontSize: 48,
        color: '#333',
        marginBottom: 8,
    },
    subtitle: {
        fontFamily: 'Inter-Regular',  // ← Deine lokale Font
        fontSize: 16,
        color: '#666',
        marginBottom: 40,
    },
    button: {
        backgroundColor: '#007AFF',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        marginBottom: 16,
        minWidth: 200,
    },
    secondaryButton: {
        backgroundColor: '#5856D6',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
    },
})