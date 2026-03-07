// Design System — Gracia Spa Manager
// Basado en mockups: header navy, bg gris claro, cards blancas
export const Colors = {
    // Header / Sidebar
    header: '#1A2535',
    headerText: '#FFFFFF',
    headerSubText: 'rgba(255,255,255,0.5)',

    // Alias para compatibilidad
    sidebar: '#1A2535',
    sidebarText: '#FFFFFF',
    sidebarSubText: 'rgba(255,255,255,0.55)',

    // Fondos
    bgPage: '#F0F2F5',
    bgCard: '#FFFFFF',
    bgSection: '#F8F9FB',

    // Texto
    textPrimary: '#1A2535',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',

    // Acentos
    primary: '#3B82F6',    // azul
    success: '#10B981',    // verde
    info: '#6366F1',       // índigo
    warning: '#F97316',    // naranja
    danger: '#EF4444',     // rojo
    purple: '#8B5CF6',     // violeta
    teal: '#14B8A6',       // teal

    // Delta positivo (reportes)
    deltaPositive: '#10B981',
    deltaNegative: '#EF4444',

    // UI
    border: '#E5E7EB',
    shadow: '#1A2535',
};

// Íconos de módulo — colores del mockup
export const MODULE_ICON_COLORS: Record<string, { bg: string; icon: string }> = {
    calendar: { bg: '#3B82F620', icon: '#3B82F6' },
    attentions: { bg: '#8B5CF620', icon: '#8B5CF6' },
    'daily-closing': { bg: '#F9731620', icon: '#F97316' },
    clients: { bg: '#10B98120', icon: '#10B981' },
    expenses: { bg: '#EF444420', icon: '#EF4444' },
    services: { bg: '#14B8A620', icon: '#14B8A6' },
    reports: { bg: '#6366F120', icon: '#6366F1' },
    users: { bg: '#F9731620', icon: '#F97316' },
};

export const SharedStyles = {
    safeArea: { flex: 1, backgroundColor: Colors.bgPage },
    header: {
        backgroundColor: Colors.header,
        paddingHorizontal: 20,
        paddingVertical: 14,
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'space-between' as const,
    },
    headerTitle: {
        color: Colors.headerText,
        fontSize: 18,
        fontWeight: '700' as const,
        flex: 1,
        textAlign: 'center' as const,
    },
    backBtn: { color: Colors.headerText, fontSize: 26, fontWeight: '300' as const, lineHeight: 30 },
    card: {
        backgroundColor: Colors.bgCard,
        borderRadius: 14,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
    listPadding: { padding: 16, gap: 10, paddingBottom: 40 },
    emptyText: {
        color: Colors.textMuted,
        textAlign: 'center' as const,
        marginTop: 60,
        fontSize: 15,
    },
    sectionLabel: {
        color: Colors.textMuted,
        fontSize: 11,
        fontWeight: '700' as const,
        textTransform: 'uppercase' as const,
        letterSpacing: 1,
        marginBottom: 10,
        marginTop: 6,
    },
};
