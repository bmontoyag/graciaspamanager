import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    Image, ActivityIndicator, Alert, KeyboardAvoidingView,
    Platform, ScrollView, StatusBar
} from 'react-native';
import { useAuth } from '../store/AuthContext';
import { api } from '../services/api';

export default function LoginScreen() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [bgUrl, setBgUrl] = useState<string | null>(null);
    const [btnColor, setBtnColor] = useState('#1A2535');

    useEffect(() => {
        api.get('/configuration').then(res => {
            const cfg = res.data;
            if (cfg.logoUrl) setLogoUrl(cfg.logoUrl);
            if (cfg.loginBgUrl) setBgUrl(cfg.loginBgUrl);
            if (cfg.sidebarColor) setBtnColor(cfg.sidebarColor);
        }).catch(() => { });
    }, []);

    const handleLogin = async () => {
        if (!email.trim() || !password) {
            Alert.alert('Campos requeridos', 'Ingresa tu correo y contraseña');
            return;
        }
        setLoading(true);
        try {
            await login(email.trim().toLowerCase(), password);
        } catch (e: any) {
            Alert.alert('Error', e.response?.data?.message || 'Credenciales incorrectas');
        } finally { setLoading(false); }
    };

    return (
        <>
            <StatusBar barStyle="light-content" />
            <View style={styles.root}>
                {/* Background image (blurred) */}
                {bgUrl
                    ? <Image source={{ uri: bgUrl }} style={styles.bg} blurRadius={12} />
                    : <View style={[styles.bg, styles.bgFallback]} />
                }
                {/* Overlay */}
                <View style={styles.overlay} />

                <SafeAreaView style={{ flex: 1, justifyContent: 'center' }} edges={['top', 'bottom']}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                            {/* Logo */}
                            <View style={styles.logoWrap}>
                                {logoUrl
                                    ? <Image source={{ uri: logoUrl }} style={styles.logoImg} />
                                    : <View style={styles.logoPlaceholder}>
                                        <Text style={{ fontSize: 36 }}>✦</Text>
                                    </View>
                                }
                            </View>

                            {/* Brand name */}
                            <Text style={styles.brandName}>Gracia Spa</Text>
                            <Text style={styles.brandSub}>PORTAL DE GESTIÓN</Text>

                            {/* Card */}
                            <View style={styles.card}>
                                <Text style={styles.fieldLabel}>EMAIL</Text>
                                <TextInput
                                    style={styles.input}
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder="admin@graciaspa.com"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />

                                <Text style={[styles.fieldLabel, { marginTop: 16 }]}>PASSWORD</Text>
                                <TextInput
                                    style={styles.input}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                    placeholder="••••••••"
                                    placeholderTextColor="#9CA3AF"
                                />

                                <TouchableOpacity
                                    style={[styles.loginBtn, { backgroundColor: btnColor }]}
                                    onPress={handleLogin}
                                    disabled={loading}
                                    activeOpacity={0.85}
                                >
                                    {loading
                                        ? <ActivityIndicator color="#FFF" />
                                        : <Text style={styles.loginBtnText}>Iniciar Sesión</Text>
                                    }
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.forgotWrap}>
                                    <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    bg: { ...StyleSheet.absoluteFillObject, resizeMode: 'cover' } as any,
    bgFallback: { backgroundColor: '#8B7355' },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },

    scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 40 },

    logoWrap: { marginBottom: 16 },
    logoImg: { width: 80, height: 80, borderRadius: 16 },
    logoPlaceholder: { width: 80, height: 80, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },

    brandName: { color: '#FFF', fontSize: 26, fontWeight: '800', marginBottom: 4, textAlign: 'center' },
    brandSub: { color: 'rgba(255,255,255,0.6)', fontSize: 11, letterSpacing: 3, fontWeight: '600', marginBottom: 32, textAlign: 'center' },

    card: { width: '100%', backgroundColor: '#FFF', borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 16 },

    fieldLabel: { color: '#9CA3AF', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 },
    input: { height: 48, borderBottomWidth: 1.5, borderColor: '#E5E7EB', fontSize: 15, color: '#1A2535', paddingVertical: 6 },

    loginBtn: { height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 24, marginBottom: 16 },
    loginBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },

    forgotWrap: { alignItems: 'center' },
    forgotText: { color: '#9CA3AF', fontSize: 13 },
});
