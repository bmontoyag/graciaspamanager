'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Toaster } from 'sonner';
import { ConfirmDialogHost } from '@/components/ui/confirm-dialog';
import './globals.css';
import { inter, lora } from './fonts';
import { authFetch } from '@/lib/api';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/';
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {

    // Fetch configuration from API
    const loadConfiguration = async () => {
      try {
        const res = await authFetch(`${API_URL}/configuration/public`);
        if (res.ok) {
          const config = await res.json();

          // Apply theme configuration
          const root = document.documentElement;

          if (config.primaryColor) {
            root.style.setProperty('--primary', config.primaryColor);
          }
          if (config.backgroundColor) {
            root.style.setProperty('--background', config.backgroundColor);
          }
          if (config.themeMode) {
            root.classList.remove('light', 'dark');
            root.classList.add(config.themeMode);
          }
        }
      } catch (error) {
        console.error('Failed to load configuration:', error);
      }
    };

    loadConfiguration();
  }, []);

  return (
    <html lang="es" className={`${inter.variable} ${lora.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        {children}
        <Toaster richColors position="top-right" />
        <ConfirmDialogHost />
      </body>
    </html>
  );
}
