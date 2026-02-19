'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Tag } from 'lucide-react';
import ServiceDialog from '@/components/services/ServiceDialog';
import { PageContainer } from '@/components/layout/PageContainer';

export default function ServicesPage() {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const [services, setServices] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<any>(null);
    const [filterCategory, setFilterCategory] = useState<string>('');
    const [showCategoryForm, setShowCategoryForm] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    const fetchServices = () => {
        setLoading(true);
        fetch(`${API_URL}/services`)
            .then(res => res.json())
            .then(data => {
                setServices(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching services:', err);
                setServices([]);
                setLoading(false);
            });
    };

    const fetchCategories = () => {
        fetch(`${API_URL}/service-categories`)
            .then(res => res.json())
            .then(data => setCategories(Array.isArray(data) ? data : []))
            .catch(err => console.error('Error fetching categories:', err));
    };

    useEffect(() => {
        fetchServices();
        fetchCategories();
    }, []);

    const handleEdit = (service: any) => {
        setSelectedService(service);
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Está seguro de eliminar este servicio?')) return;

        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`${API_URL}/services/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!res.ok) throw new Error('Failed to delete');
            fetchServices();
        } catch (error) {
            console.error('Error deleting service:', error);
            alert('Error al eliminar el servicio');
        }
    };

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;

        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`${API_URL}/service-categories`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: newCategoryName })
            });
            if (!res.ok) throw new Error('Failed to create category');

            setNewCategoryName('');
            // setShowCategoryForm(false); // Keep open to add more or manage
            fetchCategories();
        } catch (error) {
            console.error('Error creating category:', error);
            alert('Error al crear la categoría');
        }
    };

    const handleDeleteCategory = async (id: number) => {
        if (!confirm('¿Está seguro de eliminar esta categoría?')) return;
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`${API_URL}/service-categories/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!res.ok) throw new Error('Failed to delete category');
            fetchCategories();
        } catch (error) {
            console.error('Error deleting category:', error);
            alert('Error al eliminar la categoría');
        }
    };

    const handleEditCategory = async (cat: any) => {
        const newName = prompt('Nuevo nombre para la categoría:', cat.name);
        if (!newName || newName === cat.name) return;

        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`${API_URL}/service-categories/${cat.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: newName })
            });
            if (!res.ok) throw new Error('Failed to update category');
            fetchCategories();
        } catch (error) {
            console.error('Error updating category:', error);
            alert('Error al actualizar la categoría');
        }
    };

    const filteredServices = filterCategory
        ? services.filter(s => s.categoryId?.toString() === filterCategory)
        : services;

    return (
        <PageContainer>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-3xl font-serif font-bold">Servicios</h1>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button
                        onClick={() => setShowCategoryForm(!showCategoryForm)}
                        className="flex-1 sm:flex-none justify-center bg-secondary text-secondary-foreground px-4 py-2 rounded-md flex items-center gap-2 hover:opacity-90"
                    >
                        <Tag className="h-4 w-4" />
                        Categorías
                    </button>
                    <button
                        onClick={() => {
                            setSelectedService(null);
                            setIsDialogOpen(true);
                        }}
                        className="flex-1 sm:flex-none justify-center bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 hover:opacity-90"
                    >
                        <Plus className="h-4 w-4" />
                        Nuevo Servicio
                    </button>
                </div>
            </div>

            {showCategoryForm && (
                <div className="bg-card border rounded-lg p-4 mb-6">
                    <h3 className="font-bold mb-3">Gestionar Categorías</h3>
                    <div className="flex gap-2 mb-4">
                        <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="Nueva categoría"
                            className="flex-1 p-2 border rounded-md bg-background"
                            onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                        />
                        <button
                            onClick={handleAddCategory}
                            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90"
                        >
                            Agregar
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {categories.map(cat => (
                            <div key={cat.id} className="flex items-center gap-1 bg-muted px-3 py-1 rounded-full text-sm group">
                                <span>{cat.name}</span>
                                <button
                                    onClick={() => handleEditCategory(cat)}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-blue-600 transition-opacity"
                                >
                                    <Edit className="h-3 w-3" />
                                </button>
                                <button
                                    onClick={() => handleDeleteCategory(cat.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-600 transition-opacity"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="mb-4">
                <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="p-2 border rounded-md bg-background"
                >
                    <option value="">Todas las categorías</option>
                    {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
            </div>

            <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left min-w-[600px]">
                        <thead className="bg-muted/50 border-b">
                            <tr>
                                <th className="p-4 font-medium">Servicio</th>
                                <th className="p-4 font-medium">Categoría</th>
                                <th className="p-4 font-medium">Duración</th>
                                <th className="p-4 font-medium text-right">Precio</th>
                                <th className="p-4 font-medium">Estado</th>
                                <th className="p-4 font-medium text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Cargando...</td></tr>
                            )}
                            {!loading && filteredServices.length === 0 && (
                                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No hay servicios registrados.</td></tr>
                            )}
                            {filteredServices.map((service) => (
                                <tr key={service.id} className="border-b hover:bg-muted/50 transition">
                                    <td className="p-4">
                                        <div className="font-medium">{service.name}</div>
                                        {service.description && (
                                            <div className="text-xs text-muted-foreground">{service.description}</div>
                                        )}
                                    </td>
                                    <td className="p-4 text-muted-foreground">
                                        {service.category?.name || 'Sin categoría'}
                                    </td>
                                    <td className="p-4">{service.durationMin} min</td>
                                    <td className="p-4 text-right font-mono">S/.{Number(service.price).toFixed(2)}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs ${service.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                            }`}>
                                            {service.isActive ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(service)}
                                                className="p-2 hover:bg-accent rounded"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(service.id)}
                                                className="p-2 hover:bg-accent rounded text-red-600"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <ServiceDialog
                isOpen={isDialogOpen}
                onClose={() => {
                    setIsDialogOpen(false);
                    setSelectedService(null);
                }}
                onSave={fetchServices}
                service={selectedService}
            />
        </PageContainer>
    );
}
