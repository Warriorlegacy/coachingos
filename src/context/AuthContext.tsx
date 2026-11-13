// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Centre, UserRole } from '../types';
import { apiRequest, setCsrfToken } from '../lib/api';

interface AuthContextType {
  user: User | null;
  activeCentre: Centre | null;
  role: UserRole | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  demoLogin: (targetRole: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [activeCentre, setActiveCentre] = useState<Centre | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchSession = async () => {
    try {
      const data = await apiRequest('/auth/me');
      if (data.authenticated && data.user) {
        setUser(data.user);
        setActiveCentre(data.activeCentre);
        setRole(data.role);
        if (data.csrfToken) {
          setCsrfToken(data.csrfToken);
        }
      } else {
        setUser(null);
        setActiveCentre(null);
        setRole(null);
      }
    } catch (err) {
      console.warn('[Auth] Check session failed:', err);
      setUser(null);
      setActiveCentre(null);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setUser(data.user);
    setActiveCentre(data.activeCentre);
    setRole(data.role);
    if (data.csrfToken) {
      setCsrfToken(data.csrfToken);
    }
  };

  const demoLogin = async (targetRole: UserRole) => {
    const data = await apiRequest('/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ role: targetRole }),
    });
    setUser(data.user);
    setActiveCentre(data.activeCentre);
    setRole(data.role);
    if (data.csrfToken) {
      setCsrfToken(data.csrfToken);
    }
  };

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch { /* ignore */ }
    setUser(null);
    setActiveCentre(null);
    setRole(null);
    setCsrfToken('');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeCentre,
        role,
        loading,
        login,
        demoLogin,
        logout,
        refreshUser: fetchSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
