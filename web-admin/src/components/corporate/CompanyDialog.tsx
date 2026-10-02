'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">{company ? 'Editar Empresa' : 'Nueva Empresa'}</h2>
                    <button onClick={onClose} className="hover:bg-muted rounded p-1">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Razón social / Nombre *</label>
                        <input name="name" value={formData.name} onChange={handleChange} required className="w-full p-2 border rounded-md bg-background" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">RUC (opcional)</label>
                            <input name="ruc" value={formData.ruc} onChange={handleChange} maxLength={11} className="w-full p-2 border rounded-md bg-background" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Contacto</label>
                            <input name="contactName" value={formData.contactName} onChange={handleChange} className="w-full p-2 border rounded-md bg-background" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Teléfono</label>
                            <input name="contactPhone" value={formData.contactPhone} onChange={handleChange} className="w-full p-2 border rounded-md bg-background" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Email</label>
                            <input type="email" name="contactEmail" value={formData.contactEmail} onChange={handleChange} className="w-full p-2 border rounded-md bg-background" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Dirección</label>
                        <input name="address" value={formData.address} onChange={handleChange} className="w-full p-2 border rounded-md bg-background" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Notas</label>
                        <textarea name="notes" value={formData.notes} onChange={handleChange} rows={2} className="w-full p-2 border rounded-md bg-background" />
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md hover:bg-muted transition">Cancelar</button>
                        <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition disabled:opacity-50">
                            {saving ? 'Guardando...' : company ? 'Actualizar' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
