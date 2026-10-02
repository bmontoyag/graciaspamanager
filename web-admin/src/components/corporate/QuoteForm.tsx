'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { DEFAULT_QUOTE, formatMoney, getLocalToday, toInputDate } from '@/lib/corporate';
import CompanyDialog from './CompanyDialog';

interface QuoteFormProps {
    quote?: any;
    readOnly?: boolean;
    onSaved: (quote: any) => void;
}

type Day = { date: string; startTime: string; endTime: string };
type Item = { serviceId: string; description: string; quantity: string; unitPrice: string };
type Condition = { title: string; text: string };

const inputClass = 'w-full p-2 border rounded-md bg-card disabled:bg-muted';
const round2 = (v: number) => Math.round(v * 100) / 100;

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
    return (
        <section className="bg-card border rounded-lg p-4 md:p-6 shadow-sm">
            <h2 className="text-lg font-semibold">{title}</h2>
            {description && <p className="text-sm text-muted-foreground mb-4">{description}</p>}
            <div className={description ? '' : 'mt-4'}>{children}</div>
        </section>
    );
}

function StringListEditor({ values, onChange, placeholder, disabled }: {
    values: string[]; onChange: (v: string[]) => void; placeholder: string; disabled?: boolean;
}) {
    return (
        <div className="space-y-2">
            {values.map((value, i) => (
                <div key={i} className="flex gap-2">
                    <input
                        value={value}
                        disabled={disabled}
                        onChange={e => onChange(values.map((v, j) => (j === i ? e.target.value : v)))}
                        className={inputClass}
                    />
                    {!disabled && (
                        <button type="button" onClick={() => onChange(values.filter((_, j) => j !== i))} className="p-2 hover:bg-accent rounded text-red-600" aria-label="Eliminar">
                            <Trash2 className="h-4 w-4" />
                        </button>
                    )}
                </div>
            ))}
            {!disabled && (
                <button type="button" onClick={() => onChange([...values, ''])} className="text-sm text-primary flex items-center gap-1 hover:underline">
                    <Plus className="h-4 w-4" /> {placeholder}
                </button>
            )}
        </div>
    );
}

export default function QuoteForm({ quote, readOnly, onSaved }: QuoteFormProps) {
    const [companies, setCompanies] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [configIgvRate, setConfigIgvRate] = useState(18);
    const [isCompanyDialogOpen, setIsCompanyDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        companyId: '',
        location: '',
        title: DEFAULT_QUOTE.title,
        subtitle: DEFAULT_QUOTE.subtitle,
        issueDate: getLocalToday(),
        validityDays: '7',
        introduction: DEFAULT_QUOTE.introduction,
        serviceDescription: DEFAULT_QUOTE.serviceDescription,
        sessionDurationMin: '15',
        therapistsCount: '1',
        chairsCount: '1',
        modality: DEFAULT_QUOTE.modality,
        showIssuerRuc: false,
        includeIgv: false,
        igvIncluded: false,
        discount: '0',
        showBreakdown: false,
        therapistDayRate: '0',
        notes: '',
    });
    const [focusZones, setFocusZones] = useState<string[]>(DEFAULT_QUOTE.focusZones);
    const [scopeItems, setScopeItems] = useState<string[]>(DEFAULT_QUOTE.scopeItems);
    const [conditions, setConditions] = useState<Condition[]>(DEFAULT_QUOTE.conditions);
    const [days, setDays] = useState<Day[]>([{ date: getLocalToday(), startTime: '09:00', endTime: '13:00' }]);
    const [items, setItems] = useState<Item[]>([
        { serviceId: '', description: 'Jornada de masajes corporativos', quantity: '1', unitPrice: '0' },
    ]);

    const loadCompanies = () =>
        apiFetch('/companies')
            .then(data => setCompanies(Array.isArray(data) ? data : []))
            .catch(err => toast.error(`No se pudieron cargar las empresas: ${err.message}`));

    useEffect(() => {
        loadCompanies();
        apiFetch('/services').then(data => setServices(Array.isArray(data) ? data.filter((s: any) => s.isActive) : [])).catch(console.error);
        apiFetch('/configuration').then(config => setConfigIgvRate(Number(config.igvRate ?? 18))).catch(console.error);
    }, []);

    useEffect(() => {
        if (!quote) return;
        setForm({
            companyId: quote.companyId.toString(),
            location: quote.location || '',
            title: quote.title,
            subtitle: quote.subtitle || '',
            issueDate: toInputDate(quote.issueDate),
            validityDays: quote.validityDays.toString(),
            introduction: quote.introduction || '',
            serviceDescription: quote.serviceDescription || '',
            sessionDurationMin: quote.sessionDurationMin.toString(),
            therapistsCount: quote.therapistsCount.toString(),
            chairsCount: quote.chairsCount.toString(),
            modality: quote.modality || '',
            showIssuerRuc: quote.showIssuerRuc,
            includeIgv: quote.includeIgv,
            igvIncluded: quote.igvIncluded,
            discount: Number(quote.discount).toString(),
            showBreakdown: quote.showBreakdown,
            therapistDayRate: Number(quote.therapistDayRate).toString(),
            notes: quote.notes || '',
        });
        setFocusZones(quote.focusZones || []);
        setScopeItems(quote.scopeItems || []);
        setConditions(Array.isArray(quote.conditions) ? quote.conditions : []);
        setDays(quote.days.map((d: any) => ({ date: toInputDate(d.date), startTime: d.startTime, endTime: d.endTime })));
        setItems(quote.items.map((i: any) => ({
            serviceId: i.serviceId ? i.serviceId.toString() : '',
            description: i.description,
            quantity: Number(i.quantity).toString(),
            unitPrice: Number(i.unitPrice).toString(),
        })));
    }, [quote]);

    const igvRate = quote ? Number(quote.igvRate) : configIgvRate;

    // Mismo cálculo que el backend (CorporateQuotesService.computeTotals)
    const totals = useMemo(() => {
        const subtotal = round2(items.reduce((sum, i) => sum + (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0), 0));
        const base = round2(Math.max(subtotal - (parseFloat(form.discount) || 0), 0));
        let igvAmount = 0;
        let total = base;
        if (form.includeIgv) {
            if (form.igvIncluded) {
                igvAmount = round2(base - base / (1 + igvRate / 100));
            } else {
                igvAmount = round2(base * igvRate / 100);
                total = round2(base + igvAmount);
            }
        }
        return { subtotal, base, igvAmount, total };
    }, [items, form.discount, form.includeIgv, form.igvIncluded, igvRate]);

    const estimatedTherapistCost = (parseFloat(form.therapistDayRate) || 0) * (parseInt(form.therapistsCount) || 0) * days.length;
    const netIncome = form.includeIgv ? totals.total - totals.igvAmount : totals.total;

    const set = (name: string, value: any) => setForm(prev => ({ ...prev, [name]: value }));
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        set(name, type === 'checkbox' ? (e.target as HTMLInputElement).checked : value);
    };

    const updateDay = (index: number, field: keyof Day, value: string) =>
        setDays(prev => prev.map((d, i) => (i === index ? { ...d, [field]: value } : d)));
    const updateItem = (index: number, field: keyof Item, value: string) =>
        setItems(prev => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));

    const handleServiceSelect = (index: number, serviceId: string) => {
        const service = services.find(s => s.id.toString() === serviceId);
        setItems(prev => prev.map((it, i) => (i === index
            ? { ...it, serviceId, description: service ? service.name : it.description, unitPrice: service ? Number(service.price).toString() : it.unitPrice }
            : it)));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.companyId) {
            toast.error('Seleccione la empresa');
            return;
        }

        const payload = {
            companyId: parseInt(form.companyId),
            location: form.location || undefined,
            title: form.title,
            subtitle: form.subtitle || undefined,
            issueDate: form.issueDate,
            validityDays: parseInt(form.validityDays) || 7,
            introduction: form.introduction,
            serviceDescription: form.serviceDescription,
            focusZones: focusZones.map(z => z.trim()).filter(Boolean),
            sessionDurationMin: parseInt(form.sessionDurationMin) || 15,
            therapistsCount: parseInt(form.therapistsCount) || 1,
            chairsCount: parseInt(form.chairsCount) || 0,
            modality: form.modality,
            scopeItems: scopeItems.map(s => s.trim()).filter(Boolean),
            conditions: conditions.filter(c => c.title.trim()),
            showIssuerRuc: form.showIssuerRuc,
            includeIgv: form.includeIgv,
            igvIncluded: form.includeIgv && form.igvIncluded,
            discount: parseFloat(form.discount) || 0,
            showBreakdown: form.showBreakdown,
            therapistDayRate: parseFloat(form.therapistDayRate) || 0,
            notes: form.notes,
            days,
            items: items.map(i => ({
                serviceId: i.serviceId ? parseInt(i.serviceId) : undefined,
                description: i.description,
                quantity: parseFloat(i.quantity) || 0,
                unitPrice: parseFloat(i.unitPrice) || 0,
            })),
        };

        setSaving(true);
        try {
            const saved = await apiFetch(quote ? `/corporate/quotes/${quote.id}` : '/corporate/quotes', {
                method: quote ? 'PATCH' : 'POST',
                body: JSON.stringify(payload),
            });
            toast.success(quote ? 'Cotización actualizada' : `Cotización ${saved.code} creada`);
            onSaved(saved);
        } catch (error: any) {
            toast.error(`Error al guardar: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    const selectedCompany = companies.find(c => c.id.toString() === form.companyId);

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-6">
                <fieldset disabled={readOnly} className="space-y-6">
                    <Section title="Cliente y emisión">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Empresa *</label>
                                <div className="flex gap-2">
                                    <select name="companyId" value={form.companyId} onChange={handleChange} required className={inputClass}>
                                        <option value="">Seleccionar...</option>
                                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}{c.ruc ? ` (RUC ${c.ruc})` : ''}</option>)}
                                    </select>
                                    {!readOnly && (
                                        <button type="button" onClick={() => setIsCompanyDialogOpen(true)} title="Nueva empresa" className="px-3 border rounded-md hover:bg-muted">
                                            <Building2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                                {selectedCompany?.contactName && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Contacto: {selectedCompany.contactName} {selectedCompany.contactPhone && `- ${selectedCompany.contactPhone}`}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Sede / Lugar del servicio</label>
                                <input name="location" value={form.location} onChange={handleChange} placeholder="Ej. Sede La Molina" className={inputClass} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Fecha de emisión</label>
                                <input type="date" name="issueDate" value={form.issueDate} onChange={handleChange} required className={inputClass} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Vigencia (días calendario)</label>
                                <input type="number" min="1" name="validityDays" value={form.validityDays} onChange={handleChange} className={inputClass} />
                            </div>
                        </div>
                    </Section>

                    <Section title="Contenido de la propuesta">
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Título</label>
                                    <input name="title" value={form.title} onChange={handleChange} required className={inputClass} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Subtítulo</label>
                                    <input name="subtitle" value={form.subtitle} onChange={handleChange} className={inputClass} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">01. Presentación</label>
                                <textarea name="introduction" value={form.introduction} onChange={handleChange} rows={4} className={inputClass} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">02. Servicio propuesto</label>
                                <textarea name="serviceDescription" value={form.serviceDescription} onChange={handleChange} rows={3} className={inputClass} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Zonas de enfoque</label>
                                <StringListEditor values={focusZones} onChange={setFocusZones} placeholder="Agregar zona" disabled={readOnly} />
                            </div>
                        </div>
                    </Section>

                    <Section title="Equipo y jornadas">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium mb-1">Terapeutas</label>
                                <input type="number" min="1" name="therapistsCount" value={form.therapistsCount} onChange={handleChange} className={inputClass} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Sillas / camillas</label>
                                <input type="number" min="0" name="chairsCount" value={form.chairsCount} onChange={handleChange} className={inputClass} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Duración sesión (min)</label>
                                <input type="number" min="1" name="sessionDurationMin" value={form.sessionDurationMin} onChange={handleChange} className={inputClass} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Modalidad</label>
                                <input name="modality" value={form.modality} onChange={handleChange} className={inputClass} />
                            </div>
                        </div>

                        <label className="block text-sm font-medium mb-2">Jornadas *</label>
                        <div className="space-y-2">
                            {days.map((day, i) => (
                                <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
                                    <input type="date" value={day.date} onChange={e => updateDay(i, 'date', e.target.value)} required className={inputClass} />
                                    <input type="time" value={day.startTime} onChange={e => updateDay(i, 'startTime', e.target.value)} required className={inputClass} />
                                    <input type="time" value={day.endTime} onChange={e => updateDay(i, 'endTime', e.target.value)} required className={inputClass} />
                                    {!readOnly && days.length > 1 ? (
                                        <button type="button" onClick={() => setDays(days.filter((_, j) => j !== i))} className="p-2 hover:bg-accent rounded text-red-600" aria-label="Eliminar">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    ) : <span className="w-8" />}
                                </div>
                            ))}
                        </div>
                        {!readOnly && (
                            <button
                                type="button"
                                onClick={() => setDays([...days, { ...days[days.length - 1], date: '' }])}
                                className="mt-2 text-sm text-primary flex items-center gap-1 hover:underline"
                            >
                                <Plus className="h-4 w-4" /> Agregar jornada
                            </button>
                        )}
                    </Section>

                    <Section title="Alcance y condiciones">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium mb-2">05. Alcance del servicio</label>
                                <StringListEditor values={scopeItems} onChange={setScopeItems} placeholder="Agregar ítem" disabled={readOnly} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">07. Condiciones del servicio</label>
                                <div className="space-y-3">
                                    {conditions.map((c, i) => (
                                        <div key={i} className="border rounded-md p-2 space-y-2">
                                            <div className="flex gap-2">
                                                <input
                                                    value={c.title}
                                                    placeholder="Título"
                                                    onChange={e => setConditions(conditions.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                                                    className={`${inputClass} font-medium`}
                                                />
                                                {!readOnly && (
                                                    <button type="button" onClick={() => setConditions(conditions.filter((_, j) => j !== i))} className="p-2 hover:bg-accent rounded text-red-600" aria-label="Eliminar">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                            <textarea
                                                value={c.text}
                                                rows={2}
                                                onChange={e => setConditions(conditions.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                                                className={inputClass}
                                            />
                                        </div>
                                    ))}
                                    {!readOnly && (
                                        <button type="button" onClick={() => setConditions([...conditions, { title: '', text: '' }])} className="text-sm text-primary flex items-center gap-1 hover:underline">
                                            <Plus className="h-4 w-4" /> Agregar condición
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Section>

                    <Section title="Inversión" description="Conceptos de cobro. Puede mostrar solo el total o el detalle en el PDF.">
                        <div className="space-y-2 overflow-x-auto">
                            <div className="hidden md:grid grid-cols-[180px_1fr_90px_120px_110px_40px] gap-2 text-xs font-medium text-muted-foreground">
                                <span>Servicio (opcional)</span><span>Descripción</span><span>Cantidad</span><span>Precio unit.</span><span className="text-right">Subtotal</span><span />
                            </div>
                            {items.map((item, i) => (
                                <div key={i} className="grid grid-cols-2 md:grid-cols-[180px_1fr_90px_120px_110px_40px] gap-2 items-center border-b md:border-0 pb-2 md:pb-0">
                                    <select value={item.serviceId} onChange={e => handleServiceSelect(i, e.target.value)} className={`${inputClass} col-span-2 md:col-span-1`}>
                                        <option value="">Personalizado</option>
                                        {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                    <input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} required placeholder="Descripción" className={`${inputClass} col-span-2 md:col-span-1`} />
                                    <input type="number" step="0.01" min="0" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} className={inputClass} />
                                    <input type="number" step="0.01" min="0" value={item.unitPrice} onChange={e => updateItem(i, 'unitPrice', e.target.value)} className={inputClass} />
                                    <span className="text-right font-mono text-sm">
                                        {formatMoney((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0))}
                                    </span>
                                    {!readOnly && items.length > 1 ? (
                                        <button type="button" onClick={() => setItems(items.filter((_, j) => j !== i))} className="p-2 hover:bg-accent rounded text-red-600 justify-self-end" aria-label="Eliminar">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    ) : <span />}
                                </div>
                            ))}
                        </div>
                        {!readOnly && (
                            <button
                                type="button"
                                onClick={() => setItems([...items, { serviceId: '', description: '', quantity: '1', unitPrice: '0' }])}
                                className="mt-2 text-sm text-primary flex items-center gap-1 hover:underline"
                            >
                                <Plus className="h-4 w-4" /> Agregar concepto
                            </button>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold">Opciones tributarias y de presentación</h3>
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" name="showIssuerRuc" checked={form.showIssuerRuc} onChange={handleChange} />
                                    Mostrar RUC del emisor en la cotización
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" name="includeIgv" checked={form.includeIgv} onChange={handleChange} />
                                    Incluir IGV ({igvRate}%)
                                </label>
                                {form.includeIgv && (
                                    <div className="ml-6 space-y-1">
                                        <label className="flex items-center gap-2 text-sm">
                                            <input type="radio" checked={!form.igvIncluded} onChange={() => set('igvIncluded', false)} />
                                            Precios más IGV (se suma al total)
                                        </label>
                                        <label className="flex items-center gap-2 text-sm">
                                            <input type="radio" checked={form.igvIncluded} onChange={() => set('igvIncluded', true)} />
                                            Precios incluyen IGV (se desglosa)
                                        </label>
                                    </div>
                                )}
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" name="showBreakdown" checked={form.showBreakdown} onChange={handleChange} />
                                    Mostrar detalle de conceptos en el PDF
                                </label>
                                <div className="max-w-[200px]">
                                    <label className="block text-sm font-medium mb-1">Descuento (S/)</label>
                                    <input type="number" step="0.01" min="0" name="discount" value={form.discount} onChange={handleChange} className={inputClass} />
                                </div>
                            </div>

                            <div className="bg-muted/40 rounded-lg p-4 text-sm space-y-1 self-start">
                                <div className="flex justify-between"><span>Subtotal</span><span className="font-mono">{formatMoney(totals.subtotal)}</span></div>
                                {(parseFloat(form.discount) || 0) > 0 && (
                                    <div className="flex justify-between text-red-600"><span>Descuento</span><span className="font-mono">- {formatMoney(form.discount)}</span></div>
                                )}
                                {form.includeIgv && (
                                    <>
                                        <div className="flex justify-between"><span>Op. gravada</span><span className="font-mono">{formatMoney(totals.total - totals.igvAmount)}</span></div>
                                        <div className="flex justify-between"><span>IGV ({igvRate}%)</span><span className="font-mono">{formatMoney(totals.igvAmount)}</span></div>
                                    </>
                                )}
                                <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2"><span>Total</span><span className="font-mono">{formatMoney(totals.total)}</span></div>
                            </div>
                        </div>
                    </Section>

                    <Section title="Datos internos" description="No se muestran en el PDF. Sirven para estimar el margen y sugerir el pago al convertir en evento.">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Pago por terapeuta por jornada (S/)</label>
                                <input type="number" step="0.01" min="0" name="therapistDayRate" value={form.therapistDayRate} onChange={handleChange} className={inputClass} />
                            </div>
                            <div className="text-sm">
                                <p className="text-muted-foreground">Costo estimado terapeutas</p>
                                <p className="font-mono font-semibold">{formatMoney(estimatedTherapistCost)}</p>
                                <p className="text-xs text-muted-foreground">{form.therapistsCount} terapeutas x {days.length} jornadas</p>
                            </div>
                            <div className="text-sm">
                                <p className="text-muted-foreground">Margen estimado {form.includeIgv && '(sin IGV)'}</p>
                                <p className={`font-mono font-semibold ${netIncome - estimatedTherapistCost >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatMoney(netIncome - estimatedTherapistCost)}
                                </p>
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-sm font-medium mb-1">Notas internas</label>
                                <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className={inputClass} />
                            </div>
                        </div>
                    </Section>
                </fieldset>

                {!readOnly && (
                    <div className="flex justify-end gap-2 sticky bottom-0 bg-background/90 backdrop-blur py-3">
                        <button type="submit" disabled={saving} className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition disabled:opacity-50">
                            {saving ? 'Guardando...' : quote ? 'Guardar cambios' : 'Crear cotización'}
                        </button>
                    </div>
                )}
            </form>

            <CompanyDialog
                isOpen={isCompanyDialogOpen}
                onClose={() => setIsCompanyDialogOpen(false)}
                onSave={async (company) => {
                    await loadCompanies();
                    set('companyId', company.id.toString());
                }}
            />
        </>
    );
}
