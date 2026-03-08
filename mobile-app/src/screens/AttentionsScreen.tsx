import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput,
    RefreshControl, Modal, Alert, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { api } from '../services/api';
import { Colors } from '../theme';
import { useTheme } from '../store/ThemeContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Attentions'> };
const EMPTY_FORM = { date: '', clientId: '', serviceId: '', workersIds: '', totalCost: '', paymentMethod: 'CASH', notes: '' };

export default function AttentionsScreen({ navigation }: Props) {
    const theme = useTheme();
    const sidebarColor = theme.sidebar || Colors.header;

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

    // Inline creation
    const [showNewClient, setShowNewClient] = useState(false);
    const [showNewService, setShowNewService] = useState(false);
    const [clientSearch, setClientSearch] = useState('');
    const [serviceSearch, setServiceSearch] = useState('');
    const [newClient, setNewClient] = useState({ name: '', phone: '' });
    const [newService, setNewService] = useState({ name: '', price: '', durationMin: '60' });
    const [creatingClient, setCreatingClient] = useState(false);
    const [creatingService, setCreatingService] = useState(false);

    const filteredClients = clients.filter(c =>
        c.name?.toLowerCase().includes(clientSearch.toLowerCase()) || c.phone?.includes(clientSearch)
    );
    const filteredServices = services.filter(s =>
        s.name?.toLowerCase().includes(serviceSearch.toLowerCase())
    );
    const selectedClientObj = clients.find(c => String(c.id) === form.clientId);
    const selectedServiceObj = services.find(s => String(s.id) === form.serviceId);

    const load = async () => {
        try {
            const [aRes, cRes, sRes, wRes] = await Promise.allSettled([
                api.get('/attentions'), api.get('/clients'), api.get('/services'), api.get('/users'),
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

    const resetInline = () => {
        setShowNewClient(false); setShowNewService(false);
        setClientSearch(''); setServiceSearch('');
        setNewClient({ name: '', phone: '' }); setNewService({ name: '', price: '', durationMin: '60' });
    };

    const openCreate = () => {
        setEditing(null); setForm({ ...EMPTY_FORM, date: new Date().toISOString().slice(0, 16) });
        resetInline(); setModalVisible(true);
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
            notes: att.notes || ''
        });
        resetInline(); setModalVisible(true);
    };

    /* ── Inline client creation ── */
    const handleCreateClient = async () => {
        if (!newClient.name.trim()) { Alert.alert('Requerido', 'Ingresa el nombre'); return; }
        setCreatingClient(true);
        try {
            const res = await api.post('/clients', { name: newClient.name.trim(), phone: newClient.phone || undefined });
            const created = res.data;
            setClients(prev => [...prev, created]);
            setForm(p => ({ ...p, clientId: String(created.id) }));
            setShowNewClient(false); setNewClient({ name: '', phone: '' }); setClientSearch('');
            Alert.alert('✓ Creado', `Cliente "${created.name}" creado y seleccionado`);
        } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'No se pudo crear'); }
        finally { setCreatingClient(false); }
    };

    /* ── Inline service creation ── */
    const handleCreateService = async () => {
        if (!newService.name.trim() || !newService.price) { Alert.alert('Requerido', 'Nombre y precio son obligatorios'); return; }
        setCreatingService(true);
        try {
            const res = await api.post('/services', {
                name: newService.name.trim(),
                price: parseFloat(newService.price),
                durationMin: parseInt(newService.durationMin) || 60
            });
            const created = res.data;
            setServices(prev => [...prev, created]);
            setForm(p => ({ ...p, serviceId: String(created.id), totalCost: String(created.price) }));
            setShowNewService(false); setNewService({ name: '', price: '', durationMin: '60' }); setServiceSearch('');
            Alert.alert('✓ Creado', `Servicio "${created.name}" creado y seleccionado`);
        } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'No se pudo crear'); }
        finally { setCreatingService(false); }
    };

    /* ── Save attention ── */
    const handleSave = async () => {
        if (!form.clientId || !form.serviceId || !form.totalCost) {
            Alert.alert('Requeridos', 'Cliente, servicio y costo son obligatorios'); return;
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
                workerIds: workerIds.length > 0 ? workerIds : undefined
            };
            if (editing) await api.patch(`/attentions/${editing.id}`, payload);
            else await api.post('/attentions', payload);
            setModalVisible(false); load();
        } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'No se pudo guardar'); }
        finally { setSaving(false); }
    };

    const handleDelete = (att: any) =>
        Alert.alert('Eliminar atención', '¿Estás seguro?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar', style: 'destructive', onPress: async () => {
                    try { await api.delete(`/attentions/${att.id}`); load(); }
                    catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Error'); }
                }
            }
        ]);

    const formatDate = (s: string) => new Date(s).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });

    return (
        <>
            <View style={{ flex: 1, backgroundColor: Colors.bgPage }}>
                {/* HEADER BLOCK */}
                <View style={[styles.headerBlock, { backgroundColor: sidebarColor }]}>
                    <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }} />
                    <View style={styles.titleRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.hSide}>
                            <Text style={styles.backText}>‹</Text>
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Atenciones</Text>
                        <TouchableOpacity onPress={openCreate} style={styles.newBtn}>
                            <Text style={styles.newBtnText}>+ Nueva</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.searchBar}>
                        <Text style={{ fontSize: 14, marginRight: 8 }}>🔍</Text>
                        <TextInput style={styles.searchInput} placeholder="Buscar por cliente o servicio..."
                            placeholderTextColor="rgba(255,255,255,0.5)" value={search} onChangeText={setSearch} />
                    </View>
                </View>

                {/* LIST */}
                {loading ? (
                    <ActivityIndicator size="large" color={sidebarColor} style={{ marginTop: 60 }} />
                ) : (
                    <FlatList
                        data={filtered}
                        keyExtractor={item => String(item.id)}
                        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
                        refreshControl={<RefreshControl refreshing={refreshing} tintColor={sidebarColor} onRefresh={() => { setRefreshing(true); load(); }} />}
                        renderItem={({ item }) => (
                            <View style={styles.card}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.clientName}>{item.client?.name || '—'}</Text>
                                        <Text style={styles.serviceName}>{item.service?.name}</Text>
                                        <Text style={styles.dateText}>{formatDate(item.date)}</Text>
                                        {item.workers?.map((w: any) => <Text key={w.id} style={styles.workerText}>👤 {w.worker?.name}</Text>)}
                                    </View>
                                    <Text style={[styles.cost, { color: Colors.success }]}>S/ {Number(item.totalCost).toFixed(2)}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    <TouchableOpacity onPress={() => openEdit(item)} style={[styles.actionBtn, { backgroundColor: sidebarColor + '18' }]}>
                                        <Text style={[styles.actionText, { color: sidebarColor }]}>✏️ Editar</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleDelete(item)} style={[styles.actionBtn, { backgroundColor: Colors.danger + '18' }]}>
                                        <Text style={[styles.actionText, { color: Colors.danger }]}>🗑</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                        ListEmptyComponent={
                            <View style={{ alignItems: 'center', marginTop: 80, gap: 8 }}>
                                <Text style={{ fontSize: 40 }}>💆</Text>
                                <Text style={{ color: Colors.textSecondary, fontSize: 16 }}>Sin atenciones</Text>
                                <TouchableOpacity onPress={openCreate} style={[styles.newBtn, { backgroundColor: sidebarColor, marginTop: 8 }]}>
                                    <Text style={styles.newBtnText}>+ Registrar atención</Text>
                                </TouchableOpacity>
                            </View>
                        }
                    />
                )}
            </View>

            {/* MODAL */}
            <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bgPage }} edges={['top']}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={{ color: Colors.danger }}>Cancelar</Text></TouchableOpacity>
                            <Text style={styles.modalTitle}>{editing ? 'Editar Atención' : 'Nueva Atención'}</Text>
                            <TouchableOpacity onPress={handleSave} disabled={saving}>
                                {saving ? <ActivityIndicator color={sidebarColor} /> : <Text style={{ color: sidebarColor, fontWeight: '700' }}>Guardar</Text>}
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

                            {/* ── CLIENTE ── */}
                            <View style={styles.sectionHeader}>
                                <Text style={ff.label}>Cliente *</Text>
                                <TouchableOpacity onPress={() => { setShowNewClient(v => !v); setClientSearch(''); }}>
                                    <Text style={{ color: sidebarColor, fontSize: 12, fontWeight: '700' }}>
                                        {showNewClient ? '✕ Cancelar' : '＋ Nuevo cliente'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {showNewClient ? (
                                <View style={[styles.inlineBox, { borderColor: sidebarColor + '60', backgroundColor: sidebarColor + '08' }]}>
                                    <Text style={[ff.label, { color: sidebarColor, marginBottom: 8 }]}>Crear nuevo cliente</Text>
                                    <TextInput style={ff.input} value={newClient.name} onChangeText={v => setNewClient(p => ({ ...p, name: v }))}
                                        placeholder="Nombre *" placeholderTextColor={Colors.textMuted} autoFocus />
                                    <TextInput style={[ff.input, { marginTop: 8 }]} value={newClient.phone} onChangeText={v => setNewClient(p => ({ ...p, phone: v }))}
                                        placeholder="Teléfono (opcional)" placeholderTextColor={Colors.textMuted} keyboardType="phone-pad" />
                                    <TouchableOpacity onPress={handleCreateClient} disabled={creatingClient || !newClient.name.trim()}
                                        style={[styles.createBtn, { backgroundColor: sidebarColor, opacity: creatingClient || !newClient.name.trim() ? 0.5 : 1 }]}>
                                        <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>
                                            {creatingClient ? 'Creando...' : '✓ Crear y seleccionar'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={{ marginBottom: 14 }}>
                                    <TextInput style={[ff.input, { marginBottom: 8 }]} value={clientSearch} onChangeText={setClientSearch}
                                        placeholder="Buscar por nombre o teléfono..." placeholderTextColor={Colors.textMuted} />
                                    {selectedClientObj && (
                                        <View style={styles.selectedBadge}>
                                            <Text style={{ color: Colors.success, fontSize: 12, fontWeight: '700' }}>
                                                ✓ {selectedClientObj.name}{selectedClientObj.phone ? ` · ${selectedClientObj.phone}` : ''}
                                            </Text>
                                        </View>
                                    )}
                                    <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                                        {filteredClients.slice(0, 20).map(c => (
                                            <TouchableOpacity key={c.id} onPress={() => { setForm(p => ({ ...p, clientId: String(c.id) })); setClientSearch(''); }}
                                                style={[styles.pickRow, form.clientId === String(c.id) && { backgroundColor: sidebarColor + '15', borderColor: sidebarColor }]}>
                                                <View style={[styles.pickDot, { backgroundColor: form.clientId === String(c.id) ? sidebarColor : Colors.border }]} />
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.pickName, form.clientId === String(c.id) && { color: sidebarColor }]}>{c.name}</Text>
                                                    {c.phone && <Text style={styles.pickSub}>{c.phone}</Text>}
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                        {filteredClients.length === 0 && (
                                            <Text style={{ color: Colors.textMuted, textAlign: 'center', padding: 10, fontSize: 12 }}>
                                                Sin resultados — usa "Nuevo cliente" ↑
                                            </Text>
                                        )}
                                    </ScrollView>
                                </View>
                            )}

                            {/* ── SERVICIO ── */}
                            <View style={styles.sectionHeader}>
                                <Text style={ff.label}>Servicio *</Text>
                                <TouchableOpacity onPress={() => { setShowNewService(v => !v); setServiceSearch(''); }}>
                                    <Text style={{ color: Colors.success, fontSize: 12, fontWeight: '700' }}>
                                        {showNewService ? '✕ Cancelar' : '＋ Nuevo servicio'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {showNewService ? (
                                <View style={[styles.inlineBox, { borderColor: Colors.success + '60', backgroundColor: Colors.success + '08' }]}>
                                    <Text style={[ff.label, { color: Colors.success, marginBottom: 8 }]}>Crear nuevo servicio</Text>
                                    <TextInput style={ff.input} value={newService.name} onChangeText={v => setNewService(p => ({ ...p, name: v }))}
                                        placeholder="Nombre *" placeholderTextColor={Colors.textMuted} autoFocus />
                                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                                        <TextInput style={[ff.input, { flex: 1 }]} value={newService.price} onChangeText={v => setNewService(p => ({ ...p, price: v }))}
                                            placeholder="Precio S/ *" placeholderTextColor={Colors.textMuted} keyboardType="numeric" />
                                        <TextInput style={[ff.input, { flex: 1 }]} value={newService.durationMin} onChangeText={v => setNewService(p => ({ ...p, durationMin: v }))}
                                            placeholder="Duración (min)" placeholderTextColor={Colors.textMuted} keyboardType="numeric" />
                                    </View>
                                    <TouchableOpacity onPress={handleCreateService}
                                        disabled={creatingService || !newService.name.trim() || !newService.price}
                                        style={[styles.createBtn, { backgroundColor: Colors.success, opacity: creatingService || !newService.name.trim() || !newService.price ? 0.5 : 1 }]}>
                                        <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>
                                            {creatingService ? 'Creando...' : '✓ Crear y seleccionar'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={{ marginBottom: 14 }}>
                                    <TextInput style={[ff.input, { marginBottom: 8 }]} value={serviceSearch} onChangeText={setServiceSearch}
                                        placeholder="Buscar servicio..." placeholderTextColor={Colors.textMuted} />
                                    {selectedServiceObj && (
                                        <View style={[styles.selectedBadge, { backgroundColor: Colors.success + '18' }]}>
                                            <Text style={{ color: Colors.success, fontSize: 12, fontWeight: '700' }}>
                                                ✓ {selectedServiceObj.name} — S/ {selectedServiceObj.price}
                                            </Text>
                                        </View>
                                    )}
                                    <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                                        {filteredServices.slice(0, 20).map(s => (
                                            <TouchableOpacity key={s.id} onPress={() => setForm(p => ({ ...p, serviceId: String(s.id), totalCost: String(s.price) }))}
                                                style={[styles.pickRow, form.serviceId === String(s.id) && { backgroundColor: Colors.success + '15', borderColor: Colors.success }]}>
                                                <View style={[styles.pickDot, { backgroundColor: form.serviceId === String(s.id) ? Colors.success : Colors.border }]} />
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.pickName, form.serviceId === String(s.id) && { color: Colors.success }]}>{s.name}</Text>
                                                    <Text style={styles.pickSub}>S/ {s.price} · {s.durationMin} min</Text>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                        {filteredServices.length === 0 && (
                                            <Text style={{ color: Colors.textMuted, textAlign: 'center', padding: 10, fontSize: 12 }}>
                                                Sin resultados — usa "Nuevo servicio" ↑
                                            </Text>
                                        )}
                                    </ScrollView>
                                </View>
                            )}

                            {/* ── PROFESIONAL ── */}
                            <Text style={ff.label}>Profesional</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    {workers.map(w => (
                                        <TouchableOpacity key={w.id} onPress={() => setForm(p => ({ ...p, workersIds: String(w.id) }))}
                                            style={[styles.chip, { backgroundColor: form.workersIds === String(w.id) ? sidebarColor : Colors.bgCard, borderColor: sidebarColor }]}>
                                            <Text style={{ color: form.workersIds === String(w.id) ? '#FFF' : Colors.textPrimary, fontSize: 13, fontWeight: '600' }}>{w.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>

                            {/* ── COSTO ── */}
                            <FField label="Costo Total *" value={form.totalCost} onChange={v => setForm(p => ({ ...p, totalCost: v }))} placeholder="0.00" keyboardType="numeric" />
                            <FField label="Fecha y Hora (YYYY-MM-DDTHH:MM)" value={form.date} onChange={v => setForm(p => ({ ...p, date: v }))} placeholder="2025-06-15T10:30" />
                            <FField label="Notas" value={form.notes} onChange={v => setForm(p => ({ ...p, notes: v }))} placeholder="Observaciones..." multiline />

                            {/* ── MÉTODO DE PAGO ── */}
                            <Text style={ff.label}>Método de Pago</Text>
                            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                                {['CASH', 'CARD', 'TRANSFER', 'YAPE'].map(m => (
                                    <TouchableOpacity key={m} onPress={() => setForm(p => ({ ...p, paymentMethod: m }))}
                                        style={[styles.chip, { borderColor: sidebarColor, backgroundColor: form.paymentMethod === m ? sidebarColor : 'transparent' }]}>
                                        <Text style={{ color: form.paymentMethod === m ? '#FFF' : sidebarColor, fontSize: 12, fontWeight: '600' }}>{m}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    </SafeAreaView>
                </KeyboardAvoidingView>
            </Modal>
        </>
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
});

const styles = StyleSheet.create({
    headerBlock: {
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
        paddingHorizontal: 16, paddingBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18, shadowRadius: 14, elevation: 10, zIndex: 10,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    hSide: { width: 44, alignItems: 'center' },
    backText: { color: '#FFF', fontSize: 28, fontWeight: '300' },
    headerTitle: { flex: 1, color: '#FFF', fontSize: 18, fontWeight: '700', textAlign: 'center' },
    newBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 7 },
    newBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingHorizontal: 12, height: 42 },
    searchInput: { flex: 1, color: '#FFF', fontSize: 14 },

    card: { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
    clientName: { color: Colors.textPrimary, fontWeight: '700', fontSize: 15 },
    serviceName: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
    dateText: { color: Colors.info, fontSize: 12, marginTop: 2 },
    workerText: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
    cost: { fontSize: 17, fontWeight: '800' },
    actionBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
    actionText: { fontSize: 13, fontWeight: '600' },

    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.bgCard },
    modalTitle: { color: Colors.textPrimary, fontWeight: '700', fontSize: 16 },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    inlineBox: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 14, padding: 14, marginBottom: 14 },
    createBtn: { marginTop: 10, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
    selectedBadge: { backgroundColor: '#D1FAE5', borderRadius: 10, padding: 8, marginBottom: 6 },
    pickRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border, marginBottom: 6, backgroundColor: Colors.bgCard },
    pickDot: { width: 10, height: 10, borderRadius: 5 },
    pickName: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
    pickSub: { color: Colors.textSecondary, fontSize: 12, marginTop: 1 },
    chip: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
});
