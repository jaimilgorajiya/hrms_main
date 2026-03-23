const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:7000';

console.log('API_URL loaded:', API_URL);

if (!API_URL) {
    console.error("VITE_API_URL is not defined in environment variables!");
}

export default API_URL;
