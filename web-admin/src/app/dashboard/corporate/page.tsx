'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, Edit, Trash2, Settings2, FileText, CalendarCheck, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageContainer } from '@/components/layout/PageContainer';
import CompanyDialog from '@/components/corporate/CompanyDialog';
import IssuerDialog from '@/components/corporate/IssuerDialog';
import { apiFetch } from '@/lib/api';
import { EVENT_STATUS, QUOTE_STATUS, displayQuoteStatus, formatDay, formatMoney, isQuoteExpired } from '@/lib/corporate';
import { confirmDialog } from '@/components/ui/confirm-dialog';

type Tab = 'quotes' | 'events' | 'companies';

export default function CorporatePage() {
    const router = useRouter();
    const [tab, setTab] = useState<Tab>('quotes');
    const [quotes, setQuotes] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [isCompanyDialogOpen, setIsCompanyDialogOpen] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<any>(null);
    const [isIssuerDialogOpen, setIsIssuerDialogOpen] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [quotesData, eventsData, companiesData] = await Promise.all([
                apiFetch('/corporate/quotes'),
                apiFetch('/corporate/events'),
                apiFetch('/companies'),
            ]);
            setQuotes(Array.isArray(quotesData) ? quotesData : []);
            setEvents(Array.isArray(eventsData) ? eventsData : []);
            setCompanies(Array.isArray(companiesData) ? companiesData : []);
        } catch (error: any) {
            toast.error(`Error al cargar datos: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const changeTab = (next: Tab) => {
        setTab(next);
        setFilter('');
        setStatusFilter('all');
    };

    const handleDeleteQuote = async (quote: any) => {
        if (!await confirmDialog(`¿Eliminar la cotización ${quote.code}?`)) return;
        try {
            await apiFetch(`/corporate/quotes/${quote.id}`, { method: 'DELETE' });
            toast.success('Cotización eliminada');
            fetchData();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleDeleteCompany = async (company: any) => {
        if (!await confirmDialog(`¿Eliminar la empresa ${company.name}?`)) return;
        try {
            await apiFetch(`/companies/${company.id}`, { method: 'DELETE' });
            toast.success('Empresa eliminada');
            fetchData();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const text = filter.toLowerCase();

    const filteredQuotes = quotes.filter(q => {
        const matchesText = q.code.toLowerCase().includes(text) || q.company?.name.toLowerCase().includes(text) || q.title.toLowerCase().includes(text);
        const effectiveStatus = isQuoteExpired(q) ? 'EXPIRED' : q.status;
        return matchesText && (statusFilter === 'all' || effectiveStatus === statusFilter);
    });

    const filteredEvents = events.filter(e => {
        const matchesText = e.title.toLowerCase().includes(text) || e.company?.name.toLowerCase().includes(text);
        return matchesText && (statusFilter === 'all' || e.status === statusFilter);
    });

    const filteredCompanies = companies.filter(c =>
        c.name.toLowerCase().includes(text) || c.ruc?.includes(text) || c.contactName?.toLowerCase().includes(text)
    );

    const daysLabel = (days: any[]) => {
        if (!days?.length) return '-';
        const first = formatDay(days[0].date);
        if (days.length === 1) return first;
        return `${first} (+${days.length - 1})`;
    };

    const tabs: { key: Tab; label: string; icon: any; count: number }[] = [
        { key: 'quotes', label: 'Cotizaciones', icon: FileText, count: quotes.length },
        { key: 'events', label: 'Eventos', icon: CalendarCheck, count: events.length },
        { key: 'companies', label: 'Empresas', icon: Building2, count: companies.length },
    ];

    const statusOptions = tab === 'quotes' ? QUOTE_STATUS : tab === 'events' ? EVENT_STATUS : null;

    return (
        <PageContainer>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-3xl font-serif font-bold">Corporativo</h1>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button
                        onClick={() => setIsIssuerDialogOpen(true)}
                        className="flex-1 sm:flex-none justify-center border px-4 py-2 rounded-md flex items-center gap-2 hover:bg-muted"
                    >
                        <Settings2 className="h-4 w-4" />
                        Datos del emisor
                    </button>
                    {tab === 'companies' ? (
                        <button
                            onClick={() => { setSelectedCompany(null); setIsCompanyDialogOpen(true); }}
                            className="flex-1 sm:flex-none justify-center bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 hover:opacity-90"
                        >
                            <Plus className="h-4 w-4" />
                            Nueva Empresa
                        </button>
                    ) : (
                        <button
                            onClick={() => router.push('/dashboard/corporate/quotes/new')}
                            className="flex-1 sm:flex-none justify-center bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 hover:opacity-90"
                        >
                            <Plus className="h-4 w-4" />
                            Nueva Cotización
                        </button>
                    )}
                </div>
            </div>

            <div className="flex gap-1 border-b mb-6 overflow-x-auto">
                {tabs.map(t => (
                    <button
                        key={t.key}
                        onClick={() => changeTab(t.key)}
                        className={`flex items-center gap-2 px-4 py-2 border-b-2 -mb-px whitespace-nowrap transition-colors ${tab === t.key ? 'border-primary text-primary font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                        <t.icon className="h-4 w-4" />
                        {t.label}
                        <span className="text-xs bg-muted px-1.5 rounded">{t.count}</span>
                    </button>
                ))}
            </div>

            <div className="bg-card rounded-lg border shadow-sm p-4 mb-6 flex flex-col md:flex-row gap-4">
                <div className="flex items-center gap-2 flex-1 relative">
                    <Search className="text-muted-foreground h-4 w-4 absolute left-3" />
                    <input
                        type="text"
                        placeholder="Buscar..."
                        className="bg-card border rounded-md pl-9 pr-3 py-2 w-full outline-none focus:ring-1 focus:ring-primary/50 text-sm"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>
                {statusOptions && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground whitespace-nowrap">Estado:</span>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-card border rounded-md px-2 py-1.5 text-sm outline-none w-full sm:w-[150px]"
                        >
                            <option value="all">Todos</option>
                            {Object.entries(statusOptions).map(([key, s]) => (
                                <option key={key} value={key}>{s.label}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    {tab === 'quotes' && (
                        <table className="w-full text-sm text-left min-w-[760px]">
                            <thead className="bg-muted/50 border-b">
                                <tr>
                                    <th className="p-4 font-medium">Código</th>
                                    <th className="p-4 font-medium">Empresa</th>
                                    <th className="p-4 font-medium">Emisión</th>
                                    <th className="p-4 font-medium">Jornadas</th>
                                    <th className="p-4 font-medium">Estado</th>
                                    <th className="p-4 font-medium text-right">Total</th>
                                    <th className="p-4 font-medium text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Cargando...</td></tr>}
                                {!loading && filteredQuotes.length === 0 && (
                                    <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No hay cotizaciones.</td></tr>
                                )}
                                {filteredQuotes.map(q => {
                                    const status = displayQuoteStatus(q);
                                    return (
                                        <tr key={q.id} className="border-b hover:bg-muted/50 transition cursor-pointer" onClick={() => router.push(`/dashboard/corporate/quotes/${q.id}`)}>
                                            <td className="p-4 font-mono font-medium">{q.code}</td>
                                            <td className="p-4">
                                                <div className="font-medium">{q.company?.name}</div>
                                                {q.location && <div className="text-xs text-muted-foreground">{q.location}</div>}
                                            </td>
                                            <td className="p-4">{formatDay(q.issueDate)}</td>
                                            <td className="p-4">{daysLabel(q.days)}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${status.className}`}>{status.label}</span>
                                            </td>
                                            <td className="p-4 text-right font-mono">{formatMoney(q.total)}</td>
                                            <td className="p-4 text-right" onClick={e => e.stopPropagation()}>
                                                <div className="flex justify-end gap-2">
                                                    <Link href={`/dashboard/corporate/quotes/${q.id}`} className="p-2 hover:bg-accent rounded" aria-label="Editar">
                                                        <Edit className="h-4 w-4" />
                                                    </Link>
                                                    {!q.event && (
                                                        <button onClick={() => handleDeleteQuote(q)} className="p-2 hover:bg-accent rounded text-red-600" aria-label="Eliminar">
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}

                    {tab === 'events' && (
                        <table className="w-full text-sm text-left min-w-[760px]">
                            <thead className="bg-muted/50 border-b">
                                <tr>
                                    <th className="p-4 font-medium">Evento</th>
                                    <th className="p-4 font-medium">Empresa</th>
                                    <th className="p-4 font-medium">Jornadas</th>
                                    <th className="p-4 font-medium">Estado</th>
                                    <th className="p-4 font-medium text-right">Monto</th>
                                    <th className="p-4 font-medium text-right">Cobrado</th>
                                    <th className="p-4 font-medium text-right">Saldo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Cargando...</td></tr>}
                                {!loading && filteredEvents.length === 0 && (
                                    <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No hay eventos. Convierta una cotización aceptada para crear uno.</td></tr>
                                )}
                                {filteredEvents.map(e => (
                                    <tr key={e.id} className="border-b hover:bg-muted/50 transition cursor-pointer" onClick={() => router.push(`/dashboard/corporate/events/${e.id}`)}>
                                        <td className="p-4">
                                            <div className="font-medium">{e.title}</div>
                                            {e.quote && <div className="text-xs text-muted-foreground font-mono">{e.quote.code}</div>}
                                        </td>
                                        <td className="p-4">{e.company?.name}</td>
                                        <td className="p-4">{daysLabel(e.days)}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${EVENT_STATUS[e.status].className}`}>{EVENT_STATUS[e.status].label}</span>
                                        </td>
                                        <td className="p-4 text-right font-mono">{formatMoney(e.agreedAmount)}</td>
                                        <td className="p-4 text-right font-mono text-green-600">{formatMoney(e.totalPaid)}</td>
                                        <td className={`p-4 text-right font-mono ${e.balance > 0 ? 'text-amber-600' : ''}`}>{formatMoney(e.balance)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {tab === 'companies' && (
                        <table className="w-full text-sm text-left min-w-[700px]">
                            <thead className="bg-muted/50 border-b">
                                <tr>
                                    <th className="p-4 font-medium">Empresa</th>
                                    <th className="p-4 font-medium">RUC</th>
                                    <th className="p-4 font-medium">Contacto</th>
                                    <th className="p-4 font-medium text-center">Cotizaciones</th>
                                    <th className="p-4 font-medium text-center">Eventos</th>
                                    <th className="p-4 font-medium text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Cargando...</td></tr>}
                                {!loading && filteredCompanies.length === 0 && (
                                    <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No hay empresas registradas.</td></tr>
                                )}
                                {filteredCompanies.map(c => (
                                    <tr key={c.id} className="border-b hover:bg-muted/50 transition">
                                        <td className="p-4 font-medium">{c.name}</td>
                                        <td className="p-4 font-mono">{c.ruc || '-'}</td>
                                        <td className="p-4">
                                            <div>{c.contactName || '-'}</div>
                                            <div className="text-xs text-muted-foreground">{[c.contactPhone, c.contactEmail].filter(Boolean).join(' · ')}</div>
                                        </td>
                                        <td className="p-4 text-center">{c._count?.quotes ?? 0}</td>
                                        <td className="p-4 text-center">{c._count?.events ?? 0}</td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => { setSelectedCompany(c); setIsCompanyDialogOpen(true); }} className="p-2 hover:bg-accent rounded" aria-label="Editar">
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => handleDeleteCompany(c)} className="p-2 hover:bg-accent rounded text-red-600" aria-label="Eliminar">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <CompanyDialog
                isOpen={isCompanyDialogOpen}
                onClose={() => { setIsCompanyDialogOpen(false); setSelectedCompany(null); }}
                onSave={fetchData}
                company={selectedCompany}
            />
            <IssuerDialog isOpen={isIssuerDialogOpen} onClose={() => setIsIssuerDialogOpen(false)} />
        </PageContainer>
    );
}
