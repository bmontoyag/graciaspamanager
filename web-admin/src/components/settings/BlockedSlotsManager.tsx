'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, Clock, AlertCircle } from 'lucide-react';

interface BlockedSlot {
    id: number;
    date: string;
    startTime: string;
    endTime: string;
    reason?: string;
}

export default function BlockedSlotsManager() {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const [slots, setSlots] = useState<BlockedSlot[]>([]);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        date: '',
        startTime: '',
        endTime: '',
        reason: ''
    });

    const fetchSlots = async () => {
        try {
            const res = await fetch(`${API_URL}/blocked-slots`);
            if (res.ok) {
                const data = await res.json();
                setSlots(data);
            }
        } catch (error) {
            console.error('Error fetching blocked slots:', error);
        }
    };

    useEffect(() => {
        fetchSlots();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/blocked-slots`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setFormData({ date: '', startTime: '', endTime: '', reason: '' });
                fetchSlots();
                alert('Bloqueo agregado correctamente');
            } else {
                const err = await res.json();
                alert(`Error: ${err.message || 'Error desconocido'}`);
            }
        } catch (error) {
            console.error('Error creating blocked slot:', error);
            alert('Error al crear el bloqueo');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Estás seguro de eliminar este bloqueo?')) return;
        try {
            await fetch(`${API_URL}/blocked-slots/${id}`, { method: 'DELETE' });
            fetchSlots();
        } catch (error) {
            console.error('Error deleting blocked slot:', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Form */}
                <div className="md:col-span-1 bg-muted/20 p-4 rounded-lg">
                    <h3 className="font-medium mb-4 flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Nuevo Bloqueo
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div>
                            <label className="block text-xs font-medium mb-1">Fecha</label>
                            <input
                                type="date"
                                required
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                className="w-full p-2 border rounded-md text-sm bg-background"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium mb-1">Inicio</label>
                                <input
                                    type="time"
                                    required
                                    value={formData.startTime}
                                    onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                    className="w-full p-2 border rounded-md text-sm bg-background"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Fin</label>
                                <input
                                    type="time"
                                    required
                                    value={formData.endTime}
                                    onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                                    className="w-full p-2 border rounded-md text-sm bg-background"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1">Motivo</label>
                            <input
                                type="text"
                                value={formData.reason}
                                onChange={e => setFormData({ ...formData, reason: e.target.value })}
                                placeholder="Ej: Mantenimiento, Feriado..."
                                className="w-full p-2 border rounded-md text-sm bg-background"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary text-primary-foreground py-2 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
                        >
                            {loading ? 'Guardando...' : 'Agregar Bloqueo'}
                        </button>
                    </form>
                </div>

                {/* List */}
                <div className="md:col-span-2">
                    <h3 className="font-medium mb-4 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Bloqueos Activos
                    </h3>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                        {slots.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">No hay bloqueos registrados.</p>
                        ) : (
                            slots.map(slot => (
                                <div key={slot.id} className="flex justify-between items-center p-3 border rounded-lg bg-card hover:bg-accent/50 transition">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Calendar className="h-3 w-3 text-muted-foreground" />
                                            <span className="text-sm font-medium">
                                                {new Date(slot.date).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {slot.startTime} - {slot.endTime}
                                            </div>
                                            {slot.reason && (
                                                <span className="px-2 py-0.5 bg-muted rounded-full">
                                                    {slot.reason}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(slot.id)}
                                        className="text-destructive hover:bg-destructive/10 p-2 rounded-full transition"
                                        title="Eliminar bloqueo"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
