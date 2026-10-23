import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'leaflet/dist/leaflet.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// Prevent flash of light mode on dark mode page refresh
if (localStorage.getItem('admin-theme') === 'dark') {
  document.body.classList.add('dark-mode');
} else {
  document.body.classList.remove('dark-mode');
}

// Globally prevent mouse wheel / trackpad scrolling from incrementing or decrementing number inputs
document.addEventListener('wheel', () => {
  if (document.activeElement && document.activeElement.type === 'number') {
    document.activeElement.blur();
  }
}, { passive: true });

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
