'use client';

import { useEffect, useState } from 'react';
import { Gift, Award, CheckCircle, Search, RefreshCw } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { toast } from 'sonner';

interface Client {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    loyaltyPoints: number;
}

export default function LoyaltyPage() {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [redeemingId, setRedeemingId] = useState<number | null>(null);
    const [syncing, setSyncing] = useState(false);
    const REDEEM_COST = 10; // Number of points needed for a reward

    const fetchClients = () => {
        setLoading(true);
        fetch(`${API_URL}/clients`)
            .then((res) => res.json())
            .then((data) => {
                const arr = Array.isArray(data) ? data : [];
                // Sort by points descending
                const sorted = arr.sort((a, b) => (b.loyaltyPoints || 0) - (a.loyaltyPoints || 0));
                setClients(sorted);
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

    const handleRedeem = async (client: Client) => {
        if (!confirm(`¿Estás seguro de canjear ${REDEEM_COST} puntos de ${client.name} por una promoción?`)) return;

        setRedeemingId(client.id);

        try {
            const newPoints = (client.loyaltyPoints || 0) - REDEEM_COST;
            const res = await fetch(`${API_URL}/clients/${client.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ loyaltyPoints: newPoints })
            });

            if (!res.ok) throw new Error('Failed to update points');

            toast.success(`¡Promoción canjeada para ${client.name}! Le quedan ${newPoints} puntos.`);
            fetchClients();
        } catch (error) {
            console.error('Error redeeming points:', error);
            toast.error('Error al canjear los puntos. Intente nuevamente.');
        } finally {
            setRedeemingId(null);
        }
    };

    const filteredClients = clients.filter(c => {
        const query = searchTerm.toLowerCase();
        return c.name.toLowerCase().includes(query) || (c.phone && c.phone.includes(query));
    });

    const handleSync = async () => {
        if (!confirm('¿Desea escanear el historial completo y recalcular los puntos de todos los pacientes? Dependiendo de la cantidad de atenciones, esto puede tardar unos segundos.')) return;
        setSyncing(true);
        try {
            const res = await fetch(`${API_URL}/clients/sync-loyalty`, {
                method: 'POST'
            });
            if (!res.ok) throw new Error('Error en sincronización');

            const data = await res.json();
            toast.success(`Sincronización completa. Se actualizaron ${data.updatedClients} pacientes.`);
            fetchClients(); // recargar
        } catch (error) {
            console.error('Sync error:', error);
            toast.error('Ocurrió un error al sincronizar puntos retroactivos.');
        } finally {
            setSyncing(false);
        }
    };

    return (
        <PageContainer>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-amber-600 flex items-center gap-2">
                        <Gift className="h-8 w-8" />
                        Fidelidad y Recompensas
                    </h1>
                    <p className="text-muted-foreground mt-1">Acumula 1 punto por cada atención médica o de spa finalizada.</p>
                </div>
                <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition disabled:opacity-50"
                >
                    <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Calculando...' : 'Sincronizar Historial Pasado'}
                </button>
            </div>

            <div className="bg-card rounded-lg border shadow-sm p-6 mb-6">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Buscar paciente por nombre o teléfono..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                    </div>
                    <div className="flex bg-amber-100 text-amber-800 px-4 py-2 rounded-md items-center gap-2 w-full md:w-auto font-medium">
                        <Award className="h-5 w-5" />
                        <span>Costo Promo: <strong className="text-xl mx-1">{REDEEM_COST}</strong> pts</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left min-w-[600px]">
                        <thead className="bg-muted/50 border-y">
                            <tr>
                                <th className="px-4 py-3 font-medium">Paciente</th>
                                <th className="px-4 py-3 font-medium">Contacto</th>
                                <th className="px-4 py-3 font-medium text-center">Progreso</th>
                                <th className="px-4 py-3 font-medium text-center">Puntos Actuales</th>
                                <th className="px-4 py-3 font-medium text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                                        Cargando listado de puntos...
                                    </td>
                                </tr>
                            ) : filteredClients.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                                        No se encontraron pacientes acumulando puntos.
                                    </td>
                                </tr>
                            ) : (
                                filteredClients.map((client) => {
                                    const points = client.loyaltyPoints || 0;
                                    const canRedeem = points >= REDEEM_COST;
                                    const progressPercent = Math.min((points / REDEEM_COST) * 100, 100);

                                    return (
                                        <tr key={client.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-4 font-medium">
                                                {client.name}
                                                {canRedeem && <AsteriskIcon className="inline-block text-amber-500 size-4 ml-1" />}
                                            </td>
                                            <td className="px-4 py-4 text-muted-foreground">
                                                {client.phone || client.email || 'Sin contacto'}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="w-full max-w-[200px] mx-auto bg-muted rounded-full h-2.5 overflow-hidden">
                                                    <div
                                                        className={`h-2.5 rounded-full ${canRedeem ? 'bg-amber-500' : 'bg-primary'}`}
                                                        style={{ width: `${progressPercent}%` }}
                                                    ></div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className={`inline-flex items-center justify-center min-w-[3rem] px-2 py-1 rounded-md font-bold text-lg
                                                    ${canRedeem ? 'bg-amber-100 text-amber-700' : 'bg-secondary text-secondary-foreground'}
                                                `}>
                                                    {points}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <button
                                                    onClick={() => handleRedeem(client)}
                                                    disabled={!canRedeem || redeemingId === client.id}
                                                    className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 ml-auto transition-all
                                                        ${canRedeem
                                                            ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                                                            : 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'}
                                                    `}
                                                >
                                                    {redeemingId === client.id ? (
                                                        'Canjeando...'
                                                    ) : canRedeem ? (
                                                        <>
                                                            <CheckCircle className="h-4 w-4" />
                                                            Canjear Promo
                                                        </>
                                                    ) : (
                                                        `Faltan ${REDEEM_COST - points}`
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </PageContainer>
    );
}

function AsteriskIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 6v12" />
            <path d="M17.196 9 6.804 15" />
            <path d="m6.804 9 10.392 6" />
        </svg>
    )
}
