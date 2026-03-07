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

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Expenses'> };

const CATEGORIES = ['Sueldo', 'Alquiler', 'Insumos', 'Marketing', 'Servicios', 'Otros'];
const EMPTY_FORM = { description: '', amount: '', category: 'Otros', date: '' };

export default function ExpensesScreen({ navigation }: Props) {
    const theme = useTheme();
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [total, setTotal] = useState(0);
    const [modalVisible, setModalVisible] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);

    const load = async () => {
        try {
            const res = await api.get('/expenses');
            const data = [...res.data].reverse();
            setExpenses(data);
            setTotal(data.reduce((s: number, e: any) => s + Number(e.amount), 0));
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { load(); }, []);

    const openCreate = () => {
        setEditing(null);
        setForm({ ...EMPTY_FORM, date: new Date().toISOString().split('T')[0] });
        setModalVisible(true);
    };

    const openEdit = (exp: any) => {
        setEditing(exp);
        setForm({
            description: exp.description || '',
            amount: String(exp.amount || ''),
            category: exp.category || 'Otros',
            date: exp.date ? new Date(exp.date).toISOString().split('T')[0] : ''});
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!form.description.trim() || !form.amount) {
            Alert.alert('Requeridos', 'Descripción y monto son obligatorios');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                description: form.description.trim(),
                amount: parseFloat(form.amount),
                category: form.category,
                date: form.date ? new Date(form.date).toISOString() : new Date().toISOString()};
            if (editing) { await api.patch(`/expenses/${editing.id}`, payload); }
            else { await api.post('/expenses', payload); }
            setModalVisible(false);
            load();
        } catch (e: any) {
            Alert.alert('Error', e.response?.data?.message || 'No se pudo guardar');
        } finally { setSaving(false); }
    };

    const handleDelete = (exp: any) => {
        Alert.alert('Eliminar gasto', '¿Estás seguro?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar', style: 'destructive', onPress: async () => {
                    try { await api.delete(`/expenses/${exp.id}`); load(); }
                    catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'No se pudo eliminar'); }
                }
            }
        ]);
    };

    const CAT_COLORS: Record<string, string> = {
        Sueldo: Colors.danger, Alquiler: Colors.warning, Insumos: Colors.info,
        Marketing: Colors.purple, Servicios: Colors.success, Otros: Colors.textSecondary};

    return (
        <SafeAreaView style={SharedStyles.safeArea}>
            <View style={[SharedStyles.header, { backgroundColor: theme.sidebar }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={SharedStyles.backBtn}>← Volver</Text>
                </TouchableOpacity>
                <Text style={SharedStyles.headerTitle}>Gastos</Text>
                <TouchableOpacity onPress={openCreate} style={styles.addBtn}>
                    <Text style={styles.addBtnText}>+ Nuevo</Text>
                </TouchableOpacity>
            </View>

            {/* Total Banner */}
            <View style={[styles.totalBanner, { backgroundColor: theme.sidebar + 'EE' }]}>
                <Text style={styles.totalLabel}>Total registrado</Text>
                <Text style={styles.totalValue}>S/ {total.toFixed(2)}</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={theme.sidebar} style={{ marginTop: 60 }} />
            ) : (
                <FlatList
                    data={expenses}
                    keyExtractor={item => String(item.id)}
                    contentContainerStyle={SharedStyles.listPadding}
                    refreshControl={<RefreshControl refreshing={refreshing} tintColor={theme.sidebar} onRefresh={() => { setRefreshing(true); load(); }} />}
                    renderItem={({ item }) => {
                        const catColor = CAT_COLORS[item.category] || Colors.textSecondary;
                        return (
                            <View style={SharedStyles.card}>
                                <View style={styles.itemRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.desc}>{item.description}</Text>
                                        {item.category && (
                                            <View style={[styles.catBadge, { backgroundColor: catColor + '18' }]}>
                                                <Text style={[styles.catText, { color: catColor }]}>{item.category}</Text>
                                            </View>
                                        )}
                                        <Text style={styles.date}>{new Date(item.date).toLocaleDateString('es-PE')}</Text>
                                    </View>
                                    <Text style={[styles.amount, { color: Colors.danger }]}>S/ {Number(item.amount).toFixed(2)}</Text>
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
                        );
                    }}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Text style={{ fontSize: 40 }}>💰</Text>
                            <Text style={styles.emptyText}>Sin gastos registrados</Text>
                            <TouchableOpacity onPress={openCreate} style={[styles.emptyBtn, { backgroundColor: theme.sidebar }]}>
                                <Text style={styles.emptyBtnText}>+ Registrar gasto</Text>
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
                            <Text style={styles.modalTitle}>{editing ? 'Editar Gasto' : 'Nuevo Gasto'}</Text>
                            <TouchableOpacity onPress={handleSave} disabled={saving}>
                                {saving ? <ActivityIndicator color={theme.sidebar} /> : <Text style={[styles.modalSave, { color: theme.sidebar }]}>Guardar</Text>}
                            </TouchableOpacity>
                        </View>
                        <ScrollView contentContainerStyle={{ padding: 20 }}>
                            {[
                                { label: 'Descripción *', key: 'description', placeholder: 'Ej: Pago de alquiler' },
                                { label: 'Monto (S/) *', key: 'amount', placeholder: '0.00', keyboardType: 'numeric' },
                                { label: 'Fecha (YYYY-MM-DD)', key: 'date', placeholder: new Date().toISOString().split('T')[0] },
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

                            <Text style={ff.label}>Categoría</Text>
                            <View style={styles.catGrid}>
                                {CATEGORIES.map(c => (
                                    <TouchableOpacity
                                        key={c}
                                        onPress={() => setForm(p => ({ ...p, category: c }))}
                                        style={[styles.catChip, {
                                            backgroundColor: form.category === c ? (CAT_COLORS[c] || Colors.textSecondary) : 'transparent',
                                            borderColor: CAT_COLORS[c] || Colors.textSecondary}]}
                                    >
                                        <Text style={{ color: form.category === c ? '#FFF' : (CAT_COLORS[c] || Colors.textSecondary), fontSize: 13, fontWeight: '600' }}>{c}</Text>
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

const CAT_COLORS_OUTER: Record<string, string> = {
    Sueldo: Colors.danger, Alquiler: Colors.warning, Insumos: Colors.info,
    Marketing: Colors.purple, Servicios: Colors.success, Otros: Colors.textSecondary};

const ff = StyleSheet.create({
    label: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6 },
    input: { height: 46, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 12, fontSize: 14, color: Colors.textPrimary, backgroundColor: '#FAFAFA' }});

const styles = StyleSheet.create({
    addBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    addBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
    totalBanner: { paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
    totalValue: { color: '#FFF', fontSize: 22, fontWeight: '800' },
    itemRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    desc: { color: Colors.textPrimary, fontWeight: '700', fontSize: 15, marginBottom: 4 },
    catBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 6 },
    catText: { fontSize: 11, fontWeight: '700' },
    date: { color: Colors.textSecondary, fontSize: 12 },
    amount: { fontSize: 16, fontWeight: '800' },
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
    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    catChip: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 }});


