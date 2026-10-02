import { cn } from '@/lib/utils';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand';

/** Combinaciones con contraste AA sobre fondo claro. */
export const TONE_CLASSES: Record<StatusTone, string> = {
    success: 'bg-green-100 text-green-800',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-sky-100 text-sky-800',
    neutral: 'bg-stone-100 text-stone-700',
    brand: 'bg-secondary text-primary',
};

export const APPOINTMENT_STATUS: Record<string, { label: string; tone: StatusTone }> = {
    PENDING: { label: 'Pendiente', tone: 'warning' },
    CONFIRMED: { label: 'Confirmada', tone: 'success' },
    COMPLETED: { label: 'Completada', tone: 'info' },
    CANCELLED: { label: 'Cancelada', tone: 'danger' },
    NO_SHOW: { label: 'No asistió', tone: 'danger' },
};

export function StatusBadge({ tone = 'neutral', className, children }: {
    tone?: StatusTone;
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <span className={cn('inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium', TONE_CLASSES[tone], className)}>
            {children}
        </span>
    );
}
