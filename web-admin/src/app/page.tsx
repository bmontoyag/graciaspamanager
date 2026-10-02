'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { API_URL, authFetch } from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [loginBgUrl, setLoginBgUrl] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    setMounted(true);

    // Fetch configuration from API
    const loadConfiguration = async () => {
      try {
        const res = await authFetch(`${API_URL}/configuration/public`);
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
    setError('');
    setLoading(true);

    try {
      const res = await authFetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const { access_token, user } = await res.json();

        localStorage.setItem('accessToken', access_token);
        localStorage.setItem('userId', user.id.toString());
        localStorage.setItem('userRoles', JSON.stringify(user.roles));
        localStorage.setItem('userPermissions', JSON.stringify(user.permissions));

        router.push('/dashboard');
        return;
      }

      setError(res.status === 401 ? 'Correo o contraseña incorrectos.' : 'No se pudo iniciar sesión. Intente nuevamente.');
    } catch (error) {
      console.error('Error logging in:', error);
      setError('No hay conexión con el servidor.');
    }
    setLoading(false);
  };

  if (!mounted) return null;

  const inputClass = 'w-full rounded-md border border-input bg-card px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary';

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background relative px-4"
      style={loginBgUrl ? {
        backgroundImage: `url(${loginBgUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      } : {}}
    >
      {loginBgUrl && <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />}

      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-xl relative z-10">
        <div className="mb-8 flex justify-center">
          <img src={logoUrl || '/logo1.png'} alt="Gracia Spa: más que un spa, un espacio para sanar" className="max-h-16 object-contain" />
        </div>

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor="email">
              Correo electrónico
            </label>
            <input
              className={inputClass}
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@correo.com"
            />
          </div>
          <div className="mb-6">
            <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor="password">
              Contraseña
            </label>
            <div className="relative">
              <input
                className={`${inputClass} pr-11`}
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <button
            className="w-full rounded-md bg-primary px-4 py-2.5 font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
            type="submit"
            disabled={loading}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
