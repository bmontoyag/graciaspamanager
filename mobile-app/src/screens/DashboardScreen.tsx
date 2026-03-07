import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, ActivityIndicator,
    TouchableOpacity, StatusBar, RefreshControl
} from 'react-native';
import { api } from '../services/api';
import { Colors, SharedStyles } from '../theme';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Dashboard'> };

interface Stat { label: string; value: string; color: string; icon: string; }

export default function DashboardScreen({ navigation }: Props) {
    const [stats, setStats] = useState<Stat[]>([]);
    const [todayAppts, setTodayAppts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = async () => {
        try {
            const [sRes, aRes] = await Promise.allSettled([
                api.get('/dashboard/stats'),
                api.get('/dashboard/appointments'),
            ]);

            if (sRes.status === 'fulfilled') {
                const d = sRes.value.data;
                setStats([
                    { label: 'Citas Hoy', value: String(d.todayAppointments ?? 0), color: Colors.purple, icon: '📅' },
                    { label: 'Atenciones del Mes', value: String(d.monthlyAttentions ?? 0), color: Colors.info, icon: '💆' },
                    { label: 'Clientes Totales', value: String(d.activeClients ?? d.totalClients ?? 0), color: Colors.success, icon: '👥' },
                    { label: 'Ingresos del Mes', value: `S/ ${Number(d.monthlyRevenue ?? 0).toFixed(0)}`, color: Colors.warning, icon: '💰' },
                ]);
            }

            if (aRes.status === 'fulfilled') {
                setTodayAppts(aRes.value.data?.slice(0, 5) || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { load(); }, []);

    const STATUS_COLORS: Record<string, string> = {
        PENDING: Colors.warning,
        CONFIRMED: Colors.success,
        COMPLETED: Colors.purple,
        CANCELLED: Colors.danger};

    return (
        <SafeAreaView style={SharedStyles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.sidebar} />
            <View style={SharedStyles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={SharedStyles.backBtn}>← Volver</Text>
                </TouchableOpacity>
                <Text style={SharedStyles.headerTitle}>Resumen del Día</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={Colors.sidebar} style={{ marginTop: 60 }} />
            ) : (
                <ScrollView
                    contentContainerStyle={{ padding: 16, gap: 12 }}
                    refreshControl={<RefreshControl refreshing={refreshing} tintColor={Colors.sidebar} onRefresh={() => { setRefreshing(true); load(); }} />}
                >
                    {/* Stats Grid */}
                    <View style={styles.grid}>
                        {stats.map(s => (
                            <View key={s.label} style={styles.statCard}>
                                <Text style={styles.statIcon}>{s.icon}</Text>
                                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                                <Text style={styles.statLabel}>{s.label}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Today's Appointments */}
                    {todayAppts.length > 0 && (
                        <>
                            <Text style={styles.sectionTitle}>Citas de Hoy</Text>
                            {todayAppts.map(apt => (
                                <View key={apt.id} style={[SharedStyles.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                                    <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[apt.status] || Colors.textMuted }]} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.aptClient}>{apt.client?.name}</Text>
                                        <Text style={styles.aptService}>{apt.service?.name}</Text>
                                    </View>
                                    <Text style={styles.aptTime}>
                                        {new Date(apt.date).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                            ))}
                        </>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    statCard: {
        width: '47%', backgroundColor: Colors.bgCard, borderRadius: 16,
        padding: 16, alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3},
    statIcon: { fontSize: 24, marginBottom: 6 },
    statValue: { fontSize: 26, fontWeight: '800' },
    statLabel: { color: Colors.textSecondary, fontSize: 12, marginTop: 4, textAlign: 'center' },
    sectionTitle: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4 },
    statusDot: { width: 10, height: 10, borderRadius: 5 },
    aptClient: { color: Colors.textPrimary, fontWeight: '600', fontSize: 14 },
    aptService: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
    aptTime: { color: Colors.sidebar, fontWeight: '700', fontSize: 14 }});


