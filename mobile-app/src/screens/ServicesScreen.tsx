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

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Services'> };

export default function ServicesScreen({ navigation }: Props) {
    const theme = useTheme();
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form, setForm] = useState({ name: '', description: '', price: '', duration: '' });
    const [saving, setSaving] = useState(false);

    const load = async () => {
        try {
            const res = await api.get('/services');
            setServices(res.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { load(); }, []);

    const openCreate = () => {
        setEditing(null);
        setForm({ name: '', description: '', price: '', duration: '' });
        setModalVisible(true);
    };

    const openEdit = (s: any) => {
        setEditing(s);
        setForm({ name: s.name || '', description: s.description || '', price: String(s.price || ''), duration: String(s.duration || '') });
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) { Alert.alert('Requerido', 'El nombre es obligatorio'); return; }
        setSaving(true);
        try {
            const payload: any = { name: form.name.trim() };
            if (form.description) payload.description = form.description;
            if (form.price) payload.price = parseFloat(form.price);
            if (form.duration) payload.duration = parseInt(form.duration);
            if (editing) { await api.patch(`/services/${editing.id}`, payload); }
            else { await api.post('/services', payload); }
            setModalVisible(false);
            load();
        } catch (e: any) {
            Alert.alert('Error', e.response?.data?.message || 'No se pudo guardar');
        } finally { setSaving(false); }
    };

    const handleDelete = (s: any) => {
        Alert.alert(`Eliminar ${s.name}`, '¿Estás seguro?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar', style: 'destructive', onPress: async () => {
                    try { await api.delete(`/services/${s.id}`); load(); }
                    catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'No se pudo eliminar'); }
                }
            }
        ]);
    };

    return (
        <SafeAreaView style={SharedStyles.safeArea}>
            <View style={[SharedStyles.header, { backgroundColor: theme.sidebar }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={SharedStyles.backBtn}>← Volver</Text>
                </TouchableOpacity>
                <Text style={SharedStyles.headerTitle}>Servicios</Text>
                <TouchableOpacity onPress={openCreate} style={styles.addBtn}>
                    <Text style={styles.addBtnText}>+ Nuevo</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={theme.sidebar} style={{ marginTop: 60 }} />
            ) : (
                <FlatList
                    data={services}
                    keyExtractor={item => String(item.id)}
                    contentContainerStyle={SharedStyles.listPadding}
                    refreshControl={<RefreshControl refreshing={refreshing} tintColor={theme.sidebar} onRefresh={() => { setRefreshing(true); load(); }} />}
                    renderItem={({ item }) => (
                        <View style={SharedStyles.card}>
                            <View style={styles.row}>
                                <View style={[styles.iconWrap, { backgroundColor: theme.sidebar + '18' }]}>
                                    <Text style={[styles.icon, { color: theme.sidebar }]}>◎</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.name}>{item.name}</Text>
                                    {item.description && <Text style={styles.desc}>{item.description}</Text>}
                                    <View style={styles.chips}>
                                        {item.price && <Text style={[styles.chip, { color: Colors.success }]}>S/ {Number(item.price).toFixed(2)}</Text>}
                                        {item.duration && <Text style={[styles.chip, { color: Colors.info }]}>{item.duration} min</Text>}
                                    </View>
                                </View>
                            </View>
                            <View style={styles.actions}>
                                <TouchableOpacity onPress={() => openEdit(item)} style={[styles.actBtn, { backgroundColor: theme.sidebar + '18' }]}>
                                    <Text style={[styles.actText, { color: theme.sidebar }]}>✏️ Editar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDelete(item)} style={[styles.actBtn, { backgroundColor: Colors.danger + '18' }]}>
                                    <Text style={[styles.actText, { color: Colors.danger }]}>🗑</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Text style={{ fontSize: 40 }}>◎</Text>
                            <Text style={styles.emptyText}>Sin servicios registrados</Text>
                            <TouchableOpacity onPress={openCreate} style={[styles.emptyBtn, { backgroundColor: theme.sidebar }]}>
                                <Text style={styles.emptyBtnText}>+ Agregar servicio</Text>
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
                            <Text style={styles.modalTitle}>{editing ? 'Editar Servicio' : 'Nuevo Servicio'}</Text>
                            <TouchableOpacity onPress={handleSave} disabled={saving}>
                                {saving ? <ActivityIndicator color={theme.sidebar} /> : <Text style={[styles.modalSave, { color: theme.sidebar }]}>Guardar</Text>}
                            </TouchableOpacity>
                        </View>
                        <ScrollView contentContainerStyle={{ padding: 20 }}>
                            {[
                                { label: 'Nombre *', key: 'name', placeholder: 'Ej: Masaje relajante' },
                                { label: 'Descripción', key: 'description', placeholder: 'Descripción del servicio' },
                                { label: 'Precio (S/)', key: 'price', placeholder: '50.00', keyboardType: 'numeric' },
                                { label: 'Duración (min)', key: 'duration', placeholder: '60', keyboardType: 'numeric' },
                            ].map(f => (
                                <View key={f.key} style={{ marginBottom: 16 }}>
                                    <Text style={ff.label}>{f.label}</Text>
                                    <TextInput
                                        style={ff.input}
                                        value={form[f.key as keyof typeof form]}
                                        onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                                        placeholder={f.placeholder}
                                        placeholderTextColor={Colors.textMuted}
                                        keyboardType={(f as any).keyboardType || 'default'}
                                    />
                                </View>
                            ))}
                        </ScrollView>
                    </SafeAreaView>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const ff = StyleSheet.create({
    label: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6 },
    input: { height: 46, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 12, fontSize: 14, color: Colors.textPrimary, backgroundColor: '#FAFAFA' }});

const styles = StyleSheet.create({
    addBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    addBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
    row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 10 },
    iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    icon: { fontSize: 22 },
    name: { color: Colors.textPrimary, fontWeight: '700', fontSize: 15 },
    desc: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
    chips: { flexDirection: 'row', gap: 8, marginTop: 6 },
    chip: { fontSize: 13, fontWeight: '700' },
    actions: { flexDirection: 'row', gap: 8 },
    actBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
    actText: { fontSize: 13, fontWeight: '600' },
    empty: { alignItems: 'center', marginTop: 80, gap: 8 },
    emptyText: { color: Colors.textSecondary, fontSize: 15 },
    emptyBtn: { borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, marginTop: 8 },
    emptyBtnText: { color: '#FFF', fontWeight: '700' },
    modal: { flex: 1, backgroundColor: Colors.bgPage },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.bgCard },
    modalTitle: { color: Colors.textPrimary, fontWeight: '700', fontSize: 16 },
    modalCancel: { color: Colors.danger, fontSize: 15 },
    modalSave: { fontSize: 15, fontWeight: '700' }});


