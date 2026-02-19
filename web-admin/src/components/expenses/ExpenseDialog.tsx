'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface ExpenseDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    expense?: any;
}

export default function ExpenseDialog({ isOpen, onClose, onSave, expense }: ExpenseDialogProps) {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        category: '',
        date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        if (expense) {
            setFormData({
                description: expense.description || '',
                amount: expense.amount?.toString() || '',
                category: expense.category || '',
                date: expense.date ? new Date(expense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
            });
        } else {
            setFormData({
                description: '',
                amount: '',
                category: '',
                date: new Date().toISOString().split('T')[0]
            });
        }
    }, [expense, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const payload = {
                description: formData.description,
                amount: parseFloat(formData.amount),
                category: formData.category,
                date: new Date(formData.date).toISOString()
            };

            console.log('Sending expense payload:', payload);

            const url = expense
                ? `${API_URL}/expenses/${expense.id}`
                : `${API_URL}/expenses`;

            const res = await fetch(url, {
                method: expense ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorText = await res.text();
                let errorMessage = 'Error desconocido';
                try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.message || errorJson.error || res.statusText;
                } catch {
                    errorMessage = errorText || res.statusText;
                }

                console.error('Error response:', errorMessage);
                alert(`Error al guardar el gasto: ${errorMessage}`);
                return;
            }

            const result = await res.json();
            console.log('Expense saved successfully:', result);

            onSave();
            onClose();
        } catch (error) {
            console.error('Exception saving expense:', error);
            alert(`Error al guardar el gasto: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card border rounded-lg p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">{expense ? 'Editar Gasto' : 'Nuevo Gasto'}</h2>
                    <button onClick={onClose} className="hover:bg-muted rounded p-1">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Descripción</label>
                        <input
                            type="text"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            className="w-full p-2 border rounded-md bg-background"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Monto (S/)</label>
                        <input
                            type="number"
                            step="0.01"
                            name="amount"
                            value={formData.amount}
                            onChange={handleChange}
                            className="w-full p-2 border rounded-md bg-background"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Categoría</label>
                        <select
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            className="w-full p-2 border rounded-md bg-background"
                            required
                        >
                            <option value="">Seleccionar...</option>
                            <option value="Salarios">Salarios</option>
                            <option value="Alquiler">Alquiler</option>
                            <option value="Servicios">Servicios</option>
                            <option value="Insumos">Insumos</option>
                            <option value="Mantenimiento">Mantenimiento</option>
                            <option value="Marketing">Marketing</option>
                            <option value="Otros">Otros</option>
                        </select>
                    </div>

                    {/* Payment Apps Links */}
                    {formData.category === 'Salarios' && (
                        <div className="bg-muted/30 p-3 rounded-lg border">
                            <p className="text-sm font-medium mb-2">Pagar con Billetera Digital:</p>
                            <div className="flex gap-3">
                                <a
                                    href="https://www.yape.com.pe/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 flex items-center justify-center gap-2 bg-[#742384] text-white py-2 rounded-md hover:opacity-90 transition font-medium text-sm"
                                >
                                    Login Yape
                                </a>
                                <a
                                    href="https://pling.pe/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 flex items-center justify-center gap-2 bg-[#00AEC7] text-white py-2 rounded-md hover:opacity-90 transition font-medium text-sm"
                                >
                                    Login Plin
                                </a>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2 text-center">
                                Se abrirá la web oficial. Para pagar directo usa la App móvil.
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium mb-1">Fecha</label>
                        <input
                            type="date"
                            name="date"
                            value={formData.date}
                            onChange={handleChange}
                            className="w-full p-2 border rounded-md bg-background"
                            required
                        />
                    </div>

                    <div className="flex gap-2 justify-end pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border rounded-md hover:bg-muted transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition"
                        >
                            {expense ? 'Actualizar' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
