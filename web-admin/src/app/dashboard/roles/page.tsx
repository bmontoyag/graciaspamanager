'use client';

import { useState, useEffect } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function RolesPage() {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const [roles, setRoles] = useState<any[]>([]);
    const [modules, setModules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentRole, setCurrentRole] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        moduleIds: [] as number[],
    });

    useEffect(() => {
        fetchRoles();
        fetchModules();
    }, []);

    const fetchRoles = async () => {
        try {
            const res = await fetch(`${API_URL}/roles`);
            if (res.ok) {
                const data = await res.json();
                setRoles(data);
            }
        } catch (error) {
            console.error('Error fetching roles:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchModules = async () => {
        try {
            const res = await fetch(`${API_URL}/modules`);
            if (res.ok) {
                const data = await res.json();
                setModules(data);
            }
        } catch (error) {
            console.error('Error fetching modules:', error);
        }
    };

    const handleOpenDialog = (role?: any) => {
        if (role) {
            setCurrentRole(role);
            setFormData({
                name: role.name,
                description: role.description || '',
                moduleIds: role.modules.map((m: any) => m.moduleId),
            });
        } else {
            setCurrentRole(null);
            setFormData({
                name: '',
                description: '',
                moduleIds: [],
            });
        }
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        try {
            const method = currentRole ? 'PATCH' : 'POST';
            const url = currentRole
                ? `${API_URL}/roles/${currentRole.id}`
                : `${API_URL}/roles`;

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                toast.success(`Role ${currentRole ? 'updated' : 'created'} successfully`);
                fetchRoles();
                setIsDialogOpen(false);
            } else {
                const errorData = await res.json().catch(() => ({}));
                console.error('Failed to save role:', errorData);
                toast.error(`Failed to save role: ${errorData.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error saving role:', error);
            toast.error('Error saving role');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this role?')) return;
        try {
            const res = await fetch(`${API_URL}/roles/${id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                toast.success('Role deleted');
                fetchRoles();
            } else {
                toast.error('Failed to delete role');
            }
        } catch (error) {
            console.error('Error deleting role:', error);
        }
    };

    const toggleModule = (moduleId: number) => {
        setFormData(prev => {
            const isSelected = prev.moduleIds.includes(moduleId);
            if (isSelected) {
                return { ...prev, moduleIds: prev.moduleIds.filter(id => id !== moduleId) };
            } else {
                return { ...prev, moduleIds: [...prev.moduleIds, moduleId] };
            }
        });
    };

    return (
        <PageContainer title="Gestión de Roles y Permisos">
            <div className="mb-6 flex justify-end">
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="mr-2 h-4 w-4" /> Nuevo Rol
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {roles.map((role) => (
                    <Card key={role.id}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xl font-bold">{role.name}</CardTitle>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(role)}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(role.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">{role.description || 'Sin descripción'}</p>
                            <div className="text-sm font-medium mb-2">Módulos permitidos:</div>
                            <div className="flex flex-wrap gap-2">
                                {role.modules?.map((rm: any) => (
                                    <span key={rm.moduleId} className="bg-secondary px-2 py-1 rounded-md text-xs">
                                        {rm.module.name}
                                    </span>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{currentRole ? 'Editar Rol' : 'Nuevo Rol'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nombre del Rol</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Descripción</Label>
                            <Input
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Permisos (Módulos)</Label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border p-4 rounded-md">
                                {modules.map((module) => (
                                    <div key={module.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`module-${module.id}`}
                                            checked={formData.moduleIds.includes(module.id)}
                                            onCheckedChange={() => toggleModule(module.id)}
                                        />
                                        <Label htmlFor={`module-${module.id}`}>{module.name}</Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave}>Guardar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </PageContainer>
    );
}
