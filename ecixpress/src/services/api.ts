const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(
  path: string,
  token: string | null,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const raw = body.message;
    let message: string;
    if (typeof raw === 'string') {
      message = raw;
    } else if (Array.isArray(raw)) {
      message = raw.join(', ');
    } else if (raw && typeof raw === 'object') {
      const nested = raw as Record<string, unknown>;
      if (typeof nested['message'] === 'string') {
        // GlobalExceptionFilter wraps NestJS response: { message: { message: string } }
        message = nested['message'];
      } else if (Array.isArray(nested['message'])) {
        message = (nested['message'] as string[]).join(', ');
      } else {
        // Zod flatten(): { formErrors: string[], fieldErrors: Record<string, string[]> }
        const parts: string[] = [
          ...((nested['formErrors'] as string[]) ?? []),
          ...Object.values((nested['fieldErrors'] as Record<string, string[]>) ?? {}).flat(),
        ];
        message = parts.join(', ') || `Error ${res.status}`;
      }
    } else {
      message = `Error ${res.status}`;
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}
