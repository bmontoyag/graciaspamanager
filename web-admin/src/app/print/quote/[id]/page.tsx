'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Printer } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { durationLabel, formatDay, formatMoney, formatTime12 } from '@/lib/corporate';

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Lora:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');

.quote-doc { --sage: #6B7F6A; --sage-dark: #56685a; --cream: #F3F2EC; --line: #DAD9D0; --ink: #1f2421; --muted: #6b6f6a;
  font-family: 'Inter', system-ui, sans-serif; color: var(--ink); background: #fff; width: 210mm; min-height: 297mm;
  margin: 0 auto; padding: 14mm 16mm; font-size: 10.5pt; line-height: 1.5; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
.quote-doc h1, .quote-doc h2, .quote-doc .serif { font-family: 'Lora', Georgia, serif; }
.quote-doc .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 10px; border-bottom: 2px solid var(--sage); }
.quote-doc .pill { border: 1px solid var(--sage); border-radius: 999px; padding: 6px 18px; font-size: 8pt; font-weight: 600; letter-spacing: .18em; color: var(--sage-dark); }
.quote-doc .issuer { text-align: right; font-size: 8pt; color: var(--muted); margin-top: 6px; }
.quote-doc .banner { background: var(--sage); color: #fff; border-radius: 6px; padding: 22px 28px; margin-top: 16px; }
.quote-doc .banner h1 { font-size: 17pt; font-weight: 500; letter-spacing: .02em; margin: 0; }
.quote-doc .banner p { margin: 6px 0 0; opacity: .9; }
.quote-doc .info { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; background: var(--cream); border: 1px solid var(--line); border-radius: 6px; padding: 12px 18px; margin-top: 12px; }
.quote-doc .label { font-size: 7pt; font-weight: 600; letter-spacing: .14em; color: var(--muted); text-transform: uppercase; }
.quote-doc .info .value { font-weight: 600; font-size: 9.5pt; }
.quote-doc section { margin-top: 18px; break-inside: avoid; }
.quote-doc h2 { font-size: 12pt; font-weight: 500; letter-spacing: .04em; text-transform: uppercase; border-left: 4px solid var(--sage); padding-left: 10px; margin: 0 0 8px; color: var(--sage-dark); }
.quote-doc .box { background: var(--cream); border: 1px solid var(--line); border-radius: 6px; padding: 12px 16px; text-align: center; }
.quote-doc .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.quote-doc .card { border: 1px solid var(--line); border-top: 3px solid var(--sage); border-radius: 6px; padding: 12px 14px; }
.quote-doc .card .title { font-weight: 600; color: var(--sage-dark); margin-bottom: 4px; }
.quote-doc .card p { margin: 0; color: var(--muted); font-size: 9pt; }
.quote-doc table { width: 100%; border-collapse: collapse; }
.quote-doc th { background: var(--cream); text-align: left; font-size: 7.5pt; letter-spacing: .12em; color: var(--muted); padding: 10px 14px; border-bottom: 2px solid var(--sage); text-transform: uppercase; }
.quote-doc td { padding: 9px 14px; border-bottom: 1px solid var(--line); vertical-align: top; }
.quote-doc td.concept { color: var(--sage-dark); font-weight: 600; width: 32%; }
.quote-doc .scope { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; border: 1px solid var(--line); border-radius: 6px; padding: 14px 20px; }
.quote-doc .scope span::before { content: '\\2713'; color: var(--sage); margin-right: 6px; }
.quote-doc .investment { background: var(--cream); border: 1.5px solid var(--sage); border-radius: 6px; padding: 20px; text-align: center; }
.quote-doc .investment .amount { font-family: 'Lora', serif; font-size: 30pt; font-weight: 600; color: var(--sage-dark); margin: 4px 0; }
.quote-doc .investment .caption { font-size: 9pt; color: var(--muted); }
.quote-doc .tax-lines { max-width: 300px; margin: 0 auto 6px; font-size: 9.5pt; }
.quote-doc .tax-lines div { display: flex; justify-content: space-between; }
.quote-doc .conditions { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.quote-doc .condition { border: 1px solid var(--line); border-left: 4px solid var(--sage); border-radius: 6px; padding: 12px 16px; background: #fafaf7; }
.quote-doc .condition .title { font-weight: 600; color: var(--sage-dark); }
.quote-doc .condition p { margin: 2px 0 0; color: var(--muted); font-size: 9pt; }
.quote-doc .thanks { margin-top: 14px; text-align: center; }
.quote-doc .footer { margin-top: 24px; display: flex; justify-content: space-between; font-size: 7.5pt; letter-spacing: .1em; color: var(--muted); text-transform: uppercase; }

@media print {
  @page { size: A4; margin: 14mm 0; }
  html, body { background: #fff !important; }
  .no-print { display: none !important; }
  .quote-doc { box-shadow: none; margin: 0; padding-top: 0; padding-bottom: 0; min-height: auto; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;

/** "21 y 22 de octubre, 2026" cuando todas las fechas son del mismo mes; si no, lista completa. */
function serviceDatesLabel(days: any[]) {
    if (days.length === 0) return '-';
    const parts = days.map(d => new Date(d.date));
    const sameMonth = parts.every(p => p.getUTCMonth() === parts[0].getUTCMonth() && p.getUTCFullYear() === parts[0].getUTCFullYear());
    if (!sameMonth) return days.map(d => formatDay(d.date, { day: '2-digit', month: 'short', year: 'numeric' })).join(', ');

    const dayNumbers = parts.map(p => p.getUTCDate());
    const joined = dayNumbers.length === 1
        ? `${dayNumbers[0]}`
        : `${dayNumbers.slice(0, -1).join(', ')} y ${dayNumbers[dayNumbers.length - 1]}`;
    const month = parts[0].toLocaleDateString('es-PE', { month: 'long', timeZone: 'UTC' });
    return `${joined} de ${month}, ${parts[0].getUTCFullYear()}`;
}

function totalMinutes(days: any[]) {
    return days.reduce((sum, d) => {
        const [sh, sm] = d.startTime.split(':').map(Number);
        const [eh, em] = d.endTime.split(':').map(Number);
        return sum + (eh * 60 + em) - (sh * 60 + sm);
    }, 0);
}

export default function PrintQuotePage() {
    const { id } = useParams<{ id: string }>();
    const [quote, setQuote] = useState<any>(null);
    const [config, setConfig] = useState<any>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        Promise.all([apiFetch(`/corporate/quotes/${id}`), apiFetch('/configuration')])
            .then(([quoteData, configData]) => {
                setQuote(quoteData);
                setConfig(configData);
                document.title = `${quoteData.code} - ${quoteData.company?.name}`;
            })
            .catch(err => setError(err.message));
    }, [id]);

    if (error) return <p className="p-8 text-red-600">No se pudo cargar la cotización: {error}</p>;
    if (!quote) return <p className="p-8 text-muted-foreground">Cargando...</p>;

    const days = quote.days;
    const sameSchedule = days.every((d: any) => d.startTime === days[0]?.startTime && d.endTime === days[0]?.endTime);
    const scheduleLabel = days.length === 0 ? '-' : sameSchedule
        ? `${formatTime12(days[0].startTime)} – ${formatTime12(days[0].endTime)}`
        : 'Según jornada';
    const minutes = totalMinutes(days);
    const hoursLabel = minutes % 60 === 0 ? `${minutes / 60} horas` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    const businessName = config?.businessName || 'Gracia Spa';
    const conditions: { title: string; text: string }[] = Array.isArray(quote.conditions) ? quote.conditions : [];
    const validUntil = new Date(quote.issueDate);
    validUntil.setUTCDate(validUntil.getUTCDate() + quote.validityDays);
    const discount = Number(quote.discount);
    const igvAmount = Number(quote.igvAmount);
    const total = Number(quote.total);

    // Numeración de secciones según las que se muestran
    const sectionTitles = [
        quote.introduction && 'Presentación',
        (quote.serviceDescription || quote.focusZones?.length > 0) && 'Servicio propuesto',
        'Equipo y recursos',
        'Resumen de la jornada',
        quote.scopeItems?.length > 0 && 'Alcance del servicio',
        'Inversión corporativa',
        conditions.length > 0 && 'Condiciones del servicio',
        'Confirmación & próximos pasos',
    ].filter(Boolean) as string[];
    const heading = (title: string) => (
        <h2>{String(sectionTitles.indexOf(title) + 1).padStart(2, '0')}. {title}</h2>
    );

    return (
        <div className="min-h-screen bg-neutral-200 py-6 print:p-0 print:bg-white">
            <style dangerouslySetInnerHTML={{ __html: STYLES }} />

            <div className="no-print max-w-[210mm] mx-auto mb-4 flex justify-between items-center px-2">
                <p className="text-sm text-neutral-600">Use &quot;Guardar como PDF&quot; en el diálogo de impresión. Active &quot;Gráficos de fondo&quot; para conservar los colores.</p>
                <button onClick={() => window.print()} className="bg-[#6B7F6A] text-white px-4 py-2 rounded-md flex items-center gap-2 hover:opacity-90">
                    <Printer className="h-4 w-4" /> Imprimir / PDF
                </button>
            </div>

            <div className="quote-doc">
                <div className="header">
                    <img src="/logo1.png" alt={businessName} style={{ height: 52 }} />
                    <div style={{ textAlign: 'right' }}>
                        <span className="pill">COTIZACIÓN CORPORATIVA</span>
                        <div className="issuer">
                            <div style={{ fontWeight: 600, color: '#1f2421' }}>{quote.code}</div>
                            {quote.showIssuerRuc && config?.businessRuc && <div>RUC {config.businessRuc}</div>}
                            {[config?.businessPhone, config?.businessEmail].filter(Boolean).join(' · ')}
                        </div>
                    </div>
                </div>

                <div className="banner">
                    <h1>{quote.title}</h1>
                    {quote.subtitle && <p>{quote.subtitle}</p>}
                </div>

                <div className="info">
                    <div>
                        <div className="label">Cliente</div>
                        <div className="value">{quote.company?.name}{quote.location ? ` — ${quote.location}` : ''}</div>
                        {quote.company?.ruc && <div style={{ fontSize: '8pt', color: '#6b6f6a' }}>RUC {quote.company.ruc}</div>}
                    </div>
                    <div>
                        <div className="label">Fecha emisión</div>
                        <div className="value">{formatDay(quote.issueDate, { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                    </div>
                    <div>
                        <div className="label">Fechas servicio</div>
                        <div className="value">{serviceDatesLabel(days)}</div>
                    </div>
                    <div>
                        <div className="label">Horario</div>
                        <div className="value">{scheduleLabel}</div>
                    </div>
                </div>

                {quote.introduction && (
                    <section>
                        {heading('Presentación')}
                        <p style={{ margin: 0, textAlign: 'justify' }}>{quote.introduction}</p>
                    </section>
                )}

                {(quote.serviceDescription || quote.focusZones?.length > 0) && (
                    <section>
                        {heading('Servicio propuesto')}
                        {quote.serviceDescription && <p style={{ margin: '0 0 10px', textAlign: 'justify' }}>{quote.serviceDescription}</p>}
                        {quote.focusZones?.length > 0 && (
                            <div className="box">
                                <div className="label">Zonas de enfoque principal</div>
                                <div style={{ fontWeight: 600, marginTop: 4 }}>{quote.focusZones.join(' · ')}</div>
                            </div>
                        )}
                    </section>
                )}

                <section>
                    {heading('Equipo y recursos')}
                    <div className="cards">
                        <div className="card">
                            <div className="title">{quote.therapistsCount} {quote.therapistsCount === 1 ? 'Terapeuta' : 'Terapeutas'}</div>
                            <p>Equipo profesional altamente capacitado para la atención de sus colaboradores.</p>
                        </div>
                        {quote.chairsCount > 0 && (
                            <div className="card">
                                <div className="title">{quote.chairsCount} {quote.chairsCount === 1 ? 'Silla Ergonómica' : 'Sillas Ergonómicas'}</div>
                                <p>Equipamiento especializado que permite {quote.chairsCount} {quote.chairsCount === 1 ? 'atención' : 'atenciones simultáneas'} con total confort.</p>
                            </div>
                        )}
                        <div className="card">
                            <div className="title">Atención de {quote.sessionDurationMin} min</div>
                            <p>Sesiones fluidas{quote.modality ? ` bajo modalidad ${quote.modality.toLowerCase()}` : ''} durante el horario contratado.</p>
                        </div>
                    </div>
                </section>

                <section>
                    {heading('Resumen de la jornada')}
                    <table>
                        <thead>
                            <tr><th>Concepto</th><th>Detalle del servicio</th></tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="concept">Fechas del evento</td>
                                <td>{days.map((d: any) => formatDay(d.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })).join(' · ')}</td>
                            </tr>
                            <tr>
                                <td className="concept">Horario y Duración</td>
                                <td>
                                    {sameSchedule
                                        ? `${scheduleLabel} (${durationLabel(days[0].startTime, days[0].endTime)} por jornada)`
                                        : days.map((d: any) => (
                                            <div key={d.id}>
                                                {formatDay(d.date, { day: '2-digit', month: 'short' })}: {formatTime12(d.startTime)} – {formatTime12(d.endTime)} ({durationLabel(d.startTime, d.endTime)})
                                            </div>
                                        ))}
                                </td>
                            </tr>
                            <tr>
                                <td className="concept">Capacidad Operativa</td>
                                <td>
                                    {quote.therapistsCount} terapeutas profesionales
                                    {quote.chairsCount > 0 && ` y ${quote.chairsCount} sillas de masaje simultáneas`}
                                </td>
                            </tr>
                            <tr>
                                <td className="concept">Modalidad &amp; Lugar</td>
                                <td>{[quote.modality, `${quote.company?.name}${quote.location ? ` ${quote.location}` : ''}`].filter(Boolean).join(' · ')}</td>
                            </tr>
                        </tbody>
                    </table>
                </section>

                {quote.scopeItems?.length > 0 && (
                    <section>
                        {heading('Alcance del servicio')}
                        <div className="scope">
                            {quote.scopeItems.map((item: string, i: number) => <span key={i}>{item}</span>)}
                        </div>
                    </section>
                )}

                <section>
                    {heading('Inversión corporativa')}
                    {quote.showBreakdown && (
                        <table style={{ marginBottom: 12 }}>
                            <thead>
                                <tr>
                                    <th>Concepto</th>
                                    <th style={{ textAlign: 'right' }}>Cant.</th>
                                    <th style={{ textAlign: 'right' }}>P. Unit.</th>
                                    <th style={{ textAlign: 'right' }}>Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {quote.items.map((item: any) => (
                                    <tr key={item.id}>
                                        <td>{item.description}</td>
                                        <td style={{ textAlign: 'right' }}>{Number(item.quantity)}</td>
                                        <td style={{ textAlign: 'right' }}>{formatMoney(item.unitPrice)}</td>
                                        <td style={{ textAlign: 'right' }}>{formatMoney(item.subtotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    <div className="investment">
                        {(quote.includeIgv || discount > 0) && (
                            <div className="tax-lines">
                                {discount > 0 && (
                                    <>
                                        <div><span>Subtotal</span><span>{formatMoney(quote.subtotal)}</span></div>
                                        <div><span>Descuento</span><span>- {formatMoney(discount)}</span></div>
                                    </>
                                )}
                                {quote.includeIgv && (
                                    <>
                                        <div><span>Op. gravada</span><span>{formatMoney(total - igvAmount)}</span></div>
                                        <div><span>IGV ({Number(quote.igvRate)}%)</span><span>{formatMoney(igvAmount)}</span></div>
                                    </>
                                )}
                            </div>
                        )}
                        <div className="label">Inversión total{quote.includeIgv ? ' (incluye IGV)' : ''}</div>
                        <div className="amount">{formatMoney(total)}</div>
                        <div className="caption">
                            Incluye {days.length} {days.length === 1 ? 'jornada' : 'jornadas'} de servicio ({hoursLabel} totales de atención),{' '}
                            {quote.therapistsCount} terapeutas, equipos y logística de traslado a la sede.
                        </div>
                    </div>
                </section>

                {conditions.length > 0 && (
                    <section>
                        {heading('Condiciones del servicio')}
                        <div className="conditions">
                            {conditions.map((c, i) => (
                                <div key={i} className="condition">
                                    <div className="title">{c.title}</div>
                                    <p>{c.text}</p>
                                </div>
                            ))}
                        </div>
                        <p style={{ fontSize: '8pt', color: '#6b6f6a', marginTop: 8 }}>
                            Cotización válida hasta el {formatDay(validUntil.toISOString(), { day: '2-digit', month: 'long', year: 'numeric' })}.
                        </p>
                    </section>
                )}

                <section>
                    {heading('Confirmación & próximos pasos')}
                    <p style={{ margin: 0, textAlign: 'justify' }}>
                        Tras la aprobación, iniciaremos las coordinaciones logísticas para accesos, validación del espacio, datos de contacto
                        y detalles operativos para asegurar una jornada puntual y organizada.
                    </p>
                    <div className="box thanks">
                        <img src="/logo1.png" alt={businessName} style={{ height: 40, margin: '4px auto 8px' }} />
                        <div className="serif" style={{ fontWeight: 600, fontSize: '12pt', color: '#56685a' }}>¡Gracias por considerar a {businessName}!</div>
                        <div style={{ fontStyle: 'italic', color: '#6b6f6a' }}>&quot;Más que un spa, un espacio para sanar&quot;</div>
                    </div>
                </section>

                <div className="footer">
                    <span>{businessName} — Propuesta corporativa {quote.company?.name}</span>
                    <span>{quote.code}</span>
                </div>
            </div>
        </div>
    );
}
