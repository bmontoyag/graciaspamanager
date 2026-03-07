import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, FlatList, ActivityIndicator,
    TouchableOpacity, StatusBar, RefreshControl, Modal,
    TextInput, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { api } from '../services/api';
import { Colors } from '../theme';
import { useTheme } from '../store/ThemeContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Calendar'> };

const DAYS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
    PENDING: { label: 'Pendiente', bg: '#FFF3E0', color: '#F97316' },
    CONFIRMED: { label: 'Confirmado', bg: '#D1FAE5', color: '#10B981' },
    COMPLETED: { label: 'Completado', bg: '#EDE9FE', color: '#7C3AED' },
    CANCELLED: { label: 'Cancelado', bg: '#FEE2E2', color: '#EF4444' },
    BLOQUEADO: { label: 'Bloqueado', bg: '#FEE2E2', color: '#EF4444' },
};

function getCalendarDays(year: number, month: number): (number | null)[] {
    const first = new Date(year, month, 1).getDay();
    const daysNum = new Date(year, month + 1, 0).getDate();
    const arr: (number | null)[] = Array(first).fill(null);
    for (let i = 1; i <= daysNum; i++) arr.push(i);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
}

export default function CalendarScreen({ navigation }: Props) {
    const theme = useTheme();
    const sidebarColor = theme.sidebar || Colors.header;

    const today = new Date();
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [selDay, setSelDay] = useState(today.getDate());

    const calDays = getCalendarDays(viewYear, viewMonth);
    const selectedDate = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(selDay).padStart(2, '0')}`;

    const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); setSelDay(1); };
    const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); setSelDay(1); };

    const [appts, setAppts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [clients, setClients] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [form, setForm] = useState({ clientId: '', serviceId: '', date: '', notes: '' });
    const [saving, setSaving] = useState(false);

    const load = async () => {
        try {
            const r = await api.get('/appointments');
            setAppts(r.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    };
    const loadMeta = async () => {
        const [cr, sr] = await Promise.allSettled([api.get('/clients'), api.get('/services')]);
        if (cr.status === 'fulfilled') setClients(cr.value.data);
        if (sr.status === 'fulfilled') setServices(sr.value.data);
    };
    useEffect(() => { load(); loadMeta(); }, []);

    const dayAppts = appts.filter(a => {
        const d = new Date(a.date);
        return d.getFullYear() === viewYear && d.getMonth() === viewMonth && d.getDate() === selDay;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Dots for days that have appointments
    const apptDays = new Set(appts.filter(a => {
        const d = new Date(a.date);
        return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
    }).map(a => new Date(a.date).getDate()));

    const openCreate = () => {
        setEditing(null);
        setForm({ clientId: '', serviceId: '', date: `${selectedDate}T09:00`, notes: '' });
        setModalOpen(true);
    };
    const openEdit = (a: any) => {
        setEditing(a);
        setForm({
            clientId: String(a.clientId || ''),
            serviceId: String(a.serviceId || ''),
            date: a.date ? a.date.slice(0, 16) : '',
            notes: a.notes || '',
        });
        setModalOpen(true);
    };
    const handleSave = async () => {
        if (!form.clientId || !form.serviceId || !form.date) { Alert.alert('Incompleto', 'Completa todos los campos'); return; }
        setSaving(true);
        try {
            const payload = { clientId: Number(form.clientId), serviceId: Number(form.serviceId), date: new Date(form.date).toISOString(), notes: form.notes, status: 'PENDING' };
            if (editing) await api.patch(`/appointments/${editing.id}`, payload);
            else await api.post('/appointments', payload);
            setModalOpen(false); load();
        } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'No se pudo guardar'); }
        finally { setSaving(false); }
    };
    const changeStatus = async (apt: any, status: string) => {
        try { await api.patch(`/appointments/${apt.id}`, { status }); load(); }
        catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Error'); }
    };

    const dayLabel = `${['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][new Date(viewYear, viewMonth, selDay).getDay()]}, ${selDay} de ${MONTHS[viewMonth]}`;

    return (
        <>
            <StatusBar barStyle="light-content" backgroundColor={sidebarColor} />
            <View style={{ flex: 1, backgroundColor: Colors.bgPage }}>

                {/* HEADER BLOCK — calendar grid inside, rounded bottom, floating */}
                <View style={[styles.headerBlock, { backgroundColor: sidebarColor }]}>
                    <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }} />

                    {/* Title + month nav */}
                    <View style={styles.titleRow}>
                        <TouchableOpacity onPress={prevMonth} style={styles.hSide}>
                            <Text style={styles.navArrow}>‹</Text>
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>{MONTHS[viewMonth]} {viewYear}</Text>
                        <TouchableOpacity onPress={nextMonth} style={styles.hSide}>
                            <Text style={styles.navArrow}>›</Text>
                        </TouchableOpacity>
                    </View>
                    {/* Back + new buttons row */}
                    <View style={styles.subRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backPill}>
                            <Text style={styles.backPillText}>‹ Volver</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={openCreate} style={styles.newBtn}>
                            <Text style={styles.newBtnText}>+ Nueva</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Day headers */}
                    <View style={styles.dayHeaders}>
                        {DAYS.map(d => <Text key={d} style={styles.dayHeaderText}>{d}</Text>)}
                    </View>

                    {/* Calendar grid */}
                    <View style={styles.calGrid}>
                        {calDays.map((d, i) => {
                            const isSelected = d === selDay;
                            const isToday = d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
                            const hasDot = d !== null && apptDays.has(d);
                            return (
                                <TouchableOpacity
                                    key={i}
                                    style={[styles.calCell, isSelected && [styles.calCellSelected, { backgroundColor: '#FFF' }]]}
                                    onPress={() => d && setSelDay(d)}
                                    disabled={!d}
                                    activeOpacity={d ? 0.7 : 1}
                                >
                                    {d && (
                                        <>
                                            <Text style={[
                                                styles.calDayText,
                                                isSelected && [styles.calDaySelected, { color: sidebarColor }],
                                                isToday && !isSelected && styles.calDayToday,
                                            ]}>{d}</Text>
                                            {hasDot && <View style={[styles.dot, { backgroundColor: isSelected ? sidebarColor : 'rgba(255,255,255,0.6)' }]} />}
                                        </>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* BODY */}
                <ScrollView
                    contentContainerStyle={{ padding: 14, paddingBottom: 50 }}
                    refreshControl={<RefreshControl refreshing={refreshing} tintColor={sidebarColor} onRefresh={() => { setRefreshing(true); load(); }} />}
                >
                    <Text style={styles.dayLabel}>{dayLabel.toUpperCase()}</Text>
                    {loading ? (
                        <ActivityIndicator size="large" color={sidebarColor} style={{ marginTop: 40 }} />
                    ) : dayAppts.length === 0 ? (
                        <View style={{ alignItems: 'center', paddingTop: 48, gap: 8 }}>
                            <Text style={{ fontSize: 36 }}>📅</Text>
                            <Text style={{ color: Colors.textSecondary, fontSize: 14 }}>Sin citas este día</Text>
                        </View>
                    ) : (
                        dayAppts.map(apt => {
                            const t = new Date(apt.date);
                            const time = t.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
                            const badge = STATUS_BADGE[apt.status] || STATUS_BADGE.PENDING;
                            return (
                                <TouchableOpacity key={apt.id} style={styles.aptRow} onPress={() => openEdit(apt)} activeOpacity={0.8}>
                                    <Text style={styles.aptTime}>{time}</Text>
                                    <View style={styles.aptCard}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <Text style={styles.aptName}>{apt.client?.name}</Text>
                                            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                                                <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label.toUpperCase()}</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.aptService}>{apt.service?.name}</Text>
                                        {apt.worker && <Text style={styles.aptWorker}>👤 {apt.worker?.name}</Text>}
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </ScrollView>
            </View>

            {/* Modal */}
            <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalOpen(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bgPage }} edges={['top']}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setModalOpen(false)}><Text style={{ color: Colors.danger }}>Cancelar</Text></TouchableOpacity>
                            <Text style={styles.modalTitle}>{editing ? 'Editar cita' : 'Nueva cita'}</Text>
                            <TouchableOpacity onPress={handleSave} disabled={saving}>
                                {saving ? <ActivityIndicator color={sidebarColor} /> : <Text style={[{ fontWeight: '700' }, { color: sidebarColor }]}>Guardar</Text>}
                            </TouchableOpacity>
                        </View>
                        <ScrollView contentContainerStyle={{ padding: 20 }}>
                            <Text style={mf.label}>Cliente</Text>
                            <TextInput style={mf.input} value={form.clientId} onChangeText={v => setForm(p => ({ ...p, clientId: v }))} placeholder="ID del cliente" placeholderTextColor={Colors.textMuted} keyboardType="numeric" />
                            <Text style={[mf.label, { marginTop: 12 }]}>Servicio</Text>
                            <TextInput style={mf.input} value={form.serviceId} onChangeText={v => setForm(p => ({ ...p, serviceId: v }))} placeholder="ID del servicio" placeholderTextColor={Colors.textMuted} keyboardType="numeric" />
                            <Text style={[mf.label, { marginTop: 12 }]}>Fecha/hora (YYYY-MM-DDTHH:mm)</Text>
                            <TextInput style={mf.input} value={form.date} onChangeText={v => setForm(p => ({ ...p, date: v }))} placeholder="2024-03-06T10:30" placeholderTextColor={Colors.textMuted} />
                            <Text style={[mf.label, { marginTop: 12 }]}>Notas</Text>
                            <TextInput style={[mf.input, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]} value={form.notes} onChangeText={v => setForm(p => ({ ...p, notes: v }))} placeholder="Notas opcionales..." placeholderTextColor={Colors.textMuted} multiline />
                            {editing && (
                                <View style={{ marginTop: 20 }}>
                                    <Text style={mf.label}>Cambiar estado</Text>
                                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                                        {Object.entries(STATUS_BADGE).map(([s, b]) => (
                                            <TouchableOpacity key={s} style={[{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: b.bg }]}
                                                onPress={() => { changeStatus(editing, s); setModalOpen(false); }}>
                                                <Text style={{ color: b.color, fontWeight: '700', fontSize: 12 }}>{b.label}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            )}
                        </ScrollView>
                    </SafeAreaView>
                </KeyboardAvoidingView>
            </Modal>
        </>
    );
}

const mf = StyleSheet.create({
    label: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 6 },
    input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 15, color: Colors.textPrimary, backgroundColor: '#FAFAFA' },
});

const styles = StyleSheet.create({
    headerBlock: {
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
        paddingHorizontal: 8, paddingBottom: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2, shadowRadius: 16, elevation: 12, zIndex: 10,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, marginBottom: 4 },
    hSide: { width: 40, alignItems: 'center', paddingVertical: 6 },
    navArrow: { color: 'rgba(255,255,255,0.7)', fontSize: 26, fontWeight: '300' },
    headerTitle: { color: '#FFF', fontSize: 17, fontWeight: '700' },

    subRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, marginBottom: 10 },
    backPill: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14 },
    backPillText: { color: '#FFF', fontSize: 12 },
    newBtn: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14 },
    newBtnText: { color: '#FFF', fontWeight: '700', fontSize: 12 },

    dayHeaders: { flexDirection: 'row', paddingHorizontal: 4, marginBottom: 4 },
    dayHeaderText: { flex: 1, textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600' },

    calGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 4 },
    calCell: { width: `${100 / 7}%` as any, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
    calCellSelected: { borderRadius: 20 },
    calDayText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500' },
    calDaySelected: { fontWeight: '800', fontSize: 14 },
    calDayToday: { color: '#FFF', fontWeight: '800' },
    dot: { width: 4, height: 4, borderRadius: 2, marginTop: 1 },

    dayLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },

    aptRow: { flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'flex-start' },
    aptTime: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600', width: 46, paddingTop: 14 },
    aptCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
    aptName: { color: Colors.textPrimary, fontWeight: '700', fontSize: 14 },
    aptService: { color: Colors.textSecondary, fontSize: 12, marginTop: 3 },
    aptWorker: { color: Colors.textMuted, fontSize: 11, marginTop: 4 },
    badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.bgCard },
    modalTitle: { color: Colors.textPrimary, fontWeight: '700', fontSize: 16 },
});
