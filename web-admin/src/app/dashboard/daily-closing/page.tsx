'use client';

import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Save, Calendar, Users, CheckCircle2, AlertTriangle } from 'lucide-react';
import ExpenseDialog from '../../../components/expenses/ExpenseDialog';
import { PageContainer } from '@/components/layout/PageContainer';

export default function DailyClosingPage() {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    // Obtener la fecha local correctamente sin importar la hora UTC
    const getLocalToday = () => {
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().split('T')[0];
    };

    const [selectedDate, setSelectedDate] = useState(getLocalToday());
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

            const dateStr = selectedDate;

            const safeGetDate = (isoString: string) => {
                if (!isoString) return '';
                // Si viene como Date puro o viene como ISO de medianoche
                if (isoString.includes('T00:00:00.000Z') || isoString.length === 10) {
                    return isoString.split('T')[0];
                }
                // Si la fecha fue grabada con hora real local del servidor/navegador,
                // la parseamos y devolvemos YYYY-MM-DD
                const d = new Date(isoString);
                const localD = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
                return localD.toISOString().split('T')[0];
            };

            const filteredAttentions = (Array.isArray(attentionsData) ? attentionsData : []).filter((att: any) => {
                return safeGetDate(att.date) === dateStr;
            });

            const filteredExpenses = (Array.isArray(expensesData) ? expensesData : []).filter((exp: any) => {
                return safeGetDate(exp.date) === dateStr;
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

    // Helper functions for date formatting
    const formatDateObj = (dateString: string) => {
        const d = new Date(dateString);
        // Add offset to display correct local date from UTC
        d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
        return d;
    };

    const getFormattedDateText = (dateString: string) => {
        const date = formatDateObj(dateString);
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

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
                        paymentStatus: 'PENDING',
                        workerRecords: [],
                        paidExpenseInfo: null // Store expense data if we find a matching payment
                    };
                }

                acc[workerId].totalCommission += commission;
                acc[workerId].attentionCount += 1;
                acc[workerId].workerRecords.push(w);
            });
        }
        return acc;
    }, {});

    // Second pass: Cross-reference with Expenses to auto-detect if already paid
    expenses.forEach((exp: any) => {
        if (exp.workerId && therapistPayments[exp.workerId]) {
            const therapist = therapistPayments[exp.workerId];
            const expenseAmount = Number(exp.amount || 0);

            therapist.paidExpenseInfo = exp;

            // Validate amount
            if (Math.abs(expenseAmount - therapist.totalCommission) <= 1) {
                therapist.paymentStatus = 'PAID';
            } else {
                therapist.paymentStatus = 'OBSERVED';
            }
        }
    });

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
                                                        {therapist.paymentStatus === 'PAID' ? (
                                                            <div className="flex flex-col items-center gap-1">
                                                                <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                                                                    <CheckCircle2 className="h-3 w-3" />
                                                                    Pagado
                                                                </span>
                                                                {therapist.paidExpenseInfo && (
                                                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                                        (S/{Number(therapist.paidExpenseInfo.amount).toFixed(2)})
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : therapist.paymentStatus === 'OBSERVED' ? (
                                                            <div className="flex flex-col items-center gap-1">
                                                                <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-medium">
                                                                    <AlertTriangle className="h-3 w-3" />
                                                                    Observado
                                                                </span>
                                                                {therapist.paidExpenseInfo && (
                                                                    <span className="text-[10px] text-orange-600 font-medium whitespace-nowrap">
                                                                        (Pagado: S/{Number(therapist.paidExpenseInfo.amount).toFixed(2)})
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-medium">
                                                                Pendiente
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        {therapist.paymentStatus !== 'PENDING' ? (
                                                            <div className="flex gap-2 justify-center">
                                                                {therapist.paidExpenseInfo && (
                                                                    <button
                                                                        onClick={() => {
                                                                            // Pass the existing expense so ExpenseDialog mounts in PATCH/Edit mode
                                                                            setSelectedTherapist({ ...therapist });
                                                                            setIsExpenseDialogOpen(true);
                                                                        }}
                                                                        className="bg-accent text-accent-foreground px-3 py-1 rounded-md text-xs hover:opacity-90 transition"
                                                                        title="Editar este pago (Gasto)"
                                                                    >
                                                                        Editar Pago
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="flex gap-2 justify-center">
                                                                {therapist.phoneNumber && (
                                                                    <button
                                                                        onClick={() => {
                                                                            const phone = therapist.phoneNumber.replace(/\s/g, '');
                                                                            const amount = therapist.totalCommission.toFixed(2);
                                                                            // Copiar el teléfono al portapapeles para pegarlo rápidamente en Yape
                                                                            navigator.clipboard.writeText(phone);
                                                                            alert(`📱 Teléfono ${phone} copiado al portapapeles.\n💰 Monto exacto a pagar: S/ ${amount}\n\nAbriendo Yape...`);
                                                                            // Intentar abrir el app de Yape de forma nativa
                                                                            window.location.href = 'yape://';
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
                                                <th className="p-3 text-left font-medium">Asignado a</th>
                                                <th className="p-3 text-right font-medium">Monto</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {expenses.map((exp) => (
                                                <tr key={exp.id} className="border-b hover:bg-muted/50 transition">
                                                    <td className="p-3 font-medium">{exp.description}</td>
                                                    <td className="p-3">
                                                        <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded text-xs">
                                                            {exp.category}
                                                        </span>
                                                    </td>
                                                    <td className="p-3">
                                                        {exp.worker ? (
                                                            <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs truncate max-w-[150px] inline-block">
                                                                {exp.worker.name}
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted-foreground text-xs italic">Negocio</span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-right font-mono text-red-600">S/ {Number(exp.amount).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
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
                    expense={selectedTherapist.paidExpenseInfo ? {
                        ...selectedTherapist.paidExpenseInfo,
                        // Always keep the workerId synced in case they edit the expense
                        workerId: selectedTherapist.id
                    } : {
                        description: `Pago atenciones del día ${getFormattedDateText(selectedDate)} - ${selectedTherapist.name}`,
                        amount: selectedTherapist.totalCommission,
                        category: 'Salarios',
                        date: selectedDate,
                        workerId: selectedTherapist.id
                    }}
                />
            )}
        </PageContainer>
    );
}
