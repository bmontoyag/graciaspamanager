'use client';

import { useState, useEffect } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';

export default function AnnualReportPage() {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
    const [monthlyData, setMonthlyData] = useState<any[]>([]);

    // Totals
    const [totalIncome, setTotalIncome] = useState(0);
    const [totalExpenses, setTotalExpenses] = useState(0);
    const [netProfit, setNetProfit] = useState(0);

    // Charts Data
    const [expensesByCategory, setExpensesByCategory] = useState<any[]>([]);
    const [incomeByMethod, setIncomeByMethod] = useState<any[]>([]);

    const [configColors, setConfigColors] = useState({
        primary: '#8B7355',
        sidebar: '#2C3E50',
        background: '#F5F1E8',
        chartPalette: [
            '#8B7355', '#2C3E50', '#EAB308', '#22C55E', '#EF4444', '#3B82F6', '#A855F7', '#EC4899'
        ]
    });

    const checkAuth = () => {
        const userId = localStorage.getItem('userId');
        if (!userId) {
            router.push('/');
        }
    };

    useEffect(() => {
        // Hydration check
        checkAuth();
        fetchAnnualData();
        fetchConfiguration();
    }, [selectedYear]);

    const fetchConfiguration = async () => {
        try {
            const res = await fetch(`${API_URL}/configuration`);
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

    const fetchAnnualData = async () => {
        setLoading(true);
        try {
            const [attentionsRes, expensesRes] = await Promise.all([
                fetch(`${API_URL}/attentions`),
                fetch(`${API_URL}/expenses`)
            ]);

            const attentions: any[] = await attentionsRes.json();
            const expensesList: any[] = await expensesRes.json();

            // Initialize 12 months with 0
            const months = Array.from({ length: 12 }, (_, i) => ({
                month: new Date(0, i).toLocaleString('es-ES', { month: 'short' }),
                monthIndex: i,
                ingresos: 0,
                gastos: 0,
                ganancia: 0
            }));

            let yearIncome = 0;
            let yearExpenses = 0;

            const categoryStats: Record<string, number> = {};
            const methodStats: Record<string, number> = {};

            // Process Attentions (Income)
            if (Array.isArray(attentions)) {
                attentions.forEach((att: any) => {
                    const date = new Date(att.date);
                    if (date.getFullYear().toString() === selectedYear) {
                        const monthIndex = date.getMonth();
                        const amount = Number(att.totalCost || 0);
                        months[monthIndex].ingresos += amount;
                        yearIncome += amount;

                        // Payment Methods
                        if (att.payments && Array.isArray(att.payments)) {
                            att.payments.forEach((p: any) => {
                                const method = p.method || 'OTROS';
                                methodStats[method] = (methodStats[method] || 0) + Number(p.amount);
                            });
                        } else {
                            // Fallback if no specific payments (assume default or use total)
                            // For accuracy, strictly we should use payments, but if migration matches totalCost:
                            // methodStats['UNKNOWN'] = (methodStats['UNKNOWN'] || 0) + amount;
                        }
                    }
                });
            }

            // Process Expenses
            if (Array.isArray(expensesList)) {
                expensesList.forEach((exp: any) => {
                    const date = new Date(exp.date);
                    if (date.getFullYear().toString() === selectedYear) {
                        const monthIndex = date.getMonth();
                        const amount = Number(exp.amount || 0);
                        months[monthIndex].gastos += amount;
                        yearExpenses += amount;

                        // Category
                        const cat = exp.category || 'Sin Categoría';
                        categoryStats[cat] = (categoryStats[cat] || 0) + amount;
                    }
                });
            }

            // Calculate Profit per month
            months.forEach(m => {
                m.ganancia = m.ingresos - m.gastos;
            });

            setMonthlyData(months);
            setTotalIncome(yearIncome);
            setTotalExpenses(yearExpenses);
            setNetProfit(yearIncome - yearExpenses);

            // Set Chart Data
            setExpensesByCategory(Object.entries(categoryStats).map(([name, value]) => ({ name, value })));
            setIncomeByMethod(Object.entries(methodStats).map(([name, value]) => ({ name, value })));

        } catch (error) {
            console.error('Error fetching annual data:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageContainer>
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-accent rounded-full transition-colors"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <h1 className="text-3xl font-serif font-bold">Análisis Anual {selectedYear}</h1>
            </div>

            {/* Year Selector */}
            <div className="bg-card border rounded-lg p-6 mb-6">
                <div className="flex items-center gap-4">
                    <label className="font-medium">Seleccionar Año:</label>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="p-2 border rounded-md bg-background w-32"
                    >
                        {Array.from({ length: 5 }, (_, i) => {
                            const year = new Date().getFullYear() - 2 + i;
                            return <option key={year} value={year}>{year}</option>;
                        })}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-muted-foreground">Calculando análisis anual...</div>
            ) : (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-card border rounded-lg p-6 shadow-sm">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-muted-foreground font-medium">Ingresos Totales</span>
                                <TrendingUp className="h-5 w-5 text-green-600" />
                            </div>
                            <p className="text-3xl font-bold text-green-600">S/ {totalIncome.toFixed(2)}</p>
                        </div>

                        <div className="bg-card border rounded-lg p-6 shadow-sm">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-muted-foreground font-medium">Gastos Totales</span>
                                <TrendingDown className="h-5 w-5 text-red-600" />
                            </div>
                            <p className="text-3xl font-bold text-red-600">S/ {totalExpenses.toFixed(2)}</p>
                        </div>

                        <div className="bg-card border rounded-lg p-6 shadow-sm">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-muted-foreground font-medium">Ganancia Neta</span>
                                <DollarSign className="h-5 w-5 text-primary" />
                            </div>
                            <p className={`text-3xl font-bold ${netProfit >= 0 ? 'text-primary' : 'text-red-500'}`}>
                                S/ {netProfit.toFixed(2)}
                            </p>
                        </div>
                    </div>

                    {/* Main Chart */}
                    <div className="bg-card border rounded-lg p-6 mb-8 shadow-sm">
                        <h2 className="text-xl font-bold mb-6">Balance Mensual</h2>
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="ingresos" name="Ingresos" fill={configColors.primary} radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="gastos" name="Gastos" fill={configColors.chartPalette[4]} radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="ganancia" name="Ganancia" fill={configColors.sidebar} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Distribution Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {/* Income by Payment Method */}
                        <div className="bg-card border rounded-lg p-6 shadow-sm">
                            <h2 className="text-xl font-bold mb-6">Ingresos por Medio de Pago</h2>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={incomeByMethod}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                            outerRadius={100}
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
                            <h2 className="text-xl font-bold mb-6">Gastos por Categoría</h2>
                            {expensesByCategory.length > 0 ? (
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={expensesByCategory}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                                outerRadius={100}
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
                                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                                    No hay gastos registrados.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Monthly Details Table */}
                    <div className="bg-card border rounded-lg p-6 shadow-sm">
                        <h2 className="text-xl font-bold mb-4">Detalle Mensual</h2>
                        <div className="overflow-hidden rounded-lg border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 border-b">
                                    <tr>
                                        <th className="p-4 text-left font-medium">Mes</th>
                                        <th className="p-4 text-right font-medium">Ingresos</th>
                                        <th className="p-4 text-right font-medium">Gastos</th>
                                        <th className="p-4 text-right font-medium">Ganancia</th>
                                        <th className="p-4 text-right font-medium">Margen</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {monthlyData.map((data, index) => {
                                        const margin = data.ingresos > 0 ? ((data.ganancia / data.ingresos) * 100).toFixed(1) : '0.0';
                                        return (
                                            <tr key={index} className="border-b hover:bg-muted/50 transition">
                                                <td className="p-4 font-medium capitalize">{data.month}</td>
                                                <td className="p-4 text-right font-mono text-green-600">S/ {data.ingresos.toFixed(2)}</td>
                                                <td className="p-4 text-right font-mono text-red-600">S/ {data.gastos.toFixed(2)}</td>
                                                <td className="p-4 text-right font-mono font-bold">S/ {data.ganancia.toFixed(2)}</td>
                                                <td className="p-4 text-right font-mono text-muted-foreground">{margin}%</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </PageContainer>
    );
}
