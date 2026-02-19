'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface AttentionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    attention?: any;
}

export default function AttentionDialog({ isOpen, onClose, onSave, attention }: AttentionDialogProps) {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const [clients, setClients] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [workers, setWorkers] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        clientId: '',
        serviceId: '',
        workerIds: [] as string[],
        totalCost: '',
        notes: '',
        date: new Date().toISOString().split('T')[0],
        appointmentId: ''
    });

    useEffect(() => {
        if (isOpen) {
            Promise.all([
                fetch(`${API_URL}/clients`).then(res => res.json()),
                fetch(`${API_URL}/services`).then(res => res.json()),
                fetch(`${API_URL}/users`).then(res => res.json()),
                fetch(`${API_URL}/appointments`).then(res => res.json())
            ]).then(([clientsData, servicesData, usersData, appointmentsData]) => {
                setClients(clientsData);
                setServices(servicesData);
                setWorkers(usersData);
                setAppointments(Array.isArray(appointmentsData) ? appointmentsData : []);
            }).catch(err => console.error('Error fetching data:', err));

            if (attention) {
                setFormData({
                    clientId: attention.clientId?.toString() || '',
                    serviceId: attention.serviceId?.toString() || '',
                    workerIds: attention.workers?.map((w: any) => w.workerId.toString()) || [],
                    totalCost: attention.totalCost?.toString() || '',
                    notes: attention.notes || '',
                    date: attention.date ? new Date(attention.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    appointmentId: attention.appointmentId?.toString() || ''
                });
            } else {
                setFormData({
                    clientId: '',
                    serviceId: '',
                    workerIds: [],
                    totalCost: '',
                    notes: '',
                    date: new Date().toISOString().split('T')[0],
                    appointmentId: ''
                });
            }
        }
    }, [isOpen, attention]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleWorkerToggle = (workerId: string) => {
        setFormData(prev => {
            const currentIds = prev.workerIds;
            if (currentIds.includes(workerId)) {
                return { ...prev, workerIds: currentIds.filter(id => id !== workerId) };
            } else {
                return { ...prev, workerIds: [...currentIds, workerId] };
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload: any = {
                clientId: Number(formData.clientId),
                serviceId: Number(formData.serviceId),
                workerIds: formData.workerIds.map(Number),
                totalCost: Number(formData.totalCost),
                notes: formData.notes,
                date: new Date(formData.date).toISOString()
            };

            if (formData.appointmentId) {
                payload.appointmentId = Number(formData.appointmentId);
            }

            const url = attention
                ? `${API_URL}/attentions/${attention.id}`
                : `${API_URL}/attentions`;

            const res = await fetch(url, {
                method: attention ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Failed to save attention');

            onSave();
            onClose();
        } catch (error) {
            console.error('Error saving attention:', error);
            alert('Error al guardar la atención');
        }
    };

    if (!isOpen) return null;

    const filteredAppointments = appointments.filter(apt =>
        apt.clientId === Number(formData.clientId) &&
        apt.status !== 'CANCELLED'
    );

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">{attention ? 'Editar Atención' : 'Nueva Atención'}</h2>
                    <button onClick={onClose}><X className="h-5 w-5" /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Cliente</label>
                            <select
                                name="clientId"
                                value={formData.clientId}
                                onChange={handleChange}
                                className="w-full p-2 border rounded-md bg-background"
                                required
                            >
                                <option value="">Seleccionar Cliente</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Servicio</label>
                            <select
                                name="serviceId"
                                value={formData.serviceId}
                                onChange={handleChange}
                                className="w-full p-2 border rounded-md bg-background"
                                required
                            >
                                <option value="">Seleccionar Servicio</option>
                                {services.map(s => (
                                    <option key={s.id} value={s.id}>{s.name} - S/ {s.price}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Cita Asociada (Opcional)</label>
                        <select
                            name="appointmentId"
                            value={formData.appointmentId}
                            onChange={handleChange}
                            className="w-full p-2 border rounded-md bg-background"
                        >
                            <option value="">Sin cita asociada</option>
                            {filteredAppointments.map(apt => (
                                <option key={apt.id} value={apt.id}>
                                    {new Date(apt.startTime).toLocaleString('es-ES')} - {apt.service?.name}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-muted-foreground mt-1">
                            {formData.clientId ? 'Citas del cliente seleccionado' : 'Selecciona un cliente primero'}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Personal (Seleccionar Múltiples)</label>
                        <div className="grid grid-cols-2 gap-2 border p-3 rounded-md max-h-32 overflow-y-auto">
                            {workers.map(w => (
                                <label key={w.id} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        value={w.id}
                                        checked={formData.workerIds.includes(String(w.id))}
                                        onChange={() => handleWorkerToggle(String(w.id))}
                                        className="rounded border-gray-300"
                                    />
                                    <span>{w.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Costo Total</label>
                            <input
                                type="number"
                                name="totalCost"
                                value={formData.totalCost}
                                onChange={handleChange}
                                className="w-full p-2 border rounded-md bg-background"
                                step="0.01"
                                required
                            />
                        </div>
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
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Notas</label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            className="w-full p-2 border rounded-md bg-background"
                            rows={3}
                        />
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="mr-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent rounded-md"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90"
                        >
                            {attention ? 'Actualizar' : 'Guardar'} Atención
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
