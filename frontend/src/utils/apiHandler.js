import API_URL from '../config/api';

/**
 * Custom fetch wrapper that handles authentication and automatic logout on 401.
 */
export const authenticatedFetch = async (endpoint, options = {}) => {
    const token = localStorage.getItem('token');
    
    // Set up headers
    const headers = {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
    };

    // Only set Content-Type if it's not FormData
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    const config = {
        ...options,
        headers,
    };

    // Ensure endpoint starts with / if it doesn't and isn't a full URL
    const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

    try {
        const response = await fetch(url, config);

        if (response.status === 401 || response.status === 403) {
            // Token expired, unauthorized, or Account Inactive
            console.warn('Access denied or account inactive. Logging out...');
            
            // Clear local storage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // Redirect to login page
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login?expired=true';
            }
        }

        return response;
    } catch (error) {
        console.error('API Fetch Error:', error);
        throw error;
    }
};

export default authenticatedFetch;
