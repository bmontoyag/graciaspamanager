'use client';

import { useState, useEffect } from 'react';
import { User, Lock, Save, Eye, EyeOff } from 'lucide-react';

export default function ProfilePage() {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const [userId, setUserId] = useState<string | null>(null);
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    const [profileForm, setProfileForm] = useState({
        name: '',
        email: ''
    });

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    useEffect(() => {
        const storedUserId = localStorage.getItem('userId');
        console.log('Profile page - userId from localStorage:', storedUserId);
        setUserId(storedUserId);

        if (storedUserId) {
            fetchUserData(storedUserId);
        } else {
            console.error('No userId found in localStorage');
            setLoading(false);
        }
    }, []);

    const fetchUserData = async (id: string) => {
        try {
            console.log('Fetching user data for ID:', id);
            const res = await fetch(`${API_URL}/users/${id}`);

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            const data = await res.json();
            console.log('User data received:', data);
            setUserData(data);
            setProfileForm({
                name: data.name || '',
                email: data.email || ''
            });
        } catch (error) {
            console.error('Error fetching user data:', error);
            alert('Error al cargar los datos del usuario. Verifica que el backend esté corriendo.');
        } finally {
            setLoading(false);
        }
    };

    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setProfileForm(prev => ({ ...prev, [name]: value }));
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPasswordForm(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: profileForm.name,
                    email: profileForm.email
                })
            });

            if (!res.ok) throw new Error('Failed to update profile');

            alert('✅ Perfil actualizado correctamente');
            if (userId) fetchUserData(userId);
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('❌ Error al actualizar el perfil');
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            alert('❌ Las contraseñas no coinciden');
            return;
        }

        if (passwordForm.newPassword.length < 6) {
            alert('❌ La contraseña debe tener al menos 6 caracteres');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password: passwordForm.newPassword
                })
            });

            if (!res.ok) throw new Error('Failed to update password');

            alert('✅ Contraseña actualizada correctamente');
            setPasswordForm({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
        } catch (error) {
            console.error('Error updating password:', error);
            alert('❌ Error al actualizar la contraseña');
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center py-12">
                    <div className="text-muted-foreground">Cargando perfil...</div>
                    <div className="text-xs text-muted-foreground mt-2">
                        Si esto tarda mucho, verifica que hayas iniciado sesión correctamente
                    </div>
                </div>
            </div>
        );
    }

    if (!userId) {
        return (
            <div className="p-6">
                <div className="text-center py-12">
                    <div className="text-destructive font-bold">Error: No se encontró el ID de usuario</div>
                    <div className="text-sm text-muted-foreground mt-2">
                        Por favor, cierra sesión e inicia sesión nuevamente
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-serif font-bold mb-8">Mi Perfil</h1>

            <div className="space-y-6">
                {/* Profile Information */}
                <div className="bg-card border rounded-lg p-6">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Información Personal
                    </h2>
                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Nombre</label>
                            <input
                                type="text"
                                name="name"
                                value={profileForm.name}
                                onChange={handleProfileChange}
                                className="w-full p-3 border rounded-md bg-background"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Email</label>
                            <input
                                type="email"
                                name="email"
                                value={profileForm.email}
                                onChange={handleProfileChange}
                                className="w-full p-3 border rounded-md bg-background"
                                required
                            />
                        </div>

                        <div className="bg-muted/30 p-3 rounded-md">
                            <p className="text-sm text-muted-foreground">
                                <strong>Rol:</strong> {userData?.role === 'ADMIN' ? 'Administrador' : 'Trabajador'}
                            </p>
                            {userData?.role === 'WORKER' && (
                                <p className="text-sm text-muted-foreground mt-1">
                                    <strong>Comisión:</strong> {userData?.commissionPercentage}%
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="bg-primary text-primary-foreground px-6 py-3 rounded-md flex items-center gap-2 hover:opacity-90 transition"
                        >
                            <Save className="h-4 w-4" />
                            Guardar Cambios
                        </button>
                    </form>
                </div>

                {/* Change Password */}
                <div className="bg-card border rounded-lg p-6">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Lock className="h-5 w-5" />
                        Cambiar Contraseña
                    </h2>
                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Nueva Contraseña</label>
                            <div className="relative">
                                <input
                                    type={showNewPassword ? 'text' : 'password'}
                                    name="newPassword"
                                    value={passwordForm.newPassword}
                                    onChange={handlePasswordChange}
                                    className="w-full p-3 border rounded-md bg-background pr-10"
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Mínimo 6 caracteres</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Confirmar Nueva Contraseña</label>
                            <input
                                type={showNewPassword ? 'text' : 'password'}
                                name="confirmPassword"
                                value={passwordForm.confirmPassword}
                                onChange={handlePasswordChange}
                                className="w-full p-3 border rounded-md bg-background"
                                required
                                minLength={6}
                            />
                        </div>

                        <button
                            type="submit"
                            className="bg-primary text-primary-foreground px-6 py-3 rounded-md flex items-center gap-2 hover:opacity-90 transition"
                        >
                            <Lock className="h-4 w-4" />
                            Actualizar Contraseña
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
