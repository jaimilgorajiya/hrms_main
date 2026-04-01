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
  const timeoutId = setTimeout(() => {
    console.warn(`[apiFetch] Request to ${url} timed out after 30s`);
    controller.abort();
  }, 30000); // Increased to 30s timeout

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
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error(`[apiFetch] Timeout Error: Request to ${url} was aborted.`);
      throw new Error('Request timed out. Please check your connection or try again.');
    }
    console.error(`[apiFetch] Fetch Error for ${url}:`, error);
    throw error;
  }
};

export const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_URL}/uploads/${path}`;
};