import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import API_URL from '../../../config/api';

const MobileAuthContext = createContext(null);

export const MobileAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('mobile_token') || localStorage.getItem('token');
    const storedUser  = localStorage.getItem('mobile_user')  || localStorage.getItem('user');
    if (storedToken) {
      setToken(storedToken);
      try { setUser(JSON.parse(storedUser)); } catch { setUser(null); }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (json.success && json.token) {
      localStorage.setItem('mobile_token', json.token);
      localStorage.setItem('mobile_user', JSON.stringify(json.user));
      localStorage.setItem('token', json.token);
      localStorage.setItem('user', JSON.stringify(json.user));
      setToken(json.token);
      setUser(json.user);
    }
    return json;
  };

  const loginWithOTP = async (idToken) => {
    const res = await fetch(`${API_URL}/api/auth/otp-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    const json = await res.json();
    if (json.success && json.user?.token) {
      localStorage.setItem('mobile_token', json.user.token);
      localStorage.setItem('mobile_user', JSON.stringify(json.user));
      localStorage.setItem('token', json.user.token);
      localStorage.setItem('user', JSON.stringify(json.user));
      setToken(json.user.token);
      setUser(json.user);
    }
    return json;
  };

  const logout = () => {
    localStorage.removeItem('mobile_token');
    localStorage.removeItem('mobile_user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const apiFetch = useCallback(async (endpoint, options = {}) => {
    const t = token || localStorage.getItem('mobile_token') || localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
      ...options.headers,
    };
    const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(url, { ...options, headers, signal: controller.signal });
      clearTimeout(tid);
      // Only force logout if token is invalid (no token / bad signature).
      // Account-blocked (403) or other errors should NOT clear the session.
      if (response.status === 401) {
        const json = await response.clone().json().catch(() => ({}));
        const msg = json?.message || '';
        // Only logout if the token itself is bad — not for other 401 reasons
        if (msg.includes('Invalid Token') || msg.includes('No Token')) {
          logout();
        }
      }
      return response;
    } catch (err) {
      clearTimeout(tid);
      throw err;
    }
  }, [token]);

  return (
    <MobileAuthContext.Provider value={{ user, token, loading, login, loginWithOTP, logout, apiFetch, isAuthenticated: !!token }}>
      {children}
    </MobileAuthContext.Provider>
  );
};

export const useMobileAuth = () => {
  const ctx = useContext(MobileAuthContext);
  if (!ctx) throw new Error('useMobileAuth must be used inside MobileAuthProvider');
  return ctx;
};
