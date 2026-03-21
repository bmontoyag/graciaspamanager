'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ExpenseTypesPage() {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const [types, setTypes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState<number | null>(null);
    const [formData, setFormData] = useState({ name: '', description: '' });

    const fetchTypes = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`${API_URL}/expense-types`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setTypes(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching types:', error);
            toast.error('Error al cargar tipos de gastos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTypes();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('accessToken');
        const url = isEditing 
            ? `${API_URL}/expense-types/${isEditing}` 
            : `${API_URL}/expense-types`;
        
        try {
            const res = await fetch(url, {
                method: isEditing ? 'PATCH' : 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast.success(isEditing ? 'Tipo actualizado' : 'Tipo creado');
                setFormData({ name: '', description: '' });
                setIsEditing(null);
                fetchTypes();
            } else {
                toast.error('Error al guardar');
            }
        } catch (error) {
            toast.error('Error de conexión');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Estás seguro de eliminar este tipo?')) return;
        const token = localStorage.getItem('accessToken');
        try {
            const res = await fetch(`${API_URL}/expense-types/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                toast.success('Tipo eliminado');
                fetchTypes();
            } else {
                toast.error('Error al eliminar');
            }
        } catch (error) {
            toast.error('Error de conexión');
        }
    };

    return (
        <PageContainer>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-serif font-bold">Tipos de Gastos</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-card border rounded-lg p-6 h-fit">
                    <h2 className="text-xl font-bold mb-4">{isEditing ? 'Editar Tipo' : 'Nuevo Tipo'}</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Nombre</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full p-2 border rounded-md bg-background"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Descripción</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full p-2 border rounded-md bg-background h-24"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit" className="flex-1 gap-2">
                                <Save className="h-4 w-4" />
                                {isEditing ? 'Actualizar' : 'Crear'}
                            </Button>
                            {isEditing && (
                                <Button 
                                    type="button" 
                                    variant="outline"
                                    onClick={() => {
                                        setIsEditing(null);
                                        setFormData({ name: '', description: '' });
                                    }}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </form>
                </div>

                <div className="md:col-span-2 bg-card border rounded-lg p-6">
                    <h2 className="text-xl font-bold mb-4">Listado de Tipos</h2>
                    {loading ? (
                        <p>Cargando...</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b">
                                        <th className="py-2">Nombre</th>
                                        <th className="py-2">Descripción</th>
                                        <th className="py-2 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {types.map((type) => (
                                        <tr key={type.id} className="border-b hover:bg-muted/30">
                                            <td className="py-3 font-medium">{type.name}</td>
                                            <td className="py-3 text-sm text-muted-foreground">{type.description}</td>
                                            <td className="py-3 text-right space-x-2">
                                                <button
                                                    onClick={() => {
                                                        setIsEditing(type.id);
                                                        setFormData({ name: type.name, description: type.description || '' });
                                                    }}
                                                    className="p-1 hover:text-primary transition-colors"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(type.id)}
                                                    className="p-1 hover:text-destructive transition-colors"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {types.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="py-8 text-center text-muted-foreground">
                                                No hay tipos registrados
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </PageContainer>
    );
}
