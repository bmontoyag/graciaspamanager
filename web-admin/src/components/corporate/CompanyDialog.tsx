'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface CompanyDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (company: any) => void;
    company?: any;
}

const EMPTY = { name: '', ruc: '', contactName: '', contactPhone: '', contactEmail: '', address: '', notes: '' };

export default function CompanyDialog({ isOpen, onClose, onSave, company }: CompanyDialogProps) {
    const [formData, setFormData] = useState(EMPTY);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setFormData(company
            ? Object.fromEntries(Object.keys(EMPTY).map(k => [k, company[k] || ''])) as typeof EMPTY
            : EMPTY);
    }, [company, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            // Los campos vacíos se envían como undefined para no fallar la validación de email
            const payload = Object.fromEntries(
                Object.entries(formData).map(([k, v]) => [k, v.trim() === '' ? undefined : v.trim()])
            );
            const saved = await apiFetch(company ? `/companies/${company.id}` : '/companies', {
                method: company ? 'PATCH' : 'POST',
                body: JSON.stringify(payload),
            });
            toast.success(company ? 'Empresa actualizada' : 'Empresa registrada');
            onSave(saved);
            onClose();
        } catch (error: any) {
            toast.error(`Error al guardar la empresa: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };


    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{company ? 'Editar Empresa' : 'Nueva Empresa'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Razón social / Nombre *</label>
                        <input name="name" value={formData.name} onChange={handleChange} required className="w-full p-2 border rounded-md bg-card" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">RUC (opcional)</label>
                            <input name="ruc" value={formData.ruc} onChange={handleChange} maxLength={11} className="w-full p-2 border rounded-md bg-card" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Contacto</label>
                            <input name="contactName" value={formData.contactName} onChange={handleChange} className="w-full p-2 border rounded-md bg-card" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Teléfono</label>
                            <input name="contactPhone" value={formData.contactPhone} onChange={handleChange} className="w-full p-2 border rounded-md bg-card" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Email</label>
                            <input type="email" name="contactEmail" value={formData.contactEmail} onChange={handleChange} className="w-full p-2 border rounded-md bg-card" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Dirección</label>
                        <input name="address" value={formData.address} onChange={handleChange} className="w-full p-2 border rounded-md bg-card" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Notas</label>
                        <textarea name="notes" value={formData.notes} onChange={handleChange} rows={2} className="w-full p-2 border rounded-md bg-card" />
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md hover:bg-muted transition">Cancelar</button>
                        <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition disabled:opacity-50">
                            {saving ? 'Guardando...' : company ? 'Actualizar' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
