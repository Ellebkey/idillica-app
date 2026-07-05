import { API_URL } from './config';
import { session } from '../auth/session';
import type { ApiErrorBody, JWTResponse } from '../api/types';

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/** Se dispara cuando la sesión no puede recuperarse (falló el refresh) — AuthProvider escucha */
export const UNAUTHORIZED_EVENT = 'idilica:unauthorized';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Adjunta el token y reintenta con refresh en 401 (default true) */
  auth?: boolean;
  signal?: AbortSignal;
}

const AUTH_PATHS = ['/auth/login', '/auth/refresh', '/auth/register'];

function send(path: string, { method = 'GET', body, auth = true, signal }: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = {};
  const isForm = body instanceof FormData;

  if (body !== undefined && !isForm) {
    headers['Content-Type'] = 'application/json';
  }
  if (auth) {
    const token = session.getToken();
    if (token) {
      // El backend espera el token en crudo — sin prefijo "Bearer"
      headers.Authorization = token;
    }
  }

  return fetch(`${API_URL}${path}`, {
    method,
    headers,
    signal,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });
}

async function parse<T>(res: Response): Promise<T> {
  if (res.status === 204) {
    return undefined as T;
  }
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (data as ApiErrorBody | null)?.error;
    throw new ApiError(res.status, err?.message ?? `HTTP ${res.status}`, err?.code);
  }
  return data as T;
}

let refreshPromise: Promise<boolean> | null = null;

/** Single-flight: varios 401 concurrentes comparten un solo refresh */
function refreshTokens(): Promise<boolean> {
  refreshPromise ??= (async () => {
    const refreshToken = session.getRefreshToken();
    if (!refreshToken) {
      return false;
    }
    try {
      const res = await send('/auth/refresh', { method: 'POST', body: { refreshToken }, auth: false });
      if (!res.ok) {
        return false;
      }
      const data = (await res.json()) as JWTResponse;
      session.updateTokens(data.token, data.refreshToken, data.expiresIn);
      return true;
    } catch {
      return false;
    }
  })().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await send(path, options);

  if (res.status !== 401 || options.auth === false || AUTH_PATHS.some((p) => path.startsWith(p))) {
    return parse<T>(res);
  }

  if (await refreshTokens()) {
    return parse<T>(await send(path, options));
  }

  session.clear();
  window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  throw new ApiError(401, 'Session expired', 'UNAUTHORIZED');
}
