import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity,
    StatusBar, TextInput, RefreshControl, Modal, Alert, ScrollView,
    KeyboardAvoidingView, Platform
} from 'react-native';
import { api } from '../services/api';
import { Colors } from '../theme';
import { useTheme } from '../store/ThemeContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Clients'> };
const EMPTY_FORM = { name: '', phone: '', email: '', birthday: '' };

export default function ClientsScreen({ navigation }: Props) {
    const theme = useTheme();
    const sidebarColor = theme.sidebar || Colors.header;

    const [clients, setClients] = useState<any[]>([]);
    const [filtered, setFiltered] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);

    const load = async () => {
        try { const r = await api.get('/clients'); setClients(r.data); setFiltered(r.data); }
        catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    };
    useEffect(() => { load(); }, []);
    useEffect(() => {
        const q = search.toLowerCase();
        setFiltered(clients.filter(c => c.name?.toLowerCase().includes(q) || c.phone?.includes(q) || String(c.id).includes(q)));
    }, [search, clients]);

    const openCreate = () => { setEditing(null); setForm({ ...EMPTY_FORM }); setModalVisible(true); };
    const openEdit = (c: any) => { setEditing(c); setForm({ name: c.name || '', phone: c.phone || '', email: c.email || '', birthday: c.birthday ? c.birthday.split('T')[0] : '' }); setModalVisible(true); };

    const handleSave = async () => {
        if (!form.name.trim()) { Alert.alert('Requerido', 'El nombre es obligatorio'); return; }
        setSaving(true);
        try {
            const payload: any = { name: form.name.trim() };
            if (form.phone) payload.phone = form.phone;
            if (form.email) payload.email = form.email;
            if (form.birthday) payload.birthday = form.birthday;
            if (editing) await api.patch(`/clients/${editing.id}`, payload);
            else await api.post('/clients', payload);
            setModalVisible(false); load();
        } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'No se pudo guardar'); }
        finally { setSaving(false); }
    };

    const handleDelete = (c: any) => {
        Alert.alert(`Eliminar ${c.name}`, '¿Estás seguro?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar', style: 'destructive', onPress: async () => {
                    try { await api.delete(`/clients/${c.id}`); load(); }
                    catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Error'); }
                }
            }
        ]);
    };

    const lastApt = (c: any) => {
        if (!c.lastAppointment) return null;
        const d = new Date(c.lastAppointment);
        if (d.toDateString() === new Date().toDateString()) return 'Hoy';
        return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
    };

    return (
        <>
            <StatusBar barStyle="light-content" backgroundColor={sidebarColor} />
            <View style={{ flex: 1, backgroundColor: Colors.bgPage }}>

                {/* HEADER BLOCK — rounded bottom, floating */}
                <View style={[styles.headerBlock, { backgroundColor: sidebarColor }]}>
                    <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }} />
                    {/* Title row */}
                    <View style={styles.titleRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.hSide}>
                            <Text style={styles.backText}>‹</Text>
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Clientes</Text>
                        <TouchableOpacity onPress={openCreate} style={styles.newBtn}>
                            <Text style={styles.newBtnText}>+ Nuevo</Text>
                        </TouchableOpacity>
                    </View>
                    {/* Search bar inside header */}
                    <View style={styles.searchBar}>
                        <Text style={styles.searchIcon}>🔍</Text>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Buscar por nombre o ID..."
                            placeholderTextColor="rgba(255,255,255,0.5)"
                            value={search}
                            onChangeText={setSearch}
                        />
                    </View>
                </View>

                {/* BODY */}
                {loading ? (
                    <ActivityIndicator size="large" color={sidebarColor} style={{ marginTop: 60 }} />
                ) : (
                    <FlatList
                        data={filtered}
                        keyExtractor={item => String(item.id)}
                        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 10 }}
                        refreshControl={<RefreshControl refreshing={refreshing} tintColor={sidebarColor} onRefresh={() => { setRefreshing(true); load(); }} />}
                        renderItem={({ item }) => (
                            <View style={styles.clientCard}>
                                <View style={[styles.iconBox, { backgroundColor: sidebarColor + '18' }]}>
                                    <Text style={{ fontSize: 20 }}>👥</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.clientName}>{item.name}</Text>
                                    <Text style={styles.clientMeta}>
                                        {'ID: ' + item.id}{lastApt(item) ? ` • Última cita: ${lastApt(item)}` : ''}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconBtn}>
                                    <Text style={{ fontSize: 14 }}>✏️</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDelete(item)} style={[styles.iconBtn, { backgroundColor: '#FEE2E2' }]}>
                                    <Text style={{ fontSize: 14 }}>🗑️</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        ListEmptyComponent={
                            <View style={{ alignItems: 'center', paddingTop: 80, gap: 10 }}>
                                <Text style={{ fontSize: 48 }}>👥</Text>
                                <Text style={{ color: Colors.textSecondary, fontSize: 16 }}>Sin clientes</Text>
                                <TouchableOpacity onPress={openCreate} style={[styles.newBtn, { backgroundColor: sidebarColor, marginTop: 8 }]}>
                                    <Text style={styles.newBtnText}>+ Agregar primero</Text>
                                </TouchableOpacity>
                            </View>
                        }
                    />
                )}
            </View>

            <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bgPage }} edges={['top']}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={{ color: Colors.danger, fontSize: 15 }}>Cancelar</Text></TouchableOpacity>
                            <Text style={styles.modalTitle}>{editing ? 'Editar Cliente' : 'Nuevo Cliente'}</Text>
                            <TouchableOpacity onPress={handleSave} disabled={saving}>
                                {saving ? <ActivityIndicator color={sidebarColor} /> : <Text style={[{ fontSize: 15, fontWeight: '700' }, { color: sidebarColor }]}>Guardar</Text>}
                            </TouchableOpacity>
                        </View>
                        <ScrollView contentContainerStyle={{ padding: 20 }}>
                            {[
                                { label: 'Nombre *', key: 'name', kbType: 'default', placeholder: 'Nombre completo' },
                                { label: 'Teléfono', key: 'phone', kbType: 'phone-pad', placeholder: '+51 999 999 999' },
                                { label: 'Email', key: 'email', kbType: 'email-address', placeholder: 'cliente@email.com' },
                                { label: 'Cumpleaños (YYYY-MM-DD)', key: 'birthday', kbType: 'default', placeholder: '1990-06-15' },
                            ].map(f => (
                                <View key={f.key} style={{ marginBottom: 16 }}>
                                    <Text style={ff.label}>{f.label}</Text>
                                    <TextInput style={ff.input} value={(form as any)[f.key]} onChangeText={v => setForm((prev: any) => ({ ...prev, [f.key]: v }))}
                                        placeholder={f.placeholder} placeholderTextColor={Colors.textMuted} keyboardType={f.kbType as any} autoCapitalize="none" />
                                </View>
                            ))}
                        </ScrollView>
                    </SafeAreaView>
                </KeyboardAvoidingView>
            </Modal>
        </>
    );
}

const ff = StyleSheet.create({
    label: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 6 },
    input: { height: 48, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 14, fontSize: 15, color: Colors.textPrimary, backgroundColor: '#FAFAFA' },
});

const styles = StyleSheet.create({
    headerBlock: {
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
        paddingHorizontal: 16, paddingBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18, shadowRadius: 14, elevation: 10, zIndex: 10,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    hSide: { width: 44, alignItems: 'center' },
    backText: { color: '#FFF', fontSize: 28, fontWeight: '300' },
    headerTitle: { flex: 1, color: '#FFF', fontSize: 18, fontWeight: '700', textAlign: 'center' },
    newBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 7 },
    newBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },

    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingHorizontal: 12, height: 42 },
    searchIcon: { fontSize: 14, marginRight: 8 },
    searchInput: { flex: 1, color: '#FFF', fontSize: 14 },

    clientCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.bgCard, borderRadius: 16, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
    iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    clientName: { color: Colors.textPrimary, fontWeight: '700', fontSize: 14 },
    clientMeta: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
    iconBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#F0F2F5', alignItems: 'center', justifyContent: 'center' },

    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.bgCard },
    modalTitle: { color: Colors.textPrimary, fontWeight: '700', fontSize: 16 },
});
