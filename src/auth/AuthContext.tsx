import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { session } from './session';
import { UNAUTHORIZED_EVENT } from '../lib/http';
import * as authApi from '../api/auth.api';

interface AuthContextValue {
  isAuthenticated: boolean;
  username: string | null;
  fullname: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => session.isAuthenticated());

  // El cliente HTTP dispara este evento cuando el refresh token ya no es válido
  useEffect(() => {
    const onUnauthorized = () => setIsAuthenticated(false);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    // El teléfono es un dispositivo personal: siempre recordamos la sesión
    const res = await authApi.login({ username, password, rememberMe: true });
    session.setUser(res);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    session.clear();
    setIsAuthenticated(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      username: isAuthenticated ? session.getUsername() : null,
      fullname: isAuthenticated ? session.getFullname() : null,
      login,
      logout,
    }),
    [isAuthenticated, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
