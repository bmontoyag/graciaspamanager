'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, CheckCircle, Undo2, UserPlus, Save } from 'lucide-react';
import { toast } from 'sonner';
import { PageContainer } from '@/components/layout/PageContainer';
import { apiFetch } from '@/lib/api';
import {
    DAY_STATUS, EVENT_STATUS, PAYMENT_METHODS, PAYMENT_TYPES,
    formatDay, formatMoney, getLocalToday,
} from '@/lib/corporate';
import { confirmDialog } from '@/components/ui/confirm-dialog';

const inputClass = 'p-2 border rounded-md bg-card text-sm';

function SummaryCard({ label, value, className = '', hint }: { label: string; value: string; className?: string; hint?: string }) {
    return (
        <div className="bg-card border rounded-lg p-4 shadow-sm">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">{label}</p>
            <p className={`text-xl font-bold font-mono ${className}`}>{value}</p>
            {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
        </div>
    );
}

function DayCard({ day, users, defaultRate, onChange, run }: {
    day: any; users: any[]; defaultRate: number; onChange: (event: any) => void; run: (fn: () => Promise<void>) => void;
}) {
    // El componente se vuelve a montar cuando cambia la jornada (ver key en el padre)
    const [sessionsCount, setSessionsCount] = useState(day.sessionsCount?.toString() ?? '');
    const [workerId, setWorkerId] = useState('');
    const [payAmount, setPayAmount] = useState(defaultRate.toString());
    const [amounts, setAmounts] = useState<Record<number, string>>(
        () => Object.fromEntries(day.workers.map((w: any) => [w.id, Number(w.payAmount).toString()]))
    );

    const assignedIds = new Set(day.workers.map((w: any) => w.workerId));
    const available = users.filter(u => u.isActive !== false && !assignedIds.has(u.id));

    const updateDay = (data: any, message?: string) => run(async () => {
        onChange(await apiFetch(`/corporate/event-days/${day.id}`, { method: 'PATCH', body: JSON.stringify(data) }));
        if (message) toast.success(message);
    });

    const assign = () => {
        if (!workerId) return;
        run(async () => {
            const result = await apiFetch(`/corporate/event-days/${day.id}/workers`, {
                method: 'POST',
                body: JSON.stringify({ workerId: parseInt(workerId), payAmount: parseFloat(payAmount) || 0 }),
            });
            onChange(result.event);
            setWorkerId('');
            if (result.warnings?.length) {
                toast.warning(`Terapeuta asignada con advertencias: ${result.warnings.join(' ')}`, { duration: 10000 });
            } else {
                toast.success('Terapeuta asignada');
            }
        });
    };

    const workerAction = (path: string, method: string, body?: any, message?: string) => run(async () => {
        onChange(await apiFetch(`/corporate/event-workers/${path}`, { method, body: body ? JSON.stringify(body) : undefined }));
        if (message) toast.success(message);
    });

    const removeDay = async () => {
        if (!await confirmDialog('¿Eliminar esta jornada?')) return;
        run(async () => {
            onChange(await apiFetch(`/corporate/event-days/${day.id}`, { method: 'DELETE' }));
            toast.success('Jornada eliminada');
        });
    };

    const status = DAY_STATUS[day.status];
    const dayTotal = day.workers.reduce((sum: number, w: any) => sum + Number(w.payAmount), 0);

    return (
        <div className="bg-card border rounded-lg shadow-sm">
            <div className="p-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold first-letter:uppercase">{formatDay(day.date, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${status.className}`}>{status.label}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{day.startTime} - {day.endTime} · {day.workers.length} terapeutas · {formatMoney(dayTotal)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <select value={day.status} onChange={e => updateDay({ status: e.target.value }, 'Estado de jornada actualizado')} className={inputClass}>
                        {Object.entries(DAY_STATUS).map(([key, s]) => <option key={key} value={key}>{s.label}</option>)}
                    </select>
                    <input
                        type="number"
                        min="0"
                        placeholder="Sesiones"
                        title="Sesiones atendidas"
                        value={sessionsCount}
                        onChange={e => setSessionsCount(e.target.value)}
                        className={`${inputClass} w-24`}
                    />
                    <button
                        onClick={() => updateDay({ sessionsCount: parseInt(sessionsCount) || 0 }, 'Sesiones registradas')}
                        title="Guardar sesiones atendidas"
                        className="p-2 border rounded-md hover:bg-muted"
                    >
                        <Save className="h-4 w-4" />
                    </button>
                    <button onClick={removeDay} title="Eliminar jornada" className="p-2 border rounded-md hover:bg-muted text-red-600">
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[560px]">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="p-3 text-left font-medium">Terapeuta</th>
                            <th className="p-3 text-left font-medium">Pago jornada</th>
                            <th className="p-3 text-left font-medium">Estado</th>
                            <th className="p-3 text-right font-medium">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {day.workers.length === 0 && (
                            <tr><td colSpan={4} className="p-3 text-center text-muted-foreground">Sin terapeutas asignadas.</td></tr>
                        )}
                        {day.workers.map((w: any) => (
                            <tr key={w.id} className="border-t">
                                <td className="p-3 font-medium">{w.worker?.name}</td>
                                <td className="p-3">
                                    {w.isPaid ? (
                                        <span className="font-mono">{formatMoney(w.payAmount)}</span>
                                    ) : (
                                        <div className="flex gap-1 items-center">
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={amounts[w.id] ?? ''}
                                                onChange={e => setAmounts(prev => ({ ...prev, [w.id]: e.target.value }))}
                                                className={`${inputClass} w-28`}
                                            />
                                            {Number(amounts[w.id]) !== Number(w.payAmount) && (
                                                <button
                                                    onClick={() => workerAction(`${w.id}`, 'PATCH', { payAmount: parseFloat(amounts[w.id]) || 0 }, 'Monto actualizado')}
                                                    className="p-2 hover:bg-accent rounded"
                                                    title="Guardar monto"
                                                >
                                                    <Save className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </td>
                                <td className="p-3">
                                    {w.isPaid ? (
                                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Pagado</span>
                                    ) : (
                                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">Pendiente</span>
                                    )}
                                </td>
                                <td className="p-3">
                                    <div className="flex justify-end gap-1">
                                        {w.isPaid ? (
                                            <button
                                                onClick={async () => (await confirmDialog({ title: '¿Revertir el pago?', description: 'Se eliminará el gasto asociado a este pago.' })) && workerAction(`${w.id}/unpay`, 'POST', undefined, 'Pago revertido')}
                                                className="px-2 py-1 border rounded text-xs flex items-center gap-1 hover:bg-muted"
                                            >
                                                <Undo2 className="h-3 w-3" /> Revertir
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => workerAction(`${w.id}/pay`, 'POST', {}, 'Pago registrado en Gastos')}
                                                    className="px-2 py-1 rounded text-xs flex items-center gap-1 bg-green-600 text-white hover:opacity-90"
                                                >
                                                    <CheckCircle className="h-3 w-3" /> Pagar
                                                </button>
                                                <button onClick={() => workerAction(`${w.id}`, 'DELETE', undefined, 'Terapeuta retirada')} className="p-1 hover:bg-accent rounded text-red-600" aria-label="Eliminar">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="p-3 border-t flex flex-col sm:flex-row gap-2">
                <select value={workerId} onChange={e => setWorkerId(e.target.value)} className={`${inputClass} flex-1`}>
                    <option value="">Asignar terapeuta...</option>
                    {available.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    placeholder="Pago S/"
                    className={`${inputClass} sm:w-32`}
                />
                <button onClick={assign} disabled={!workerId} className="px-3 py-2 rounded-md text-sm flex items-center justify-center gap-1 bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
                    <UserPlus className="h-4 w-4" /> Asignar
                </button>
            </div>
        </div>
    );
}

export default function EventDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [event, setEvent] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [editForm, setEditForm] = useState({ title: '', location: '', agreedAmount: '', notes: '' });
    const [newDay, setNewDay] = useState({ date: '', startTime: '09:00', endTime: '13:00' });
    const [payment, setPayment] = useState({ amount: '', date: getLocalToday(), method: 'TRANSFER', type: 'ADVANCE', notes: '' });
    const [expense, setExpense] = useState({ description: '', amount: '', date: getLocalToday(), category: 'Otros' });

    const applyEvent = (data: any) => {
        setEvent(data);
        setEditForm({
            title: data.title,
            location: data.location || '',
            agreedAmount: Number(data.agreedAmount).toString(),
            notes: data.notes || '',
        });
    };

    useEffect(() => {
        Promise.all([apiFetch(`/corporate/events/${id}`), apiFetch('/users')])
            .then(([eventData, usersData]) => {
                applyEvent(eventData);
                setUsers(Array.isArray(usersData) ? usersData : []);
            })
            .catch(error => toast.error(error.message))
            .finally(() => setLoading(false));
    }, [id]);

    const run = async (action: () => Promise<void>) => {
        setBusy(true);
        try {
            await action();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setBusy(false);
        }
    };

    const updateEvent = (data: any, message: string) => run(async () => {
        applyEvent(await apiFetch(`/corporate/events/${id}`, { method: 'PATCH', body: JSON.stringify(data) }));
        toast.success(message);
    });

    const deleteEvent = async () => {
        if (!await confirmDialog({ title: '¿Eliminar el evento?', description: 'La cotización volverá a estado Aceptada.' })) return;
        run(async () => {
            await apiFetch(`/corporate/events/${id}`, { method: 'DELETE' });
            toast.success('Evento eliminado');
            router.push('/dashboard/corporate');
        });
    };

    const addDay = (e: React.FormEvent) => {
        e.preventDefault();
        run(async () => {
            applyEvent(await apiFetch(`/corporate/events/${id}/days`, { method: 'POST', body: JSON.stringify(newDay) }));
            setNewDay({ ...newDay, date: '' });
            toast.success('Jornada agregada');
        });
    };

    const addPayment = (e: React.FormEvent) => {
        e.preventDefault();
        run(async () => {
            applyEvent(await apiFetch(`/corporate/events/${id}/payments`, {
                method: 'POST',
                body: JSON.stringify({ ...payment, amount: parseFloat(payment.amount), notes: payment.notes || undefined }),
            }));
            setPayment({ ...payment, amount: '', notes: '' });
            toast.success('Cobro registrado');
        });
    };

    const addExpense = (e: React.FormEvent) => {
        e.preventDefault();
        run(async () => {
            applyEvent(await apiFetch(`/corporate/events/${id}/expenses`, {
                method: 'POST',
                body: JSON.stringify({ ...expense, amount: parseFloat(expense.amount) }),
            }));
            setExpense({ ...expense, description: '', amount: '' });
            toast.success('Gasto registrado');
        });
    };

    const removeItem = async (path: string, message: string) => {
        if (!await confirmDialog('¿Eliminar este registro?')) return;
        run(async () => {
            applyEvent(await apiFetch(path, { method: 'DELETE' }));
            toast.success(message);
        });
    };

    if (loading) return <PageContainer><p className="text-muted-foreground">Cargando...</p></PageContainer>;
    if (!event) return <PageContainer><p className="text-muted-foreground">Evento no encontrado.</p></PageContainer>;

    const { summary } = event;
    const workerExpenseIds = new Set(event.days.flatMap((d: any) => d.workers.map((w: any) => w.expenseId)).filter(Boolean));
    const otherExpenses = event.expenses.filter((e: any) => !workerExpenseIds.has(e.id));
    const defaultRate = Number(event.quote?.therapistDayRate || 0);

    return (
        <PageContainer>
            <Link href="/dashboard/corporate" className="text-sm text-muted-foreground flex items-center gap-1 mb-2 hover:underline">
                <ArrowLeft className="h-4 w-4" /> Corporativo
            </Link>

            <div className="flex flex-col lg:flex-row justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-serif font-bold">{event.title}</h1>
                    <p className="text-muted-foreground">
                        {event.company?.name}
                        {event.location && ` · ${event.location}`}
                        {event.quote && (
                            <> · <Link href={`/dashboard/corporate/quotes/${event.quote.id}`} className="font-mono hover:underline">{event.quote.code}</Link></>
                        )}
                    </p>
                </div>
                <div className="flex gap-2 items-start">
                    <select
                        value={event.status}
                        disabled={busy}
                        onChange={e => updateEvent({ status: e.target.value }, 'Estado actualizado')}
                        className={`${inputClass} font-medium`}
                    >
                        {Object.entries(EVENT_STATUS).map(([key, s]) => <option key={key} value={key}>{s.label}</option>)}
                    </select>
                    <button onClick={deleteEvent} disabled={busy} className="p-2 border rounded-md hover:bg-muted text-red-600" title="Eliminar evento">
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <SummaryCard label="Monto acordado" value={formatMoney(summary.agreedAmount)} hint={event.quote?.includeIgv ? `Incluye IGV ${formatMoney(event.quote.igvAmount)}` : undefined} />
                <SummaryCard label="Cobrado" value={formatMoney(summary.totalPaid)} className="text-green-600" hint={`Saldo: ${formatMoney(summary.balance)}`} />
                <SummaryCard
                    label="Pago terapeutas"
                    value={formatMoney(summary.therapistCost)}
                    className="text-red-600"
                    hint={`Pagado ${formatMoney(summary.therapistPaid)} · Pendiente ${formatMoney(summary.therapistPending)}`}
                />
                <SummaryCard
                    label="Margen estimado"
                    value={formatMoney(summary.estimatedMargin)}
                    className={summary.estimatedMargin >= 0 ? 'text-primary' : 'text-red-600'}
                    hint={`Otros gastos ${formatMoney(summary.otherExpenses)} · ${summary.sessionsTotal} sesiones`}
                />
            </div>

            <section className="mb-8">
                <h2 className="text-xl font-bold mb-3">Jornadas</h2>
                <div className="space-y-4">
                    {event.days.map((day: any) => (
                        <DayCard
                            key={`${day.id}:${day.updatedAt}:${day.workers.map((w: any) => `${w.id}-${w.payAmount}-${w.isPaid}`).join(',')}`}
                            day={day} users={users} defaultRate={defaultRate} onChange={applyEvent} run={run} />
                    ))}
                </div>
                <form onSubmit={addDay} className="mt-3 flex flex-col sm:flex-row gap-2">
                    <input type="date" required value={newDay.date} onChange={e => setNewDay({ ...newDay, date: e.target.value })} className={inputClass} />
                    <input type="time" required value={newDay.startTime} onChange={e => setNewDay({ ...newDay, startTime: e.target.value })} className={inputClass} />
                    <input type="time" required value={newDay.endTime} onChange={e => setNewDay({ ...newDay, endTime: e.target.value })} className={inputClass} />
                    <button type="submit" disabled={busy} className="px-3 py-2 border rounded-md text-sm flex items-center justify-center gap-1 hover:bg-muted">
                        <Plus className="h-4 w-4" /> Agregar jornada
                    </button>
                </form>
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
                <section className="bg-card border rounded-lg shadow-sm">
                    <h2 className="text-lg font-bold p-4 border-b">Cobros a la empresa</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[480px]">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="p-3 text-left font-medium">Fecha</th>
                                    <th className="p-3 text-left font-medium">Tipo</th>
                                    <th className="p-3 text-left font-medium">Método</th>
                                    <th className="p-3 text-right font-medium">Monto</th>
                                    <th className="p-3" />
                                </tr>
                            </thead>
                            <tbody>
                                {event.payments.length === 0 && <tr><td colSpan={5} className="p-3 text-center text-muted-foreground">Sin cobros registrados.</td></tr>}
                                {event.payments.map((p: any) => (
                                    <tr key={p.id} className="border-t">
                                        <td className="p-3">{formatDay(p.date)}</td>
                                        <td className="p-3">
                                            {PAYMENT_TYPES[p.type]}
                                            {p.notes && <div className="text-xs text-muted-foreground">{p.notes}</div>}
                                        </td>
                                        <td className="p-3">{PAYMENT_METHODS[p.method]}</td>
                                        <td className="p-3 text-right font-mono text-green-600">{formatMoney(p.amount)}</td>
                                        <td className="p-3 text-right">
                                            <button onClick={() => removeItem(`/corporate/event-payments/${p.id}`, 'Cobro eliminado')} className="p-1 hover:bg-accent rounded text-red-600" aria-label="Eliminar">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <form onSubmit={addPayment} className="p-3 border-t grid grid-cols-2 md:grid-cols-3 gap-2">
                        <input type="number" step="0.01" min="0.01" required placeholder="Monto S/" value={payment.amount} onChange={e => setPayment({ ...payment, amount: e.target.value })} className={inputClass} />
                        <input type="date" required value={payment.date} onChange={e => setPayment({ ...payment, date: e.target.value })} className={inputClass} />
                        <select value={payment.type} onChange={e => setPayment({ ...payment, type: e.target.value })} className={inputClass}>
                            {Object.entries(PAYMENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                        <select value={payment.method} onChange={e => setPayment({ ...payment, method: e.target.value })} className={inputClass}>
                            {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                        <input placeholder="Nota (opcional)" value={payment.notes} onChange={e => setPayment({ ...payment, notes: e.target.value })} className={inputClass} />
                        <button type="submit" disabled={busy} className="px-3 py-2 rounded-md text-sm flex items-center justify-center gap-1 bg-primary text-primary-foreground hover:opacity-90">
                            <Plus className="h-4 w-4" /> Registrar cobro
                        </button>
                    </form>
                </section>

                <section className="bg-card border rounded-lg shadow-sm">
                    <h2 className="text-lg font-bold p-4 border-b">Otros gastos del evento</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[420px]">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="p-3 text-left font-medium">Fecha</th>
                                    <th className="p-3 text-left font-medium">Descripción</th>
                                    <th className="p-3 text-right font-medium">Monto</th>
                                    <th className="p-3" />
                                </tr>
                            </thead>
                            <tbody>
                                {otherExpenses.length === 0 && <tr><td colSpan={4} className="p-3 text-center text-muted-foreground">Sin gastos adicionales.</td></tr>}
                                {otherExpenses.map((e: any) => (
                                    <tr key={e.id} className="border-t">
                                        <td className="p-3">{formatDay(e.date)}</td>
                                        <td className="p-3">
                                            {e.description}
                                            <div className="text-xs text-muted-foreground">{e.category}</div>
                                        </td>
                                        <td className="p-3 text-right font-mono text-red-600">- {formatMoney(e.amount)}</td>
                                        <td className="p-3 text-right">
                                            <button onClick={() => removeItem(`/corporate/event-expenses/${e.id}`, 'Gasto eliminado')} className="p-1 hover:bg-accent rounded text-red-600" aria-label="Eliminar">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <form onSubmit={addExpense} className="p-3 border-t grid grid-cols-2 gap-2">
                        <input required placeholder="Descripción (ej. Movilidad)" value={expense.description} onChange={e => setExpense({ ...expense, description: e.target.value })} className={`${inputClass} col-span-2`} />
                        <input type="number" step="0.01" min="0.01" required placeholder="Monto S/" value={expense.amount} onChange={e => setExpense({ ...expense, amount: e.target.value })} className={inputClass} />
                        <input type="date" required value={expense.date} onChange={e => setExpense({ ...expense, date: e.target.value })} className={inputClass} />
                        <select value={expense.category} onChange={e => setExpense({ ...expense, category: e.target.value })} className={inputClass}>
                            <option value="Otros">Otros</option>
                            <option value="Insumos">Insumos</option>
                            <option value="Servicios">Servicios</option>
                            <option value="Marketing">Marketing</option>
                        </select>
                        <button type="submit" disabled={busy} className="px-3 py-2 rounded-md text-sm flex items-center justify-center gap-1 bg-primary text-primary-foreground hover:opacity-90">
                            <Plus className="h-4 w-4" /> Registrar gasto
                        </button>
                    </form>
                    <p className="px-3 pb-3 text-xs text-muted-foreground">Los pagos a terapeutas se registran desde cada jornada y también aparecen en Gastos.</p>
                </section>
            </div>

            <section className="bg-card border rounded-lg shadow-sm p-4 mb-8">
                <h2 className="text-lg font-bold mb-3">Datos del evento</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Título</label>
                        <input value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} className={`${inputClass} w-full`} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Lugar</label>
                        <input value={editForm.location} onChange={e => setEditForm({ ...editForm, location: e.target.value })} className={`${inputClass} w-full`} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Monto acordado (S/)</label>
                        <input type="number" step="0.01" min="0" value={editForm.agreedAmount} onChange={e => setEditForm({ ...editForm, agreedAmount: e.target.value })} className={`${inputClass} w-full`} />
                    </div>
                    <div className="md:col-span-3">
                        <label className="block text-sm font-medium mb-1">Notas (accesos, contacto en sede, etc.)</label>
                        <textarea rows={3} value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} className={`${inputClass} w-full`} />
                    </div>
                </div>
                <div className="flex justify-end mt-3">
                    <button
                        onClick={() => updateEvent({ ...editForm, agreedAmount: parseFloat(editForm.agreedAmount) || 0 }, 'Evento actualizado')}
                        disabled={busy}
                        className="px-4 py-2 rounded-md text-sm bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                    >
                        Guardar datos
                    </button>
                </div>
            </section>
        </PageContainer>
    );
}
