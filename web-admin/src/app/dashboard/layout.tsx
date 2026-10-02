'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
    House, CalendarDays, Receipt, Sparkles, Users, Gift, Briefcase, Wallet, ClipboardCheck, ChartColumn,
    UserCog, ShieldCheck, Clock, Tags, Megaphone, Palette, Database, History, CircleUser, LogOut,
    ChevronDown, Menu, X, Settings, Lock,
} from 'lucide-react';
import { AutoLogout } from '@/components/layout/AutoLogout';
import { API_URL, authFetch, clearSession } from '@/lib/api';

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; permission?: string };
type NavGroup = { title: string; items: NavItem[] };

const MAIN_NAV: NavGroup[] = [
    {
        title: 'Operación',
        items: [
            { href: '/dashboard/calendar', label: 'Calendario', icon: CalendarDays, permission: 'calendar' },
            { href: '/dashboard/attentions', label: 'Atenciones', icon: Receipt, permission: 'attentions' },
            { href: '/dashboard/clients', label: 'Clientes', icon: Users, permission: 'clients' },
            { href: '/dashboard/loyalty', label: 'Fidelidad', icon: Gift, permission: 'clients' },
            { href: '/dashboard/services', label: 'Servicios', icon: Sparkles, permission: 'services' },
            { href: '/dashboard/corporate', label: 'Corporativo', icon: Briefcase, permission: 'corporate' },
        ],
    },
    {
        title: 'Finanzas',
        items: [
            { href: '/dashboard/expenses', label: 'Gastos', icon: Wallet, permission: 'expenses' },
            { href: '/dashboard/daily-closing', label: 'Cierre diario', icon: ClipboardCheck, permission: 'daily_closing' },
            { href: '/dashboard/reports', label: 'Reportes', icon: ChartColumn, permission: 'reports' },
        ],
    },
];

const SETTINGS_NAV: NavGroup[] = [
    {
        title: 'Equipo',
        items: [
            { href: '/dashboard/users', label: 'Personal', icon: UserCog, permission: 'users' },
            { href: '/dashboard/roles', label: 'Roles y permisos', icon: ShieldCheck, permission: 'roles' },
        ],
    },
    {
        title: 'Negocio',
        items: [
            { href: '/dashboard/schedule', label: 'Horarios', icon: Clock, permission: 'settings' },
            { href: '/dashboard/settings/expense-types', label: 'Tipos de gasto', icon: Tags, permission: 'settings' },
            { href: '/dashboard/messages', label: 'Marketing y redes', icon: Megaphone, permission: 'settings' },
        ],
    },
    {
        title: 'Sistema',
        items: [
            { href: '/dashboard/settings', label: 'Temas y branding', icon: Palette, permission: 'settings' },
            { href: '/dashboard/backup', label: 'Backup', icon: Database, permission: 'settings' },
            { href: '/dashboard/audit', label: 'Auditoría', icon: History, permission: 'settings' },
        ],
    },
];

function NavLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate: () => void }) {
    return (
        <li>
            <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${active
                    ? 'bg-white/15 font-semibold text-white shadow-[inset_3px_0_0_0_#fff]'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
            >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                {item.label}
            </Link>
        </li>
    );
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarColor, setSidebarColor] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [permissions, setPermissions] = useState<string[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);

    useEffect(() => {
        if (!localStorage.getItem('userId') || !localStorage.getItem('accessToken')) {
            router.push('/');
            return;
        }

        const storedPermissions = localStorage.getItem('userPermissions');
        if (storedPermissions) setPermissions(JSON.parse(storedPermissions));
        setIsMounted(true);

        const loadSidebarColor = async () => {
            try {
                const res = await authFetch(`${API_URL}/configuration/public`);
                if (res.ok) {
                    const config = await res.json();
                    if (config.sidebarColor) setSidebarColor(config.sidebarColor);
                }
            } catch (error) {
                console.error('Failed to load sidebar color:', error);
            }
        };

        loadSidebarColor();
        window.addEventListener('storage', loadSidebarColor);
        return () => window.removeEventListener('storage', loadSidebarColor);
    }, [router]);

    if (!isMounted) return null;

    const hasPermission = (moduleKey?: string) =>
        !moduleKey || permissions.includes('all') || permissions.includes(moduleKey);
    const isAdmin = permissions.includes('all');

    const isActive = (href: string) =>
        href === '/dashboard' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

    const visibleGroups = (groups: NavGroup[]) =>
        groups
            .map(group => ({ ...group, items: group.items.filter(item => hasPermission(item.permission)) }))
            .filter(group => group.items.length > 0);

    const mainGroups = visibleGroups(MAIN_NAV);
    const settingsGroups = visibleGroups(SETTINGS_NAV);
    // La sección de configuración se abre sola si la página actual está dentro de ella
    const settingsActive = settingsGroups.some(g => g.items.some(i => isActive(i.href)));
    const showSettings = settingsOpen || settingsActive;

    const closeSidebar = () => setIsSidebarOpen(false);

    // Si la URL corresponde a un módulo sin permiso, se muestra un aviso en vez de la página vacía
    const currentItem = [...MAIN_NAV, ...SETTINGS_NAV]
        .flatMap(group => group.items)
        .filter(item => isActive(item.href))
        .sort((a, b) => b.href.length - a.href.length)[0];
    const canViewPage = !currentItem || hasPermission(currentItem.permission);

    const handleLogout = () => {
        clearSession();
        router.push('/');
    };

    return (
        <div className="flex h-screen bg-background">
            {/* Mobile Menu Button */}
            <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                aria-label={isSidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
                className="fixed top-4 left-4 z-50 md:hidden bg-card border rounded-lg p-2 shadow-lg"
            >
                {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>

            {/* Overlay for mobile */}
            {isSidebarOpen && (
                <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={closeSidebar} />
            )}

            <aside
                className={`
                    fixed md:static inset-y-0 left-0 z-40 flex flex-col
                    w-64 shrink-0 bg-sidebar text-sidebar-foreground
                    transform transition-transform duration-300 ease-in-out
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}
                style={sidebarColor ? { backgroundColor: sidebarColor } : undefined}
            >
                <div className="flex h-16 shrink-0 items-center justify-center border-b border-white/10">
                    {/* Logo en blanco para que sea legible sobre el menú */}
                    <img src="/logo1.png" alt="Gracia Spa" className="h-9 w-auto brightness-0 invert" />
                </div>

                <nav aria-label="Menú principal" className="flex-1 overflow-y-auto px-3 py-4">
                    <ul className="space-y-1">
                        {hasPermission('dashboard') && (
                            <NavLink item={{ href: '/dashboard', label: isAdmin ? 'Dashboard' : 'Resumen', icon: House }} active={isActive('/dashboard')} onNavigate={closeSidebar} />
                        )}
                    </ul>

                    {mainGroups.map(group => (
                        <div key={group.title} className="mt-5">
                            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/50">{group.title}</p>
                            <ul className="space-y-1">
                                {group.items.map(item => <NavLink key={item.href} item={item} active={isActive(item.href)} onNavigate={closeSidebar} />)}
                            </ul>
                        </div>
                    ))}

                    {settingsGroups.length > 0 && (
                        <div className="mt-5">
                            <button
                                onClick={() => setSettingsOpen(!showSettings)}
                                aria-expanded={showSettings}
                                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white"
                            >
                                <Settings className="h-[18px] w-[18px]" />
                                <span className="flex-1 text-left">Configuración</span>
                                <ChevronDown className={`h-4 w-4 transition-transform ${showSettings ? 'rotate-180' : ''}`} />
                            </button>
                            {showSettings && (
                                <div className="mt-1 ml-3 border-l border-white/10 pl-2">
                                    {settingsGroups.map(group => (
                                        <div key={group.title} className="mt-2">
                                            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/40">{group.title}</p>
                                            <ul className="space-y-0.5">
                                                {group.items.map(item => <NavLink key={item.href} item={item} active={isActive(item.href)} onNavigate={closeSidebar} />)}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </nav>

                <div className="shrink-0 border-t border-white/10 p-3 space-y-1">
                    <ul>
                        <NavLink item={{ href: '/dashboard/profile', label: 'Mi perfil', icon: CircleUser }} active={isActive('/dashboard/profile')} onNavigate={closeSidebar} />
                    </ul>
                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white"
                    >
                        <LogOut className="h-[18px] w-[18px]" />
                        Cerrar sesión
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto md:ml-0">
                <div className="md:hidden h-16" /> {/* Spacer for mobile menu button */}
                <AutoLogout timeoutMinutes={15}>
                    {canViewPage ? children : (
                        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
                            <div className="rounded-full bg-muted p-4 text-muted-foreground">
                                <Lock className="h-8 w-8" />
                            </div>
                            <h1 className="text-2xl font-serif font-bold">Sin acceso</h1>
                            <p className="max-w-sm text-muted-foreground">
                                Su rol no tiene permiso para el módulo &quot;{currentItem?.label}&quot;. Si lo necesita, pídale acceso a un administrador.
                            </p>
                            <Link href="/dashboard" className="mt-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90">
                                Ir al inicio
                            </Link>
                        </div>
                    )}
                </AutoLogout>
            </main>
        </div>
    );
}
