'use client';

import { useState, useEffect } from 'react';
import { X, UserPlus, PlusCircle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AttentionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    attention?: any;
}

const EMPTY_CLIENT = { name: '', phone: '', email: '', birthday: '', discoverySource: '' };
const EMPTY_SERVICE = { name: '', price: '', durationMin: '60' };

const getLocalToday = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
};

export default function AttentionDialog({ isOpen, onClose, onSave, attention }: AttentionDialogProps) {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    const [clients, setClients] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [workers, setWorkers] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);

    // Inline creation states
    const [showNewClient, setShowNewClient] = useState(false);
    const [showNewService, setShowNewService] = useState(false);
    const [newClient, setNewClient] = useState({ ...EMPTY_CLIENT });
    const [newService, setNewService] = useState({ ...EMPTY_SERVICE });
    const [creatingClient, setCreatingClient] = useState(false);
    const [creatingService, setCreatingService] = useState(false);
    const [clientSearch, setClientSearch] = useState('');
    const [serviceSearch, setServiceSearch] = useState('');
    const [discoverySources, setDiscoverySources] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        clientId: '',
        services: [] as { serviceId: string, workerIds: string[], totalCost: string }[],
        notes: '',
        date: getLocalToday(),
        appointmentId: ''
    });

    const [advanceAmount, setAdvanceAmount] = useState(0);

    // Temporal state for adding a new service to the list
    const [currentServiceId, setCurrentServiceId] = useState('');
    const [currentWorkerIds, setCurrentWorkerIds] = useState<string[]>([]);
    const [currentTotalCost, setCurrentTotalCost] = useState('');

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.phone?.includes(clientSearch)
    );
    const filteredServices = services.filter(s =>
        s.name.toLowerCase().includes(serviceSearch.toLowerCase())
    );

    const loadAll = () =>
        Promise.all([
            fetch(`${API_URL}/clients`).then(r => r.json()),
            fetch(`${API_URL}/services`).then(r => r.json()),
            fetch(`${API_URL}/users`).then(r => r.json()),
            fetch(`${API_URL}/appointments`).then(r => r.json()),
        ]).then(([c, s, u, a]) => {
            setClients(Array.isArray(c) ? c : []);
            setServices(Array.isArray(s) ? s : []);
            setWorkers(Array.isArray(u) ? u : []);
            setAppointments(Array.isArray(a) ? a : []);
        });

    useEffect(() => {
        if (!isOpen) return;
        loadAll().catch(console.error);

        fetch(`${API_URL}/configuration`).then(r => r.json()).then(conf => {
            if (conf.discoverySources) setDiscoverySources(conf.discoverySources);
        }).catch(console.error);

        setShowNewClient(false); setShowNewService(false);
        setClientSearch(''); setServiceSearch('');
        setNewClient({ ...EMPTY_CLIENT }); setNewService({ ...EMPTY_SERVICE });

        if (attention) {
            setFormData({
                clientId: attention.clientId?.toString() || '',
                services: [{
                    serviceId: attention.serviceId?.toString() || '',
                    workerIds: attention.workers?.map((w: any) => w.workerId.toString()) || [],
                    totalCost: attention.totalCost?.toString() || ''
                }],
                notes: attention.notes || '',
                date: attention.date ? new Date(attention.date).toISOString().split('T')[0] : getLocalToday(),
                appointmentId: attention.appointmentId?.toString() || ''
            });
        } else {
            setFormData({ clientId: '', services: [], notes: '', date: getLocalToday(), appointmentId: '' });
            setCurrentServiceId('');
            setCurrentWorkerIds([]);
            setCurrentTotalCost('');
        }
    }, [isOpen, attention]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(p => ({ ...p, [name]: value }));

        if (name === 'appointmentId') {
            if (value) {
                fetch(`${API_URL}/appointments/${value}`)
                    .then(r => r.json())
                    .then(apt => {
                        const totalAdvance = apt.payments
                            ?.filter((p: any) => p.type === 'ADVANCE')
                            .reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
                        setAdvanceAmount(totalAdvance);

                        // Precargar el servicio de la cita
                        if (apt.serviceId) {
                            const workerIds = apt.workers?.map((aw: any) => aw.workerId.toString()) || 
                                             (apt.workerId ? [apt.workerId.toString()] : []);
                            
                            setFormData(prev => ({
                                ...prev,
                                services: [{
                                    serviceId: apt.serviceId.toString(),
                                    workerIds: workerIds,
                                    totalCost: apt.cost?.toString() || '0'
                                }]
                            }));
                        }
                    })
                    .catch(console.error);
            } else {
                setAdvanceAmount(0);
                setFormData(prev => ({ ...prev, services: [] }));
            }
        }
    };

    const handleCurrentServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        const svc = services.find(s => String(s.id) === value);
        setCurrentServiceId(value);
        setCurrentTotalCost(svc ? String(svc.price) : currentTotalCost);
    };

    const toggleCurrentWorker = (id: string) =>
        setCurrentWorkerIds(prev => prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]);

    const handleAddService = () => {
        if (!currentServiceId || !currentTotalCost) {
            toast.error('Debe seleccionar un servicio y establecer su costo');
            return;
        }
        if (currentWorkerIds.length === 0) {
            toast.error('Debe asignar al menos un terapeuta por servicio');
            return;
        }
        
        setFormData(prev => ({
            ...prev,
            services: [...prev.services, {
                serviceId: currentServiceId,
                workerIds: currentWorkerIds,
                totalCost: currentTotalCost
            }]
        }));

        setCurrentServiceId('');
        setCurrentWorkerIds([]);
        setCurrentTotalCost('');
    };

    const handleRemoveService = (index: number) => {
        setFormData(prev => {
            const newServices = [...prev.services];
            newServices.splice(index, 1);
            return { ...prev, services: newServices };
        });
    };



    /* ── Inline client ── */
    const handleCreateClient = async () => {
        if (!newClient.name.trim()) { toast.error('El nombre es requerido'); return; }
        setCreatingClient(true);
        try {
            const res = await fetch(`${API_URL}/clients`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
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
            setClients(p => [...p, created]);
            setFormData(p => ({ ...p, clientId: String(created.id) }));
            setShowNewClient(false); setNewClient({ ...EMPTY_CLIENT }); setClientSearch('');
            toast.success(`Cliente "${created.name}" creado y seleccionado`);
        } catch (e: any) { toast.error(e.message || 'Error'); }
        finally { setCreatingClient(false); }
    };

    /* ── Inline service ── */
    const handleCreateService = async () => {
        if (!newService.name.trim() || !newService.price) { toast.error('Nombre y precio son requeridos'); return; }
        setCreatingService(true);
        try {
            const res = await fetch(`${API_URL}/services`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newService.name.trim(), price: Number(newService.price), durationMin: Number(newService.durationMin) || 60 })
            });
            if (!res.ok) throw new Error((await res.json()).message || 'Error');
            const created = await res.json();
            setServices(p => [...p, created]);
            setCurrentServiceId(String(created.id));
            setCurrentTotalCost(String(created.price));
            setShowNewService(false); setNewService({ ...EMPTY_SERVICE }); setServiceSearch('');
            toast.success(`Servicio "${created.name}" creado y seleccionado`);
        } catch (e: any) { toast.error(e.message || 'Error'); }
        finally { setCreatingService(false); }
    };

    /* ── Submit ── */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (formData.services.length === 0) {
            toast.error('Debe agregar al menos un servicio a la atención');
            return;
        }

        try {
            const basePayload = {
                clientId: Number(formData.clientId),
                notes: formData.notes,
                date: new Date(formData.date + 'T12:00:00.000Z').toISOString(),
                ...(formData.appointmentId ? { appointmentId: Number(formData.appointmentId) } : {})
            };

            const url = attention ? `${API_URL}/attentions/${attention.id}` : `${API_URL}/attentions/batch`;
            
            let finalPayload;
            if (attention) {
                // Cuando editamos, solo mandamos el primer servicio (por ahora no soporta editar bach)
                finalPayload = {
                    ...basePayload,
                    serviceId: Number(formData.services[0].serviceId),
                    workerIds: formData.services[0].workerIds.map(Number),
                    totalCost: Number(formData.services[0].totalCost)
                };
            } else {
                finalPayload = {
                    ...basePayload,
                    services: formData.services.map(s => ({
                        serviceId: Number(s.serviceId),
                        workerIds: s.workerIds.map(Number),
                        totalCost: Number(s.totalCost)
                    }))
                };
            }

            const res = await fetch(url, {
                method: attention ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalPayload)
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: res.statusText }));
                throw new Error(Array.isArray(err.message) ? err.message.join(', ') : err.message || 'Error');
            }
            onSave(); onClose();
            toast.success(attention ? 'Atención actualizada' : 'Atención registrada');
        } catch (e: any) { toast.error(e.message || 'Error al guardar'); }
    };

    if (!isOpen) return null;

    const selectedClient = clients.find(c => String(c.id) === formData.clientId);
    const filteredApts = appointments.filter(a => a.clientId === Number(formData.clientId) && a.status !== 'CANCELLED');
    const displayTotalCost = formData.services.reduce((sum, s) => sum + (Number(s.totalCost) || 0), 0);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-5">
                    <h2 className="text-xl font-bold">{attention ? 'Editar Atención' : 'Nueva Atención'}</h2>
                    <button onClick={onClose}><X className="h-5 w-5" /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">

                    {/* ══ CLIENTE ══ */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-semibold">Cliente *</label>
                            <button type="button" onClick={() => { setShowNewClient(v => !v); setClientSearch(''); }}
                                className="flex items-center gap-1 text-xs text-primary hover:underline">
                                <UserPlus className="h-3.5 w-3.5" />
                                {showNewClient ? 'Cancelar' : 'Nuevo cliente'}
                                {showNewClient ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                        </div>

                        {showNewClient ? (
                            <div className="p-3 border border-dashed border-primary/50 rounded-lg bg-primary/5 space-y-2">
                                <p className="text-xs font-semibold text-primary">Crear nuevo cliente</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="text" placeholder="Nombre *" value={newClient.name} onChange={e => setNewClient(p => ({ ...p, name: e.target.value }))}
                                        className="col-span-2 p-2 text-sm border rounded-md bg-background" autoFocus />
                                    <input type="tel" placeholder="Teléfono" value={newClient.phone} onChange={e => setNewClient(p => ({ ...p, phone: e.target.value }))}
                                        className="p-2 text-sm border rounded-md bg-background" />
                                    <input type="email" placeholder="Email" value={newClient.email} onChange={e => setNewClient(p => ({ ...p, email: e.target.value }))}
                                        className="p-2 text-sm border rounded-md bg-background" />
                                    <input type="date" title="Fecha de Nacimiento" value={newClient.birthday} onChange={e => setNewClient(p => ({ ...p, birthday: e.target.value }))}
                                        className="col-span-2 p-2 text-sm border rounded-md bg-background text-muted-foreground" />
                                    <select title="¿De dónde nos conoció?" value={newClient.discoverySource} onChange={e => setNewClient(p => ({ ...p, discoverySource: e.target.value }))}
                                        className="col-span-2 p-2 text-sm border rounded-md bg-background text-muted-foreground">
                                        <option value="">¿De dónde nos conoció? (Opcional)</option>
                                        {discoverySources.map((s, i) => <option key={i} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <button type="button" onClick={handleCreateClient} disabled={creatingClient || !newClient.name.trim()}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50">
                                    {creatingClient && <Loader2 className="h-3 w-3 animate-spin" />}
                                    {creatingClient ? 'Creando...' : '✓ Crear y seleccionar'}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                <input type="text" placeholder="Buscar cliente..." value={clientSearch} onChange={e => setClientSearch(e.target.value)}
                                    className="w-full p-2 text-sm border rounded-md bg-background" />
                                <select name="clientId" value={formData.clientId} onChange={handleChange}
                                    className="w-full p-2 border rounded-md bg-background" required>
                                    <option value="">Seleccionar cliente ({filteredClients.length})</option>
                                    {filteredClients.map(c => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ''}</option>)}
                                </select>
                                {selectedClient && <p className="text-xs text-muted-foreground">✓ {selectedClient.name}{selectedClient.phone ? ` · ${selectedClient.phone}` : ''}</p>}
                            </div>
                        )}
                    </div>

                    {/* ══ SERVICIO ══ */}
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-semibold">Servicios *</label>
                                <button type="button" onClick={() => { setShowNewService(v => !v); setServiceSearch(''); }}
                                    className="flex items-center gap-1 text-xs text-primary hover:underline">
                                    <PlusCircle className="h-3.5 w-3.5" />
                                    {showNewService ? 'Cancelar' : 'Nuevo servicio'}
                                    {showNewService ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                </button>
                            </div>

                            {/* Lista de Servicios Agregados */}
                            {formData.services.length > 0 && (
                                <div className="space-y-2 mb-4">
                                    {formData.services.map((item, index) => {
                                        const svc = services.find(s => String(s.id) === item.serviceId);
                                        const wrks = workers.filter(w => item.workerIds.includes(String(w.id)));
                                        return (
                                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                                                <div>
                                                    <p className="font-medium text-sm">{svc?.name || 'Servicio'}</p>
                                                    <p className="text-xs text-muted-foreground">Terapistas: {wrks.map(w => w.name).join(', ')}</p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <p className="font-semibold text-primary">S/ {Number(item.totalCost).toFixed(2)}</p>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => handleRemoveService(index)}
                                                        className="text-destructive hover:bg-destructive/10 p-1.5 rounded-full"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div className="flex justify-between items-center px-2 pt-2 border-t">
                                        <p className="font-medium text-sm">Costo Total:</p>
                                        <p className="font-bold text-lg text-primary">S/ {displayTotalCost.toFixed(2)}</p>
                                    </div>

                                    {advanceAmount > 0 && (
                                        <div className="space-y-1 mt-2 pt-2 border-t px-2 border-dashed border-yellow-500/30">
                                            <div className="flex justify-between items-center text-yellow-600 dark:text-yellow-500 font-medium">
                                                <p className="text-xs italic">Adelanto registrado:</p>
                                                <p className="text-sm">- S/ {advanceAmount.toFixed(2)}</p>
                                            </div>
                                            <div className="flex justify-between items-center text-primary font-bold">
                                                <p className="text-sm uppercase">Saldo a cobrar:</p>
                                                <p className="text-xl">S/ {(displayTotalCost - advanceAmount).toFixed(2)}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Formulario para agregar servicio */}
                            <div className="bg-muted/10 p-4 rounded-lg border border-dashed space-y-4">
                                    {showNewService ? (
                            <div className="p-3 border border-dashed border-emerald-500/50 rounded-lg bg-emerald-500/5 space-y-2">
                                <p className="text-xs font-semibold text-emerald-600">Crear nuevo servicio</p>
                                <div className="grid grid-cols-3 gap-2">
                                    <input type="text" placeholder="Nombre *" value={newService.name} onChange={e => setNewService(p => ({ ...p, name: e.target.value }))}
                                        className="col-span-1 p-2 text-sm border rounded-md bg-background" autoFocus />
                                    <input type="number" placeholder="Precio S/ *" value={newService.price} onChange={e => setNewService(p => ({ ...p, price: e.target.value }))}
                                        className="p-2 text-sm border rounded-md bg-background" step="0.01" min="0" />
                                    <input type="number" placeholder="Duración (min)" value={newService.durationMin} onChange={e => setNewService(p => ({ ...p, durationMin: e.target.value }))}
                                        className="p-2 text-sm border rounded-md bg-background" min="1" />
                                </div>
                                <button type="button" onClick={handleCreateService} disabled={creatingService || !newService.name.trim() || !newService.price}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-md hover:opacity-90 disabled:opacity-50">
                                    {creatingService && <Loader2 className="h-3 w-3 animate-spin" />}
                                    {creatingService ? 'Creando...' : '✓ Crear y seleccionar'}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <input type="text" placeholder="Buscar servicio..." value={serviceSearch} onChange={e => setServiceSearch(e.target.value)}
                                        className="w-full p-2 mb-2 text-sm border rounded-md bg-background" />
                                    <select name="serviceId" value={currentServiceId} onChange={handleCurrentServiceChange}
                                        className="w-full p-2 border rounded-md bg-background">
                                        <option value="">Seleccionar servicio ({filteredServices.length})</option>
                                        {filteredServices.map(s => <option key={s.id} value={s.id}>{s.name} — S/ {s.price}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold mb-1">Costo (S/)</label>
                                        <input type="number" name="totalCost" value={currentTotalCost} onChange={e => setCurrentTotalCost(e.target.value)}
                                            className="w-full p-2 text-sm border rounded-md bg-background" step="0.01" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold mb-1">Personal Asignado *</label>
                                        <div className="grid grid-cols-1 gap-1 border p-2 rounded-md max-h-32 overflow-y-auto bg-background">
                                            {workers.map(w => (
                                                <label key={w.id} className="flex items-center gap-2 cursor-pointer p-0.5 hover:bg-muted/50 rounded">
                                                    <input type="checkbox" checked={currentWorkerIds.includes(String(w.id))} onChange={() => toggleCurrentWorker(String(w.id))} className="rounded" />
                                                    <span className="text-xs">{w.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <button type="button" onClick={handleAddService} disabled={!currentServiceId || currentWorkerIds.length === 0 || !currentTotalCost}
                                    className="w-full py-2 text-sm font-semibold border-2 border-primary text-primary hover:bg-primary/10 rounded-md transition-colors disabled:opacity-50">
                                    + Añadir a la Atención
                                </button>
                            </div>
                        )}
                        </div>

                    {/* ══ CITA ASOCIADA ══ */}
                    {formData.clientId && (
                        <div>
                            <label className="block text-sm font-semibold mb-1">Cita Asociada <span className="font-normal text-muted-foreground">(Opcional)</span></label>
                            <select name="appointmentId" value={formData.appointmentId} onChange={handleChange} className="w-full p-2 border rounded-md bg-background">
                                <option value="">Sin cita asociada</option>
                                {filteredApts.map(a => (
                                    <option key={a.id} value={a.id}>
                                        {new Date(a.date).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })} — {a.service?.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* ══ FECHA ══ */}
                    <div>
                        <label className="block text-sm font-semibold mb-1">Fecha</label>
                        <input type="date" name="date" value={formData.date} onChange={handleChange}
                            className="w-full p-2 border rounded-md bg-background" required />
                    </div>

                    {/* ══ NOTAS ══ */}
                    <div>
                        <label className="block text-sm font-semibold mb-1">Notas</label>
                        <textarea name="notes" value={formData.notes} onChange={handleChange}
                            className="w-full p-2 border rounded-md bg-background" rows={3} />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent rounded-md">Cancelar</button>
                        <button type="submit" disabled={formData.services.length === 0} className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50">
                            {attention ? 'Actualizar' : 'Guardar'} Atención
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
