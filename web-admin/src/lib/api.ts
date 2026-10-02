export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const SESSION_KEYS = ['accessToken', 'userId', 'userRole', 'userRoles', 'userPermissions', 'userName', 'userEmail'];

export function clearSession() {
    SESSION_KEYS.forEach(key => localStorage.removeItem(key));
}

/**
 * Igual que fetch, pero agrega el token JWT. Si la sesión expiró (401 con token), vuelve al login.
 */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const headers = new Headers(init.headers);
    if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);

    const res = await fetch(input, { ...init, headers });
    if (res.status === 401 && token && typeof window !== 'undefined') {
        clearSession();
        window.location.href = '/';
    }
    return res;
}

/**
 * authFetch + JSON + manejo de errores del backend (lanza Error con el mensaje de NestJS).
 */
export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    const res = await authFetch(`${API_URL}${path}`, { ...options, headers });
    const text = await res.text();
    let data: any = null;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }

    if (!res.ok) {
        const message = Array.isArray(data?.message) ? data.message.join(', ') : data?.message || res.statusText;
        throw new Error(message);
    }
    return data as T;
}
