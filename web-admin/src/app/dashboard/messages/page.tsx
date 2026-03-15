'use client';

import { useState, useEffect } from 'react';
import { Save, MessageCircle, Plus, X, Wand2, Facebook, Instagram, Music2, Share2, Gift } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function MessagesSettingsPage() {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    // Textos
    const [birthdayMessage, setBirthdayMessage] = useState<string>('');
    const [whatsappMessageTemplate, setWhatsappMessageTemplate] = useState<string>('');
    const [marketingMessage, setMarketingMessage] = useState<string>('');
    
    // Social
    const [facebookUrl, setFacebookUrl] = useState<string>('');
    const [instagramUrl, setInstagramUrl] = useState<string>('');
    const [tiktokUrl, setTiktokUrl] = useState<string>('');
    const [whatsappUrl, setWhatsappUrl] = useState<string>('');

    // Discovery
    const [discoverySources, setDiscoverySources] = useState<string[]>([]);
    const [newSource, setNewSource] = useState('');

    // Loyalty
    const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState<number>(10);

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
                if (config.birthdayMessage) setBirthdayMessage(config.birthdayMessage);
                if (config.whatsappMessageTemplate) setWhatsappMessageTemplate(config.whatsappMessageTemplate);
                if (config.marketingMessage) setMarketingMessage(config.marketingMessage);
                if (config.discoverySources) setDiscoverySources(config.discoverySources);
                if (config.facebookUrl) setFacebookUrl(config.facebookUrl);
                if (config.instagramUrl) setInstagramUrl(config.instagramUrl);
                if (config.tiktokUrl) setTiktokUrl(config.tiktokUrl);
                if (config.whatsappUrl) setWhatsappUrl(config.whatsappUrl);
                if (config.loyaltyPointsToRedeem) setLoyaltyPointsToRedeem(config.loyaltyPointsToRedeem);
            }
        } catch (error) {
            console.error('Failed to load configuration:', error);
            toast.error('Error al cargar configuración');
        }
    };

    const handleChange = () => {
        setHasChanges(true);
    };

    const addSource = () => {
        if (newSource.trim() && !discoverySources.includes(newSource.trim())) {
            setDiscoverySources([...discoverySources, newSource.trim()]);
            setNewSource('');
            setHasChanges(true);
        }
    };

    const removeSource = (source: string) => {
        setDiscoverySources(discoverySources.filter(s => s !== source));
        setHasChanges(true);
    };

    const saveChanges = async () => {
        setLoading(true);
        try {
            const payload = {
                birthdayMessage,
                whatsappMessageTemplate,
                marketingMessage,
                discoverySources,
                facebookUrl,
                instagramUrl,
                tiktokUrl,
                whatsappUrl,
                loyaltyPointsToRedeem
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
            toast.success('Configuración de mensajes guardada');
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
                <h1 className="text-3xl font-serif font-bold">Marketing y Campañas</h1>
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
                {/* Textos y Notificaciones */}
                <div className="bg-card border rounded-lg p-6">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <MessageCircle className="h-5 w-5 text-primary" />
                        Plantillas de WhatsApp
                    </h2>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium mb-2">Mensaje de Confirmación de Reserva</label>
                            <textarea
                                value={whatsappMessageTemplate}
                                onChange={(e) => { setWhatsappMessageTemplate(e.target.value); handleChange(); }}
                                className="w-full h-24 p-2 text-sm border rounded-md bg-background resize-none focus:ring-1 focus:ring-primary focus:border-primary"
                                placeholder="Escribe el mensaje de confirmación..."
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Variables: <span className="font-mono bg-muted px-1 rounded text-primary">{'{name}'}</span>, <span className="font-mono bg-muted px-1 rounded text-primary">{'{service}'}</span>, <span className="font-mono bg-muted px-1 rounded text-primary">{'{date}'}</span>, <span className="font-mono bg-muted px-1 rounded text-primary">{'{time}'}</span>.
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Mensaje de Cumpleaños</label>
                            <textarea
                                value={birthdayMessage}
                                onChange={(e) => { setBirthdayMessage(e.target.value); handleChange(); }}
                                className="w-full h-24 p-2 text-sm border rounded-md bg-background resize-none focus:ring-1 focus:ring-primary focus:border-primary"
                                placeholder="Escribe el mensaje de cumpleaños..."
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Variables: <span className="font-mono bg-muted px-1 rounded text-primary">{'{name}'}</span>.
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Mensaje de Captación / Promociones</label>
                            <textarea
                                value={marketingMessage}
                                onChange={(e) => { setMarketingMessage(e.target.value); handleChange(); }}
                                className="w-full h-24 p-2 text-sm border rounded-md bg-background resize-none focus:ring-1 focus:ring-primary focus:border-primary"
                                placeholder="Escribe el mensaje de marketing..."
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Mensaje general para campañas de WhatsApp.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Redes Sociales */}
                <div className="bg-card border rounded-lg p-6">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Share2 className="h-5 w-5 text-primary" />
                        Redes Sociales y Canales
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Facebook className="h-4 w-4 text-blue-600" /> Facebook (URL)
                            </label>
                            <input
                                type="text"
                                value={facebookUrl || ''}
                                onChange={(e) => { setFacebookUrl(e.target.value); handleChange(); }}
                                className="w-full p-2 text-sm border rounded-md bg-background"
                                placeholder="https://facebook.com/..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Instagram className="h-4 w-4 text-pink-600" /> Instagram (URL)
                            </label>
                            <input
                                type="text"
                                value={instagramUrl || ''}
                                onChange={(e) => { setInstagramUrl(e.target.value); handleChange(); }}
                                className="w-full p-2 text-sm border rounded-md bg-background"
                                placeholder="https://instagram.com/..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Music2 className="h-4 w-4 text-black" /> TikTok (URL)
                            </label>
                            <input
                                type="text"
                                value={tiktokUrl || ''}
                                onChange={(e) => { setTiktokUrl(e.target.value); handleChange(); }}
                                className="w-full p-2 text-sm border rounded-md bg-background"
                                placeholder="https://tiktok.com/@..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <MessageCircle className="h-4 w-4 text-green-600" /> WhatsApp Business (Link)
                            </label>
                            <input
                                type="text"
                                value={whatsappUrl || ''}
                                onChange={(e) => { setWhatsappUrl(e.target.value); handleChange(); }}
                                className="w-full p-2 text-sm border rounded-md bg-background"
                                placeholder="https://wa.me/..."
                            />
                        </div>
                    </div>
                </div>

                {/* Reglas de Fidelización */}
                <div className="bg-card border rounded-lg p-6">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Gift className="h-5 w-5 text-primary" />
                        Programa de Fidelidad
                    </h2>
                    <div className="max-w-xs space-y-2">
                        <label className="text-sm font-medium">Puntos para Canjear Premio</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                value={loyaltyPointsToRedeem}
                                onChange={(e) => { setLoyaltyPointsToRedeem(parseInt(e.target.value)); handleChange(); }}
                                className="w-full p-2 text-sm border rounded-md bg-background"
                                min="1"
                            />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">puntos</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Define cuántos puntos debe acumular un cliente para poder canjear su beneficio.
                        </p>
                    </div>
                </div>

                {/* Fuentes de Descubrimiento */}
                <div className="bg-card border rounded-lg p-6">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Wand2 className="h-5 w-5 text-primary" />
                        ¿De dónde nos conoció? (Configuración)
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4">
                        Estas opciones aparecerán al registrar un nuevo cliente para saber qué canales son los más efectivos.
                    </p>
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newSource}
                                onChange={(e) => setNewSource(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addSource()}
                                placeholder="Añadir nueva fuente (ej. TikTok)"
                                className="flex-1 p-2 text-sm border rounded-md bg-background focus:ring-1 focus:ring-primary focus:border-primary"
                            />
                            <Button type="button" onClick={addSource} variant="outline" className="gap-1">
                                <Plus className="h-4 w-4" /> Agregar
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {discoverySources.map((source, idx) => (
                                <div key={idx} className="flex items-center gap-1 bg-accent/50 px-3 py-1.5 rounded-full border text-sm">
                                    <span>{source}</span>
                                    <button
                                        onClick={() => removeSource(source)}
                                        className="text-muted-foreground hover:text-destructive transition-colors ml-1 p-0.5 rounded-full hover:bg-muted"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                            {discoverySources.length === 0 && (
                                <p className="text-sm text-muted-foreground italic w-full">No hay fuentes configuradas. Agrega algunas arriba.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}
