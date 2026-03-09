'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import ExpenseDialog from '@/components/expenses/ExpenseDialog';
import { PageContainer } from '@/components/layout/PageContainer';

export default function ExpensesPage() {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<any>(null);
    const [filter, setFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [workerFilter, setWorkerFilter] = useState('all');

    const fetchExpenses = () => {
        setLoading(true);
        fetch(`${API_URL}/expenses`)
            .then(res => res.json())
            .then(data => {
                setExpenses(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching expenses:', err);
                setExpenses([]);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchExpenses();
    }, []);

    const handleEdit = (expense: any) => {
        setSelectedExpense(expense);
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Está seguro de eliminar este gasto?')) return;

        try {
            const res = await fetch(`${API_URL}/expenses/${id}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to delete');
            fetchExpenses();
        } catch (error) {
            console.error('Error deleting expense:', error);
            alert('Error al eliminar el gasto');
        }
    };

    const formatSafeDate = (dateString: string) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    // Extraer valores únicos para los selects
    const uniqueCategories = Array.from(new Set(expenses.map(e => e.category))).filter(Boolean);
    const uniqueWorkers = Array.from(new Set(
        expenses.filter(e => e.worker).map(e => JSON.stringify({ id: e.workerId, name: e.worker.name }))
    )).map((str: any) => JSON.parse(str));

    const filteredExpenses = expenses.filter(e => {
        const matchesText = e.description?.toLowerCase().includes(filter.toLowerCase()) ||
            e.category?.toLowerCase().includes(filter.toLowerCase());

        const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;

        const matchesWorker = workerFilter === 'all' ||
            (workerFilter === 'negocio' && !e.workerId) ||
            (e.workerId?.toString() === workerFilter);

        const matchesDate = !dateFilter || (e.date && e.date.startsWith(dateFilter));

        return matchesText && matchesCategory && matchesWorker && matchesDate;
    });

    return (
        <PageContainer>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-3xl font-serif font-bold">Gastos</h1>
                <button
                    onClick={() => {
                        setSelectedExpense(null);
                        setIsDialogOpen(true);
                    }}
                    className="w-full sm:w-auto justify-center bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 hover:opacity-90"
                >
                    <Plus className="h-4 w-4" />
                    Nuevo Gasto
                </button>
            </div>

            <div className="bg-card rounded-lg border shadow-sm p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex items-center gap-2 flex-1 relative">
                        <Search className="text-muted-foreground h-4 w-4 absolute left-3" />
                        <input
                            type="text"
                            placeholder="Buscar por descripción..."
                            className="bg-background border rounded-md pl-9 pr-3 py-2 w-full outline-none focus:ring-1 focus:ring-primary/50 text-sm"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground whitespace-nowrap">Fecha:</span>
                            <input
                                type="date"
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                                className="bg-background border rounded-md px-2 py-1.5 text-sm outline-none w-full sm:w-[140px]"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground whitespace-nowrap">Categoría:</span>
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="bg-background border rounded-md px-2 py-1.5 text-sm outline-none w-full sm:w-[130px]"
                            >
                                <option value="all">Todas</option>
                                {uniqueCategories.map((c: any) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground whitespace-nowrap">Asignado:</span>
                            <select
                                value={workerFilter}
                                onChange={(e) => setWorkerFilter(e.target.value)}
                                className="bg-background border rounded-md px-2 py-1.5 text-sm outline-none w-full sm:w-[130px]"
                            >
                                <option value="all">Todos</option>
                                <option value="negocio">Negocio (General)</option>
                                {uniqueWorkers.map((w: any) => (
                                    <option key={w.id} value={w.id.toString()}>{w.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left min-w-[600px]">
                        <thead className="bg-muted/50 border-b">
                            <tr>
                                <th className="p-4 font-medium">Fecha</th>
                                <th className="p-4 font-medium">Descripción</th>
                                <th className="p-4 font-medium">Categoría</th>
                                <th className="p-4 font-medium">Asignado a</th>
                                <th className="p-4 font-medium text-right">Monto</th>
                                <th className="p-4 font-medium text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Cargando...</td></tr>
                            )}
                            {!loading && filteredExpenses.length === 0 && (
                                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No se encontraron gastos.</td></tr>
                            )}
                            {filteredExpenses.map((expense) => (
                                <tr key={expense.id} className="border-b hover:bg-muted/50 transition">
                                    <td className="p-4">{formatSafeDate(expense.date)}</td>
                                    <td className="p-4 font-medium">{expense.description}</td>
                                    <td className="p-4">
                                        <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded text-xs">
                                            {expense.category}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        {expense.worker ? (
                                            <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs truncate max-w-[150px] inline-block">
                                                {expense.worker.name}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground text-xs italic">Negocio</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right font-mono text-red-500">- S/.{Number(expense.amount).toFixed(2)}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(expense)}
                                                className="p-2 hover:bg-accent rounded"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(expense.id)}
                                                className="p-2 hover:bg-accent rounded text-red-600"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <ExpenseDialog
                isOpen={isDialogOpen}
                onClose={() => {
                    setIsDialogOpen(false);
                    setSelectedExpense(null);
                }}
                onSave={fetchExpenses}
                expense={selectedExpense}
            />
        </PageContainer>
    );
}
