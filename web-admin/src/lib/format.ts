/**
 * Formato único de montos y fechas para todo el portal (es-PE, soles, hora de Lima).
 */

export const formatMoney = (value: number | string | null | undefined) =>
    `S/ ${Number(value || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Fechas "de calendario" (sin hora real) se guardan como YYYY-MM-DD, 00:00Z o 12:00Z;
 * se muestran en UTC para no desfasar el día. El resto se muestra en hora de Lima.
 */
const isCalendarDate = (iso: string) => iso.length === 10 || /T(00|12):00:00(\.000)?Z$/.test(iso);

const toIso = (value: string | Date) => (typeof value === 'string' ? value : value.toISOString());

export function formatDate(
    value: string | Date | null | undefined,
    options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' },
) {
    if (!value) return '';
    const iso = toIso(value);
    const date = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
    return date.toLocaleDateString('es-PE', { ...options, timeZone: isCalendarDate(iso) ? 'UTC' : 'America/Lima' });
}

export function formatTime(value: string | Date | null | undefined) {
    if (!value) return '';
    return new Date(toIso(value)).toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Lima',
    });
}

export function formatDateTime(value: string | Date | null | undefined) {
    if (!value) return '';
    return `${formatDate(value)} ${formatTime(value)}`;
}
