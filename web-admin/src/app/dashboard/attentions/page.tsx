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
    const [dateFilter, setDateFilter] = useState('');
    const [serviceFilter, setServiceFilter] = useState('all');
    const [therapistFilter, setTherapistFilter] = useState('all');

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

    // Extraer valores únicos de las atenciones para los filtros
    const uniqueTherapists = Array.from(new Set(
        attentions.flatMap(a => a.workers?.map((w: any) => JSON.stringify({ id: w.workerId, name: w.worker?.name })) || [])
    )).map((str: any) => JSON.parse(str));

    const uniqueServices = Array.from(new Set(
        attentions.map(a => JSON.stringify({ id: a.service?.id, name: a.service?.name }))
    )).filter(str => str !== 'undefined').map((str: any) => JSON.parse(str));

    const filteredAttentions = attentions.filter(a => {
        const matchesText = a.client?.name.toLowerCase().includes(filter.toLowerCase()) ||
            a.service?.name.toLowerCase().includes(filter.toLowerCase());

        const matchesTherapist = therapistFilter === 'all' ||
            a.workers?.some((w: any) => w.workerId.toString() === therapistFilter);

        const matchesService = serviceFilter === 'all' ||
            a.service?.id?.toString() === serviceFilter;

        const matchesDate = !dateFilter || (a.date && a.date.startsWith(dateFilter));

        return matchesText && matchesTherapist && matchesService && matchesDate;
    });

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
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex items-center gap-2 flex-1 relative">
                        <Search className="text-muted-foreground h-4 w-4 absolute left-3" />
                        <input
                            type="text"
                            placeholder="Buscar por cliente o servicio..."
                            className="bg-background border rounded-md pl-9 pr-3 py-2 w-full outline-none focus:ring-1 focus:ring-primary/50 text-sm"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground whitespace-nowrap">Fecha:</span>
                            <input
                                type="date"
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                                className="bg-background border rounded-md px-2 py-1.5 text-sm outline-none w-full sm:w-[140px]"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground whitespace-nowrap">Servicio:</span>
                            <select
                                value={serviceFilter}
                                onChange={(e) => setServiceFilter(e.target.value)}
                                className="bg-background border rounded-md px-2 py-1.5 text-sm outline-none w-full sm:w-[130px]"
                            >
                                <option value="all">Todos</option>
                                {uniqueServices.map((s: any) => s.id && (
                                    <option key={s.id} value={s.id.toString()}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground whitespace-nowrap">Terapeuta:</span>
                            <select
                                value={therapistFilter}
                                onChange={(e) => setTherapistFilter(e.target.value)}
                                className="bg-background border rounded-md px-2 py-1.5 text-sm outline-none w-full sm:w-[130px]"
                            >
                                <option value="all">Todos</option>
                                {uniqueTherapists.map((t: any) => (
                                    <option key={t.id} value={t.id.toString()}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
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
