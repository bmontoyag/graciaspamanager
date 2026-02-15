'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface ServiceDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    service?: any;
}

export default function ServiceDialog({ isOpen, onClose, onSave, service }: ServiceDialogProps) {
    const [categories, setCategories] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        categoryId: '',
        price: '',
        durationMin: '',
        isActive: true
    });

    useEffect(() => {
        if (isOpen) {
            fetch('http://localhost:3001/service-categories')
                .then(res => res.json())
                .then(data => setCategories(Array.isArray(data) ? data : []))
                .catch(err => console.error('Error fetching categories:', err));

            if (service) {
                setFormData({
                    name: service.name || '',
                    description: service.description || '',
                    categoryId: service.categoryId?.toString() || '',
                    price: service.price?.toString() || '',
                    durationMin: service.durationMin?.toString() || '',
                    isActive: service.isActive ?? true
                });
            } else {
                setFormData({
                    name: '',
                    description: '',
                    categoryId: '',
                    price: '',
                    durationMin: '',
                    isActive: true
                });
            }
        }
    }, [isOpen, service]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                name: formData.name,
                description: formData.description || undefined,
                categoryId: formData.categoryId ? Number(formData.categoryId) : undefined,
                price: Number(formData.price),
                durationMin: Number(formData.durationMin),
                isActive: formData.isActive
            };

            console.log('Sending service payload:', payload);

            const url = service
                ? `http://localhost:3001/services/${service.id}`
                : 'http://localhost:3001/services';

            const res = await fetch(url, {
                method: service ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.error('Backend error:', errorText);
                throw new Error(`Failed to save service: ${errorText}`);
            }

            onSave();
            onClose();
        } catch (error: any) {
            console.error('Error saving service:', error);
            alert(`Error al guardar el servicio: ${error.message}`);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">{service ? 'Editar Servicio' : 'Nuevo Servicio'}</h2>
                    <button onClick={onClose}><X className="h-5 w-5" /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Nombre del Servicio *</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="w-full p-2 border rounded-md bg-background"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Descripción</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            className="w-full p-2 border rounded-md bg-background"
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Categoría</label>
                            <select
                                name="categoryId"
                                value={formData.categoryId}
                                onChange={handleChange}
                                className="w-full p-2 border rounded-md bg-background"
                            >
                                <option value="">Sin categoría</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Duración (minutos) *</label>
                            <input
                                type="number"
                                name="durationMin"
                                value={formData.durationMin}
                                onChange={handleChange}
                                className="w-full p-2 border rounded-md bg-background"
                                required
                                min="1"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Precio (S/.) *</label>
                            <input
                                type="number"
                                name="price"
                                value={formData.price}
                                onChange={handleChange}
                                className="w-full p-2 border rounded-md bg-background"
                                step="0.01"
                                required
                                min="0"
                            />
                        </div>
                        <div className="flex items-center pt-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="isActive"
                                    checked={formData.isActive}
                                    onChange={handleChange}
                                    className="w-4 h-4"
                                />
                                <span className="text-sm font-medium">Servicio Activo</span>
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent rounded-md"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90"
                        >
                            {service ? 'Actualizar' : 'Crear'} Servicio
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
