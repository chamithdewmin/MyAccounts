import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleLogout = () => {
      setIsAuthenticated(false);
      setUser(null);
      localStorage.removeItem('token');
    };
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok) {
            setIsAuthenticated(true);
            setUser(data.user);
            window.dispatchEvent(new CustomEvent('auth:login'));
          } else {
            localStorage.removeItem('token');
          }
        } catch {
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const data = await api.auth.login(email, password);
      if (data.success && data.token) {
        localStorage.setItem('token', data.token);
        if (data.loginActivityId) {
          localStorage.setItem('loginActivityId', String(data.loginActivityId));
        }
        setIsAuthenticated(true);
        setUser(data.user);
        window.dispatchEvent(new CustomEvent('auth:login'));
        return { success: true };
      }
    } catch (err) {
      return { success: false, error: err.message || 'Invalid credentials' };
    }
    return { success: false, error: 'Invalid credentials' };
  };

  const logout = async () => {
    const activityId = localStorage.getItem('loginActivityId');
    try {
      await api.auth.logout(activityId || undefined);
    } catch {
      // Best-effort logout activity update; still clear local auth state
    }
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('loginActivityId');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
