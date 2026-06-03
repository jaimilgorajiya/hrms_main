const getApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl;
  }
  // For local development, dynamically match the hostname of the browser
  const hostname = window.location.hostname;
  return `http://${hostname}:7000`;
};

const API_URL = getApiUrl();

console.log('API_URL loaded:', API_URL);

export default API_URL;
