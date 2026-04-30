'use client';
// frontend/src/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import Cookies from 'js-cookie';
import { authApi } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  firebaseLogin: (idToken: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = Cookies.get('token') || localStorage.getItem('token');
    if (token) {
      authApi.me()
        .then(res => setUser(res))
        .catch(() => {
          Cookies.remove('token');
          localStorage.removeItem('token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    const { token, user } = res;
    const isProd = process.env.NODE_ENV === 'production';
    Cookies.set('token', token, { 
      expires: 7, 
      secure: isProd,
      sameSite: 'lax'
    });
    localStorage.setItem('token', token);
    setUser(user);
  }, []);

  const firebaseLogin = useCallback(async (idToken: string) => {
    const res = await authApi.firebaseLogin(idToken);
    const { token, user } = res;
    
    // On localhost, we shouldn't use secure: true unless we're on HTTPS
    const isProd = process.env.NODE_ENV === 'production';
    Cookies.set('token', token, { 
      expires: 7, 
      secure: isProd,
      sameSite: 'lax'
    });
    
    localStorage.setItem('token', token);
    setUser(user);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const res = await authApi.register({ email, password, name });
    const { token, user } = res;
    const isProd = process.env.NODE_ENV === 'production';
    Cookies.set('token', token, { 
      expires: 7,
      secure: isProd,
      sameSite: 'lax'
    });
    localStorage.setItem('token', token);
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    authApi.logout().catch(() => {});
    Cookies.remove('token');
    localStorage.removeItem('token');
    setUser(null);
    window.location.href = '/auth/login';
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    login,
    firebaseLogin,
    register,
    logout,
    isAuthenticated: !!user
  }), [user, loading, login, firebaseLogin, register, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
