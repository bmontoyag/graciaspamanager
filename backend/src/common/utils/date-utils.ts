/**
 * Utility to handle dates in America/Lima (UTC-5)
 */

export function getMidnightLima(date: Date = new Date()): Date {
    // Get the date components in Lima timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Lima',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    
    // Format is YYYY-MM-DD
    const limaDateStr = formatter.format(date);
    
    // Create a new date at 00:00:00-05:00 for that day
    // This will correctly represent the start of that day in Lima as a UTC Date object.
    return new Date(`${limaDateStr}T00:00:00-05:00`);
}

/**
 * Current calendar date in Lima as YYYY-MM-DD.
 */
export function getTodayLimaString(date: Date = new Date()): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Lima',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date);
}

export function getEndOfDayLima(date: Date = new Date()): Date {
    const start = getMidnightLima(date);
    const end = new Date(start.getTime());
    end.setHours(23, 59, 59, 999);
    // Wait, if I setHours on a UTC date object, it uses local server time.
    // Better to just add 24h minus 1ms.
    return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

export function getStartOfMonthLima(date: Date = new Date()): Date {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Lima',
        year: 'numeric',
        month: '2-digit',
    });
    const limaMonthStr = formatter.format(date); // YYYY-MM
    return new Date(`${limaMonthStr}-01T00:00:00-05:00`);
}

/**
 * Minutes since midnight (Lima) for a given instant.
 */
export function getLimaMinutes(date: Date): number {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Lima',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(date);
    const hour = Number(parts.find(p => p.type === 'hour')?.value || 0);
    const minute = Number(parts.find(p => p.type === 'minute')?.value || 0);
    return hour * 60 + minute;
}

/**
 * Converts "HH:mm" to minutes since midnight.
 */
export function timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}

/**
 * Normalizes a calendar date (YYYY-MM-DD or ISO) to 12:00 UTC of that day,
 * same convention used by expenses to avoid day shifts.
 */
export function toCalendarDate(value: string): Date {
    return new Date(`${value.slice(0, 10)}T12:00:00.000Z`);
}
