const getApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  // If the env variable is set to a production/live domain, use it
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl;
  }
  // For local development, dynamically match the hostname of the browser
  const hostname = window.location.hostname;
  return `http://${hostname}:7000`;
};

const API_URL = getApiUrl();

console.log('API_URL loaded:', API_URL);

export default API_URL;
