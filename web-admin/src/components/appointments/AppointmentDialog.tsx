'use client';

import { useState, useEffect } from 'react';
import { X, UserPlus, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
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

const EMPTY_NEW_CLIENT = { name: '', phone: '', email: '' };

export default function AppointmentDialog({ isOpen, onClose, onSave, initialDate, appointment, config }: AppointmentDialogProps) {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const [clients, setClients] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [workers, setWorkers] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        clientId: '', serviceId: '', workerId: '',
        date: '', status: 'PENDING', cost: '', duration: '', notes: ''
    });

    // Inline client creation
    const [showNewClient, setShowNewClient] = useState(false);
    const [newClient, setNewClient] = useState({ ...EMPTY_NEW_CLIENT });
    const [creatingClient, setCreatingClient] = useState(false);
    const [clientSearch, setClientSearch] = useState('');

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.phone?.includes(clientSearch) ||
        String(c.id).includes(clientSearch)
    );

    useEffect(() => {
        if (isOpen) {
            Promise.all([
                fetch(`${API_URL}/clients`).then(r => r.json()),
                fetch(`${API_URL}/services`).then(r => r.json()),
                fetch(`${API_URL}/users`).then(r => r.json())
            ]).then(([c, s, u]) => {
                setClients(Array.isArray(c) ? c : []);
                setServices(Array.isArray(s) ? s : []);
                setWorkers(Array.isArray(u) ? u : []);
            }).catch(err => console.error(err));

            setShowNewClient(false);
            setNewClient({ ...EMPTY_NEW_CLIENT });
            setClientSearch('');

            if (appointment) {
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
                setFormData({
                    clientId: '', serviceId: '', workerId: '',
                    date: initialDate ? `${initialDate}T09:00` : '',
                    status: 'PENDING', cost: '', duration: '60', notes: ''
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
            ...prev, serviceId,
            cost: service ? service.price.toString() : prev.cost,
            duration: service ? service.durationMin?.toString() || '60' : prev.duration
        }));
    };

    /* ── Inline client creation ── */
    const handleCreateClient = async () => {
        if (!newClient.name.trim()) { toast.error('El nombre es requerido'); return; }
        setCreatingClient(true);
        try {
            const res = await fetch(`${API_URL}/clients`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newClient.name.trim(), phone: newClient.phone || undefined, email: newClient.email || undefined })
            });
            if (!res.ok) throw new Error((await res.json()).message || 'Error');
            const created = await res.json();
            setClients(prev => [...prev, created]);
            setFormData(prev => ({ ...prev, clientId: String(created.id) }));
            setShowNewClient(false);
            setNewClient({ ...EMPTY_NEW_CLIENT });
            setClientSearch('');
            toast.success(`Cliente "${created.name}" creado y seleccionado`);
        } catch (e: any) {
            toast.error(e.message || 'No se pudo crear el cliente');
        } finally {
            setCreatingClient(false);
        }
    };

    /* ── Submit appointment ── */
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
            if (formData.notes?.trim()) payload.notes = formData.notes;

            const url = appointment ? `${API_URL}/appointments/${appointment.id}` : `${API_URL}/appointments`;
            const res = await fetch(url, {
                method: appointment ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: res.statusText }));
                throw new Error(Array.isArray(err.message) ? err.message.join(', ') : err.message || 'Error');
            }

            onSave();
            onClose();
            toast.success(appointment ? 'Cita actualizada' : 'Cita creada');
        } catch (error: any) {
            toast.error(error.message || 'Error al guardar');
        }
    };

    if (!isOpen) return null;

    const selectedClient = clients.find(c => String(c.id) === formData.clientId);
    const isOutsideHours = config && formData.date
        ? (() => { const t = formData.date.split('T')[1]; return t < config.openTime || t > config.closeTime; })()
        : false;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">{appointment ? 'Editar Cita' : 'Nueva Cita'}</h2>
                    <button onClick={onClose}><X className="h-5 w-5" /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* ── CLIENT SELECTOR + INLINE CREATE ── */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-sm font-medium">Cliente</label>
                            <button
                                type="button"
                                onClick={() => { setShowNewClient(v => !v); setClientSearch(''); }}
                                className="flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                                <UserPlus className="h-3.5 w-3.5" />
                                {showNewClient ? 'Cancelar' : 'Nuevo cliente'}
                                {showNewClient ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                        </div>

                        {/* Inline new client form */}
                        {showNewClient && (
                            <div className="mb-2 p-3 border border-dashed border-primary/50 rounded-lg bg-primary/5 space-y-2">
                                <p className="text-xs font-semibold text-primary">Crear nuevo cliente</p>
                                <div className="grid grid-cols-3 gap-2">
                                    <input
                                        type="text" placeholder="Nombre *"
                                        value={newClient.name}
                                        onChange={e => setNewClient(p => ({ ...p, name: e.target.value }))}
                                        className="col-span-1 p-2 text-sm border rounded-md bg-background"
                                        autoFocus
                                    />
                                    <input
                                        type="tel" placeholder="Teléfono"
                                        value={newClient.phone}
                                        onChange={e => setNewClient(p => ({ ...p, phone: e.target.value }))}
                                        className="p-2 text-sm border rounded-md bg-background"
                                    />
                                    <input
                                        type="email" placeholder="Email"
                                        value={newClient.email}
                                        onChange={e => setNewClient(p => ({ ...p, email: e.target.value }))}
                                        className="p-2 text-sm border rounded-md bg-background"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCreateClient}
                                    disabled={creatingClient || !newClient.name.trim()}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
                                >
                                    {creatingClient && <Loader2 className="h-3 w-3 animate-spin" />}
                                    {creatingClient ? 'Creando...' : '✓ Crear y seleccionar'}
                                </button>
                            </div>
                        )}

                        {/* Search + select */}
                        {!showNewClient && (
                            <div className="space-y-1">
                                <input
                                    type="text" placeholder="Buscar cliente por nombre, teléfono o ID..."
                                    value={clientSearch}
                                    onChange={e => setClientSearch(e.target.value)}
                                    className="w-full p-2 text-sm border rounded-md bg-background"
                                />
                                <select
                                    name="clientId"
                                    value={formData.clientId}
                                    onChange={e => { handleChange(e); setClientSearch(''); }}
                                    className="w-full p-2 border rounded-md bg-background"
                                    required
                                >
                                    <option value="">Seleccionar cliente ({filteredClients.length} resultados)</option>
                                    {filteredClients.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}{c.phone ? ` · ${c.phone}` : ''}
                                        </option>
                                    ))}
                                </select>
                                {selectedClient && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        ✓ {selectedClient.name}{selectedClient.phone ? ` · ${selectedClient.phone}` : ''}
                                        {selectedClient.email ? ` · ${selectedClient.email}` : ''}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── SERVICE ── */}
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

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Personal Asignado</label>
                            <select name="workerId" value={formData.workerId} onChange={handleChange} className="w-full p-2 border rounded-md bg-background" required>
                                <option value="">Seleccionar Personal</option>
                                {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Estado</label>
                            <select name="status" value={formData.status} onChange={handleChange} className="w-full p-2 border rounded-md bg-background">
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
                            <input type="datetime-local" name="date" value={formData.date} onChange={handleChange} className="w-full p-2 border rounded-md bg-background" required />
                            {isOutsideHours && <p className="text-xs text-destructive mt-1">Fuera del horario de atención.</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-sm font-medium mb-1">Costo (S/)</label>
                                <input type="number" name="cost" value={formData.cost} onChange={handleChange} className="w-full p-2 border rounded-md bg-background" step="0.01" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Duración (min)</label>
                                <input type="number" name="duration" value={formData.duration} onChange={handleChange} className="w-full p-2 border rounded-md bg-background" min="1" required />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Notas</label>
                        <textarea name="notes" value={formData.notes} onChange={handleChange} className="w-full p-2 border rounded-md bg-background" rows={3} />
                    </div>

                    <div className="flex justify-end pt-4 gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent rounded-md">
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={!!isOutsideHours}
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
