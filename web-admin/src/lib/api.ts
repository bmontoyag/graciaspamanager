export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * fetch con token JWT y manejo de errores del backend (lanza Error con el mensaje de NestJS).
 */
export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

    const res = await fetch(`${API_URL}${path}`, { ...options, headers });
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
