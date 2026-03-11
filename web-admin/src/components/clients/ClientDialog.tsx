'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface ClientDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    client?: any;
}

export default function ClientDialog({ isOpen, onClose, onSave, client }: ClientDialogProps) {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const [activeTab, setActiveTab] = useState<'profile' | 'history'>('profile');
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        birthday: '',
        discoverySource: ''
    });

    const [discoverySources, setDiscoverySources] = useState<string[]>([]);

    useEffect(() => {
        // Load discovery sources
        fetch(`${API_URL}/configuration`)
            .then(res => res.json())
            .then(config => {
                if (config.discoverySources) {
                    setDiscoverySources(config.discoverySources);
                }
            })
            .catch(console.error);
    }, [API_URL]);

    useEffect(() => {
        if (isOpen) {
            if (client) {
                setFormData({
                    name: client.name || '',
                    phone: client.phone || '',
                    email: client.email || '',
                    birthday: client.birthday ? new Date(client.birthday).toISOString().split('T')[0] : '',
                    discoverySource: client.discoverySource || ''
                });
            } else {
                setActiveTab('profile'); // Always start new clients on profile tab
                setFormData({
                    name: '',
                    phone: '',
                    email: '',
                    birthday: '',
                    discoverySource: ''
                });
            }
        }
    }, [isOpen, client]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                name: formData.name,
                phone: formData.phone || undefined,
                email: formData.email || undefined,
                birthday: formData.birthday ? new Date(formData.birthday).toISOString() : undefined,
                discoverySource: formData.discoverySource || undefined
            };

            const url = client
                ? `${API_URL}/clients/${client.id}`
                : `${API_URL}/clients`;

            const res = await fetch(url, {
                method: client ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Failed to save client');

            onSave();
            onClose();
        } catch (error) {
            console.error('Error saving client:', error);
            alert('Error al guardar el cliente');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-card w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border shadow-lg p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="mb-6">
                    <h2 className="text-2xl font-serif font-bold">
                        {client ? `Expediente: ${client.name}` : 'Nuevo Cliente'}
                    </h2>
                    {client && (
                        <p className="text-sm text-muted-foreground mt-1">
                            Puntos de Fidelidad: <strong className="text-primary">{client.loyaltyPoints || 0} pts</strong>
                        </p>
                    )}
                </div>

                {client && (
                    <div className="flex border-b mb-6 border-border">
                        <button
                            type="button"
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'profile' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                            onClick={() => setActiveTab('profile')}
                        >
                            Perfil y Datos
                        </button>
                        <button
                            type="button"
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                            onClick={() => setActiveTab('history')}
                        >
                            Historial Médico (Atenciones)
                        </button>
                    </div>
                )}

                {activeTab === 'profile' && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium mb-1">Nombre Completo *</label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    className="w-full p-2 rounded-md border bg-background"
                                    value={formData.name}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Teléfono</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    className="w-full p-2 rounded-md border bg-background"
                                    value={formData.phone}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    className="w-full p-2 rounded-md border bg-background"
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Cumpleaños</label>
                                <input
                                    type="date"
                                    name="birthday"
                                    className="w-full p-2 rounded-md border bg-background"
                                    value={formData.birthday}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">¿De dónde nos conoció?</label>
                                <select
                                    name="discoverySource"
                                    className="w-full p-2 rounded-md border bg-background"
                                    value={formData.discoverySource}
                                    onChange={handleChange as any}
                                >
                                    <option value="">Seleccionar (Opcional)</option>
                                    {discoverySources.map((source, idx) => (
                                        <option key={idx} value={source}>{source}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="mr-2 px-4 py-2 text-sm hover:bg-accent rounded-md"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition"
                            >
                                {client ? 'Actualizar' : 'Guardar'} Cliente
                            </button>
                        </div>
                    </form>
                )}

                {activeTab === 'history' && client && (
                    <div className="space-y-4">
                        {(!client.attentions || client.attentions.length === 0) ? (
                            <p className="text-center text-muted-foreground py-8 border rounded-lg bg-muted/20">
                                Este paciente aún no tiene un historial de atenciones de Spa.
                            </p>
                        ) : (
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted/50 border-b">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Fecha</th>
                                            <th className="px-4 py-3 font-medium">Servicio</th>
                                            <th className="px-4 py-3 font-medium">Costo Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {client.attentions.map((att: any) => (
                                            <tr key={att.id} className="hover:bg-muted/30">
                                                <td className="px-4 py-3">
                                                    {new Date(att.date).toLocaleDateString('es-ES', {
                                                        year: 'numeric', month: 'short', day: '2-digit'
                                                    })}
                                                </td>
                                                <td className="px-4 py-3 font-medium">
                                                    {att.service?.name || 'Servicio General'}
                                                </td>
                                                <td className="px-4 py-3 text-green-600 font-medium">
                                                    S/ {Number(att.totalCost || 0).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <div className="flex justify-end pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm bg-accent hover:bg-zinc-200 rounded-md"
                            >
                                Cerrar Ventana
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}
