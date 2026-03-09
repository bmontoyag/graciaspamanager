'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export function AutoLogout({ children, timeoutMinutes = 15 }: { children: React.ReactNode, timeoutMinutes?: number }) {
    const router = useRouter();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const resetTimeout = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Convert minutes to milliseconds
        const ms = timeoutMinutes * 60 * 1000;

        timeoutRef.current = setTimeout(() => {
            // Logout user on inactivity
            localStorage.removeItem('accessToken');
            localStorage.removeItem('userRole');
            localStorage.removeItem('userRoles');

            alert(`Sesión expirada por inactividad tras ${timeoutMinutes} minutos.`);
            router.push('/login');
        }, ms);
    };

    useEffect(() => {
        // Initialize timeout
        resetTimeout();

        // Events that reset the timer
        const events = ['mousemove', 'keydown', 'wheel', 'mousedown', 'touchstart', 'touchmove'];

        const handleActivity = () => {
            resetTimeout();
        };

        events.forEach(event => {
            window.addEventListener(event, handleActivity);
        });

        // Cleanup
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [router, timeoutMinutes]);

    return <>{children}</>;
}
