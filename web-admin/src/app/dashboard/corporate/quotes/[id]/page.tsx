'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Printer, Copy, CalendarCheck, Send, CheckCircle, XCircle, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageContainer } from '@/components/layout/PageContainer';
import QuoteForm from '@/components/corporate/QuoteForm';
import { apiFetch } from '@/lib/api';
import { displayQuoteStatus, formatMoney } from '@/lib/corporate';
import { confirmDialog } from '@/components/ui/confirm-dialog';

export default function QuoteDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [quote, setQuote] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    const fetchQuote = async () => {
        try {
            setQuote(await apiFetch(`/corporate/quotes/${id}`));
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuote();
    }, [id]);

    const run = async (action: () => Promise<void>) => {
        setBusy(true);
        try {
            await action();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setBusy(false);
        }
    };

    const changeStatus = (status: string, message: string) => run(async () => {
        setQuote(await apiFetch(`/corporate/quotes/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }));
        toast.success(message);
    });

    const duplicate = () => run(async () => {
        const copy = await apiFetch(`/corporate/quotes/${id}/duplicate`, { method: 'POST' });
        toast.success(`Se creó la cotización ${copy.code}`);
        router.push(`/dashboard/corporate/quotes/${copy.id}`);
    });

    const convert = async () => {
        if (!await confirmDialog({ title: '¿Convertir en evento?', description: 'Se creará un evento corporativo con las jornadas y el monto de esta cotización. La cotización quedará bloqueada para edición.', confirmText: 'Convertir' })) return;
        run(async () => {
            const event = await apiFetch(`/corporate/quotes/${id}/convert`, { method: 'POST' });
            toast.success('Evento creado');
            router.push(`/dashboard/corporate/events/${event.id}`);
        });
    };

    if (loading) return <PageContainer><p className="text-muted-foreground">Cargando...</p></PageContainer>;
    if (!quote) return <PageContainer><p className="text-muted-foreground">Cotización no encontrada.</p></PageContainer>;

    const status = displayQuoteStatus(quote);
    const isConverted = quote.status === 'CONVERTED';
    const buttonClass = 'px-3 py-2 border rounded-md flex items-center gap-2 text-sm hover:bg-muted disabled:opacity-50';

    return (
        <PageContainer>
            <Link href="/dashboard/corporate" className="text-sm text-muted-foreground flex items-center gap-1 mb-2 hover:underline">
                <ArrowLeft className="h-4 w-4" /> Corporativo
            </Link>

            <div className="flex flex-col lg:flex-row justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-3xl font-serif font-bold font-mono">{quote.code}</h1>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${status.className}`}>{status.label}</span>
                    </div>
                    <p className="text-muted-foreground">{quote.company?.name} · {formatMoney(quote.total)}</p>
                </div>

                <div className="flex flex-wrap gap-2 items-start">
                    <button onClick={() => window.open(`/print/quote/${quote.id}`, '_blank')} className={buttonClass}>
                        <Printer className="h-4 w-4" /> Ver PDF
                    </button>
                    <button onClick={duplicate} disabled={busy} className={buttonClass}>
                        <Copy className="h-4 w-4" /> Duplicar
                    </button>
                    {quote.status === 'DRAFT' && (
                        <button onClick={() => changeStatus('SENT', 'Marcada como enviada')} disabled={busy} className={buttonClass}>
                            <Send className="h-4 w-4" /> Marcar enviada
                        </button>
                    )}
                    {['DRAFT', 'SENT', 'REJECTED'].includes(quote.status) && (
                        <button onClick={() => changeStatus('ACCEPTED', 'Cotización aceptada')} disabled={busy} className={`${buttonClass} text-green-700`}>
                            <CheckCircle className="h-4 w-4" /> Aceptada
                        </button>
                    )}
                    {['DRAFT', 'SENT', 'ACCEPTED'].includes(quote.status) && (
                        <button onClick={() => changeStatus('REJECTED', 'Cotización rechazada')} disabled={busy} className={`${buttonClass} text-red-600`}>
                            <XCircle className="h-4 w-4" /> Rechazada
                        </button>
                    )}
                    {['SENT', 'ACCEPTED', 'REJECTED'].includes(quote.status) && (
                        <button onClick={() => changeStatus('DRAFT', 'Cotización devuelta a borrador')} disabled={busy} className={buttonClass}>
                            <Undo2 className="h-4 w-4" /> Borrador
                        </button>
                    )}
                    {quote.status === 'ACCEPTED' && (
                        <button onClick={convert} disabled={busy} className="px-3 py-2 rounded-md flex items-center gap-2 text-sm bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
                            <CalendarCheck className="h-4 w-4" /> Convertir en evento
                        </button>
                    )}
                    {quote.event && (
                        <Link href={`/dashboard/corporate/events/${quote.event.id}`} className="px-3 py-2 rounded-md flex items-center gap-2 text-sm bg-primary text-primary-foreground hover:opacity-90">
                            <CalendarCheck className="h-4 w-4" /> Ver evento
                        </Link>
                    )}
                </div>
            </div>

            {isConverted && (
                <div className="bg-purple-50 border border-purple-200 text-purple-800 rounded-lg p-3 mb-6 text-sm">
                    Esta cotización ya fue convertida en evento y es de solo lectura. Para una nueva propuesta use &quot;Duplicar&quot;.
                </div>
            )}

            <QuoteForm quote={quote} readOnly={isConverted} onSaved={setQuote} />
        </PageContainer>
    );
}
