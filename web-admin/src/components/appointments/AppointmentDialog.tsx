'use client';

import { useState, useEffect } from 'react';
import { X, UserPlus, ChevronDown, ChevronUp, Loader2, PlusCircle, Trash2 } from 'lucide-react';
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

const EMPTY_NEW_CLIENT = { name: '', phone: '', email: '', birthday: '', discoverySource: '' };

const getLocalDatetimeString = (dateObj: Date) => {
    const tzOffset = dateObj.getTimezoneOffset() * 60000;
    const localISO = new Date(dateObj.getTime() - tzOffset).toISOString();
    return localISO.slice(0, 16);
};

export default function AppointmentDialog({ isOpen, onClose, onSave, initialDate, appointment, config }: AppointmentDialogProps) {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const [clients, setClients] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [workers, setWorkers] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        clientId: '',
        date: '', // Start date for the FIRST service
        status: 'PENDING',
        notes: ''
    });

    const [selectedServices, setSelectedServices] = useState<any[]>([]);

    // Temporal state for adding a service
    const [currentServiceId, setCurrentServiceId] = useState('');
    const [currentWorkerId, setCurrentWorkerId] = useState('');
    const [currentCost, setCurrentCost] = useState('');
    const [currentDuration, setCurrentDuration] = useState('');

    // Inline client creation
    const [showNewClient, setShowNewClient] = useState(false);
    const [newClient, setNewClient] = useState({ ...EMPTY_NEW_CLIENT });
    const [creatingClient, setCreatingClient] = useState(false);
    const [clientSearch, setClientSearch] = useState('');
    const [discoverySources, setDiscoverySources] = useState<string[]>([]);
    const [whatsappTemplate, setWhatsappTemplate] = useState<string>('');
    const [createdAppointment, setCreatedAppointment] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

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

            fetch(`${API_URL}/configuration`).then(r => r.json()).then(conf => {
                if (conf.discoverySources) setDiscoverySources(conf.discoverySources);
                if (conf.whatsappMessageTemplate) setWhatsappTemplate(conf.whatsappMessageTemplate);
            }).catch(console.error);

            setShowNewClient(false);
            setCreatedAppointment(null);
            setNewClient({ ...EMPTY_NEW_CLIENT });
            setClientSearch('');
            setIsSaving(false);

            if (appointment) {
                setFormData({
                    clientId: appointment.clientId?.toString() || '',
                    date: appointment.date ? getLocalDatetimeString(new Date(appointment.date)) : '',
                    status: appointment.status || 'PENDING',
                    notes: appointment.notes || ''
                });
                setSelectedServices([{
                    serviceId: appointment.serviceId?.toString() || '',
                    workerId: appointment.workerId?.toString() || '',
                    cost: appointment.cost?.toString() || '',
                    duration: appointment.duration?.toString() || '60'
                }]);
            } else {
                setFormData({
                    clientId: '',
                    date: initialDate ? `${initialDate}T09:00` : '',
                    status: 'PENDING',
                    notes: ''
                });
                setSelectedServices([]);
            }
            // Reset current service state
            setCurrentServiceId('');
            setCurrentWorkerId('');
            setCurrentCost('');
            setCurrentDuration('');
        }
    }, [isOpen, initialDate, appointment]);

    const handleFormDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleServiceSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        const svc = services.find(s => s.id === Number(id));
        setCurrentServiceId(id);
        if (svc) {
            setCurrentCost(svc.price.toString());
            setCurrentDuration(svc.durationMin?.toString() || '60');
        }
    };

    const handleAddService = () => {
        if (!currentServiceId || !currentWorkerId || !currentCost || !currentDuration) {
            toast.error('Complete los datos del servicio');
            return;
        }
        setSelectedServices(prev => [...prev, {
            serviceId: currentServiceId,
            workerId: currentWorkerId,
            cost: currentCost,
            duration: currentDuration
        }]);
        // Reset
        setCurrentServiceId('');
        setCurrentWorkerId('');
        setCurrentCost('');
        setCurrentDuration('');
    };

    const handleRemoveService = (index: number) => {
        setSelectedServices(prev => prev.filter((_, i) => i !== index));
    };

    const handleCreateClient = async () => {
        if (!newClient.name.trim()) { toast.error('El nombre es requerido'); return; }
        setCreatingClient(true);
        try {
            const res = await fetch(`${API_URL}/clients`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newClient.name.trim(),
                    phone: newClient.phone || undefined,
                    email: newClient.email || undefined,
                    birthday: newClient.birthday ? new Date(newClient.birthday).toISOString() : undefined,
                    discoverySource: newClient.discoverySource || undefined
                })
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedServices.length === 0) {
            toast.error('Agregue al menos un servicio');
            return;
        }

        setIsSaving(true);
        try {
            const url = appointment 
                ? `${API_URL}/appointments/${appointment.id}` 
                : `${API_URL}/appointments/batch`;
            
            let payload;
            if (appointment) {
                // Individual update (single service supported for now on edit)
                payload = {
                    clientId: Number(formData.clientId),
                    serviceId: Number(selectedServices[0].serviceId),
                    workerId: Number(selectedServices[0].workerId),
                    date: new Date(formData.date).toISOString(),
                    status: formData.status,
                    cost: Number(selectedServices[0].cost),
                    duration: Number(selectedServices[0].duration),
                    notes: formData.notes
                };
            } else {
                // Batch creation
                payload = {
                    clientId: Number(formData.clientId),
                    date: new Date(formData.date).toISOString(),
                    status: formData.status,
                    notes: formData.notes,
                    services: selectedServices.map(s => ({
                        serviceId: Number(s.serviceId),
                        workerId: Number(s.workerId),
                        cost: Number(s.cost),
                        duration: Number(s.duration)
                    }))
                };
            }

            const res = await fetch(url, {
                method: appointment ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: res.statusText }));
                throw new Error(Array.isArray(err.message) ? err.message.join(', ') : err.message || 'Error');
            }

            const result = await res.json();
            // result might be an array if batch
            setCreatedAppointment(Array.isArray(result) ? result[0] : result);
            onSave();
            toast.success(appointment ? 'Cita actualizada' : 'Citas creadas exitosamente');
        } catch (error: any) {
            toast.error(error.message || 'Error al guardar');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSendWhatsapp = () => {
        if (!createdAppointment || !whatsappTemplate) return;

        const client = clients.find(c => c.id === createdAppointment.clientId);
        const service = services.find(s => s.id === createdAppointment.serviceId);
        
        if (!client || !client.phone) {
            toast.error('El cliente no tiene un número de teléfono registrado.');
            return;
        }

        const dateObj = new Date(createdAppointment.date);
        const dateStr = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
        const timeStr = dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

        let message = whatsappTemplate
            .replace(/{name}/g, client.name || '')
            .replace(/{service}/g, service?.name || '')
            .replace(/{date}/g, dateStr)
            .replace(/{time}/g, timeStr);

        let phone = client.phone.replace(/\D/g, '');
        if (phone.length === 9) phone = '51' + phone;

        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
        onClose();
    };

    if (!isOpen) return null;

    const totalDuration = selectedServices.reduce((acc, s) => acc + (Number(s.duration) || 0), 0);
    const totalCost = selectedServices.reduce((acc, s) => acc + (Number(s.cost) || 0), 0);

    // Calculate sequential times for display
    let cumulativeMinutes = 0;
    const servicesWithTimes = selectedServices.map(s => {
        const start = new Date(new Date(formData.date).getTime() + cumulativeMinutes * 60000);
        cumulativeMinutes += (Number(s.duration) || 0);
        return { ...s, startTime: start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    });

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {createdAppointment ? (
                    <div className="text-center py-8">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4">
                            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold mb-2">¡Reserva Registrada!</h2>
                        <p className="text-muted-foreground mb-8">La cita ha sido guardada exitosamente en el sistema.</p>
                        
                        <div className="flex justify-center gap-4">
                            <button onClick={onClose} className="px-6 py-2.5 text-sm font-medium border rounded-lg hover:bg-muted transition">Cerrar</button>
                            {whatsappTemplate && (
                                <button onClick={handleSendWhatsapp} className="px-6 py-2.5 text-sm font-medium bg-[#25D366] text-white rounded-lg hover:bg-[#20bd5a] flex items-center gap-2 transition">
                                    Enviar WhatsApp
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">{appointment ? 'Editar Cita' : 'Nueva Cita Multi-Servicio'}</h2>
                            <button onClick={onClose}><X className="h-5 w-5" /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* ── CLIENTE ── */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-semibold">Cliente *</label>
                                    <button type="button" onClick={() => setShowNewClient(!showNewClient)} className="flex items-center gap-1 text-xs text-primary hover:underline">
                                        <UserPlus className="h-3.5 w-3.5" />
                                        {showNewClient ? 'Cancelar' : 'Nuevo cliente'}
                                    </button>
                                </div>

                                {showNewClient ? (
                                    <div className="p-4 border border-dashed border-primary/50 rounded-lg bg-primary/5 space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <input type="text" placeholder="Nombre *" value={newClient.name} onChange={e => setNewClient({ ...newClient, name: e.target.value })} className="col-span-2 p-2 text-sm border rounded-md bg-background" />
                                            <input type="tel" placeholder="Teléfono" value={newClient.phone} onChange={e => setNewClient({ ...newClient, phone: e.target.value })} className="p-2 text-sm border rounded-md bg-background" />
                                            <input type="email" placeholder="Email" value={newClient.email} onChange={e => setNewClient({ ...newClient, email: e.target.value })} className="p-2 text-sm border rounded-md bg-background" />
                                        </div>
                                        <button type="button" onClick={handleCreateClient} disabled={creatingClient} className="px-4 py-2 text-xs font-bold bg-primary text-white rounded-md flex items-center gap-2">
                                            {creatingClient && <Loader2 className="h-3 w-3 animate-spin" />}
                                            Crear Cliente
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <input type="text" placeholder="Buscar cliente..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} className="w-full p-2 text-sm border rounded-md bg-background" />
                                        <select name="clientId" value={formData.clientId} onChange={handleFormDataChange} className="w-full p-2 border rounded-md bg-background text-sm" required>
                                            <option value="">Seleccionar cliente</option>
                                            {filteredClients.map(c => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* ── FECHA Y ESTADO ── */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-semibold">Fecha y Hora de Inicio</label>
                                    <input type="datetime-local" name="date" value={formData.date} onChange={handleFormDataChange} className="w-full p-2 text-sm border rounded-md bg-background" required />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-semibold">Estado</label>
                                    <select name="status" value={formData.status} onChange={handleFormDataChange} className="w-full p-2 text-sm border rounded-md bg-background">
                                        <option value="PENDING">Pendiente</option>
                                        <option value="CONFIRMED">Confirmada</option>
                                    </select>
                                </div>
                            </div>

                            {/* ── SERVICIOS SELECCIONADOS ── */}
                            <div className="space-y-3">
                                <label className="text-sm font-semibold">Servicios de la Reserva</label>
                                
                                {selectedServices.length > 0 ? (
                                    <div className="border rounded-lg divide-y bg-muted/10">
                                        {servicesWithTimes.map((item, index) => {
                                            const svc = services.find(s => String(s.id) === item.serviceId);
                                            const wrk = workers.find(w => String(w.id) === item.workerId);
                                            return (
                                                <div key={index} className="p-3 flex items-center justify-between group">
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-xs font-bold bg-primary/10 text-primary w-12 text-center py-1 rounded">
                                                            {item.startTime}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium">{svc?.name}</p>
                                                            <p className="text-xs text-muted-foreground">{wrk?.name} · {item.duration} min</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <p className="text-sm font-bold">S/ {item.cost}</p>
                                                        {!appointment && (
                                                            <button type="button" onClick={() => handleRemoveService(index)} className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div className="p-3 bg-muted/20 flex justify-between items-center text-sm">
                                            <span className="font-semibold">Resumen Total:</span>
                                            <div className="space-x-4">
                                                <span>{totalDuration} min</span>
                                                <span className="font-bold text-primary text-lg">S/ {totalCost.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-6 border-2 border-dashed rounded-lg text-muted-foreground text-sm">
                                        No hay servicios agregados todavía.
                                    </div>
                                )}

                                {!appointment && (
                                    <div className="p-4 border rounded-lg bg-muted/5 space-y-4">
                                        <p className="text-xs font-bold text-muted-foreground uppercase">Agregar Servicio</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <select value={currentServiceId} onChange={handleServiceSelect} className="col-span-2 p-2 text-sm border rounded-md bg-background">
                                                <option value="">Seleccionar Servicio</option>
                                                {services.map(s => <option key={s.id} value={s.id}>{s.name} (S/ {s.price})</option>)}
                                            </select>
                                            <select value={currentWorkerId} onChange={e => setCurrentWorkerId(e.target.value)} className="p-2 text-sm border rounded-md bg-background">
                                                <option value="">Terapeuta</option>
                                                {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                            </select>
                                            <div className="flex gap-2">
                                                <input type="number" placeholder="Cost" value={currentCost} onChange={e => setCurrentCost(e.target.value)} className="w-1/2 p-2 text-sm border rounded-md bg-background" />
                                                <input type="number" placeholder="Min" value={currentDuration} onChange={e => setCurrentDuration(e.target.value)} className="w-1/2 p-2 text-sm border rounded-md bg-background" />
                                            </div>
                                        </div>
                                        <button type="button" onClick={handleAddService} className="w-full py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-bold flex items-center justify-center gap-2">
                                            <PlusCircle className="h-4 w-4" /> Añadir a la Cita
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-semibold">Notas</label>
                                <textarea name="notes" value={formData.notes} onChange={handleFormDataChange} className="w-full p-2 text-sm border rounded-md bg-background" rows={2} placeholder="Opcional..." />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition">Cancelar</button>
                                <button type="submit" disabled={isSaving || selectedServices.length === 0} className="px-6 py-2 text-sm font-bold bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
                                    {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {appointment ? 'Actualizar Reserva' : 'Confirmar Reserva'}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
