import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { useRegisterSW } from 'virtual:pwa-register/react'
import './index.css'
import App from './App.tsx'

// PWA Service Worker — auto-update manager
function ServiceWorkerManager() {
  const { updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_swUrl, r) {
      if (!r) return;
      // Immediately check for updates
      const checkForUpdate = () => {
        if (navigator.onLine && !r.installing) {
          r.update().catch(() => {});
        }
      };

      checkForUpdate();
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForUpdate();
      });

      // Poll every 30 seconds
      setInterval(checkForUpdate, 30 * 1000);
    },
    onNeedRefresh() {
      // Auto-reload immediately when a new SW version is waiting
      updateServiceWorker(true);
    },
    onOfflineReady() {
      console.info('[Cinestream PWA] Ready to work offline.');
    },
  });

  return null;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ServiceWorkerManager />
    <App />
  </StrictMode>,
)
