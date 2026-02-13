import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const authData = localStorage.getItem('auth');
      if (token) {
        try {
          const { user: userData } = await api.auth.me();
          setIsAuthenticated(true);
          setUser(userData);
          localStorage.setItem('auth', JSON.stringify({ isAuthenticated: true, user: userData }));
        } catch {
          localStorage.removeItem('token');
          localStorage.removeItem('auth');
        }
      } else if (authData) {
        const { isAuthenticated: auth, user: userData } = JSON.parse(authData);
        setIsAuthenticated(auth);
        setUser(userData);
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
        localStorage.setItem('auth', JSON.stringify({ isAuthenticated: true, user: data.user }));
        setIsAuthenticated(true);
        setUser(data.user);
        return { success: true };
      }
    } catch (err) {
      // Fallback: allow demo login when API is unreachable (e.g. backend not deployed)
      if (email === 'admin@gmail.com' && password === 'admin123') {
        const userData = { id: 1, email: 'admin@gmail.com', name: 'Admin' };
        setIsAuthenticated(true);
        setUser(userData);
        localStorage.setItem('auth', JSON.stringify({ isAuthenticated: true, user: userData }));
        return { success: true };
      }
      return { success: false, error: err.message || 'Invalid credentials' };
    }
    return { success: false, error: 'Invalid credentials' };
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('auth');
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
