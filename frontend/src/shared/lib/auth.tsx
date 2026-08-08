/* eslint-disable react-refresh/only-export-components -- patrón de contexto: el provider y
   su hook viven juntos, igual que en el frontend heredado. */

/** Sesión de la aplicación.
 *
 * Port de `legacy-frontend/src/lib/auth.tsx` adaptado a Vite: sin `"use client"` y con los
 * imports por alias `@/`. La lógica es la misma: al arrancar, si hay token en localStorage
 * se revalida contra `GET /auth/me`; si el token ya no sirve, se limpia y la sesión queda
 * vacía. El token lo guarda/lee `api.ts` (misma clave `me_token`).
 */

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { api, clearToken, getToken, setOnUnauthorized, setToken } from "@/shared/lib/api";
import type { User } from "@/shared/lib/types";

interface AuthState {
  user: User | null;
  /** true mientras se revalida el token guardado al arrancar. */
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api.me();
      setUser(me);
    } catch {
      clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Sesión expirada: si el cliente recibe un 401 en una llamada autenticada, ya limpió el
  // token; aquí solo se vacía el estado y el guard `RequireAuth` manda a /login.
  useEffect(() => {
    setOnUnauthorized(() => setUser(null));
    return () => setOnUnauthorized(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const resp = await api.login(email, password);
    setToken(resp.access_token);
    setUser(resp.user);
    return resp.user;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
