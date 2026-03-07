import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    StatusBar, Alert, Modal, Animated, ActivityIndicator, Platform
} from 'react-native';
import { useAuth } from '../store/AuthContext';
import { useTheme } from '../store/ThemeContext';
import { api } from '../services/api';
import { Colors, MODULE_ICON_COLORS } from '../theme';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

type HomeScreenProps = { navigation: NativeStackNavigationProp<RootStackParamList, 'Home'> };

const MODULES = [
    { key: 'calendar', label: 'Calendario', sub: 'Gestión de citas y horarios', screen: 'Calendar', icon: '📅' },
    { key: 'attentions', label: 'Atenciones', sub: 'Registro de servicios realizados', screen: 'Attentions', icon: '✨' },
    { key: 'daily-closing', label: 'Cierre Diario', sub: 'Resumen de caja y pagos', screen: 'DailyClosing', icon: '🧮' },
    { key: 'clients', label: 'Clientes', sub: 'Directorio de clientes', screen: 'Clients', icon: '👥' },
    { key: 'expenses', label: 'Gastos', sub: 'Control de egresos', screen: 'Expenses', icon: '🧾' },
    { key: 'services', label: 'Servicios', sub: 'Catálogo y precios', screen: 'Services', icon: '💆' },
    { key: 'reports', label: 'Reportes', sub: 'Métricas del negocio', screen: 'Reports', icon: '📊' },
    { key: 'users', label: 'Personal', sub: 'Equipo de trabajo', screen: 'Users', icon: '👤' },
];

const STATUS_COLORS: Record<string, string> = {
    PENDING: '#F97316', CONFIRMED: '#10B981', COMPLETED: '#8B5CF6', CANCELLED: '#EF4444', NO_SHOW: '#9CA3AF',
};

export default function HomeScreen({ navigation }: HomeScreenProps) {
    const { user, logout } = useAuth();
    const theme = useTheme();
    const sidebarColor = theme.sidebar || Colors.header;

    const [stats, setStats] = useState<any>(null);
    const [todayAppts, setTodayAppts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [menuOpen, setMenuOpen] = useState(false);
    const [permissions, setPermissions] = useState<string[]>([]);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        (async () => {
            try {
                const [pRes, sRes, aRes] = await Promise.allSettled([
                    api.get(`/users/${user?.id}/permissions`),
                    api.get('/dashboard/stats'),
                    api.get('/dashboard/appointments'),
                ]);
                if (pRes.status === 'fulfilled') setPermissions(pRes.value.data || []);
                else {
                    const roles = user?.roles?.map((r: any) => r.role?.name?.toLowerCase()) || [];
                    setPermissions(roles.includes('admin') ? ['all'] : []);
                }
                if (sRes.status === 'fulfilled') setStats(sRes.value.data);
                if (aRes.status === 'fulfilled') setTodayAppts(aRes.value.data || []);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        })();
    }, [user]);

    const hasPerm = (k: string) => permissions.includes('all') || permissions.includes(k) || permissions.length === 0;
    const visible = MODULES.filter(m => hasPerm(m.key));
    const firstName = user?.name?.split(' ')[0] || 'Admin';

    const openMenu = () => { setMenuOpen(true); Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start(); };
    const closeMenu = () => Animated.timing(fadeAnim, { toValue: 0, duration: 130, useNativeDriver: true }).start(() => setMenuOpen(false));

    return (
        <>
            <StatusBar barStyle="light-content" backgroundColor={sidebarColor} />
            {/* OUTER: gray background fills entire screen */}
            <View style={{ flex: 1, backgroundColor: Colors.bgPage }}>

                {/* HEADER BLOCK: dark, rounded bottom corners, elevated */}
                <View style={[styles.headerBlock, { backgroundColor: sidebarColor }]}>
                    {/* Safe area handles notch/status bar */}
                    <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }} />

                    {/* Top row */}
                    <View style={styles.topRow}>
                        <View>
                            <Text style={styles.greetSmall}>Buenos días,</Text>
                            <Text style={styles.greetName}>{firstName}</Text>
                        </View>
                        <TouchableOpacity onPress={openMenu} style={styles.avatarBtn}>
                            <Text style={styles.avatarLetter}>{user?.name?.[0]?.toUpperCase()}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Stats */}
                    {loading
                        ? <ActivityIndicator color="rgba(255,255,255,0.4)" style={{ marginBottom: 8 }} />
                        : stats && (
                            <View style={styles.statsRow}>
                                <StatPill label="CITAS HOY" value={stats.appointmentsToday ?? 0} accent="#3B82F6" />
                                <StatPill label="CLIENTES" value={stats.totalClients ?? 0} accent="#10B981" />
                                <StatPill label="VENTAS MES" value={`$${fmtK(stats.salesMonth ?? 0)}`} accent="#8B5CF6" />
                            </View>
                        )
                    }
                </View>

                {/* BODY */}
                <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
                    {/* Citas de hoy */}
                    {todayAppts.length > 0 && (
                        <>
                            <View style={styles.secHeader}>
                                <Text style={styles.secLabel}>CITAS DE HOY</Text>
                                <TouchableOpacity onPress={() => navigation.navigate('Calendar' as any)}>
                                    <Text style={[styles.seeAll, { color: sidebarColor }]}>Ver todo</Text>
                                </TouchableOpacity>
                            </View>
                            {todayAppts.slice(0, 4).map((apt: any) => (
                                <TouchableOpacity key={apt.id} style={styles.aptCard} onPress={() => navigation.navigate('Calendar' as any)} activeOpacity={0.8}>
                                    <View style={[styles.aptDot, { backgroundColor: STATUS_COLORS[apt.status] || '#9CA3AF' }]} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.aptName}>{apt.client?.name}</Text>
                                        <Text style={styles.aptService}>{apt.service?.name}</Text>
                                    </View>
                                    <Text style={styles.aptTime}>
                                        {new Date(apt.date).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </>
                    )}

                    {/* Módulos */}
                    <Text style={[styles.secLabel, { marginTop: todayAppts.length > 0 ? 18 : 4 }]}>MÓDULOS</Text>
                    <View style={styles.moduleCard}>
                        {visible.map((mod, i) => {
                            const ic = MODULE_ICON_COLORS[mod.key] || { bg: '#EEF2FF', icon: '#6366F1' };
                            return (
                                <TouchableOpacity
                                    key={mod.key}
                                    style={[styles.moduleRow, i === visible.length - 1 && { borderBottomWidth: 0 }]}
                                    onPress={() => navigation.navigate(mod.screen as any)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.moduleIcon, { backgroundColor: ic.bg }]}>
                                        <Text style={{ fontSize: 20 }}>{mod.icon}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.moduleName}>{mod.label}</Text>
                                        <Text style={styles.moduleSub}>{mod.sub}</Text>
                                    </View>
                                    <Text style={styles.chevron}>›</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>
            </View>

            {/* Dropdown menu */}
            <Modal visible={menuOpen} transparent animationType="none" onRequestClose={closeMenu}>
                <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={closeMenu} activeOpacity={1}>
                    <Animated.View style={[styles.dropdown, { opacity: fadeAnim, backgroundColor: Colors.bgCard }]}>
                        <View style={[styles.dropHead, { backgroundColor: sidebarColor }]}>
                            <View style={styles.dropAvatar}><Text style={styles.dropAvatarLetter}>{user?.name?.[0]?.toUpperCase()}</Text></View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.dropName}>{user?.name}</Text>
                                <Text style={styles.dropEmail} numberOfLines={1}>{user?.email}</Text>
                            </View>
                        </View>
                        {[{ label: '📊 Resumen estadístico', screen: 'Dashboard' }, { label: '⚙️ Configuración', screen: 'Settings' }].map(item => (
                            <TouchableOpacity key={item.screen} style={styles.dropItem} onPress={() => { closeMenu(); navigation.navigate(item.screen as any); }}>
                                <Text style={styles.dropItemText}>{item.label}</Text>
                            </TouchableOpacity>
                        ))}
                        <View style={{ height: 1, backgroundColor: Colors.border }} />
                        <TouchableOpacity style={styles.dropItem} onPress={() => {
                            closeMenu();
                            Alert.alert('Cerrar sesión', '¿Salir de la cuenta?', [
                                { text: 'Cancelar', style: 'cancel' },
                                { text: 'Salir', style: 'destructive', onPress: logout },
                            ]);
                        }}>
                            <Text style={[styles.dropItemText, { color: Colors.danger }]}>🚪 Cerrar sesión</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </TouchableOpacity>
            </Modal>
        </>
    );
}

function fmtK(n: number) { return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n); }

function StatPill({ label, value, accent }: { label: string; value: any; accent: string }) {
    return (
        <View style={[sp.pill, { borderLeftColor: accent }]}>
            <Text style={sp.label}>{label}</Text>
            <Text style={sp.value}>{value}</Text>
        </View>
    );
}
const sp = StyleSheet.create({
    pill: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12, borderLeftWidth: 3 },
    label: { color: 'rgba(255,255,255,0.55)', fontSize: 9, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
    value: { color: '#FFF', fontSize: 22, fontWeight: '800' },
});

const styles = StyleSheet.create({
    /* HEADER BLOCK — rounded bottom, elevated/floating */
    headerBlock: {
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
        paddingHorizontal: 20, paddingBottom: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18, shadowRadius: 14, elevation: 10, zIndex: 10,
    },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
    greetSmall: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
    greetName: { color: '#FFF', fontSize: 22, fontWeight: '800', marginTop: 2 },
    avatarBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    avatarLetter: { color: '#FFF', fontSize: 17, fontWeight: '800' },
    statsRow: { flexDirection: 'row', gap: 8 },

    /* BODY */
    body: { padding: 16, paddingBottom: 50 },
    secHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    secLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    seeAll: { fontSize: 13, fontWeight: '600' },

    aptCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
    aptDot: { width: 10, height: 10, borderRadius: 5 },
    aptName: { color: Colors.textPrimary, fontWeight: '700', fontSize: 14 },
    aptService: { color: Colors.textSecondary, fontSize: 12, marginTop: 1 },
    aptTime: { color: Colors.textPrimary, fontWeight: '700', fontSize: 13 },

    moduleCard: { backgroundColor: Colors.bgCard, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
    moduleRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
    moduleIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    moduleName: { color: Colors.textPrimary, fontWeight: '700', fontSize: 14 },
    moduleSub: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
    chevron: { color: Colors.textMuted, fontSize: 24 },

    dropdown: { position: 'absolute', top: Platform.OS === 'ios' ? 100 : 70, right: 14, borderRadius: 16, width: 240, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 16, overflow: 'hidden' },
    dropHead: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
    dropAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    dropAvatarLetter: { color: '#FFF', fontSize: 15, fontWeight: '800' },
    dropName: { color: '#FFF', fontWeight: '700', fontSize: 13 },
    dropEmail: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 1 },
    dropItem: { padding: 14 },
    dropItemText: { color: Colors.textPrimary, fontSize: 14 },
});
