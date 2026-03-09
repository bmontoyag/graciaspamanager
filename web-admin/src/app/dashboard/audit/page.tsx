'use client';

import { useEffect, useState } from 'react';
import { History, Search, ShieldAlert } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    // Para la seguridad de la vista:
    const [hasAccess, setHasAccess] = useState(false);

    useEffect(() => {
        const storedPermissions = localStorage.getItem('userPermissions');
        const role = localStorage.getItem('userRole');

        let permissions: string[] = [];
        if (storedPermissions) {
            permissions = JSON.parse(storedPermissions);
        }

        // Permitimos acceso a Administradores (rol "Admin" o permiso "all")
        if (role === 'Admin' || permissions.includes('all')) {
            setHasAccess(true);
            fetchLogs();
        } else {
            setLoading(false);
        }
    }, []);

    const fetchLogs = async () => {
        try {
            const res = await fetch(`${API_URL}/audit-logs`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setLogs(data);
            }
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!hasAccess && !loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                <ShieldAlert className="h-16 w-16 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Acceso Denegado</h2>
                <p className="text-muted-foreground max-w-md">
                    No tienes los permisos necesarios para visualizar el registro de auditoría del sistema. Consulta con un administrador.
                </p>
            </div>
        );
    }

    const formatDetailsForTooltip = (data: any) => {
        if (!data) return '';
        try {
            const parsed = typeof data === 'string' ? JSON.parse(data) : data;
            return JSON.stringify(parsed, null, 2);
        } catch (e) {
            return String(data);
        }
    };

    const renderCompactDetails = (data: any) => {
        if (!data) return '-';
        try {
            const parsed = typeof data === 'string' ? JSON.parse(data) : data;
            if (typeof parsed !== 'object' || parsed === null) return String(parsed);

            return Object.entries(parsed)
                .map(([key, value]) => {
                    const strValue = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value);
                    return `${key}: ${strValue}`;
                })
                .join(' • ');
        } catch (e) {
            return String(data);
        }
    };

    const filteredLogs = logs.filter(log => {
        const text = `${log.action} ${log.entity} ${log.user?.name || ''} ${renderCompactDetails(log.newData)}`.toLowerCase();
        return text.includes(searchTerm.toLowerCase());
    });

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleString('es-ES', {
            dateStyle: 'medium',
            timeStyle: 'medium',
        });
    };

    const getActionBadge = (action: string) => {
        const normalizedAction = action?.toUpperCase() || '';
        if (['CREATE', 'CREA', 'POST'].includes(normalizedAction)) {
            return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">NUEVO</span>;
        }
        if (['UPDATE', 'EDITA', 'PATCH', 'PUT'].includes(normalizedAction)) {
            return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">EDICIÓN</span>;
        }
        if (['DELETE', 'ELIMINA'].includes(normalizedAction)) {
            return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">ELIMINACIÓN</span>;
        }
        if (normalizedAction === 'LOGIN') {
            return <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">ACCESO</span>;
        }
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">{action}</span>;
    };

    return (
        <div className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-lg">
                        <History className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-serif font-bold">Registro de Auditoría</h1>
                        <p className="text-muted-foreground text-sm">Monitoreo de la actividad de los usuarios en el sistema</p>
                    </div>
                </div>

                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Buscar por usuario, acción o entidad..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-shadow"
                    />
                </div>
            </div>

            <Card className="border-0 shadow-md h-[calc(100vh-180px)] overflow-hidden flex flex-col">
                <CardHeader className="bg-muted/30 border-b pb-4 shrink-0">
                    <CardTitle className="text-lg font-medium flex items-center justify-between">
                        Historial de Eventos
                        <span className="text-xs font-normal text-muted-foreground bg-background px-3 py-1 rounded-full border">
                            {filteredLogs.length} registros encontrados
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-auto flex-1">
                    {loading ? (
                        <div className="flex justify-center items-center h-48">
                            <span className="text-muted-foreground animate-pulse">Cargando bitácora de auditoría...</span>
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                            <History className="h-12 w-12 mb-3 opacity-20" />
                            <p>No se encontraron registros de auditoría</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground bg-muted/20 sticky top-0 z-10 uppercase">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Fecha y Hora</th>
                                    <th className="px-6 py-4 font-medium">Usuario</th>
                                    <th className="px-6 py-4 font-medium">Tabla / Recurso</th>
                                    <th className="px-6 py-4 font-medium">Acción</th>
                                    <th className="px-6 py-4 font-medium">Detalles (JSON)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-muted/10 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                                            {formatDate(log.createdAt)}
                                        </td>
                                        <td className="px-6 py-4 font-medium whitespace-nowrap">
                                            {log.user?.name || <span className="text-xs italic font-normal opacity-70">Sistema / Anónimo</span>}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs">
                                            {log.entity} <span className="opacity-50 ml-1">#{log.entityId}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getActionBadge(log.action)}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-[10px] text-muted-foreground max-w-[300px]">
                                            <div className="truncate cursor-pointer hover:text-foreground transition-colors" title={formatDetailsForTooltip(log.newData)}>
                                                {renderCompactDetails(log.newData)}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
