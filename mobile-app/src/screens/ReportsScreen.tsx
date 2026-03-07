import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, ActivityIndicator,
    TouchableOpacity, StatusBar, RefreshControl
} from 'react-native';
import { api } from '../services/api';
import { Colors } from '../theme';
import { useTheme } from '../store/ThemeContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Reports'> };
type Period = 'Semana' | 'Mes' | 'Año';

export default function ReportsScreen({ navigation }: Props) {
    const theme = useTheme();
    const sidebarColor = theme.sidebar || Colors.header;
    const [period, setPeriod] = useState<Period>('Mes');
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = async () => {
        try {
            const [sRes, fRes] = await Promise.allSettled([
                api.get('/dashboard/stats'),
                api.get('/dashboard/financial'),
            ]);
            const s = sRes.status === 'fulfilled' ? sRes.value.data : {};
            const f = fRes.status === 'fulfilled' ? fRes.value.data : {};
            setStats({ ...s, ...f });
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    };
    useEffect(() => { load(); }, [period]);

    const income = stats?.income ?? stats?.totalRevenue ?? 0;
    const expenses = stats?.expenses ?? stats?.totalExpenses ?? 0;
    const net = income - expenses;
    const periods: Period[] = ['Semana', 'Mes', 'Año'];

    return (
        <>
            <StatusBar barStyle="light-content" backgroundColor={sidebarColor} />
            <View style={{ flex: 1, backgroundColor: Colors.bgPage }}>

                {/* HEADER BLOCK — with tabs inside */}
                <View style={[styles.headerBlock, { backgroundColor: sidebarColor }]}>
                    <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }} />
                    <View style={styles.titleRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.hSide}>
                            <Text style={styles.backText}>‹</Text>
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Reportes</Text>
                        <View style={styles.hSide} />
                    </View>
                    {/* Period tabs */}
                    <View style={styles.tabs}>
                        {periods.map(p => (
                            <TouchableOpacity
                                key={p}
                                style={[styles.tab, period === p && styles.tabActive]}
                                onPress={() => setPeriod(p)}
                            >
                                <Text style={[styles.tabText, period === p && styles.tabTextActive]}>{p}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* BODY */}
                {loading ? (
                    <ActivityIndicator size="large" color={sidebarColor} style={{ marginTop: 60 }} />
                ) : (
                    <ScrollView
                        contentContainerStyle={{ padding: 16, paddingBottom: 50, gap: 6 }}
                        refreshControl={<RefreshControl refreshing={refreshing} tintColor={sidebarColor} onRefresh={() => { setRefreshing(true); load(); }} />}
                    >
                        {/* ACTIVIDAD */}
                        <Text style={styles.secLabel}>ACTIVIDAD</Text>
                        <View style={styles.dataCard}>
                            {[
                                { label: 'Citas hoy', value: stats?.appointmentsToday ?? 0, delta: '+2' },
                                { label: 'Clientes totales', value: stats?.totalClients ?? 0, delta: '+15' },
                                { label: 'Ventas hoy', value: `$${(stats?.salesToday ?? 0).toLocaleString()}`, delta: '+$200' },
                                { label: 'Ventas del mes', value: `$${(stats?.salesMonth ?? 0).toLocaleString()}`, delta: '+12%' },
                            ].map((row, i, arr) => (
                                <View key={row.label} style={[styles.dataRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                                    <Text style={styles.dataLabel}>{row.label}</Text>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={styles.dataValue}>{row.value}</Text>
                                        <Text style={styles.dataDelta}>{row.delta}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>

                        {/* FINANZAS */}
                        <Text style={[styles.secLabel, { marginTop: 14 }]}>FINANZAS DEL MES</Text>
                        <View style={styles.dataCard}>
                            <View style={[styles.dataRow, { paddingVertical: 18 }]}>
                                <Text style={styles.dataLabel}>Ingresos</Text>
                                <Text style={[styles.dataValue, { color: Colors.success }]}>${income.toLocaleString('es', { minimumFractionDigits: 2 })}</Text>
                            </View>
                            <View style={[styles.dataRow, { paddingVertical: 18 }]}>
                                <Text style={styles.dataLabel}>Gastos</Text>
                                <Text style={[styles.dataValue, { color: Colors.danger }]}>${expenses.toLocaleString('es', { minimumFractionDigits: 2 })}</Text>
                            </View>
                            {/* Separator */}
                            <View style={{ height: 1, backgroundColor: Colors.border, marginHorizontal: 16 }} />
                            <View style={{ paddingHorizontal: 16, paddingVertical: 18 }}>
                                <Text style={styles.netLabel}>BALANCE NETO</Text>
                                <Text style={styles.netValue}>${net.toLocaleString('es', { minimumFractionDigits: 2 })}</Text>
                            </View>
                        </View>

                        {/* Chart placeholder */}
                        <View style={styles.chartPlaceholder}>
                            <Text style={{ color: Colors.textMuted, fontSize: 13 }}>Gráfico de Ventas Mensuales</Text>
                        </View>
                    </ScrollView>
                )}
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
    titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    hSide: { width: 44, alignItems: 'center' },
    backText: { color: '#FFF', fontSize: 28, fontWeight: '300' },
    headerTitle: { flex: 1, color: '#FFF', fontSize: 18, fontWeight: '700', textAlign: 'center' },

    tabs: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 20, padding: 4, marginHorizontal: 8 },
    tab: { flex: 1, paddingVertical: 8, borderRadius: 16, alignItems: 'center' },
    tabActive: { backgroundColor: '#FFF' },
    tabText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' },
    tabTextActive: { color: Colors.header, fontWeight: '800' },

    secLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },

    dataCard: { backgroundColor: Colors.bgCard, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
    dataRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
    dataLabel: { color: Colors.textSecondary, fontSize: 15 },
    dataValue: { color: Colors.textPrimary, fontWeight: '800', fontSize: 16 },
    dataDelta: { color: Colors.success, fontSize: 11, fontWeight: '700', marginTop: 1 },

    netLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
    netValue: { color: Colors.textPrimary, fontSize: 32, fontWeight: '800' },

    chartPlaceholder: { borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: 14, height: 120, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
});
