'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit } from 'lucide-react';
import ClientDialog from '../../../components/clients/ClientDialog';
import { PageContainer } from '@/components/layout/PageContainer';

interface Client {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    birthday: string | null;
    loyaltyPoints: number;
}

export default function ClientsPage() {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | undefined>(undefined);

    const fetchClients = () => {
        setLoading(true);
        fetch(`${API_URL}/clients`)
            .then((res) => res.json())
            .then((data) => {
                setClients(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch((err) => {
                console.error('Failed to fetch clients', err);
                setClients([]);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchClients();
    }, []);

    const handleEdit = (client: Client) => {
        setSelectedClient(client);
        setIsDialogOpen(true);
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
    };

    return (
        <PageContainer>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-serif font-bold">Gestión de Clientes</h1>
                <button
                    onClick={() => {
                        setSelectedClient(undefined);
                        setIsDialogOpen(true);
                    }}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 hover:opacity-90 transition"
                >
                    <Plus className="h-4 w-4" />
                    Nuevo Cliente
                </button>
            </div>

            <ClientDialog
                isOpen={isDialogOpen}
                onClose={() => {
                    setIsDialogOpen(false);
                    setSelectedClient(undefined);
                }}
                onSave={fetchClients}
                client={selectedClient}
            />

            <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
                {loading ? (
                    <p className="p-6 text-center">Cargando clientes...</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 border-b">
                                <tr>
                                    <th className="px-4 py-3">Nombre</th>
                                    <th className="px-4 py-3">Teléfono</th>
                                    <th className="px-4 py-3">Cumpleaños</th>
                                    <th className="px-4 py-3">Puntos</th>
                                    <th className="px-4 py-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clients.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-6 text-center text-muted-foreground">
                                            No hay clientes registrados.
                                        </td>
                                    </tr>
                                )}
                                {clients.map((client) => (
                                    <tr key={client.id} className="border-b last:border-b-0 hover:bg-muted/50">
                                        <td className="px-4 py-3 font-medium">{client.name}</td>
                                        <td className="px-4 py-3">{client.phone || '-'}</td>
                                        <td className="px-4 py-3">{formatDate(client.birthday)}</td>
                                        <td className="px-4 py-3">{client.loyaltyPoints}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => handleEdit(client)}
                                                className="p-2 hover:bg-accent rounded inline-flex items-center"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {clients.length > 0 && (
                            <p className="p-4 text-xs text-muted-foreground border-t">
                                Total: {clients.length} clientes
                            </p>
                        )}
                    </div>
                )}
            </div>
        </PageContainer>
    );
}
