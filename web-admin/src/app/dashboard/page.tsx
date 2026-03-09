'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/PageContainer';
import { Gift, Calendar, Users, DollarSign, Clock, CheckCircle, MessageCircle } from 'lucide-react';

export default function DashboardPage() {
    const [role, setRole] = useState<string | null>(null);
    const [stats, setStats] = useState({
        salesToday: 0,
        appointmentsToday: 0,
        totalClients: 0,
        salesMonth: 0,
        expensesToday: 0,
        expensesMonth: 0,
    });
    const [appointments, setAppointments] = useState<any[]>([]);
    const [upcomingBirthdays, setUpcomingBirthdays] = useState<any[]>([]);
    const [birthdayMessageTpl, setBirthdayMessageTpl] = useState<string>('¡Hola {name}! 🎉 De parte de todo el equipo de Gracia Spa queremos desearte un muy feliz cumpleaños. 🎂 Tenemos una promoción especial para ti por tu día, ¡escríbenos para agendarla! 💆‍♀️✨');
    const router = useRouter();
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
        fetch(`${API_URL}/dashboard/stats`, { headers })
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

        // Fetch Configuration for Birthday Message
        fetch(`${API_URL}/configuration`, { headers })
            .then(res => res.json())
            .then(config => {
                if (config && config.birthdayMessage) {
                    setBirthdayMessageTpl(config.birthdayMessage);
                }
            })
            .catch(err => console.error('Error fetching config for birthday msg:', err));

        // Fetch Today's Appointments
        fetch(`${API_URL}/dashboard/appointments`, { headers })
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch appointments');
                return res.json();
            })
            .then(data => setAppointments(data))
            .catch(err => console.error('Error fetching appointments:', err));

        // Fetch Clients for Birthdays
        fetch(`${API_URL}/clients`, { headers })
            .then(res => res.json())
            .then(clients => {
                if (Array.isArray(clients)) {
                    const today = new Date();
                    const nextWeek = new Date();
                    nextWeek.setDate(today.getDate() + 7);

                    const upcoming = clients.filter(c => {
                        if (!c.birthday) return false;
                        const bday = new Date(c.birthday);
                        // Normalize to current year for comparison
                        bday.setFullYear(today.getFullYear());

                        // If birthday already passed this year, check next year
                        if (bday < new Date(today.setHours(0, 0, 0, 0))) {
                            bday.setFullYear(today.getFullYear() + 1);
                        }

                        // Check if birthday is within the next 7 days
                        return bday >= new Date(new Date().setHours(0, 0, 0, 0)) && bday <= nextWeek;
                    }).sort((a, b) => {
                        const todaySet = new Date();

                        const dateA = new Date(a.birthday as string);
                        dateA.setFullYear(todaySet.getFullYear());
                        if (dateA < new Date(todaySet.setHours(0, 0, 0, 0))) dateA.setFullYear(todaySet.getFullYear() + 1);

                        // we must reset todaySet for B as setHours mutates the object
                        const todaySetB = new Date();
                        const dateB = new Date(b.birthday as string);
                        dateB.setFullYear(todaySetB.getFullYear());
                        if (dateB < new Date(todaySetB.setHours(0, 0, 0, 0))) dateB.setFullYear(todaySetB.getFullYear() + 1);

                        return dateA.getTime() - dateB.getTime();
                    });

                    setUpcomingBirthdays(upcoming);
                }
            })
            .catch(err => console.error('Error fetching clients for birthdays:', err));

    }, []);

    // We don't block anymore. If role is null, we just render.
    // Layout handles auth protection.

    const isAdmin = role === 'ADMIN';

    return (
        <PageContainer>
            <h1 className="text-3xl font-serif font-bold mb-8">Dashboard</h1>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Hoy */}
                <div className="bg-card border rounded-lg p-6 shadow-sm">
                    <p className="text-sm text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Ingresos Hoy</p>
                    <p className="text-3xl font-bold text-green-600">S/. {stats.salesToday.toLocaleString()}</p>
                </div>
                <div className="bg-card border rounded-lg p-6 shadow-sm">
                    <p className="text-sm text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Gastos Hoy</p>
                    <p className="text-3xl font-bold text-red-600">S/. {stats.expensesToday.toLocaleString()}</p>
                </div>
                <div className="bg-card border rounded-lg p-6 shadow-sm">
                    <p className="text-sm text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Citas Hoy</p>
                    <p className="text-3xl font-bold">{stats.appointmentsToday}</p>
                </div>
                <div className="bg-card border rounded-lg p-6 shadow-sm">
                    <p className="text-sm text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Total Clientes</p>
                    <p className="text-3xl font-bold">{stats.totalClients}</p>
                </div>

                {/* Mes */}
                <div className="bg-card border rounded-lg p-6 shadow-sm">
                    <p className="text-sm text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Ingresos Mes</p>
                    <p className="text-3xl font-bold text-green-700">S/. {stats.salesMonth.toLocaleString()}</p>
                </div>
                <div className="bg-card border rounded-lg p-6 shadow-sm">
                    <p className="text-sm text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Gastos Mes</p>
                    <p className="text-3xl font-bold text-red-700">S/. {stats.expensesMonth.toLocaleString()}</p>
                </div>
                <div className="bg-card border rounded-lg p-6 shadow-sm sm:col-span-2 lg:col-span-2 flex flex-col justify-center">
                    <p className="text-sm text-primary mb-1 uppercase tracking-wider font-bold">Utilidad Neta Mensual</p>
                    <p className={`text-4xl font-black ${stats.salesMonth - stats.expensesMonth >= 0 ? 'text-primary' : 'text-red-600'}`}>
                        S/. {(stats.salesMonth - stats.expensesMonth).toLocaleString()}
                    </p>
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

            {/* Upcoming Birthdays Section */}
            {upcomingBirthdays.length > 0 && (
                <div className="bg-card border border-pink-200 dark:border-pink-900/30 rounded-lg p-6 mb-8">
                    <div className="flex items-center gap-2 mb-4">
                        <Gift className="h-6 w-6 text-pink-500" />
                        <h2 className="text-xl font-bold text-pink-600 dark:text-pink-400">Próximos Cumpleaños (7 días)</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {upcomingBirthdays.map((client) => {
                            const bday = new Date(client.birthday);
                            const currentYear = new Date().getFullYear();
                            bday.setFullYear(currentYear);
                            if (bday < new Date(new Date().setHours(0, 0, 0, 0))) bday.setFullYear(currentYear + 1);

                            const isToday = bday.toDateString() === new Date().toDateString();
                            const formattedDate = bday.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });

                            const whatsappMsg = birthdayMessageTpl.replace('{name}', client.name);
                            const whatsappUrl = `https://wa.me/${client.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMsg)}`;

                            return (
                                <div key={client.id} className={`p-4 rounded-lg flex flex-col justify-between border ${isToday ? 'bg-pink-50 border-pink-200 dark:bg-pink-900/20 dark:border-pink-800/50' : 'bg-background'}`}>
                                    <div>
                                        <p className="font-bold text-lg">{client.name}</p>
                                        <p className="text-sm text-muted-foreground">{formattedDate} {isToday && <span className="text-pink-600 font-bold ml-1">¡Es Hoy!</span>}</p>
                                    </div>
                                    <div className="mt-4 flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">{client.phone || 'Sin número'}</span>
                                        {client.phone && (
                                            <a
                                                href={whatsappUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-full transition shadow-sm flex items-center gap-1 text-xs"
                                                title="Enviar felicitación por WhatsApp"
                                            >
                                                <MessageCircle className="h-4 w-4" />
                                                Felicitar
                                            </a>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

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
