import type { JWTResponse } from '../api/types';

const KEYS = ['token', 'refreshToken', 'roles', 'expiresIn', 'username', 'fullname'] as const;

function normalizeRoles(roles: string[] | string): string[] {
  return Array.isArray(roles) ? roles : [roles].filter(Boolean);
}

export const session = {
  getToken(): string | null {
    return localStorage.getItem('token');
  },

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  },

  getUsername(): string | null {
    return localStorage.getItem('username');
  },

  getFullname(): string | null {
    return localStorage.getItem('fullname');
  },

  getRoles(): string[] {
    const stored = localStorage.getItem('roles');
    if (!stored) {
      return [];
    }
    try {
      const parsed: unknown = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed as string[];
      }
      return typeof parsed === 'string' && parsed ? [parsed] : [];
    } catch {
      return [stored];
    }
  },

  isAuthenticated(): boolean {
    // Con refresh token seguimos "dentro" (el cliente HTTP renueva el access en 401)
    if (this.getRefreshToken()) {
      return true;
    }
    const expiresIn = localStorage.getItem('expiresIn');
    if (!expiresIn) {
      return false;
    }
    return new Date() < new Date(expiresIn);
  },

  setUser(res: JWTResponse): void {
    localStorage.setItem('token', res.token);
    localStorage.setItem('refreshToken', res.refreshToken);
    localStorage.setItem('roles', JSON.stringify(normalizeRoles(res.roles)));
    localStorage.setItem('expiresIn', res.expiresIn);
    localStorage.setItem('username', res.username);
    if (res.fullname) {
      localStorage.setItem('fullname', res.fullname);
    } else {
      localStorage.removeItem('fullname');
    }
  },

  updateTokens(token: string, refreshToken: string, expiresIn: string): void {
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('expiresIn', expiresIn);
  },

  clear(): void {
    KEYS.forEach((key) => localStorage.removeItem(key));
  },
};
