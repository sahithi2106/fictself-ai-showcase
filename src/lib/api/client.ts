/**
 * FictSelf API Base Client
 *
 * Wraps every API request with:
 * - JWT token injection from localStorage
 * - Uniform error handling
 * - 401 → fires 'fictself:session-expired' custom event
 */

export const API_BASE = '/api/v1';

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('fictself_access_token');

  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> ?? {}),
  };
  
  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    localStorage.removeItem('fictself_access_token');
    window.dispatchEvent(new Event('fictself:session-expired'));
    throw new Error('Session expired. Please log in again.');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      typeof body.detail === 'string'
        ? body.detail
        : JSON.stringify(body.detail) || `HTTP ${res.status}`
    );
  }

  // 204 No Content — return empty object
  if (res.status === 204) return {} as T;

  return res.json() as Promise<T>;
}

/** Convenience helpers */
export const apiGet = <T>(path: string) => apiFetch<T>(path, { method: 'GET' });

export const apiPost = <T>(path: string, body: unknown) =>
  apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) });

export const apiPostFormData = <T>(path: string, body: FormData) =>
  apiFetch<T>(path, { method: 'POST', body });

export const apiPut = <T>(path: string, body: unknown) =>
  apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) });

export const apiDelete = <T>(path: string) =>
  apiFetch<T>(path, { method: 'DELETE' });
