'use client';

import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Save, Calendar, Users, CheckCircle2 } from 'lucide-react';
import ExpenseDialog from '../../../components/expenses/ExpenseDialog';
import { PageContainer } from '@/components/layout/PageContainer';

export default function DailyClosingPage() {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [attentions, setAttentions] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
    const [selectedTherapist, setSelectedTherapist] = useState<any>(null);

    useEffect(() => {
        fetchDailyData();
    }, [selectedDate]);

    const fetchDailyData = async () => {
        setLoading(true);
        try {
            const [attentionsRes, expensesRes] = await Promise.all([
                fetch(`${API_URL}/attentions`),
                fetch(`${API_URL}/expenses`)
            ]);

            const attentionsData = await attentionsRes.json();
            const expensesData = await expensesRes.json();

            const dateStr = new Date(selectedDate).toISOString().split('T')[0];

            const filteredAttentions = (Array.isArray(attentionsData) ? attentionsData : []).filter((att: any) => {
                const attDate = new Date(att.date).toISOString().split('T')[0];
                return attDate === dateStr;
            });

            const filteredExpenses = (Array.isArray(expensesData) ? expensesData : []).filter((exp: any) => {
                const expDate = new Date(exp.date).toISOString().split('T')[0];
                return expDate === dateStr;
            });

            setAttentions(filteredAttentions);
            setExpenses(filteredExpenses);
        } catch (error) {
            console.error('Error fetching daily data:', error);
            setAttentions([]);
            setExpenses([]);
        } finally {
            setLoading(false);
        }
    };

    const totalIncome = attentions.reduce((sum, att) => sum + Number(att.totalCost || 0), 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
    const netProfit = totalIncome - totalExpenses;
    const totalClients = new Set(attentions.map(att => att.clientId)).size;

    // Calculate therapist commissions with payment status
    const therapistPayments = attentions.reduce((acc: any, att) => {
        if (att.workers && Array.isArray(att.workers)) {
            att.workers.forEach((w: any) => {
                const workerId = w.workerId;
                const workerName = w.worker?.name || 'Unknown';
                const workerPhone = w.worker?.phoneNumber;
                const commission = Number(w.commissionAmount || 0);
                const isPaid = w.isPaid || false;

                if (!acc[workerId]) {
                    acc[workerId] = {
                        id: workerId,
                        name: workerName,
                        phoneNumber: workerPhone,
                        totalCommission: 0,
                        attentionCount: 0,
                        allPaid: true,
                        workerRecords: []
                    };
                }

                acc[workerId].totalCommission += commission;
                acc[workerId].attentionCount += 1;
                acc[workerId].workerRecords.push(w);
                if (!isPaid) {
                    acc[workerId].allPaid = false;
                }
            });
        }
        return acc;
    }, {});

    const therapistList = Object.values(therapistPayments);

    const handleRegisterPayment = (therapist: any) => {
        setSelectedTherapist(therapist);
        setIsExpenseDialogOpen(true);
    };

    const handlePaymentSaved = async () => {
        // Mark all worker records as paid
        if (selectedTherapist) {
            try {
                const updatePromises = selectedTherapist.workerRecords.map((record: any) =>
                    fetch(`${API_URL}/attention-workers/${record.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            isPaid: true,
                            paidAt: new Date().toISOString()
                        })
                    })
                );

                await Promise.all(updatePromises);
                fetchDailyData();
                setSelectedTherapist(null);
            } catch (error) {
                console.error('Error marking commissions as paid:', error);
                alert('Error al marcar las comisiones como pagadas');
            }
        }
    };

    return (
        <PageContainer>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-3xl font-serif font-bold">Cierre Diario</h1>
                <div className="w-full sm:w-auto flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="flex-1 sm:flex-none p-2 border rounded-md bg-background w-full"
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-muted-foreground">Cargando...</div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-card border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-muted-foreground">Ingresos Totales</span>
                                <TrendingUp className="h-4 w-4 text-green-600" />
                            </div>
                            <p className="text-2xl font-bold text-green-600">S/ {totalIncome.toFixed(2)}</p>
                        </div>

                        <div className="bg-card border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-muted-foreground">Gastos Totales</span>
                                <TrendingDown className="h-4 w-4 text-red-600" />
                            </div>
                            <p className="text-2xl font-bold text-red-600">S/ {totalExpenses.toFixed(2)}</p>
                        </div>

                        <div className="bg-card border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-muted-foreground">Ganancia Neta</span>
                                <DollarSign className="h-4 w-4" />
                            </div>
                            <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                S/ {netProfit.toFixed(2)}
                            </p>
                        </div>

                        <div className="bg-card border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-muted-foreground">Clientes Atendidos</span>
                                <Users className="h-4 w-4 text-primary" />
                            </div>
                            <p className="text-2xl font-bold">{totalClients}</p>
                        </div>
                    </div>

                    {/* Therapist Payments */}
                    <div className="bg-card border rounded-lg p-6 mb-6">
                        <h2 className="text-xl font-bold mb-4">Pagos a Terapeutas</h2>
                        {therapistList.length === 0 ? (
                            <p className="text-muted-foreground text-center py-4">No hay pagos pendientes para esta fecha.</p>
                        ) : (
                            <div className="overflow-hidden rounded-lg border">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm min-w-[600px]">
                                        <thead className="bg-muted/50 border-b">
                                            <tr>
                                                <th className="p-4 text-left font-medium">Terapeuta</th>
                                                <th className="p-4 text-center font-medium">Atenciones</th>
                                                <th className="p-4 text-right font-medium">Comisión Total</th>
                                                <th className="p-4 text-center font-medium">Estado</th>
                                                <th className="p-4 text-center font-medium">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {therapistList.map((therapist: any) => (
                                                <tr key={therapist.id} className="border-b hover:bg-muted/50 transition">
                                                    <td className="p-4 font-medium">
                                                        <div>{therapist.name}</div>
                                                        {therapist.phoneNumber && (
                                                            <div className="text-xs text-muted-foreground">{therapist.phoneNumber}</div>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-center">{therapist.attentionCount}</td>
                                                    <td className="p-4 text-right font-mono text-green-600 font-bold">
                                                        S/ {therapist.totalCommission.toFixed(2)}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        {therapist.allPaid ? (
                                                            <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                                                                <CheckCircle2 className="h-3 w-3" />
                                                                Pagado
                                                            </span>
                                                        ) : (
                                                            <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-medium">
                                                                Pendiente
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        {!therapist.allPaid && (
                                                            <div className="flex gap-2 justify-center">
                                                                {therapist.phoneNumber && (
                                                                    <button
                                                                        onClick={() => {
                                                                            const phone = therapist.phoneNumber.replace(/\s/g, '');
                                                                            navigator.clipboard.writeText(phone);
                                                                            alert(`Número ${phone} copiado al portapapeles. Abre Yape para pagar.`);
                                                                            // Attempt to open deep link if on mobile (optional)
                                                                            // window.location.href = `yape://pay?phone=${phone}`; 
                                                                        }}
                                                                        className="bg-purple-600 text-white px-3 py-1 rounded-md text-xs hover:bg-purple-700 transition flex items-center gap-1"
                                                                        title={`Yape a: ${therapist.phoneNumber}`}
                                                                    >
                                                                        <DollarSign className="h-3 w-3" />
                                                                        Yape
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => handleRegisterPayment(therapist)}
                                                                    className="bg-primary text-primary-foreground px-3 py-1 rounded-md text-xs hover:opacity-90 transition"
                                                                >
                                                                    Registrar Pago
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-muted/30 border-t-2">
                                            <tr>
                                                <td className="p-4 font-bold">TOTAL A PAGAR</td>
                                                <td className="p-4 text-center font-bold">
                                                    {therapistList.reduce((sum: number, t: any) => sum + t.attentionCount, 0)}
                                                </td>
                                                <td className="p-4 text-right font-mono font-bold text-green-600 text-lg">
                                                    S/ {therapistList.reduce((sum: number, t: any) => sum + t.totalCommission, 0).toFixed(2)}
                                                </td>
                                                <td colSpan={2}></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                        )}
                            </div>

                    {/* Detailed Attentions */}
                        <div className="bg-card border rounded-lg p-6 mb-6">
                            <h2 className="text-xl font-bold mb-4">Detalle de Atenciones ({attentions.length})</h2>
                            {attentions.length === 0 ? (
                                <p className="text-muted-foreground text-center py-4">No hay atenciones registradas para esta fecha.</p>
                            ) : (
                                <div className="overflow-hidden rounded-lg border">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm min-w-[600px]">
                                            <thead className="bg-muted/50 border-b">
                                                <tr>
                                                    <th className="p-3 text-left font-medium">Cliente</th>
                                                    <th className="p-3 text-left font-medium">Servicio</th>
                                                    <th className="p-3 text-left font-medium">Personal</th>
                                                    <th className="p-3 text-right font-medium">Costo</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {attentions.map((att) => (
                                                    <tr key={att.id} className="border-b hover:bg-muted/50 transition">
                                                        <td className="p-3">{att.client?.name}</td>
                                                        <td className="p-3 text-muted-foreground">{att.service?.name}</td>
                                                        <td className="p-3">
                                                            <div className="flex flex-wrap gap-1">
                                                                {att.workers?.map((w: any) => (
                                                                    <span key={w.id} className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">
                                                                        {w.worker?.name}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        <td className="p-3 text-right font-mono">S/ {Number(att.totalCost).toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                        )}
                                </div>

                    {/* Detailed Expenses */}
                            <div className="bg-card border rounded-lg p-6">
                                <h2 className="text-xl font-bold mb-4">Detalle de Gastos ({expenses.length})</h2>
                                {expenses.length === 0 ? (
                                    <p className="text-muted-foreground text-center py-4">No hay gastos registrados para esta fecha.</p>
                                ) : (
                                    <div className="overflow-hidden rounded-lg border">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm min-w-[500px]">
                                                <thead className="bg-muted/50 border-b">
                                                    <tr>
                                                        <th className="p-3 text-left font-medium">Descripción</th>
                                                        <th className="p-3 text-left font-medium">Categoría</th>
                                                        <th className="p-3 text-right font-medium">Monto</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {expenses.map((exp) => (
                                                        <tr key={exp.id} className="border-b hover:bg-muted/50 transition">
                                                            <td className="p-3">{exp.description}</td>
                                                            <td className="p-3">
                                                                <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded text-xs">
                                                                    {exp.category}
                                                                </span>
                                                            </td>
                                                            <td className="p-3 text-right font-mono text-red-600">S/ {Number(exp.amount).toFixed(2)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                        )}
                                    </div>
                </>
            )}

                            {/* Expense Dialog with Pre-filled Data */}
                            {selectedTherapist && (
                                <ExpenseDialog
                                    isOpen={isExpenseDialogOpen}
                                    onClose={() => {
                                        setIsExpenseDialogOpen(false);
                                        setSelectedTherapist(null);
                                    }}
                                    onSave={handlePaymentSaved}
                                    expense={{
                                        description: `Pago de comisión - ${selectedTherapist.name}`,
                                        amount: selectedTherapist.totalCommission,
                                        category: 'Salarios',
                                        date: selectedDate
                                    }}
                                />
                            )}
                        </PageContainer>
                        );
}
