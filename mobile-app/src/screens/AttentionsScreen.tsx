import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput, RefreshControl, Modal, Alert, ScrollView,
    KeyboardAvoidingView, Platform
} from 'react-native';
import { api } from '../services/api';
import { Colors, SharedStyles } from '../theme';
import { useTheme } from '../store/ThemeContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Attentions'> };

const EMPTY_FORM = { date: '', clientId: '', serviceId: '', workersIds: '', totalCost: '', paymentMethod: 'CASH', notes: '' };

export default function AttentionsScreen({ navigation }: Props) {
    const theme = useTheme();
    const [attentions, setAttentions] = useState<any[]>([]);
    const [filtered, setFiltered] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [workers, setWorkers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);

    const load = async () => {
        try {
            const [aRes, cRes, sRes, wRes] = await Promise.allSettled([
                api.get('/attentions'),
                api.get('/clients'),
                api.get('/services'),
                api.get('/users'),
            ]);
            if (aRes.status === 'fulfilled') { setAttentions(aRes.value.data); setFiltered(aRes.value.data); }
            if (cRes.status === 'fulfilled') setClients(cRes.value.data);
            if (sRes.status === 'fulfilled') setServices(sRes.value.data);
            if (wRes.status === 'fulfilled') setWorkers(wRes.value.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { load(); }, []);
    useEffect(() => {
        const q = search.toLowerCase();
        setFiltered(attentions.filter(a =>
            a.client?.name?.toLowerCase().includes(q) || a.service?.name?.toLowerCase().includes(q)
        ));
    }, [search, attentions]);

    const openCreate = () => {
        setEditing(null);
        setForm({ ...EMPTY_FORM, date: new Date().toISOString().slice(0, 16) });
        setModalVisible(true);
    };

    const openEdit = (att: any) => {
        setEditing(att);
        setForm({
            date: att.date ? new Date(att.date).toISOString().slice(0, 16) : '',
            clientId: String(att.clientId || ''),
            serviceId: String(att.serviceId || ''),
            workersIds: att.workers?.map((w: any) => w.workerId).join(',') || '',
            totalCost: String(att.totalCost || ''),
            paymentMethod: att.paymentMethod || 'CASH',
            notes: att.notes || ''});
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!form.clientId || !form.serviceId || !form.totalCost) {
            Alert.alert('Requeridos', 'Cliente, servicio y costo son obligatorios');
            return;
        }
        setSaving(true);
        try {
            const workerIds = form.workersIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
            const payload: any = {
                date: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
                clientId: parseInt(form.clientId),
                serviceId: parseInt(form.serviceId),
                totalCost: parseFloat(form.totalCost),
                paymentMethod: form.paymentMethod,
                notes: form.notes || undefined,
                workerIds: workerIds.length > 0 ? workerIds : undefined};
            if (editing) {
                await api.patch(`/attentions/${editing.id}`, payload);
            } else {
                await api.post('/attentions', payload);
            }
            setModalVisible(false);
            load();
        } catch (e: any) {
            Alert.alert('Error', e.response?.data?.message || 'No se pudo guardar');
        } finally { setSaving(false); }
    };

    const handleDelete = (att: any) => {
        Alert.alert('Eliminar atención', '¿Estás seguro?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar', style: 'destructive', onPress: async () => {
                    try { await api.delete(`/attentions/${att.id}`); load(); }
                    catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'No se pudo eliminar'); }
                }
            }
        ]);
    };

    const formatDate = (s: string) => new Date(s).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });

    const headerBg = { backgroundColor: theme.sidebar };

    return (
        <SafeAreaView style={styles.safe}>
            <View style={[styles.header, headerBg]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>← Volver</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Atenciones</Text>
                <TouchableOpacity onPress={openCreate} style={styles.addBtn}>
                    <Text style={styles.addBtnText}>+ Nueva</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.searchWrap}>
                <TextInput
                    style={styles.search}
                    placeholder="🔍  Buscar por cliente o servicio..."
                    placeholderTextColor={Colors.textMuted}
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={theme.sidebar} style={{ marginTop: 60 }} />
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={item => String(item.id)}
                    contentContainerStyle={SharedStyles.listPadding}
                    refreshControl={<RefreshControl refreshing={refreshing} tintColor={theme.sidebar} onRefresh={() => { setRefreshing(true); load(); }} />}
                    renderItem={({ item }) => (
                        <View style={SharedStyles.card}>
                            <View style={styles.row}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.clientName}>{item.client?.name || '—'}</Text>
                                    <Text style={styles.service}>{item.service?.name}</Text>
                                    <Text style={styles.date}>{formatDate(item.date)}</Text>
                                    {item.workers?.map((w: any) => (
                                        <Text key={w.id} style={styles.worker}>👤 {w.worker?.name}</Text>
                                    ))}
                                </View>
                                <Text style={[styles.cost, { color: theme.success }]}>S/ {Number(item.totalCost).toFixed(2)}</Text>
                            </View>
                            <View style={styles.actions}>
                                <TouchableOpacity onPress={() => openEdit(item)} style={[styles.actionBtn, { backgroundColor: theme.sidebar + '18' }]}>
                                    <Text style={[styles.actionText, { color: theme.sidebar }]}>✏️ Editar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDelete(item)} style={[styles.actionBtn, { backgroundColor: Colors.danger + '18' }]}>
                                    <Text style={[styles.actionText, { color: Colors.danger }]}>🗑</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Text style={{ fontSize: 40 }}>💆</Text>
                            <Text style={styles.emptyText}>Sin atenciones</Text>
                            <TouchableOpacity onPress={openCreate} style={[styles.emptyBtn, { backgroundColor: theme.sidebar }]}>
                                <Text style={styles.emptyBtnText}>+ Registrar atención</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}

            <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <SafeAreaView style={styles.modal}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Text style={styles.modalCancel}>Cancelar</Text>
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>{editing ? 'Editar Atención' : 'Nueva Atención'}</Text>
                            <TouchableOpacity onPress={handleSave} disabled={saving}>
                                {saving ? <ActivityIndicator color={theme.sidebar} /> : <Text style={[styles.modalSave, { color: theme.sidebar }]}>Guardar</Text>}
                            </TouchableOpacity>
                        </View>
                        <ScrollView contentContainerStyle={styles.modalContent}>
                            <PickerRow label="Cliente *" items={clients} value={form.clientId} onChange={v => setForm(f => ({ ...f, clientId: v }))} />
                            <PickerRow label="Servicio *" items={services} value={form.serviceId} onChange={v => setForm(f => ({ ...f, serviceId: v }))} />
                            <PickerRow label="Profesional" items={workers} value={form.workersIds.split(',')[0]} onChange={v => setForm(f => ({ ...f, workersIds: v }))} />
                            <FField label="Costo Total *" value={form.totalCost} onChange={v => setForm(f => ({ ...f, totalCost: v }))} placeholder="0.00" keyboardType="numeric" />
                            <FField label="Fecha y Hora (YYYY-MM-DDTHH:MM)" value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} placeholder="2025-06-15T10:30" />
                            <FField label="Notas" value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} placeholder="Observaciones..." multiline />

                            <Text style={ff.label}>Método de Pago</Text>
                            <View style={styles.paymentRow}>
                                {['CASH', 'CARD', 'TRANSFER', 'YAPE'].map(m => (
                                    <TouchableOpacity
                                        key={m}
                                        onPress={() => setForm(f => ({ ...f, paymentMethod: m }))}
                                        style={[styles.payChip, { borderColor: theme.sidebar, backgroundColor: form.paymentMethod === m ? theme.sidebar : 'transparent' }]}
                                    >
                                        <Text style={{ color: form.paymentMethod === m ? '#FFF' : theme.sidebar, fontSize: 12, fontWeight: '600' }}>{m}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    </SafeAreaView>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

function PickerRow({ label, items, value, onChange }: any) {
    return (
        <View style={{ marginBottom: 14 }}>
            <Text style={ff.label}>{label}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    {items.map((item: any) => (
                        <TouchableOpacity key={item.id} onPress={() => onChange(String(item.id))}
                            style={[ff.chip, { backgroundColor: String(item.id) === value ? Colors.sidebar : Colors.bgCard, borderColor: Colors.sidebar }]}>
                            <Text style={{ color: String(item.id) === value ? '#FFF' : Colors.textPrimary, fontSize: 13, fontWeight: '600' }}>{item.name}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}
function FField({ label, value, onChange, placeholder, keyboardType = 'default', multiline = false }: any) {
    return (
        <View style={{ marginBottom: 14 }}>
            <Text style={ff.label}>{label}</Text>
            <TextInput style={[ff.input, multiline && { height: 70, textAlignVertical: 'top' }]}
                value={value} onChangeText={onChange} placeholder={placeholder}
                placeholderTextColor={Colors.textMuted} keyboardType={keyboardType} autoCapitalize="none" multiline={multiline} />
        </View>
    );
}

const ff = StyleSheet.create({
    label: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6 },
    input: { height: 46, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 12, fontSize: 14, color: Colors.textPrimary, backgroundColor: '#FAFAFA' },
    chip: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 }});

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.bgPage },
    header: { padding: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
    back: { color: '#FFF', fontSize: 16 },
    title: { flex: 1, color: '#FFF', fontSize: 19, fontWeight: '700' },
    addBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    addBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
    searchWrap: { padding: 12 },
    search: { backgroundColor: Colors.bgCard, color: Colors.textPrimary, height: 44, borderRadius: 12, paddingHorizontal: 14, fontSize: 14, borderWidth: 1.5, borderColor: Colors.border },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
    clientName: { color: Colors.textPrimary, fontWeight: '700', fontSize: 15 },
    service: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
    date: { color: Colors.info, fontSize: 12, marginTop: 2 },
    worker: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
    cost: { fontSize: 17, fontWeight: '800' },
    actions: { flexDirection: 'row', gap: 8 },
    actionBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
    actionText: { fontSize: 13, fontWeight: '600' },
    empty: { alignItems: 'center', marginTop: 80, gap: 8 },
    emptyText: { color: Colors.textSecondary, fontSize: 16, fontWeight: '600' },
    emptyBtn: { borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, marginTop: 8 },
    emptyBtnText: { color: '#FFF', fontWeight: '700' },
    modal: { flex: 1, backgroundColor: Colors.bgPage },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.bgCard },
    modalTitle: { color: Colors.textPrimary, fontWeight: '700', fontSize: 16 },
    modalCancel: { color: Colors.danger, fontSize: 15 },
    modalSave: { fontSize: 15, fontWeight: '700' },
    modalContent: { padding: 20 },
    paymentRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
    payChip: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 }});


