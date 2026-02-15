'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/PageContainer';

export default function DashboardPage() {
    const [role, setRole] = useState<string | null>(null);
    const [stats, setStats] = useState({
        salesToday: 0,
        appointmentsToday: 0,
        totalClients: 0,
        salesMonth: 0,
    });
    const [appointments, setAppointments] = useState<any[]>([]);
    const router = useRouter();

    useEffect(() => {
        // Try to get role from userRoles array or legacy userRole
        const storedRoles = localStorage.getItem('userRoles');
        if (storedRoles) {
            try {
                const roles = JSON.parse(storedRoles);
                if (Array.isArray(roles) && roles.length > 0) {
                    setRole(roles[0].name);
                }
            } catch (e) {
                console.error("Error parsing roles", e);
            }
        }

        if (!storedRoles) {
            const legacyRole = localStorage.getItem('userRole');
            setRole(legacyRole || '');
        }

        const token = localStorage.getItem('accessToken');
        console.log('DashboardPage: Token found:', !!token);
        const headers: any = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Fetch Stats
        fetch('http://localhost:3001/dashboard/stats', { headers })
            .then(res => {
                if (!res.ok) {
                    console.error('Stats fetch failed:', res.status, res.statusText);
                    throw new Error('Failed to fetch stats');
                }
                return res.json();
            })
            .then(data => setStats(data))
            .catch(err => {
                console.error('Error fetching stats:', err);
                // Keep default stats on error to prevent crash
            });

        // Fetch Today's Appointments
        fetch('http://localhost:3001/dashboard/appointments', { headers })
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch appointments');
                return res.json();
            })
            .then(data => setAppointments(data))
            .catch(err => console.error('Error fetching appointments:', err));
    }, []);

    // We don't block anymore. If role is null, we just render.
    // Layout handles auth protection.

    const isAdmin = role === 'ADMIN';

    return (
        <PageContainer>
            <h1 className="text-3xl font-serif font-bold mb-8">Dashboard</h1>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-card border rounded-lg p-6">
                    <p className="text-sm text-muted-foreground mb-2">Ventas Hoy</p>
                    <p className="text-3xl font-bold">S/. {stats.salesToday.toLocaleString()}</p>
                </div>
                <div className="bg-card border rounded-lg p-6">
                    <p className="text-sm text-muted-foreground mb-2">Citas Hoy</p>
                    <p className="text-3xl font-bold">{stats.appointmentsToday}</p>
                </div>
                <div className="bg-card border rounded-lg p-6">
                    <p className="text-sm text-muted-foreground mb-2">Total Clientes</p>
                    <p className="text-3xl font-bold">{stats.totalClients}</p>
                </div>
                <div className="bg-card border rounded-lg p-6">
                    <p className="text-sm text-muted-foreground mb-2">Ventas del Mes</p>
                    <p className="text-3xl font-bold">S/. {stats.salesMonth.toLocaleString()}</p>
                </div>
            </div>

            {/* Today's Appointments */}
            <div className="bg-card border rounded-lg p-6 mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Citas de Hoy</h2>
                    <button
                        onClick={() => router.push('/dashboard/calendar')}
                        className="text-sm text-primary hover:underline"
                    >
                        Ver Calendario Completo
                    </button>
                </div>

                {appointments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg">
                        <p>No hay citas programadas para hoy.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted text-muted-foreground">
                                <tr>
                                    <th className="p-3 rounded-tl-lg">Hora</th>
                                    <th className="p-3">Cliente</th>
                                    <th className="p-3">Servicio</th>
                                    <th className="p-3">Profesional</th>
                                    <th className="p-3 rounded-tr-lg">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {appointments.map((appt: any) => (
                                    <tr key={appt.id} className="border-b last:border-0 hover:bg-muted/50 transition">
                                        <td className="p-3 font-medium whitespace-nowrap">
                                            {new Date(appt.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="p-3 font-medium">{appt.client?.name || 'Cliente sin nombre'}</td>
                                        <td className="p-3">{appt.service?.name || '—'}</td>
                                        <td className="p-3">{appt.worker?.name || '—'}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${appt.status === 'CONFIRMED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                    appt.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                        appt.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                            'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                                }`}>
                                                {appt.status === 'PENDING' ? 'Pendiente' :
                                                    appt.status === 'CONFIRMED' ? 'Confirmada' :
                                                        appt.status === 'COMPLETED' ? 'Completada' :
                                                            appt.status === 'CANCELLED' ? 'Cancelada' : appt.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="bg-card border rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">Accesos Rápidos</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <button
                        onClick={() => router.push('/dashboard/calendar')}
                        className="p-4 bg-primary/10 hover:bg-primary/20 rounded-md text-left transition"
                    >
                        <p className="font-semibold">📅 Calendario</p>
                        <p className="text-sm text-muted-foreground">Ver citas programadas</p>
                    </button>
                    <button
                        onClick={() => router.push('/dashboard/clients')}
                        className="p-4 bg-primary/10 hover:bg-primary/20 rounded-md text-left transition"
                    >
                        <p className="font-semibold">👥 Clientes</p>
                        <p className="text-sm text-muted-foreground">Gestionar clientes</p>
                    </button>
                    <button
                        onClick={() => router.push('/dashboard/daily-closing')}
                        className="p-4 bg-primary/10 hover:bg-primary/20 rounded-md text-left transition"
                    >
                        <p className="font-semibold">💰 Cierre Diario</p>
                        <p className="text-sm text-muted-foreground">Revisar ventas del día</p>
                    </button>
                </div>
            </div>
        </PageContainer>
    );
}
