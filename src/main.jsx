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

// Broken image URLs (removed Unsplash photos, stale CMS links, cached listings) show a neutral
// brand tile instead of the browser's broken-image icon. Capture phase: <img> errors don't bubble.
const IMAGE_FALLBACK = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">' +
  '<rect width="800" height="600" fill="#0B1B32"/><rect x="330" y="235" width="140" height="130" rx="10" fill="none" stroke="#C9A96E" stroke-width="6"/>' +
  '<path d="M345 345l40-45 30 30 20-20 25 35z" fill="#C9A96E" opacity=".7"/><circle cx="440" cy="270" r="12" fill="#C9A96E" opacity=".7"/></svg>'
);
window.addEventListener('error', (event) => {
  const img = event.target;
  if (!(img instanceof HTMLImageElement) || img.dataset.fallbackApplied) return;
  img.dataset.fallbackApplied = '1';
  img.srcset = '';
  img.src = IMAGE_FALLBACK;
}, true);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)