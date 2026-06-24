import { API_URL } from '../constants/api';
import { storage } from './storage';
import NetInfo from '@react-native-community/netinfo';

/**
 * One-shot check: is there an active internet connection right now?
 * Returns true if connected, false otherwise.
 */
export const isNetworkAvailable = async () => {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected === true && state.isInternetReachable !== false;
  } catch {
    return true; // Default to true so we don't wrongly block requests
  }
};

export const apiFetch = async (endpoint, options = {}) => {
  const token = await storage.get('token');

  const headers = {
    'Content-Type': 'application/json',
    'x-platform': 'mobile',
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
      // Clone the response to read the body without consuming it
      const json = await response.clone().json().catch(() => ({}));
      const msg = json?.message || '';
      // Only clear session if the token itself is invalid (bad signature / missing)
      // Do NOT clear on account-blocked or other 401 reasons
      if (msg.includes('Invalid Token') || msg.includes('No Token')) {
        await storage.remove('token');
        await storage.remove('user');
        // Navigation handled by auth context
      }
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