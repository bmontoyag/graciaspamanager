import { getMidnightLima, getStartOfMonthLima } from './date-utils';

describe('date-utils', () => {
    describe('getMidnightLima', () => {
        it('should return 05:00 UTC for a date in Lima (Standard Time)', () => {
            const date = new Date('2026-03-25T12:00:00Z'); // Mid-day UTC
            const midnight = getMidnightLima(date);
            
            // March 25 in Lima is UTC-5.
            // 00:00 Lima = 05:00 UTC.
            expect(midnight.toISOString()).toBe('2026-03-25T05:00:00.000Z');
        });

        it('should handle evening times in Lima correctly', () => {
            // 11 PM Lima (March 25) = 04:00 UTC (March 26)
            const date = new Date('2026-03-26T04:00:00Z'); 
            const midnight = getMidnightLima(date);
            
            // Should still return March 25 05:00 UTC (00:00 Lima)
            expect(midnight.toISOString()).toBe('2026-03-25T05:00:00.000Z');
        });

        it('should handle early morning times in Lima correctly', () => {
            // 1 AM Lima (March 25) = 06:00 UTC (March 25)
            const date = new Date('2026-03-25T06:00:00Z');
            const midnight = getMidnightLima(date);
            
            expect(midnight.toISOString()).toBe('2026-03-25T05:00:00.000Z');
        });
    });

    describe('getStartOfMonthLima', () => {
        it('should return the 1st of the month at 05:00 UTC', () => {
            const date = new Date('2026-03-25T12:00:00Z');
            const som = getStartOfMonthLima(date);
            expect(som.toISOString()).toBe('2026-03-01T05:00:00.000Z');
        });
    });
});
