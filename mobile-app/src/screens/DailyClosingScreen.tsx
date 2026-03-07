import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, ActivityIndicator,
    TouchableOpacity, RefreshControl, Alert, StatusBar
} from 'react-native';
import { api } from '../services/api';
import { Colors } from '../theme';
import { useTheme } from '../store/ThemeContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'DailyClosing'> };
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function DailyClosingScreen({ navigation }: Props) {
    const theme = useTheme();
    const sidebarColor = theme.sidebar || Colors.header;

    const todayDate = new Date();
    const [selectedDay, setSelectedDay] = useState(new Date());
    const selectedDate = selectedDay.toISOString().split('T')[0];
    const isToday = selectedDate === todayDate.toISOString().split('T')[0];
    const prevDay = () => { const d = new Date(selectedDay); d.setDate(d.getDate() - 1); setSelectedDay(d); };
    const nextDay = () => { const d = new Date(selectedDay); d.setDate(d.getDate() + 1); setSelectedDay(d); };
    const dateLabel = isToday
        ? `Hoy, ${selectedDay.getDate()} de ${MONTHS[selectedDay.getMonth()]}`
        : `${selectedDay.getDate()} de ${MONTHS[selectedDay.getMonth()]} ${selectedDay.getFullYear()}`;

    const [attentions, setAttentions] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const load = async (date = selectedDate) => {
        setLoading(true);
        try {
            const [aRes, eRes] = await Promise.allSettled([api.get('/attentions'), api.get('/expenses')]);
            const allAtts = aRes.status === 'fulfilled' ? aRes.value.data : [];
            const allExps = eRes.status === 'fulfilled' ? eRes.value.data : [];
            setAttentions(allAtts.filter((a: any) => new Date(a.date).toISOString().split('T')[0] === date));
            setExpenses(allExps.filter((e: any) => new Date(e.date).toISOString().split('T')[0] === date));
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    };
    useEffect(() => { load(selectedDate); }, [selectedDate]);

    const totalIncome = attentions.reduce((s, a) => s + Number(a.totalCost || 0), 0);
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const netProfit = totalIncome - totalExpenses;
    const totalClients = new Set(attentions.map(a => a.clientId)).size;

    const therapistMap: Record<number, any> = {};
    attentions.forEach(att => {
        att.workers?.forEach((w: any) => {
            const id = w.workerId;
            if (!therapistMap[id]) therapistMap[id] = { id, name: w.worker?.name, commission: 0, count: 0, allPaid: true, records: [] };
            therapistMap[id].commission += Number(w.commissionAmount || 0);
            therapistMap[id].count += 1;
            therapistMap[id].records.push(w);
            if (!w.isPaid) therapistMap[id].allPaid = false;
        });
    });
    const therapists = Object.values(therapistMap);

    const markPaid = async (t: any) => {
        Alert.alert(`Pagar a ${t.name}`, `Comisión: S/ ${t.commission.toFixed(2)}`, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Confirmar', onPress: async () => {
                    try { await Promise.all(t.records.map((r: any) => api.patch(`/attention-workers/${r.id}`, { isPaid: true, paidAt: new Date().toISOString() }))); load(selectedDate); }
                    catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Error'); }
                }
            }
        ]);
    };

    return (
        <>
            <StatusBar barStyle="light-content" backgroundColor={sidebarColor} />
            <View style={{ flex: 1, backgroundColor: Colors.bgPage }}>

                {/* HEADER BLOCK — rounded bottom, floating */}
                <View style={[styles.headerBlock, { backgroundColor: sidebarColor }]}>
                    <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }} />
                    <View style={styles.titleRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.hSide}>
                            <Text style={styles.backText}>‹</Text>
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Cierre Diario</Text>
                        <View style={styles.hSide} />
                    </View>
                    <View style={styles.dateNav}>
                        <TouchableOpacity onPress={prevDay} style={styles.navBtn}>
                            <Text style={styles.navArrow}>‹</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setSelectedDay(new Date())} style={{ flex: 1, alignItems: 'center' }}>
                            <Text style={styles.dateNavLabel}>{dateLabel}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={nextDay} style={styles.navBtn} disabled={isToday}>
                            <Text style={[styles.navArrow, isToday && { opacity: 0.3 }]}>›</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* BODY */}
                {loading ? (
                    <ActivityIndicator size="large" color={sidebarColor} style={{ marginTop: 60 }} />
                ) : (
                    <ScrollView
                        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
                        refreshControl={<RefreshControl refreshing={refreshing} tintColor={sidebarColor} onRefresh={() => { setRefreshing(true); load(selectedDate); }} />}
                    >
                        {/* 2×2 Grid */}
                        <View style={styles.grid}>
                            <SCard label="INGRESOS" value={`S/ ${totalIncome.toFixed(2)}`} accent={Colors.success} />
                            <SCard label="GASTOS" value={`S/ ${totalExpenses.toFixed(2)}`} accent={Colors.danger} />
                            <SCard label="NETO" value={`S/ ${netProfit.toFixed(2)}`} accent={Colors.primary} />
                            <SCard label="CLIENTES" value={String(totalClients)} accent={Colors.purple} />
                        </View>

                        {/* Therapists */}
                        {therapists.length > 0 && (
                            <View>
                                <Text style={styles.secLabel}>PAGOS A TERAPEUTAS</Text>
                                <View style={styles.sectionCard}>
                                    {therapists.map((t, i) => (
                                        <View key={t.id} style={[styles.tRow, i === therapists.length - 1 && { borderBottomWidth: 0 }]}>
                                            <View style={[styles.tAvatar, { backgroundColor: sidebarColor + '20' }]}>
                                                <Text style={[styles.tLetter, { color: sidebarColor }]}>{t.name?.[0]?.toUpperCase()}</Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.tName}>{t.name}</Text>
                                                <Text style={styles.tSub}>Comisión por {t.count} servicio(s)</Text>
                                            </View>
                                            <Text style={[styles.tComm, { color: Colors.success }]}>S/ {t.commission.toFixed(2)}</Text>
                                            {t.allPaid
                                                ? <View style={styles.paidBadge}><Text style={styles.paidText}>✓ Pagado</Text></View>
                                                : <TouchableOpacity onPress={() => markPaid(t)} style={[styles.payBtn, { backgroundColor: sidebarColor }]}>
                                                    <Text style={styles.payBtnText}>Pagar</Text>
                                                </TouchableOpacity>
                                            }
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Attentions detail */}
                        {attentions.length > 0 && (
                            <View>
                                <Text style={styles.secLabel}>DETALLE DE ATENCIONES</Text>
                                <View style={styles.sectionCard}>
                                    {attentions.map((att, i) => (
                                        <View key={att.id} style={[styles.detRow, i === attentions.length - 1 && { borderBottomWidth: 0 }]}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.detName}>{att.client?.name}</Text>
                                                <Text style={styles.detService}>{att.service?.name}</Text>
                                            </View>
                                            <Text style={[styles.detCost, { color: Colors.success }]}>S/ {Number(att.totalCost).toFixed(2)}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {attentions.length === 0 && expenses.length === 0 && (
                            <View style={{ alignItems: 'center', marginTop: 60, gap: 10 }}>
                                <Text style={{ fontSize: 40 }}>📋</Text>
                                <Text style={{ color: Colors.textSecondary, fontSize: 15 }}>Sin datos para este día</Text>
                            </View>
                        )}
                    </ScrollView>
                )}
            </View>
        </>
    );
}

function SCard({ label, value, accent }: { label: string; value: string; accent: string }) {
    return (
        <View style={[sc.card, { borderTopColor: accent }]}>
            <Text style={sc.label}>{label}</Text>
            <Text style={[sc.value, { color: accent }]}>{value}</Text>
        </View>
    );
}
const sc = StyleSheet.create({
    card: { width: '47%', backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14, borderTopWidth: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    label: { color: Colors.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
    value: { fontSize: 20, fontWeight: '800' },
});

const styles = StyleSheet.create({
    headerBlock: {
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
        paddingHorizontal: 12, paddingBottom: 8,
        shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18, shadowRadius: 14, elevation: 10, zIndex: 10,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center' },
    hSide: { width: 44, alignItems: 'center' },
    backText: { color: '#FFF', fontSize: 28, fontWeight: '300' },
    headerTitle: { flex: 1, color: '#FFF', fontSize: 18, fontWeight: '700', textAlign: 'center' },

    dateNav: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
    navBtn: { padding: 10 },
    navArrow: { color: 'rgba(255,255,255,0.7)', fontSize: 28 },
    dateNavLabel: { color: '#FFF', fontSize: 14, fontWeight: '600' },

    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    secLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
    sectionCard: { backgroundColor: Colors.bgCard, borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 5, elevation: 2 },

    tRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
    tAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    tLetter: { fontSize: 16, fontWeight: '800' },
    tName: { color: Colors.textPrimary, fontWeight: '700', fontSize: 14 },
    tSub: { color: Colors.textSecondary, fontSize: 12, marginTop: 1 },
    tComm: { fontSize: 14, fontWeight: '800', marginRight: 8 },
    paidBadge: { backgroundColor: '#D1FAE5', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
    paidText: { color: '#10B981', fontSize: 12, fontWeight: '700' },
    payBtn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
    payBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },

    detRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
    detName: { color: Colors.textPrimary, fontWeight: '600', fontSize: 14 },
    detService: { color: Colors.textSecondary, fontSize: 12, marginTop: 1 },
    detCost: { fontSize: 14, fontWeight: '800' },
});
