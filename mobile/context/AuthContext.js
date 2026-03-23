import React, { createContext, useContext, useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import { apiFetch } from '../utils/api';
import { ENDPOINTS } from '../constants/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const storedToken = await storage.get('token');
      const storedUser = await storage.get('user');
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);
      }
    } catch (e) {
      console.error('Session load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await apiFetch(ENDPOINTS.login, {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });
    const data = await res.json();

    if (data.success) {
      await storage.set('token', data.user.token);
      await storage.set('user', data.user);
      setToken(data.user.token);
      setUser(data.user);
      return { success: true };
    }
    return { success: false, message: data.message || 'Login failed' };
  };

  const loginWithOTP = async (idToken) => {
    try {
      const res = await apiFetch(ENDPOINTS.otpLogin, {
        method: 'POST',
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();

      if (data.success) {
        await storage.set('token', data.user.token);
        await storage.set('user', data.user);
        setToken(data.user.token);
        setUser(data.user);
        return { success: true };
      }
      return { success: false, message: data.message || 'Login failed' };
    } catch (error) {
      return { success: false, message: 'Server unreachable' };
    }
  };

  const checkPhoneStatus = async (phone) => {
    try {
      const res = await apiFetch(ENDPOINTS.checkPhone, {
        method: 'POST',
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      return data;
    } catch (error) {
      return { success: false, message: 'Server unreachable' };
    }
  };

  const logout = async () => {
    await storage.clear();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, loginWithOTP, logout, checkPhoneStatus }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
