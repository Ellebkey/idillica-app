import { api } from '../lib/http';
import { session } from '../auth/session';
import type { JWTResponse } from './types';

export interface Credentials {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export function login(credentials: Credentials): Promise<JWTResponse> {
  return api<JWTResponse>('/auth/login', { method: 'POST', body: credentials, auth: false });
}

/** Fire-and-forget: revoca el refresh token en el servidor */
export function logout(): void {
  const refreshToken = session.getRefreshToken();
  if (refreshToken) {
    api('/auth/logout', { method: 'POST', body: { refreshToken } }).catch(() => {
      /* ignoramos errores del logout */
    });
  }
}
