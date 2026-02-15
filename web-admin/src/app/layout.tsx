'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Toaster } from 'sonner';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/';

  useEffect(() => {

    // Fetch configuration from API
    const loadConfiguration = async () => {
      try {
        const res = await fetch('http://localhost:3001/configuration');
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
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
