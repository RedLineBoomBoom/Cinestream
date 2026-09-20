import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { useRegisterSW } from 'virtual:pwa-register/react'
import './index.css'
import App from './App.tsx'

// PWA Service Worker — auto-update manager across all devices
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

      // 1. Check immediately on register
      checkForUpdate();

      // 2. Check on app resume (user reopens PWA or tab becomes visible)
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') checkForUpdate();
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', checkForUpdate);
      window.addEventListener('online', checkForUpdate);

      // 3. Periodic check every 20 seconds
      const interval = setInterval(checkForUpdate, 20 * 1000);

      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', checkForUpdate);
        window.removeEventListener('online', checkForUpdate);
      };
    },
    onNeedRefresh() {
      // Auto-reload immediately when a new SW version is waiting
      updateServiceWorker(true);
    },
    onOfflineReady() {
      console.info('[Cinestream PWA] Ready to work offline.');
    },
  });

  // Listen for controllerchange: when new service worker takes over, reload to apply updates immediately
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    let refreshing = false;
    const handleControllerChange = () => {
      if (refreshing) return;
      // Don't auto-reload if user is currently watching video (to prevent disruption)
      const isVideoPlaying = document.querySelector('video') && !document.querySelector('video')?.paused;
      if (isVideoPlaying) {
        console.info('[Cinestream PWA] Update ready, deferring reload until video ends or next session.');
        return;
      }
      refreshing = true;
      console.info('[Cinestream PWA] New version activated, refreshing to apply updates...');
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  return null;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ServiceWorkerManager />
    <App />
  </StrictMode>,
)
