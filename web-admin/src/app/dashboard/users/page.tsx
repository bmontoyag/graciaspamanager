'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit, Search, Trash2 } from 'lucide-react';
import UserDialog from '../../../components/users/UserDialog';
import { PageContainer } from '@/components/layout/PageContainer';

export default function UsersPage() {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [filter, setFilter] = useState('');

    const fetchUsers = () => {
        setLoading(true);
        fetch(`${API_URL}/users`)
            .then(res => res.json())
            .then(data => {
                setUsers(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching users:', err);
                setUsers([]);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleEdit = (user: any) => {
        setSelectedUser(user);
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Está seguro de eliminar este usuario?')) return;

        try {
            const res = await fetch(`${API_URL}/users/${id}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to delete');
            fetchUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Error al eliminar el usuario');
        }
    };

    const filteredUsers = users.filter(u =>
        u.name?.toLowerCase().includes(filter.toLowerCase()) ||
        u.email?.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <PageContainer>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-3xl font-serif font-bold">Usuarios (Personal)</h1>
                <button
                    onClick={() => {
                        setSelectedUser(null);
                        setIsDialogOpen(true);
                    }}
                    className="w-full sm:w-auto justify-center bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 hover:opacity-90"
                >
                    <Plus className="h-4 w-4" />
                    Nuevo Usuario
                </button>
            </div>

            <div className="bg-card rounded-lg border shadow-sm p-4 mb-6">
                <div className="flex items-center gap-2">
                    <Search className="text-muted-foreground h-4 w-4" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o email..."
                        className="bg-transparent outline-none w-full"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left min-w-[600px]">
                        <thead className="bg-muted/50 border-b">
                            <tr>
                                <th className="p-4 font-medium">Nombre</th>
                                <th className="p-4 font-medium">Email</th>
                                <th className="p-4 font-medium">Rol</th>
                                <th className="p-4 font-medium text-right">Comisión</th>
                                <th className="p-4 font-medium text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Cargando...</td></tr>
                            )}
                            {!loading && filteredUsers.length === 0 && (
                                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No se encontraron usuarios.</td></tr>
                            )}
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="border-b hover:bg-muted/50 transition">
                                    <td className="p-4 font-medium">{user.name}</td>
                                    <td className="p-4 text-muted-foreground">{user.email}</td>
                                    <td className="p-4">
                                        <div className="flex flex-wrap gap-1">
                                            {user.roles?.map((ur: any) => (
                                                <span key={ur.roleId} className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">
                                                    {ur.role.name}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right font-mono">{Number(user.commissionPercentage)}%</td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(user)}
                                                className="p-2 hover:bg-accent rounded"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user.id)}
                                                className="p-2 hover:bg-accent rounded text-red-600"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <UserDialog
                isOpen={isDialogOpen}
                onClose={() => {
                    setIsDialogOpen(false);
                    setSelectedUser(null);
                }}
                onSave={fetchUsers}
                user={selectedUser}
            />
        </PageContainer>
    );
}
