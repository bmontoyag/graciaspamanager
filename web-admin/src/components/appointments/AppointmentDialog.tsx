'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';

interface AppointmentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    initialDate?: string;
    appointment?: any;
    config?: {
        openTime: string;
        closeTime: string;
        appointmentBuffer: number;
    };
}

export default function AppointmentDialog({ isOpen, onClose, onSave, initialDate, appointment, config }: AppointmentDialogProps) {
    const [clients, setClients] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [workers, setWorkers] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        clientId: '',
        serviceId: '',
        workerId: '',
        date: '',
        status: 'PENDING',
        cost: '',
        duration: '',
        notes: ''
    });

    useEffect(() => {
        if (isOpen) {
            Promise.all([
                fetch('http://localhost:3001/clients').then(res => res.json()),
                fetch('http://localhost:3001/services').then(res => res.json()),
                fetch('http://localhost:3001/users').then(res => res.json())
            ]).then(([clientsData, servicesData, usersData]) => {
                setClients(Array.isArray(clientsData) ? clientsData : []);
                setServices(Array.isArray(servicesData) ? servicesData : []);
                setWorkers(Array.isArray(usersData) ? usersData : []);
            }).catch(err => console.error('Error fetching data:', err));

            if (appointment) {
                // Edit mode
                setFormData({
                    clientId: appointment.clientId?.toString() || '',
                    serviceId: appointment.serviceId?.toString() || '',
                    workerId: appointment.workerId?.toString() || '',
                    date: appointment.date ? new Date(appointment.date).toISOString().slice(0, 16) : '',
                    status: appointment.status || 'PENDING',
                    cost: appointment.cost?.toString() || '',
                    duration: appointment.duration?.toString() || '60',
                    notes: appointment.notes || ''
                });
            } else {
                // Create mode
                setFormData({
                    clientId: '',
                    serviceId: '',
                    workerId: '',
                    date: initialDate ? `${initialDate}T09:00` : '',
                    status: 'PENDING',
                    cost: '',
                    duration: '60',
                    notes: ''
                });
            }
        }
    }, [isOpen, initialDate, appointment]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const serviceId = e.target.value;
        const service = services.find(s => s.id === Number(serviceId));

        setFormData(prev => ({
            ...prev,
            serviceId,
            cost: service ? service.price.toString() : prev.cost,
            duration: service ? service.durationMin?.toString() || '60' : prev.duration
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload: any = {
                clientId: Number(formData.clientId),
                serviceId: Number(formData.serviceId),
                workerId: Number(formData.workerId),
                date: new Date(formData.date).toISOString(),
                status: formData.status,
                cost: Number(formData.cost),
                duration: Number(formData.duration)
            };

            if (formData.notes && formData.notes.trim()) {
                payload.notes = formData.notes;
            }

            console.log('Sending appointment payload:', payload);

            const url = appointment
                ? `http://localhost:3001/appointments/${appointment.id}`
                : 'http://localhost:3001/appointments';

            const res = await fetch(url, {
                method: appointment ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorText = await res.text();
                let errorMessage = 'Error desconocido';
                try {
                    const errorJson = JSON.parse(errorText);
                    if (Array.isArray(errorJson.message)) {
                        errorMessage = errorJson.message.join(', ');
                    } else {
                        errorMessage = errorJson.message || errorJson.error || res.statusText;
                    }
                } catch {
                    errorMessage = errorText || res.statusText;
                }

                // Only log unexpected errors (500s), validation errors (400, 409) are normal flow
                if (res.status >= 500) {
                    console.error('Server Error saving appointment:', errorMessage);
                } else {
                    console.warn('Validation Error saving appointment:', errorMessage);
                }

                throw new Error(errorMessage);
            }

            onSave();
            onClose();
            toast.success(appointment ? 'Cita actualizada correctamente' : 'Cita creada correctamente');
        } catch (error: any) {
            toast.error(error.message || 'Error al guardar la cita');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">{appointment ? 'Editar Cita' : 'Nueva Cita'}</h2>
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
                                onChange={handleServiceChange}
                                className="w-full p-2 border rounded-md bg-background"
                                required
                            >
                                <option value="">Seleccionar Servicio</option>
                                {services.map(s => (
                                    <option key={s.id} value={s.id}>{s.name} - S/.{s.price}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Personal Asignado</label>
                            <select
                                name="workerId"
                                value={formData.workerId}
                                onChange={handleChange}
                                className="w-full p-2 border rounded-md bg-background"
                                required
                            >
                                <option value="">Seleccionar Personal</option>
                                {workers.map(w => (
                                    <option key={w.id} value={w.id}>{w.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Estado</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="w-full p-2 border rounded-md bg-background"
                            >
                                <option value="PENDING">Pendiente</option>
                                <option value="CONFIRMED">Confirmada</option>
                                <option value="COMPLETED">Completada</option>
                                <option value="CANCELLED">Cancelada</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Fecha y Hora
                                {config && <span className="text-xs font-normal text-muted-foreground ml-2">({config.openTime} - {config.closeTime})</span>}
                            </label>
                            <input
                                type="datetime-local"
                                name="date"
                                value={formData.date}
                                onChange={handleChange}
                                className="w-full p-2 border rounded-md bg-background"
                                required
                            />
                            {config && (() => {
                                if (!formData.date) return null;
                                const timeStr = formData.date.split('T')[1];
                                if (timeStr < config.openTime || timeStr > config.closeTime) {
                                    return <p className="text-xs text-destructive mt-1">La hora seleccionada está fuera del horario de atención.</p>;
                                }
                                return null;
                            })()}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-sm font-medium mb-1">Costo (S/)</label>
                                <input
                                    type="number"
                                    name="cost"
                                    value={formData.cost}
                                    onChange={handleChange}
                                    className="w-full p-2 border rounded-md bg-background"
                                    step="0.01"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Duración (min)</label>
                                <input
                                    type="number"
                                    name="duration"
                                    value={formData.duration}
                                    onChange={handleChange}
                                    className="w-full p-2 border rounded-md bg-background"
                                    min="1"
                                    required
                                />
                            </div>
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
                            disabled={config && formData.date ? (() => {
                                const timeStr = formData.date.split('T')[1];
                                return timeStr < config.openTime || timeStr > config.closeTime;
                            })() : false}
                            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {appointment ? 'Actualizar' : 'Crear'} Cita
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
