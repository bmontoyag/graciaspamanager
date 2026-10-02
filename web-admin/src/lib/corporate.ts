export const QUOTE_STATUS: Record<string, { label: string; className: string }> = {
    DRAFT: { label: 'Borrador', className: 'bg-gray-100 text-gray-700' },
    SENT: { label: 'Enviada', className: 'bg-blue-100 text-blue-700' },
    ACCEPTED: { label: 'Aceptada', className: 'bg-green-100 text-green-700' },
    REJECTED: { label: 'Rechazada', className: 'bg-red-100 text-red-700' },
    CONVERTED: { label: 'Convertida', className: 'bg-purple-100 text-purple-700' },
    EXPIRED: { label: 'Vencida', className: 'bg-amber-100 text-amber-700' },
};

export const EVENT_STATUS: Record<string, { label: string; className: string }> = {
    SCHEDULED: { label: 'Programado', className: 'bg-blue-100 text-blue-700' },
    IN_PROGRESS: { label: 'En curso', className: 'bg-amber-100 text-amber-700' },
    COMPLETED: { label: 'Completado', className: 'bg-green-100 text-green-700' },
    CANCELLED: { label: 'Cancelado', className: 'bg-red-100 text-red-700' },
};

export const DAY_STATUS: Record<string, { label: string; className: string }> = {
    SCHEDULED: { label: 'Programada', className: 'bg-blue-100 text-blue-700' },
    COMPLETED: { label: 'Realizada', className: 'bg-green-100 text-green-700' },
    CANCELLED: { label: 'Cancelada', className: 'bg-red-100 text-red-700' },
};

export const PAYMENT_METHODS: Record<string, string> = {
    TRANSFER: 'Transferencia',
    CASH: 'Efectivo',
    CARD: 'Tarjeta',
    YAPE: 'Yape',
    PLIN: 'Plin',
};

export const PAYMENT_TYPES: Record<string, string> = {
    ADVANCE: 'Adelanto',
    FULL: 'Pago total',
    RELICIDATION: 'Saldo / Liquidación',
};

export const CORPORATE_EVENT_COLOR = '#6B7F6A';

/** Fecha de vencimiento de una cotización (issueDate + validityDays). */
export function isQuoteExpired(quote: { status: string; issueDate: string; validityDays: number }) {
    if (!['DRAFT', 'SENT'].includes(quote.status)) return false;
    const expires = new Date(quote.issueDate);
    expires.setUTCDate(expires.getUTCDate() + quote.validityDays);
    return expires.getTime() < Date.now();
}

export function displayQuoteStatus(quote: { status: string; issueDate: string; validityDays: number }) {
    return isQuoteExpired(quote) ? QUOTE_STATUS.EXPIRED : QUOTE_STATUS[quote.status];
}

export const formatMoney = (value: number | string) =>
    `S/ ${Number(value || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Fechas de calendario se guardan a las 12:00 UTC; se formatean en UTC para no desfasar el día. */
export const formatDay = (iso: string, options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }) =>
    new Date(iso).toLocaleDateString('es-PE', { ...options, timeZone: 'UTC' });

export const toInputDate = (iso: string) => iso.slice(0, 10);

export const getLocalToday = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
};

/** "11:30" -> "11:30 a. m." */
export const formatTime12 = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const suffix = h < 12 ? 'a. m.' : 'p. m.';
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
};

export const durationLabel = (start: string, end: string) => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const minutes = eh * 60 + em - (sh * 60 + sm);
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (hours === 0) return `${rest} minutos`;
    return rest > 0 ? `${hours} horas y ${rest} minutos` : `${hours} horas`;
};

export const DEFAULT_QUOTE = {
    title: 'JORNADA DE BIENESTAR PARA COLABORADORES',
    subtitle: 'Propuesta de servicio de masajes corporativos descontracturantes',
    introduction:
        'En Gracia Spa creemos firmemente que generar espacios de bienestar dentro del entorno laboral contribuye activamente a mejorar el clima organizacional y la productividad. Ponemos a disposición de su organización nuestro equipo profesional especializado para trasladar una experiencia integral de relajación y desconexión directamente a sus instalaciones.',
    serviceDescription:
        'Se brindarán sesiones individuales de masaje relajante y descontracturante en silla ergonómica, diseñadas para aliviar rápidamente la fatiga física y liberar la tensión muscular acumulada.',
    focusZones: ['Cuello y Zona Cervical', 'Hombros', 'Espalda', 'Brazos y Manos'],
    modality: 'Atención abierta continua',
    scopeItems: [
        'Terapeutas profesionales por jornada',
        'Sillas de masaje ergonómicas',
        'Sesiones descontracturantes',
        'Atención simultánea de colaboradores',
        'Coordinación y montaje de espacio previa',
        'Traslado y logística 100% incluida',
        'Organización del flujo de personas',
        'Desmontaje y retiro al finalizar',
    ],
    conditions: [
        { title: 'Coordinación & Reserva', text: 'Fechas y horarios quedan reservados tras la confirmación formal de la propuesta.' },
        { title: 'Espacio e Instalaciones', text: 'El cliente proveerá el área adecuada con espacio suficiente para las sillas y libre circulación.' },
        { title: 'Dinámica de Atención', text: 'Modalidad abierta según llegada y disponibilidad de los colaboradores en el horario acordado.' },
        { title: 'Vigencia de Cotización', text: 'Propuesta válida por 7 días calendario a partir de la fecha de emisión.' },
    ],
};
