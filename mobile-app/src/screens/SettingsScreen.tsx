import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity,
    StatusBar, RefreshControl, Alert, Switch
} from 'react-native';
import { api } from '../services/api';
import { Colors } from '../theme';
import { useTheme } from '../store/ThemeContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Settings'> };

const THEMES = [
    { name: 'Deep Navy', colors: ['#1E3A5F', '#2C5282', '#EBF8FF'] },
    { name: 'Emerald', colors: ['#065F46', '#10B981', '#D1FAE5'] },
    { name: 'Royal Purple', colors: ['#5B21B6', '#7C3AED', '#EDE9FE'] },
    { name: 'Sunset', colors: ['#C05621', '#ED6C3F', '#FFF3E0'] },
];

export default function SettingsScreen({ navigation }: Props) {
    const theme = useTheme();
    const sidebarColor = theme.sidebar || Colors.header;

    const [config, setConfig] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [notifSettings, setNotifSettings] = useState({
        newAppointments: true, paymentReminders: true,
        dailyReports: false, stockAlerts: true,
    });

    const load = async () => {
        try {
            const res = await api.get('/configuration');
            setConfig(res.data);
            if (res.data.notificationSettings) setNotifSettings(res.data.notificationSettings);
        } catch (e) { console.error(e); }
        finally { setRefreshing(false); }
    };
    useEffect(() => { load(); }, []);

    const applyTheme = async (tc: string[]) => {
        try {
            await api.patch('/configuration', { sidebarColor: tc[0] });
            load();
        } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'No se pudo aplicar'); }
    };

    const saveNotif = async (key: string, val: boolean) => {
        const updated = { ...notifSettings, [key]: val };
        setNotifSettings(updated as any);
        try { await api.patch('/configuration', { notificationSettings: updated }); }
        catch (e) { console.error(e); }
    };

    const selectedThemeIdx = THEMES.findIndex(t => t.colors[0] === sidebarColor);

    return (
        <>
            <StatusBar barStyle="light-content" backgroundColor={sidebarColor} />
            <View style={{ flex: 1, backgroundColor: Colors.bgPage }}>

                {/* HEADER BLOCK */}
                <View style={[styles.headerBlock, { backgroundColor: sidebarColor }]}>
                    <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }} />
                    <View style={styles.titleRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.hSide}>
                            <Text style={styles.backText}>‹</Text>
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Configuración</Text>
                        <View style={styles.hSide} />
                    </View>
                </View>

                {/* BODY */}
                <ScrollView
                    contentContainerStyle={{ padding: 16, paddingBottom: 50 }}
                    refreshControl={<RefreshControl refreshing={refreshing} tintColor={sidebarColor} onRefresh={() => { setRefreshing(true); load(); }} />}
                >
                    {/* TEMAS PREDEFINIDOS */}
                    <Text style={styles.secLabel}>TEMAS PREDEFINIDOS</Text>
                    <View style={styles.themeGrid}>
                        {THEMES.map((t, i) => (
                            <TouchableOpacity
                                key={t.name}
                                style={[styles.themeCard, selectedThemeIdx === i && { borderColor: sidebarColor, borderWidth: 2.5 }]}
                                onPress={() => applyTheme(t.colors)}
                                activeOpacity={0.8}
                            >
                                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                                    {t.colors.map((c, ci) => (
                                        <View key={ci} style={[styles.swatch, ci === 0 && { width: 34 }, ci === 2 && { opacity: 0.4 }, { backgroundColor: c }]} />
                                    ))}
                                </View>
                                <Text style={styles.themeName}>{t.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* NOTIFICACIONES PUSH */}
                    <Text style={[styles.secLabel, { marginTop: 20 }]}>NOTIFICACIONES PUSH</Text>
                    <View style={styles.sectionCard}>
                        {[
                            { key: 'newAppointments', label: 'Nuevas citas' },
                            { key: 'paymentReminders', label: 'Recordatorios de pago' },
                            { key: 'dailyReports', label: 'Reportes diarios' },
                            { key: 'stockAlerts', label: 'Alertas de stock' },
                        ].map((item, i, arr) => (
                            <View key={item.key} style={[styles.toggleRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                                <Text style={styles.toggleLabel}>{item.label}</Text>
                                <Switch
                                    value={(notifSettings as any)[item.key]}
                                    onValueChange={v => saveNotif(item.key, v)}
                                    trackColor={{ false: '#D1D5DB', true: '#10B981' }}
                                    thumbColor="#FFF"
                                />
                            </View>
                        ))}
                    </View>

                    {/* HORARIO DEL NEGOCIO */}
                    <Text style={[styles.secLabel, { marginTop: 20 }]}>HORARIO DEL NEGOCIO</Text>
                    <View style={styles.sectionCard}>
                        {[
                            { label: 'Lunes - Viernes', value: config?.businessHours?.weekdays || '09:00 - 20:00' },
                            { label: 'Sábados', value: config?.businessHours?.saturday || '10:00 - 18:00' },
                        ].map((row, i, arr) => (
                            <View key={row.label} style={[styles.scheduleRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                                <Text style={styles.scheduleLabel}>{row.label}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Text style={styles.scheduleValue}>{row.value}</Text>
                                    <Text style={{ color: Colors.textMuted, fontSize: 16 }}>›</Text>
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* BACKUP */}
                    <Text style={[styles.secLabel, { marginTop: 20 }]}>BACKUP</Text>
                    <View style={styles.sectionCard}>
                        <TouchableOpacity style={[styles.scheduleRow, { borderBottomWidth: 0 }]}
                            onPress={() => Alert.alert('Backup', 'Función disponible próximamente')}>
                            <Text style={styles.scheduleLabel}>Exportar datos</Text>
                            <Text style={{ color: Colors.textMuted, fontSize: 16 }}>›</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    headerBlock: {
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
        paddingHorizontal: 12, paddingBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18, shadowRadius: 14, elevation: 10, zIndex: 10,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center' },
    hSide: { width: 44, alignItems: 'center' },
    backText: { color: '#FFF', fontSize: 28, fontWeight: '300' },
    headerTitle: { flex: 1, color: '#FFF', fontSize: 18, fontWeight: '700', textAlign: 'center' },

    secLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },

    themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    themeCard: { width: '47%', backgroundColor: Colors.bgCard, borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: Colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
    swatch: { width: 28, height: 28, borderRadius: 8 },
    themeName: { color: Colors.textPrimary, fontSize: 12, fontWeight: '600', textAlign: 'center' },

    sectionCard: { backgroundColor: Colors.bgCard, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 5, elevation: 2 },

    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
    toggleLabel: { color: Colors.textPrimary, fontSize: 15 },

    scheduleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
    scheduleLabel: { color: Colors.textPrimary, fontSize: 15 },
    scheduleValue: { color: Colors.textSecondary, fontSize: 14 },
});
