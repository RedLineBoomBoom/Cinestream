import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { useRegisterSW } from 'virtual:pwa-register/react'
import './index.css'
import App from './App.tsx'

// PWA Service Worker — auto-update every hour in the background
function ServiceWorkerManager() {
  useRegisterSW({
    onRegisteredSW(swUrl, r) {
      if (!r) return;
      // Poll for updates every 60 minutes
      setInterval(async () => {
        if (!(!r.installing && navigator.onLine)) return;
        const res = await fetch(swUrl, { cache: 'no-store', headers: { cache: 'no-store' } }).catch(() => null);
        if (res?.status === 200) r.update();
      }, 60 * 60 * 1000);
    },
    onNeedRefresh() {
      // Auto-apply new SW without interrupting the user
      // The new SW will activate on next navigation
    },
    onOfflineReady() {
      // App is fully cached and ready to work offline
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
