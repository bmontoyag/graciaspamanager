'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Role {
    id: number;
    name: string;
}

interface UserDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    user?: any;
}

export default function UserDialog({ isOpen, onClose, onSave, user }: UserDialogProps) {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phoneNumber: '',
        roleIds: [] as number[],
        commissionPercentage: '50'
    });
    const [roles, setRoles] = useState<Role[]>([]);

    useEffect(() => {
        // Fetch roles
        fetch(`${API_URL}/roles`)
            .then(res => res.json())
            .then(data => setRoles(data))
            .catch(err => console.error('Error fetching roles:', err));
    }, []);

    useEffect(() => {
        if (isOpen) {
            if (user) {
                setFormData({
                    name: user.name || '',
                    email: user.email || '',
                    password: '', // Don't populate password for edit
                    phoneNumber: user.phoneNumber || '',
                    roleIds: user.roles?.map((ur: any) => ur.roleId) || [],
                    commissionPercentage: user.commissionPercentage?.toString() || '50'
                });
            } else {
                setFormData({
                    name: '',
                    email: '',
                    password: '',
                    phoneNumber: '',
                    roleIds: [],
                    commissionPercentage: '50'
                });
            }
        }
    }, [isOpen, user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const toggleRole = (roleId: number) => {
        setFormData(prev => {
            const isSelected = prev.roleIds.includes(roleId);
            if (isSelected) {
                return { ...prev, roleIds: prev.roleIds.filter(id => id !== roleId) };
            } else {
                return { ...prev, roleIds: [...prev.roleIds, roleId] };
            }
        });
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload: any = {
                name: formData.name,
                email: formData.email,
                phoneNumber: formData.phoneNumber,
                roleIds: formData.roleIds,
                commissionPercentage: Number(formData.commissionPercentage)
            };

            // Only include password if it's provided (for new users or password change)
            if (formData.password) {
                payload.password = formData.password;
            }

            const url = user
                ? `${API_URL}/users/${user.id}`
                : `${API_URL}/users`;

            const res = await fetch(url, {
                method: user ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ message: 'Error desconocido' }));
                console.error('Error saving user:', errorData);
                alert(`Error al guardar el usuario: ${errorData.message || JSON.stringify(errorData)}`);
                return;
            }

            onSave();
            onClose();
        } catch (error) {
            console.error('Exception saving user:', error);
            alert(`Error al guardar el usuario: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background p-6 rounded-lg w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">{user ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
                    <button onClick={onClose}><X className="h-5 w-5" /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Nombre Completo</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="w-full p-2 border rounded-md bg-background"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full p-2 border rounded-md bg-background"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Teléfono (Yape/Plin)</label>
                        <input
                            type="tel"
                            name="phoneNumber"
                            value={formData.phoneNumber}
                            onChange={handleChange}
                            className="w-full p-2 border rounded-md bg-background"
                            placeholder="999 999 999"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Contraseña {user && '(dejar vacío para no cambiar)'}
                        </label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full p-2 border rounded-md bg-background"
                            required={!user}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Roles</label>
                        <div className="flex flex-wrap gap-2 border p-2 rounded-md bg-background">
                            {roles.map((role) => (
                                <label key={role.id} className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.roleIds.includes(role.id)}
                                        onChange={() => toggleRole(role.id)}
                                        className="h-4 w-4"
                                    />
                                    <span>{role.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Comisión (%)</label>
                        <input
                            type="number"
                            name="commissionPercentage"
                            value={formData.commissionPercentage}
                            onChange={handleChange}
                            className="w-full p-2 border rounded-md bg-background"
                            min="0" max="100"
                        />
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="mr-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent rounded-md"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90"
                        >
                            {user ? 'Actualizar' : 'Guardar'} Usuario
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
