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

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Users'> };

const EMPTY_FORM = { name: '', email: '', password: '', phoneNumber: '', commissionPercentage: '0', isActive: true };

export default function UsersScreen({ navigation }: Props) {
    const theme = useTheme();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);

    const load = async () => {
        try {
            const res = await api.get('/users');
            setUsers(res.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { load(); }, []);

    const openCreate = () => {
        setEditing(null);
        setForm({ ...EMPTY_FORM });
        setModalVisible(true);
    };

    const openEdit = (u: any) => {
        setEditing(u);
        setForm({
            name: u.name || '',
            email: u.email || '',
            password: '',
            phoneNumber: u.phoneNumber || '',
            commissionPercentage: String(u.commissionPercentage || 0),
            isActive: u.isActive !== false});
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!form.name.trim() || !form.email.trim()) {
            Alert.alert('Requeridos', 'Nombre y correo son obligatorios');
            return;
        }
        if (!editing && !form.password.trim()) {
            Alert.alert('Requerido', 'Contraseña es obligatoria al crear un usuario');
            return;
        }
        setSaving(true);
        try {
            const payload: any = {
                name: form.name.trim(),
                email: form.email.trim(),
                phoneNumber: form.phoneNumber || undefined,
                commissionPercentage: parseFloat(form.commissionPercentage) || 0,
                isActive: form.isActive};
            if (!editing || form.password.trim()) {
                payload.password = form.password.trim() || undefined;
            }
            if (editing) {
                await api.patch(`/users/${editing.id}`, payload);
            } else {
                await api.post('/users', payload);
            }
            setModalVisible(false);
            load();
        } catch (e: any) {
            Alert.alert('Error', e.response?.data?.message || 'No se pudo guardar');
        } finally { setSaving(false); }
    };

    const toggleActive = async (u: any) => {
        try {
            await api.patch(`/users/${u.id}`, { isActive: !u.isActive });
            load();
        } catch (e: any) {
            Alert.alert('Error', e.response?.data?.message || 'No se pudo actualizar');
        }
    };

    return (
        <SafeAreaView style={SharedStyles.safeArea}>
            <View style={[SharedStyles.header, { backgroundColor: theme.sidebar }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={SharedStyles.backBtn}>← Volver</Text>
                </TouchableOpacity>
                <Text style={SharedStyles.headerTitle}>Personal</Text>
                <TouchableOpacity onPress={openCreate} style={styles.addBtn}>
                    <Text style={styles.addBtnText}>+ Nuevo</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={theme.sidebar} style={{ marginTop: 60 }} />
            ) : (
                <FlatList
                    data={users}
                    keyExtractor={item => String(item.id)}
                    contentContainerStyle={SharedStyles.listPadding}
                    refreshControl={<RefreshControl refreshing={refreshing} tintColor={theme.sidebar} onRefresh={() => { setRefreshing(true); load(); }} />}
                    renderItem={({ item }) => (
                        <View style={SharedStyles.card}>
                            <View style={styles.userRow}>
                                <View style={[styles.avatar, { backgroundColor: item.isActive ? theme.sidebar : Colors.textMuted }]}>
                                    <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase() || '?'}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={styles.nameRow}>
                                        <Text style={styles.name}>{item.name}</Text>
                                        <TouchableOpacity
                                            onPress={() => toggleActive(item)}
                                            style={[styles.statusBadge, { backgroundColor: item.isActive ? Colors.success + '20' : Colors.textMuted + '30' }]}
                                        >
                                            <Text style={[styles.statusText, { color: item.isActive ? Colors.success : Colors.textMuted }]}>
                                                {item.isActive ? 'Activo' : 'Inactivo'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                    <Text style={styles.email}>{item.email}</Text>
                                    {item.phoneNumber && <Text style={styles.info}>📞 {item.phoneNumber}</Text>}
                                    {item.roles?.length > 0 && (
                                        <Text style={[styles.info, { color: Colors.info }]}>
                                            {item.roles.map((r: any) => r.role?.name).join(', ')}
                                        </Text>
                                    )}
                                    <Text style={[styles.info, { color: Colors.success }]}>
                                        Comisión: {Number(item.commissionPercentage).toFixed(0)}%
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.actions}>
                                <TouchableOpacity onPress={() => openEdit(item)} style={[styles.actionBtn, { backgroundColor: theme.sidebar + '18' }]}>
                                    <Text style={[styles.actionText, { color: theme.sidebar }]}>✏️ Editar</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Text style={{ fontSize: 40 }}>👥</Text>
                            <Text style={styles.emptyText}>Sin usuarios registrados</Text>
                            <TouchableOpacity onPress={openCreate} style={[styles.emptyBtn, { backgroundColor: theme.sidebar }]}>
                                <Text style={styles.emptyBtnText}>+ Agregar usuario</Text>
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
                            <Text style={styles.modalTitle}>{editing ? 'Editar Usuario' : 'Nuevo Usuario'}</Text>
                            <TouchableOpacity onPress={handleSave} disabled={saving}>
                                {saving ? <ActivityIndicator color={theme.sidebar} /> : <Text style={[styles.modalSave, { color: theme.sidebar }]}>Guardar</Text>}
                            </TouchableOpacity>
                        </View>
                        <ScrollView contentContainerStyle={{ padding: 20 }}>
                            {[
                                { label: 'Nombre *', key: 'name', placeholder: 'Nombre completo' },
                                { label: 'Correo *', key: 'email', placeholder: 'correo@ejemplo.com', keyboardType: 'email-address' },
                                { label: editing ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *', key: 'password', placeholder: '••••••••', secure: true },
                                { label: 'Teléfono', key: 'phoneNumber', placeholder: '+51 999 999 999', keyboardType: 'phone-pad' },
                                { label: 'Comisión (%)', key: 'commissionPercentage', placeholder: '0', keyboardType: 'numeric' },
                            ].map(f => (
                                <View key={f.key} style={{ marginBottom: 16 }}>
                                    <Text style={ff.label}>{f.label}</Text>
                                    <TextInput
                                        style={ff.input}
                                        value={form[f.key as keyof typeof form] as string}
                                        onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                                        placeholder={f.placeholder}
                                        placeholderTextColor={Colors.textMuted}
                                        keyboardType={(f as any).keyboardType || 'default'}
                                        secureTextEntry={(f as any).secure || false}
                                        autoCapitalize={f.key === 'email' ? 'none' : 'words'}
                                    />
                                </View>
                            ))}

                            <Text style={ff.label}>Estado</Text>
                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                                {[true, false].map(val => (
                                    <TouchableOpacity
                                        key={String(val)}
                                        onPress={() => setForm(p => ({ ...p, isActive: val }))}
                                        style={[styles.statusChip, {
                                            backgroundColor: form.isActive === val ? (val ? Colors.success : Colors.danger) : 'transparent',
                                            borderColor: val ? Colors.success : Colors.danger}]}
                                    >
                                        <Text style={{ color: form.isActive === val ? '#FFF' : (val ? Colors.success : Colors.danger), fontWeight: '600', fontSize: 13 }}>
                                            {val ? 'Activo' : 'Inactivo'}
                                        </Text>
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

const ff = StyleSheet.create({
    label: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6 },
    input: { height: 46, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 12, fontSize: 14, color: Colors.textPrimary, backgroundColor: '#FAFAFA' }});

const styles = StyleSheet.create({
    addBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    addBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
    userRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 10 },
    avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#FFF', fontWeight: '800', fontSize: 20 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
    name: { color: Colors.textPrimary, fontWeight: '700', fontSize: 15 },
    statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    statusText: { fontSize: 11, fontWeight: '700' },
    email: { color: Colors.textSecondary, fontSize: 12, marginBottom: 3 },
    info: { color: Colors.textSecondary, fontSize: 12, marginBottom: 2 },
    actions: { flexDirection: 'row', gap: 8 },
    actionBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
    actionText: { fontSize: 13, fontWeight: '600' },
    empty: { alignItems: 'center', marginTop: 80, gap: 8 },
    emptyText: { color: Colors.textSecondary, fontSize: 15 },
    emptyBtn: { borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, marginTop: 8 },
    emptyBtnText: { color: '#FFF', fontWeight: '700' },
    modal: { flex: 1, backgroundColor: Colors.bgPage },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.bgCard },
    modalTitle: { color: Colors.textPrimary, fontWeight: '700', fontSize: 16 },
    modalCancel: { color: Colors.danger, fontSize: 15 },
    modalSave: { fontSize: 15, fontWeight: '700' },
    statusChip: { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingVertical: 10, alignItems: 'center' }});


