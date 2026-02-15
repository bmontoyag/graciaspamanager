'use client';

import { useEffect, useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Clock } from 'lucide-react';
import BlockedSlotsManager from '@/components/settings/BlockedSlotsManager';

export default function SchedulePage() {
    const [config, setConfig] = useState({
        openTime: '09:00',
        closeTime: '21:00',
        appointmentBuffer: 10
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetch('http://localhost:3001/configuration')
            .then(res => res.json())
            .then(data => {
                if (data) {
                    setConfig({
                        openTime: data.openTime || '09:00',
                        closeTime: data.closeTime || '21:00',
                        appointmentBuffer: data.appointmentBuffer || 10
                    });
                }
            })
            .catch(console.error);
    }, []);

    const handleSave = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch('http://localhost:3001/configuration', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(config),
            });

            if (res.ok) {
                toast.success('Horarios actualizados correctamente');
            } else {
                toast.error('Error al actualizar horarios');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageContainer>
            <h1 className="text-3xl font-serif font-bold mb-8">Horarios de Atención</h1>

            <div className="grid gap-8">
                {/* General Hours */}
                <div className="bg-card border rounded-lg p-6 w-full">
                    <div className="flex items-center gap-3 mb-6">
                        <Clock className="h-6 w-6 text-primary" />
                        <h2 className="text-xl font-bold">Configuración General</h2>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="openTime">Hora de Apertura</Label>
                                <Input
                                    id="openTime"
                                    type="time"
                                    value={config.openTime}
                                    onChange={e => setConfig({ ...config, openTime: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="closeTime">Hora de Cierre</Label>
                                <Input
                                    id="closeTime"
                                    type="time"
                                    value={config.closeTime}
                                    onChange={e => setConfig({ ...config, closeTime: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="buffer">Tiempo entre citas (minutos)</Label>
                            <Input
                                id="buffer"
                                type="number"
                                min="0"
                                value={config.appointmentBuffer}
                                onChange={e => setConfig({ ...config, appointmentBuffer: parseInt(e.target.value) || 0 })}
                            />
                            <p className="text-sm text-muted-foreground">Margen de tiempo automático para limpieza/preparación entre citas.</p>
                        </div>

                        <div className="pt-4">
                            <Button onClick={handleSave} disabled={loading}>
                                {loading ? 'Guardando...' : 'Guardar Cambios'}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Blocked Slots */}
                <div className="bg-card border rounded-lg p-6 w-full">
                    <div className="flex items-center gap-3 mb-6">
                        <Clock className="h-6 w-6 text-destructive" />
                        <h2 className="text-xl font-bold">Bloqueos y Feriados</h2>
                    </div>
                    <p className="text-muted-foreground mb-6">Gestiona los días u horas en que el negocio no estará disponible para citas.</p>
                    <BlockedSlotsManager />
                </div>
            </div>
        </PageContainer>
    );
}
