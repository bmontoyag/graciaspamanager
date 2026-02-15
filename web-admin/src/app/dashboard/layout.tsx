'use client';

import Link from 'next/link';
import { Home, Calendar, Users, DollarSign, Settings, FileText, BarChart3, ClipboardList, Menu, X, User, Palette, Package, Database, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [role, setRole] = useState<string | null>(null);
    const [sidebarColor, setSidebarColor] = useState('#2C3E50');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // We now use permissions for access control, but we can check for token/userId existence
        const userId = localStorage.getItem('userId');
        const accessToken = localStorage.getItem('accessToken');

        if (!userId || !accessToken) {
            router.push('/');
        }

        // Legacy role check removal/update
        const storedRole = localStorage.getItem('userRole'); // might be null now
        if (storedRole) setRole(storedRole);

        // Fetch sidebar color from API
        const loadSidebarColor = async () => {
            try {
                const res = await fetch('http://localhost:3001/configuration');
                if (res.ok) {
                    const config = await res.json();
                    if (config.sidebarColor) {
                        setSidebarColor(config.sidebarColor);
                    }
                }
            } catch (error) {
                console.error('Failed to load sidebar color:', error);
            }
        };

        loadSidebarColor();

        // Listen for configuration updates (e.g., if another tab changes the config via API)
        const handleStorageChange = () => {
            // Re-fetch sidebar color if a storage event occurs, assuming it might signal a config change
            loadSidebarColor();
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [router]);

    const [permissions, setPermissions] = useState<string[]>([]);

    // ...

    useEffect(() => {
        const storedRoles = localStorage.getItem('userRoles');
        setRole(storedRoles); // Keep for generic check if needed, but rely on permissions

        const storedPermissions = localStorage.getItem('userPermissions');
        if (storedPermissions) {
            setPermissions(JSON.parse(storedPermissions));
        }

        if (!localStorage.getItem('userId')) {
            router.push('/');
        }
        // ...
    }, [router]);

    // Helper to check permission
    const hasPermission = (moduleKey: string) => {
        if (permissions.includes('all')) return true;
        return permissions.includes(moduleKey);
    };

    // If we have permissions or we are waiting for load, we might show null or a loader.
    // But if we have userId, we should try to render (and sidebar will filter links).
    // If not loaded yet, permissions is empty array.

    // Simple check: if we are mounted and have no permissions AND no userId, we redirected already.
    // If we have userId but no permissions yet (maybe empty or loading), we can render the shell.
    // Ideally we want to wait, but for now let's just check if we have checked storage.

    // Let's just remove the strict null return if we have a userId
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return null;
    }

    // After mount, we can safely check localStorage
    const hasAuth = localStorage.getItem('userId');
    const hasPermissions = permissions.length > 0;

    // Optional: Show nothing while checking auth or redirecting
    if (!hasAuth && !hasPermissions) return null;

    const isAdmin = hasPermission('all'); // Backward compatibility or just use hasPermission

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const closeSidebar = () => {
        setIsSidebarOpen(false);
    };

    return (
        <div className="flex h-screen bg-background">
            {/* Mobile Menu Button */}
            <button
                onClick={toggleSidebar}
                className="fixed top-4 left-4 z-50 md:hidden bg-card border rounded-lg p-2 shadow-lg"
            >
                {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>

            {/* Overlay for mobile */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden"
                    onClick={closeSidebar}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed md:static inset-y-0 left-0 z-40
                    w-64 shadow-md border-r
                    transform transition-transform duration-300 ease-in-out
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}
                style={{ backgroundColor: sidebarColor, color: '#ffffff' }}
            >
                <div className="flex h-16 items-center justify-center border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                    <img src="/logo1.png" alt="Gracia Logo" className="h-10 w-auto" />
                </div>
                <nav className="p-4 overflow-y-auto h-[calc(100vh-8rem)]">
                    <ul className="space-y-2">
                        {/* Dashboard */}
                        {hasPermission('dashboard') && (
                            <li>
                                <Link href="/dashboard" onClick={closeSidebar} className="flex items-center rounded-md p-2 hover:bg-white/10 transition-colors">
                                    <Home className="mr-3 h-5 w-5" />
                                    {isAdmin ? 'Dashboard' : 'Resumen'}
                                </Link>
                            </li>
                        )}

                        {/* Business Section */}
                        {(hasPermission('calendar') || hasPermission('attentions') || hasPermission('services') || hasPermission('clients') || hasPermission('expenses') || hasPermission('daily_closing') || hasPermission('reports')) && (
                            <li className="pt-4">
                                <p className="text-xs uppercase tracking-wider opacity-60 px-2 mb-2">Negocio</p>
                            </li>
                        )}

                        {hasPermission('calendar') && (
                            <li>
                                <Link href="/dashboard/calendar" onClick={closeSidebar} className="flex items-center rounded-md p-2 hover:bg-white/10 transition-colors">
                                    <Calendar className="mr-3 h-5 w-5" />
                                    Calendario
                                </Link>
                            </li>
                        )}

                        {hasPermission('attentions') && (
                            <li>
                                <Link href="/dashboard/attentions" onClick={closeSidebar} className="flex items-center rounded-md p-2 hover:bg-white/10 transition-colors">
                                    <FileText className="mr-3 h-5 w-5" />
                                    Atenciones (Caja)
                                </Link>
                            </li>
                        )}

                        {hasPermission('services') && (
                            <li>
                                <Link href="/dashboard/services" onClick={closeSidebar} className="flex items-center rounded-md p-2 hover:bg-white/10 transition-colors">
                                    <Package className="mr-3 h-5 w-5" />
                                    Servicios
                                </Link>
                            </li>
                        )}

                        {hasPermission('clients') && (
                            <li>
                                <Link href="/dashboard/clients" onClick={closeSidebar} className="flex items-center rounded-md p-2 hover:bg-white/10 transition-colors">
                                    <Users className="mr-3 h-5 w-5" />
                                    Clientes
                                </Link>
                            </li>
                        )}

                        {hasPermission('expenses') && (
                            <li>
                                <Link href="/dashboard/expenses" onClick={closeSidebar} className="flex items-center rounded-md p-2 hover:bg-white/10 transition-colors">
                                    <DollarSign className="mr-3 h-5 w-5" />
                                    Gastos
                                </Link>
                            </li>
                        )}

                        {hasPermission('daily_closing') && (
                            <li>
                                <Link href="/dashboard/daily-closing" onClick={closeSidebar} className="flex items-center rounded-md p-2 hover:bg-white/10 transition-colors">
                                    <ClipboardList className="mr-3 h-5 w-5" />
                                    Cierre Diario
                                </Link>
                            </li>
                        )}

                        {hasPermission('reports') && (
                            <li>
                                <Link href="/dashboard/reports" onClick={closeSidebar} className="flex items-center rounded-md p-2 hover:bg-white/10 transition-colors">
                                    <BarChart3 className="mr-3 h-5 w-5" />
                                    Reportes
                                </Link>
                            </li>
                        )}

                        {/* Platform Configuration Section - Only if access to at least one config module */}
                        {(hasPermission('users') || hasPermission('settings') || hasPermission('roles')) && (
                            <li className="pt-4">
                                <p className="text-xs uppercase tracking-wider opacity-60 px-2 mb-2">Configuración</p>
                            </li>
                        )}

                        {hasPermission('users') && (
                            <li>
                                <Link href="/dashboard/users" onClick={closeSidebar} className="flex items-center rounded-md p-2 hover:bg-white/10 transition-colors">
                                    <Users className="mr-3 h-5 w-5" />
                                    Personal
                                </Link>
                            </li>
                        )}

                        {hasPermission('settings') && (
                            <li>
                                <Link href="/dashboard/settings" onClick={closeSidebar} className="flex items-center rounded-md p-2 hover:bg-white/10 transition-colors">
                                    <Palette className="mr-3 h-5 w-5" />
                                    Temas y Branding
                                </Link>
                            </li>
                        )}

                        {hasPermission('roles') && (
                            <li>
                                <Link href="/dashboard/roles" onClick={closeSidebar} className="flex items-center rounded-md p-2 hover:bg-white/10 transition-colors">
                                    <Users className="mr-3 h-5 w-5" />
                                    Roles y Permisos
                                </Link>
                            </li>
                        )}

                        {(isAdmin || hasPermission('settings')) && (
                            <>
                                <li>
                                    <Link href="/dashboard/schedule" onClick={closeSidebar} className="flex items-center rounded-md p-2 hover:bg-white/10 transition-colors">
                                        <div className="mr-3"><Clock className="h-5 w-5" /></div>
                                        Horarios
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/dashboard/backup" onClick={closeSidebar} className="flex items-center rounded-md p-2 hover:bg-white/10 transition-colors">
                                        <div className="mr-3"><Database className="h-5 w-5" /></div>
                                        Backup
                                    </Link>
                                </li>
                            </>
                        )}

                        {/* User Section */}
                        <li className="pt-4">
                            <p className="text-xs uppercase tracking-wider opacity-60 px-2 mb-2">Usuario</p>
                        </li>

                        <li>
                            <Link href="/dashboard/profile" onClick={closeSidebar} className="flex items-center rounded-md p-2 hover:bg-white/10 transition-colors">
                                <User className="mr-3 h-5 w-5" />
                                Mi Perfil
                            </Link>
                        </li>
                    </ul>
                </nav>
                <div className="absolute bottom-0 w-64 p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <button
                        onClick={() => {
                            localStorage.removeItem('userRole');
                            localStorage.removeItem('userId');
                            router.push('/');
                        }}
                        className="w-full rounded-md p-2 text-sm hover:bg-white/20 transition-colors"
                        style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                    >
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto md:ml-0">
                <div className="md:hidden h-16" /> {/* Spacer for mobile menu button */}
                {children}
            </main>
        </div>
    );
}
