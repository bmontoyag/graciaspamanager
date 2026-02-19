'use client';

import { useState, useEffect } from 'react';
import { Calendar, TrendingUp, TrendingDown, Users, DollarSign, Filter, Download, BarChart3, PieChart as PieChartIcon, LineChart as LineChartIcon } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { useRouter } from 'next/navigation';



export default function ReportsPage() {
    const router = useRouter();
    const [attentions, setAttentions] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Filters
    const currentDate = new Date();
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth().toString());
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString());

    // Additional filters
    const [selectedTherapist, setSelectedTherapist] = useState('');
    const [selectedService, setSelectedService] = useState('');
    const [selectedClient, setSelectedClient] = useState('');

    // Filter options
    const [therapists, setTherapists] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);

    const [configColors, setConfigColors] = useState({
        primary: '#8B7355',
        sidebar: '#2C3E50',
        background: '#F5F1E8',
        chartPalette: [
            '#8B7355', '#2C3E50', '#EAB308', '#22C55E', '#EF4444', '#3B82F6', '#A855F7', '#EC4899'
        ]
    });

    useEffect(() => {
        fetchFilterOptions();
        fetchConfiguration();
    }, []);

    const fetchConfiguration = async () => {
        try {
            const res = await fetch('http://localhost:3001/configuration');
            if (res.ok) {
                const config = await res.json();
                const primary = config.primaryColor || '#8B7355';
                const sidebar = config.sidebarColor || '#2C3E50';

                setConfigColors({
                    primary,
                    sidebar,
                    background: config.backgroundColor || '#F5F1E8',
                    chartPalette: [
                        primary,
                        sidebar,
                        '#EAB308', // Yellow
                        '#22C55E', // Green
                        '#EF4444', // Red
                        '#3B82F6', // Blue
                        '#A855F7', // Purple
                        '#EC4899'  // Pink
                    ]
                });
            }
        } catch (error) {
            console.error('Error loading configuration:', error);
        }
    };

    useEffect(() => {
        fetchReportData();
    }, [selectedMonth, selectedYear, selectedTherapist, selectedService, selectedClient]);

    const fetchFilterOptions = async () => {
        try {
            const [therapistsRes, servicesRes, clientsRes] = await Promise.all([
                fetch('http://localhost:3001/users'),
                fetch('http://localhost:3001/services'),
                fetch('http://localhost:3001/clients')
            ]);

            setTherapists(await therapistsRes.json());
            setServices(await servicesRes.json());
            setClients(await clientsRes.json());
        } catch (error) {
            console.error('Error fetching filter options:', error);
        }
    };

    const fetchReportData = async () => {
        setLoading(true);
        try {
            const [attentionsRes, expensesRes] = await Promise.all([
                fetch('http://localhost:3001/attentions'),
                fetch('http://localhost:3001/expenses')
            ]);

            let attentionsData = await attentionsRes.json();
            let expensesData = await expensesRes.json();

            // Calculate date range based on month/year
            const year = parseInt(selectedYear);
            const month = parseInt(selectedMonth);
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0, 23, 59, 59);

            // Apply filters
            attentionsData = (Array.isArray(attentionsData) ? attentionsData : []).filter((att: any) => {
                const attDate = new Date(att.date);

                if (attDate < startDate || attDate > endDate) return false;
                if (selectedTherapist && !att.workers?.some((w: any) => w.workerId === Number(selectedTherapist))) return false;
                if (selectedService && att.serviceId !== Number(selectedService)) return false;
                if (selectedClient && att.clientId !== Number(selectedClient)) return false;

                return true;
            });

            expensesData = (Array.isArray(expensesData) ? expensesData : []).filter((exp: any) => {
                const expDate = new Date(exp.date);
                return expDate >= startDate && expDate <= endDate;
            });

            setAttentions(attentionsData);
            setExpenses(expensesData);
        } catch (error) {
            console.error('Error fetching report data:', error);
            setAttentions([]);
            setExpenses([]);
        } finally {
            setLoading(false);
        }
    };

    // Calculate metrics
    const totalIncome = attentions.reduce((sum, att) => sum + Number(att.totalCost || 0), 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
    const netProfit = totalIncome - totalExpenses;
    const totalClients = new Set(attentions.map(att => att.clientId)).size;
    const totalAttentions = attentions.length;

    // Therapist breakdown
    const therapistStats = attentions.reduce((acc: any, att) => {
        if (att.workers && Array.isArray(att.workers)) {
            att.workers.forEach((w: any) => {
                const workerId = w.workerId;
                const workerName = w.worker?.name || 'Unknown';
                const commission = Number(w.commissionAmount || 0);

                if (!acc[workerId]) {
                    acc[workerId] = {
                        id: workerId,
                        name: workerName,
                        totalCommission: 0,
                        attentionCount: 0,
                        totalRevenue: 0
                    };
                }

                acc[workerId].totalCommission += commission;
                acc[workerId].attentionCount += 1;
                acc[workerId].totalRevenue += Number(att.totalCost || 0);
            });
        }
        return acc;
    }, {});

    const therapistList = Object.values(therapistStats);
    const therapistChartData = therapistList.map((t: any) => ({
        name: t.name,
        ingresos: t.totalRevenue,
        atenciones: t.attentionCount
    }));

    // Service breakdown
    const serviceStats = attentions.reduce((acc: any, att) => {
        const serviceId = att.serviceId;
        const serviceName = att.service?.name || 'Unknown';

        if (!acc[serviceId]) {
            acc[serviceId] = {
                id: serviceId,
                name: serviceName,
                count: 0,
                revenue: 0
            };
        }

        acc[serviceId].count += 1;
        acc[serviceId].revenue += Number(att.totalCost || 0);

        return acc;
    }, {});

    const serviceList = Object.values(serviceStats).sort((a: any, b: any) => b.revenue - a.revenue);
    const serviceChartData = serviceList.slice(0, 5).map((s: any) => ({
        name: s.name,
        value: s.count,
        revenue: s.revenue
    }));

    // Daily Evolution
    const daysInMonth = new Date(parseInt(selectedYear), parseInt(selectedMonth) + 1, 0).getDate();
    const dailyStats = Array.from({ length: daysInMonth }, (_, i) => ({
        day: i + 1,
        atenciones: 0,
        ingresos: 0
    }));

    const categoryStats: Record<string, number> = {};
    const methodStats: Record<string, number> = {};

    attentions.forEach((att: any) => {
        const date = new Date(att.date);
        const day = date.getDate();
        if (day >= 1 && day <= daysInMonth) {
            dailyStats[day - 1].atenciones += 1;
            dailyStats[day - 1].ingresos += Number(att.totalCost || 0);
        }

        // Income by Method
        if (att.payments && Array.isArray(att.payments)) {
            att.payments.forEach((p: any) => {
                const method = p.method || 'OTROS';
                methodStats[method] = (methodStats[method] || 0) + Number(p.amount);
            });
        }
    });

    expenses.forEach((exp: any) => {
        const cat = exp.category || 'Sin Categoría';
        categoryStats[cat] = (categoryStats[cat] || 0) + Number(exp.amount || 0);
    });

    const dailyChartData = dailyStats;
    const expensesByCategory = Object.entries(categoryStats).map(([name, value]) => ({ name, value }));
    const incomeByMethod = Object.entries(methodStats).map(([name, value]) => ({ name, value }));

    return (
        <PageContainer>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h1 className="text-3xl font-serif font-bold">Resumen Mensual</h1>
                <button
                    onClick={() => router.push('/dashboard/reports/annual')}
                    className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md flex items-center gap-2 hover:opacity-90 transition-colors"
                >
                    <BarChart3 className="h-4 w-4" />
                    Ver Análisis Anual
                </button>
            </div>

            {/* Filters */}
            <div className="bg-card border rounded-lg p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <Filter className="h-5 w-5" />
                    <h2 className="text-lg font-bold">Filtros</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Mes</label>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="w-full p-2 border rounded-md bg-background"
                        >
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i} value={i}>
                                    {new Date(0, i).toLocaleString('es-ES', { month: 'long' })}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Año</label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="w-full p-2 border rounded-md bg-background"
                        >
                            {Array.from({ length: 5 }, (_, i) => {
                                const year = new Date().getFullYear() - 2 + i;
                                return <option key={year} value={year}>{year}</option>;
                            })}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Terapeuta</label>
                        <select
                            value={selectedTherapist}
                            onChange={(e) => setSelectedTherapist(e.target.value)}
                            className="w-full p-2 border rounded-md bg-background"
                        >
                            <option value="">Todos</option>
                            {therapists.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Servicio</label>
                        <select
                            value={selectedService}
                            onChange={(e) => setSelectedService(e.target.value)}
                            className="w-full p-2 border rounded-md bg-background"
                        >
                            <option value="">Todos</option>
                            {services.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Cliente</label>
                        <select
                            value={selectedClient}
                            onChange={(e) => setSelectedClient(e.target.value)}
                            className="w-full p-2 border rounded-md bg-background"
                        >
                            <option value="">Todos</option>
                            {clients.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-muted-foreground">Cargando reporte...</div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                        <div className="bg-card border rounded-lg p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-muted-foreground">Ingresos</span>
                                <TrendingUp className="h-4 w-4 text-green-600" />
                            </div>
                            <p className="text-2xl font-bold text-green-600">S/ {totalIncome.toFixed(2)}</p>
                        </div>

                        <div className="bg-card border rounded-lg p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-muted-foreground">Gastos</span>
                                <DollarSign className="h-4 w-4 text-red-600" />
                            </div>
                            <p className="text-2xl font-bold text-red-600">S/ {totalExpenses.toFixed(2)}</p>
                        </div>

                        <div className="bg-card border rounded-lg p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-muted-foreground">Ganancia</span>
                                <DollarSign className="h-4 w-4" />
                            </div>
                            <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                S/ {netProfit.toFixed(2)}
                            </p>
                        </div>

                        <div className="bg-card border rounded-lg p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-muted-foreground">Atenciones</span>
                                <Calendar className="h-4 w-4 text-primary" />
                            </div>
                            <p className="text-2xl font-bold">{totalAttentions}</p>
                        </div>

                        <div className="bg-card border rounded-lg p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-muted-foreground">Clientes Únicos</span>
                                <Users className="h-4 w-4 text-primary" />
                            </div>
                            <p className="text-2xl font-bold">{totalClients}</p>
                        </div>
                    </div>

                    {/* Charts Section */}
                    {/* 1. Evolution and Distribution */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        <div className="bg-card border rounded-lg p-6 shadow-sm">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <LineChartIcon className="h-5 w-5" /> Evolución Diaria
                            </h2>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={dailyChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="day" />
                                        <YAxis yAxisId="left" />
                                        <YAxis yAxisId="right" orientation="right" />
                                        <Tooltip />
                                        <Legend />
                                        <Line yAxisId="left" type="monotone" dataKey="atenciones" name="Atenciones" stroke={configColors.sidebar} activeDot={{ r: 8 }} />
                                        <Line yAxisId="right" type="monotone" dataKey="ingresos" name="Ingresos (S/)" stroke={configColors.primary} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-card border rounded-lg p-6 shadow-sm">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <Users className="h-5 w-5" /> Distribución por Terapeuta
                            </h2>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={therapistChartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" />
                                        <YAxis dataKey="name" type="category" width={100} />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="ingresos" name="Ingresos (S/)" fill={configColors.primary} radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* 2. Pies: Service, Payment, Expenses */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {/* Service Proportion */}
                        <div className="bg-card border rounded-lg p-6 shadow-sm">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <PieChartIcon className="h-4 w-4" /> Servicios
                            </h2>
                            <div className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={serviceChartData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            // label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {serviceChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={configColors.chartPalette[index % configColors.chartPalette.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Income by Payment Data */}
                        <div className="bg-card border rounded-lg p-6 shadow-sm">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <DollarSign className="h-4 w-4" /> Medios de Pago
                            </h2>
                            <div className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={incomeByMethod}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            // label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {incomeByMethod.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={configColors.chartPalette[index % configColors.chartPalette.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value: any) => `S/ ${Number(value).toFixed(2)}`} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Expenses by Category */}
                        <div className="bg-card border rounded-lg p-6 shadow-sm">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <TrendingDown className="h-4 w-4" /> Gastos
                            </h2>
                            {expensesByCategory.length > 0 ? (
                                <div className="h-[250px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={expensesByCategory}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                // label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                                outerRadius={80}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {expensesByCategory.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={configColors.chartPalette[index % configColors.chartPalette.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value: any) => `S/ ${Number(value).toFixed(2)}`} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                                    No hay gastos registrados.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Service Performance Table */}
                    <div className="bg-card border rounded-lg p-6 mb-6 shadow-sm">
                        <h2 className="text-xl font-bold mb-4">Detalle de Servicios</h2>
                        {serviceList.length === 0 ? (
                            <p className="text-muted-foreground text-center py-4">No hay datos disponibles.</p>
                        ) : (
                            <div className="overflow-hidden rounded-lg border">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50 border-b">
                                        <tr>
                                            <th className="p-4 text-left font-medium">Servicio</th>
                                            <th className="p-4 text-center font-medium">Cantidad</th>
                                            <th className="p-4 text-right font-medium">Ingresos Totales</th>
                                            <th className="p-4 text-right font-medium">% del Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {serviceList.map((service: any) => (
                                            <tr key={service.id} className="border-b hover:bg-muted/50 transition">
                                                <td className="p-4 font-medium">{service.name}</td>
                                                <td className="p-4 text-center">{service.count}</td>
                                                <td className="p-4 text-right font-mono">S/ {service.revenue.toFixed(2)}</td>
                                                <td className="p-4 text-right font-mono text-muted-foreground">
                                                    {totalIncome > 0 ? ((service.revenue / totalIncome) * 100).toFixed(1) : 0}%
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </PageContainer>
    );
}
