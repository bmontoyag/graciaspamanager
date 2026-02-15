'use client';

import { useState, useEffect } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database, Download, Mail, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function BackupPage() {
    const [loading, setLoading] = useState(false);
    const [config, setConfig] = useState({
        backupEnabled: false,
        backupFrequency: 'daily',
        backupTime: '02:00',
        backupEmail: ''
    });

    useEffect(() => {
        // Fetch current config
        fetch('http://localhost:3001/configuration')
            .then(res => res.json())
            .then(data => {
                if (data) {
                    setConfig({
                        backupEnabled: data.backupEnabled || false,
                        backupFrequency: data.backupFrequency || 'daily',
                        backupTime: data.backupTime || '02:00',
                        backupEmail: data.backupEmail || ''
                    });
                }
            })
            .catch(console.error);
    }, []);

    const handleDownload = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('accessToken');
            const response = await fetch('http://localhost:3001/backup/download', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Backup download failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup-${new Date().toISOString().slice(0, 10)}.sql`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success('Backup descargado correctamente');
        } catch (error) {
            console.error(error);
            toast.error('Error al descargar el backup');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveConfig = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('accessToken');
            const res = await fetch('http://localhost:3001/configuration', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(config)
            });

            if (!res.ok) throw new Error('Failed to update config');

            toast.success('Configuración de backup actualizada');
        } catch (error) {
            console.error(error);
            toast.error('Error al guardar configuración');
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageContainer>
            <h1 className="text-3xl font-serif font-bold mb-8">Backup y Restauración</h1>

            <div className="grid gap-8">
                {/* Manual Backup */}
                <div className="bg-card border rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Database className="h-6 w-6 text-primary" />
                        <h2 className="text-xl font-bold">Copia de Seguridad Manual</h2>
                    </div>
                    <p className="text-muted-foreground mb-6">
                        Descarga una copia completa de la base de datos actual. Se recomienda hacer esto antes de realizar cambios importantes.
                    </p>
                    <Button onClick={handleDownload} disabled={loading} className="w-full sm:w-auto">
                        <Download className="mr-2 h-4 w-4" />
                        {loading ? 'Procesando...' : 'Descargar Backup Global'}
                    </Button>
                </div>

                {/* Scheduled Backup */}
                <div className="bg-card border rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Clock className="h-6 w-6 text-primary" />
                        <h2 className="text-xl font-bold">Backup Automático</h2>
                    </div>
                    <p className="text-muted-foreground mb-6">
                        Configura el envío automático de copias de seguridad a tu correo electrónico.
                    </p>

                    <div className="space-y-6 max-w-2xl">
                        <div className="flex items-center justify-between border p-4 rounded-lg">
                            <div className="space-y-0.5">
                                <Label className="text-base">Habilitar Backup Automático</Label>
                                <p className="text-sm text-muted-foreground">
                                    El sistema enviará el backup al correo configurado.
                                </p>
                            </div>
                            <Switch
                                checked={config.backupEnabled}
                                onCheckedChange={(checked) => setConfig({ ...config, backupEnabled: checked })}
                            />
                        </div>

                        {config.backupEnabled && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <Label>Frecuencia</Label>
                                    <Select
                                        value={config.backupFrequency}
                                        onValueChange={(val) => setConfig({ ...config, backupFrequency: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar frecuencia" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="daily">Diario</SelectItem>
                                            <SelectItem value="weekly">Semanal (Lunes)</SelectItem>
                                            <SelectItem value="monthly">Mensual (1ro del mes)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Hora de Ejecución</Label>
                                    <Input
                                        type="time"
                                        value={config.backupTime}
                                        onChange={(e) => setConfig({ ...config, backupTime: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <Label>Correo de Destino</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="email"
                                            placeholder="admin@ejemplo.com"
                                            className="pl-9"
                                            value={config.backupEmail}
                                            onChange={(e) => setConfig({ ...config, backupEmail: e.target.value })}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">Asegúrate de haber configurado las credenciales SMTP en el servidor.</p>
                                </div>
                            </div>
                        )}

                        <Button onClick={handleSaveConfig} disabled={loading} variant="default">
                            {loading ? 'Guardando...' : 'Guardar Configuración'}
                        </Button>
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}
