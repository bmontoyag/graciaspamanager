'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import AttentionDialog from '@/components/attentions/AttentionDialog';
import { PageContainer } from '@/components/layout/PageContainer';

export default function AttentionsPage() {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const [attentions, setAttentions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedAttention, setSelectedAttention] = useState<any>(null);
    const [filter, setFilter] = useState('');

    const fetchAttentions = () => {
        setLoading(true);
        fetch(`${API_URL}/attentions`)
            .then(res => res.json())
            .then(data => {
                setAttentions(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching attentions:', err);
                setAttentions([]);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchAttentions();
    }, []);

    const handleEdit = (attention: any) => {
        setSelectedAttention(attention);
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Está seguro de eliminar esta atención?')) return;

        try {
            const res = await fetch(`${API_URL}/attentions/${id}`, {
                method: 'DELETE'
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to delete');
            }
            fetchAttentions();
        } catch (error: any) {
            console.error('Error deleting attention:', error);
            alert(`Error al eliminar la atención: ${error.message}`);
        }
    };

    const filteredAttentions = attentions.filter(a =>
        a.client?.name.toLowerCase().includes(filter.toLowerCase()) ||
        a.service?.name.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <PageContainer>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-3xl font-serif font-bold">Atenciones</h1>
                <button
                    onClick={() => {
                        setSelectedAttention(null);
                        setIsDialogOpen(true);
                    }}
                    className="w-full sm:w-auto justify-center bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 hover:opacity-90"
                >
                    <Plus className="h-4 w-4" />
                    Nueva Atención
                </button>
            </div>

            <div className="bg-card rounded-lg border shadow-sm p-4 mb-6">
                <div className="flex items-center gap-2">
                    <Search className="text-muted-foreground h-4 w-4" />
                    <input
                        type="text"
                        placeholder="Buscar por cliente o servicio..."
                        className="bg-transparent outline-none w-full"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left min-w-[700px]">
                        <thead className="bg-muted/50 border-b">
                            <tr>
                                <th className="p-4 font-medium">Fecha</th>
                                <th className="p-4 font-medium">Cliente</th>
                                <th className="p-4 font-medium">Servicio</th>
                                <th className="p-4 font-medium">Personal</th>
                                <th className="p-4 font-medium text-right">Costo</th>
                                <th className="p-4 font-medium text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Cargando...</td></tr>
                            )}
                            {!loading && filteredAttentions.length === 0 && (
                                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No se encontraron atenciones.</td></tr>
                            )}
                            {filteredAttentions.map((att) => (
                                <tr key={att.id} className="border-b hover:bg-muted/50 transition">
                                    <td className="p-4">{new Date(att.date).toLocaleDateString()}</td>
                                    <td className="p-4 font-medium">{att.client?.name || 'Cliente Eliminado'}</td>
                                    <td className="p-4 text-muted-foreground">{att.service?.name || 'Legacy Service'}</td>
                                    <td className="p-4">
                                        <div className="flex flex-col gap-1">
                                            {att.workers && att.workers.map((w: any) => (
                                                <span key={w.id} className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs w-fit">
                                                    {w.worker?.name}
                                                </span>
                                            ))}
                                            {(!att.workers || att.workers.length === 0) && <span className="text-muted-foreground">-</span>}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right font-mono">S/ {Number(att.totalCost).toFixed(2)}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(att)}
                                                className="p-2 hover:bg-accent rounded"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(att.id)}
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

                <AttentionDialog
                    isOpen={isDialogOpen}
                    onClose={() => {
                        setIsDialogOpen(false);
                        setSelectedAttention(null);
                    }}
                    onSave={fetchAttentions}
                    attention={selectedAttention}
                />
        </PageContainer>
    );
}
