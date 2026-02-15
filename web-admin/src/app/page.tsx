'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mounted, setMounted] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [loginBgUrl, setLoginBgUrl] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    setMounted(true);

    // Fetch configuration from API
    const loadConfiguration = async () => {
      try {
        const res = await fetch('http://localhost:3001/configuration');
        if (res.ok) {
          const config = await res.json();
          if (config.logoUrl) setLogoUrl(config.logoUrl);
          if (config.loginBgUrl) setLoginBgUrl(config.loginBgUrl);
        }
      } catch (error) {
        console.error('Failed to load configuration:', error);
      }
    };

    loadConfiguration();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch('http://localhost:3001/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        const { access_token, user } = data;

        localStorage.setItem('accessToken', access_token);
        localStorage.setItem('userId', user.id.toString());
        localStorage.setItem('userRoles', JSON.stringify(user.roles));
        localStorage.setItem('userPermissions', JSON.stringify(user.permissions));

        console.log('Login successful:', { email: user.email, roles: user.roles, permissions: user.permissions });
        router.push('/dashboard');
      } else {
        const errorData = await res.json();
        alert(`Error al iniciar sesión: ${errorData.message || 'Credenciales inválidas'}`);
      }
    } catch (error) {
      console.error('Error logging in:', error);
      alert('Error de conexión con el servidor');
    }
  };

  if (!mounted) return null;

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background relative"
      style={loginBgUrl ? {
        backgroundImage: `url(${loginBgUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      } : {}}
    >
      {loginBgUrl && <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />}

      <div className="w-full max-w-md rounded-lg border border-border bg-card/95 backdrop-blur-md p-8 shadow-2xl relative z-10">
        {logoUrl ? (
          <div className="mb-6 flex justify-center">
            <img src={logoUrl} alt="Logo" className="max-h-20 object-contain" />
          </div>
        ) : (
          <h2 className="mb-6 text-3xl font-serif font-bold text-center tracking-widest text-foreground">GRACIA</h2>
        )}

        <p className="mb-6 text-center text-sm text-muted-foreground tracking-widest uppercase">Más que un spa, un espacio para sanar</p>

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="email">
              Email
            </label>
            <input
              className="w-full rounded-md border border-input bg-background/80 backdrop-blur px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@graciaspa.com"
            />
          </div>
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="password">
              Password
            </label>
            <input
              className="w-full rounded-md border border-input bg-background/80 backdrop-blur px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button
            className="w-full rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            type="submit"
          >
            Iniciar Sesión
          </button>
        </form>
      </div>
    </div>
  );
}
