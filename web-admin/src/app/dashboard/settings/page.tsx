'use client';

import { useState, useEffect } from 'react';
import { Save, Image, Palette, Wand2 } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const PREDEFINED_THEMES = [
    { name: 'Clásico Dark', primary: '#2C3E50', sidebar: '#2C3E50', bg: '#f8f9fa' },
    { name: 'Ocean Blue', primary: '#0ea5e9', sidebar: '#0f172a', bg: '#f0f9ff' },
    { name: 'Forest Green', primary: '#10b981', sidebar: '#064e3b', bg: '#f0fdf4' },
    { name: 'Sunset Orange', primary: '#f97316', sidebar: '#7c2d12', bg: '#fff7ed' },
    { name: 'Royal Purple', primary: '#8b5cf6', sidebar: '#4c1d95', bg: '#f5f3ff' },
    { name: 'Minimal Black', primary: '#000000', sidebar: '#000000', bg: '#ffffff' },
];

export default function SettingsPage() {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    // Colors
    const [primaryColor, setPrimaryColor] = useState('#000000');
    const [sidebarColor, setSidebarColor] = useState('#000000');
    const [backgroundColor, setBackgroundColor] = useState('#ffffff');

    // Images
    const [logoUrl, setLogoUrl] = useState<string>('');
    const [loginBgUrl, setLoginBgUrl] = useState<string>('');

    const [mounted, setMounted] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setMounted(true);
        loadConfiguration();
    }, []);

    const loadConfiguration = async () => {
        try {
            const res = await fetch(`${API_URL}/configuration`);
            if (res.ok) {
                const config = await res.json();
                if (config.primaryColor) setPrimaryColor(config.primaryColor);
                if (config.sidebarColor) setSidebarColor(config.sidebarColor);
                if (config.backgroundColor) setBackgroundColor(config.backgroundColor);
                if (config.logoUrl) setLogoUrl(config.logoUrl);
                if (config.loginBgUrl) setLoginBgUrl(config.loginBgUrl);
            }
        } catch (error) {
            console.error('Failed to load configuration:', error);
            toast.error('Error al cargar configuración');
        }
    };

    const handleChange = () => {
        setHasChanges(true);
    };

    const applyTheme = (theme: typeof PREDEFINED_THEMES[0]) => {
        setPrimaryColor(theme.primary);
        setSidebarColor(theme.sidebar);
        setBackgroundColor(theme.bg);
        setHasChanges(true);
        toast.info(`Tema "${theme.name}" aplicado. Guarde para confirmar.`);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'loginBg') => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('El archivo es muy grande. Máximo 5MB.');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                if (type === 'logo') setLogoUrl(reader.result as string);
                else setLoginBgUrl(reader.result as string);
                setHasChanges(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const saveChanges = async () => {
        setLoading(true);
        try {
            const payload = {
                primaryColor,
                sidebarColor,
                backgroundColor,
                logoUrl: logoUrl || undefined,
                loginBgUrl: loginBgUrl || undefined,
            };

            const token = localStorage.getItem('accessToken');
            const res = await fetch(`${API_URL}/configuration`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error('Failed to update');

            setHasChanges(false);
            toast.success('Configuración guardada exitosamente');

            // Force reload sidebar color if needed (optional, depends on implementation)
        } catch (error: any) {
            console.error('Error saving configuration:', error);
            toast.error('Error al guardar configuración');
        } finally {
            setLoading(false);
        }
    };

    if (!mounted) return null;

    return (
        <PageContainer className="max-w-4xl">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-serif font-bold">Temas y Branding</h1>
                {hasChanges && (
                    <Button
                        onClick={saveChanges}
                        disabled={loading}
                        className="gap-2 animate-pulse shadow-lg"
                    >
                        <Save className="h-4 w-4" />
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                )}
            </div>

            <div className="space-y-8">
                {/* Predefined Themes */}
                <div className="bg-card border rounded-lg p-6">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Wand2 className="h-5 w-5 text-primary" />
                        Temas Predefinidos
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {PREDEFINED_THEMES.map((theme) => (
                            <button
                                key={theme.name}
                                onClick={() => applyTheme(theme)}
                                className="flex flex-col items-center gap-2 p-4 border rounded-lg hover:bg-accent hover:border-primary transition group text-left"
                            >
                                <div className="flex gap-1 shadow-sm">
                                    <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: theme.primary }} title="Primario" />
                                    <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: theme.sidebar }} title="Sidebar" />
                                    <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: theme.bg }} title="Fondo" />
                                </div>
                                <span className="font-medium text-sm group-hover:text-primary transition-colors">{theme.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Custom Colors */}
                <div className="bg-card border rounded-lg p-6">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Palette className="h-5 w-5 text-primary" />
                        Personalización Manual
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium mb-2">Color Primario</label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={primaryColor}
                                    onChange={(e) => { setPrimaryColor(e.target.value); handleChange(); }}
                                    className="h-10 w-20 p-1 rounded border cursor-pointer"
                                />
                                <span className="text-sm font-mono text-muted-foreground">{primaryColor}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Botones, iconos y acentos.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Color Sidebar</label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={sidebarColor}
                                    onChange={(e) => { setSidebarColor(e.target.value); handleChange(); }}
                                    className="h-10 w-20 p-1 rounded border cursor-pointer"
                                />
                                <span className="text-sm font-mono text-muted-foreground">{sidebarColor}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Fondo del menú lateral.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Color Fondo</label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={backgroundColor}
                                    onChange={(e) => { setBackgroundColor(e.target.value); handleChange(); }}
                                    className="h-10 w-20 p-1 rounded border cursor-pointer"
                                />
                                <span className="text-sm font-mono text-muted-foreground">{backgroundColor}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Fondo general de la aplicación.</p>
                        </div>
                    </div>
                </div>

                {/* Branding / Images */}
                <div className="bg-card border rounded-lg p-6">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Image className="h-5 w-5 text-primary" />
                        Logos e Imágenes
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="block text-sm font-medium mb-3">Logo del Negocio</label>
                            {logoUrl && (
                                <div className="mb-3 p-4 border rounded-lg bg-muted/20 flex justify-center">
                                    <img src={logoUrl} alt="Logo" className="h-20 object-contain" />
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileUpload(e, 'logo')}
                                className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                            />
                            <p className="text-xs text-muted-foreground mt-2">Se muestra en el login y en el sidebar. Máx 5MB.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-3">Fondo de Login</label>
                            {loginBgUrl && (
                                <div className="mb-3 p-4 border rounded-lg bg-muted/20">
                                    <img src={loginBgUrl} alt="Login Background" className="h-20 w-full object-cover rounded" />
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileUpload(e, 'loginBg')}
                                className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                            />
                            <p className="text-xs text-muted-foreground mt-2">Imagen de fondo para la pantalla de inicio de sesión. Máx 5MB.</p>
                        </div>
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}
