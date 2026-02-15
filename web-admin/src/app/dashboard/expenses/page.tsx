'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import ExpenseDialog from '@/components/expenses/ExpenseDialog';
import { PageContainer } from '@/components/layout/PageContainer';

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<any>(null);
    const [filter, setFilter] = useState('');

    const fetchExpenses = () => {
        setLoading(true);
        fetch('http://localhost:3001/expenses')
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
            const res = await fetch(`http://localhost:3001/expenses/${id}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to delete');
            fetchExpenses();
        } catch (error) {
            console.error('Error deleting expense:', error);
            alert('Error al eliminar el gasto');
        }
    };

    const filteredExpenses = expenses.filter(e =>
        e.description?.toLowerCase().includes(filter.toLowerCase()) ||
        e.category?.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <PageContainer>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-serif font-bold">Gastos</h1>
                <button
                    onClick={() => {
                        setSelectedExpense(null);
                        setIsDialogOpen(true);
                    }}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 hover:opacity-90"
                >
                    <Plus className="h-4 w-4" />
                    Nuevo Gasto
                </button>
            </div>

            <div className="bg-card rounded-lg border shadow-sm p-4 mb-6">
                <div className="flex items-center gap-2">
                    <Search className="text-muted-foreground h-4 w-4" />
                    <input
                        type="text"
                        placeholder="Buscar por descripción o categoría..."
                        className="bg-transparent outline-none w-full"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 border-b">
                        <tr>
                            <th className="p-4 font-medium">Fecha</th>
                            <th className="p-4 font-medium">Descripción</th>
                            <th className="p-4 font-medium">Categoría</th>
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
                                <td className="p-4">{new Date(expense.date).toLocaleDateString()}</td>
                                <td className="p-4 font-medium">{expense.description}</td>
                                <td className="p-4">
                                    <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded text-xs">
                                        {expense.category}
                                    </span>
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
