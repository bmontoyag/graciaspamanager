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
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        birthday: ''
    });

    useEffect(() => {
        if (isOpen) {
            if (client) {
                setFormData({
                    name: client.name || '',
                    phone: client.phone || '',
                    email: client.email || '',
                    birthday: client.birthday ? new Date(client.birthday).toISOString().split('T')[0] : ''
                });
            } else {
                setFormData({
                    name: '',
                    phone: '',
                    email: '',
                    birthday: ''
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
                birthday: formData.birthday ? new Date(formData.birthday).toISOString() : undefined
            };

            const url = client
                ? `http://localhost:3001/clients/${client.id}`
                : 'http://localhost:3001/clients';

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
            <div className="bg-card w-full max-w-md rounded-lg border shadow-lg p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                >
                    <X className="h-5 w-5" />
                </button>

                <h2 className="text-2xl font-serif font-bold mb-6">
                    {client ? 'Editar Cliente' : 'Nuevo Cliente'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
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
            </div>
        </div>
    );
}
