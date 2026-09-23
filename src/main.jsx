import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'
import './index.css'
import './styles/art-direction.css'
import App from './App.jsx'
import ErrorBoundary from './components/common/ErrorBoundary.jsx'

// Auto-heal new deployments when CSS/JS chunks are updated on the server
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  const reloadKey = '1line_vite_preload_reload';
  const lastAttempt = sessionStorage.getItem(reloadKey);
  if (!lastAttempt || (Date.now() - Number(lastAttempt)) > 15000) {
    sessionStorage.setItem(reloadKey, String(Date.now()));
    window.location.reload();
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)