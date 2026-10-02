'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

interface IssuerDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * Datos del negocio que aparecen como emisor en las cotizaciones.
 */
export default function IssuerDialog({ isOpen, onClose }: IssuerDialogProps) {
    const [formData, setFormData] = useState({
        businessName: '',
        businessRuc: '',
        businessAddress: '',
        businessPhone: '',
        businessEmail: '',
        igvRate: '18',
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        apiFetch('/configuration')
            .then(config => setFormData({
                businessName: config.businessName || 'Gracia Spa',
                businessRuc: config.businessRuc || '',
                businessAddress: config.businessAddress || '',
                businessPhone: config.businessPhone || '',
                businessEmail: config.businessEmail || '',
                igvRate: config.igvRate?.toString() || '18',
            }))
            .catch(err => toast.error(`No se pudo cargar la configuración: ${err.message}`));
    }, [isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await apiFetch('/configuration', {
                method: 'PATCH',
                body: JSON.stringify({ ...formData, igvRate: parseFloat(formData.igvRate) || 18 }),
            });
            toast.success('Datos del emisor actualizados');
            onClose();
        } catch (error: any) {
            toast.error(`Error al guardar: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border rounded-lg p-6 w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Datos del Emisor</h2>
                    <button onClick={onClose} className="hover:bg-muted rounded p-1">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                    Se muestran en el encabezado de las cotizaciones. El RUC solo aparece en las cotizaciones donde se active
                    &quot;Mostrar RUC del emisor&quot;.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Nombre comercial</label>
                        <input name="businessName" value={formData.businessName} onChange={handleChange} required className="w-full p-2 border rounded-md bg-background" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">RUC</label>
                            <input name="businessRuc" value={formData.businessRuc} onChange={handleChange} maxLength={11} className="w-full p-2 border rounded-md bg-background" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Tasa IGV (%)</label>
                            <input type="number" step="0.01" name="igvRate" value={formData.igvRate} onChange={handleChange} className="w-full p-2 border rounded-md bg-background" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Teléfono</label>
                            <input name="businessPhone" value={formData.businessPhone} onChange={handleChange} className="w-full p-2 border rounded-md bg-background" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Email</label>
                            <input name="businessEmail" value={formData.businessEmail} onChange={handleChange} className="w-full p-2 border rounded-md bg-background" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Dirección</label>
                        <input name="businessAddress" value={formData.businessAddress} onChange={handleChange} className="w-full p-2 border rounded-md bg-background" />
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md hover:bg-muted transition">Cancelar</button>
                        <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition disabled:opacity-50">
                            {saving ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
