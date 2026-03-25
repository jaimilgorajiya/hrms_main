import { API_URL } from '../constants/api';
import { storage } from './storage';

export const apiFetch = async (endpoint, options = {}) => {
  const token = await storage.get('token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
  console.log('[apiFetch] Fetching:', url, 'with method:', options.method || 'GET');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(url, { 
      ...options, 
      headers,
      signal: controller.signal 
    });
    
    clearTimeout(timeoutId);

    if (response.status === 401) {
      await storage.remove('token');
      await storage.remove('user');
      // Navigation handled by auth context
    }

    return response;
  } catch (error) {
    console.error('API Fetch Error:', error);
    throw error;
  }
};

export const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_URL}/uploads/${path}`;
};
