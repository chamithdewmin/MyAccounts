import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const authData = localStorage.getItem('auth');
    if (authData) {
      const { isAuthenticated: auth, user: userData } = JSON.parse(authData);
      setIsAuthenticated(auth);
      setUser(userData);
    }
  }, []);

  const login = (email, password) => {
    if (email === 'admin@gmail.com' && password === 'admin123') {
      const userData = { id: 1, email: 'admin@gmail.com', name: 'Admin' };
      setIsAuthenticated(true);
      setUser(userData);
      localStorage.setItem('auth', JSON.stringify({ isAuthenticated: true, user: userData }));
      return { success: true };
    }
    return { success: false, error: 'Invalid credentials' };
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('auth');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
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