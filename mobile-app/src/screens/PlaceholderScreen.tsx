import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity} from 'react-native';

export default function PlaceholderScreen({ navigation, route }: any) {
    const name = route?.name || 'Módulo';
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>← Volver</Text>
                </TouchableOpacity>
                <Text style={styles.title}>{name}</Text>
            </View>
            <View style={styles.center}>
                <Text style={styles.emoji}>🔧</Text>
                <Text style={styles.text}>Módulo en construcción</Text>
                <Text style={styles.sub}>Disponible próximamente</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1A1A2E' },
    header: { backgroundColor: '#2C3E50', padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
    back: { color: '#FFF', fontSize: 16 },
    title: { color: '#FFF', fontSize: 20, fontWeight: '700' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
    emoji: { fontSize: 48 },
    text: { color: '#FFF', fontSize: 18, fontWeight: '600' },
    sub: { color: 'rgba(255,255,255,0.5)', fontSize: 14 }});


