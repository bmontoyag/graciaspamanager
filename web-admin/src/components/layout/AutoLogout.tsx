'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { clearSession } from '@/lib/api';

// Compartido entre pestañas (igual que la sesión): una pestaña inactiva no cierra la sesión
// mientras se trabaja en otra.
const ACTIVITY_KEY = 'lastActivity';
const CHECK_INTERVAL_MS = 5000;

export function AutoLogout({ children, timeoutMinutes = 1 }: { children: React.ReactNode, timeoutMinutes?: number }) {
    const router = useRouter();

    useEffect(() => {
        const timeoutMs = timeoutMinutes * 60 * 1000;
        let lastWrite = 0;

        const markActivity = () => {
            const now = Date.now();
            // mousemove dispara muchos eventos por segundo: se guarda como mucho una vez por segundo
            if (now - lastWrite < 1000) return;
            lastWrite = now;
            localStorage.setItem(ACTIVITY_KEY, String(now));
        };

        const check = () => {
            // Otra pestaña ya cerró la sesión
            if (!localStorage.getItem('accessToken')) {
                router.push('/');
                return;
            }
            const last = Number(localStorage.getItem(ACTIVITY_KEY)) || 0;
            if (Date.now() - last >= timeoutMs) {
                clearSession();
                localStorage.removeItem(ACTIVITY_KEY);
                const label = timeoutMinutes === 1 ? '1 minuto' : `${timeoutMinutes} minutos`;
                toast.info(`Sesión cerrada por inactividad tras ${label}.`);
                router.push('/');
            }
        };

        markActivity();
        const interval = setInterval(check, CHECK_INTERVAL_MS);

        // Events that reset the timer
        const events = ['mousemove', 'keydown', 'wheel', 'mousedown', 'touchstart', 'touchmove'];
        events.forEach(event => window.addEventListener(event, markActivity));
        // Al volver a la pestaña se revisa de inmediato (los timers se ralentizan en segundo plano)
        const onVisible = () => { if (document.visibilityState === 'visible') check(); };
        document.addEventListener('visibilitychange', onVisible);

        return () => {
            clearInterval(interval);
            events.forEach(event => window.removeEventListener(event, markActivity));
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [router, timeoutMinutes]);

    return <>{children}</>;
}
