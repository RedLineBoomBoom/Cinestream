import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { useRegisterSW } from 'virtual:pwa-register/react'
import './index.css'
import App from './App.tsx'

import { notifyUpdateAvailable } from './utils/pwaUpdate'

// PWA Service Worker — auto-update manager across all devices
function ServiceWorkerManager() {
  const { updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_swUrl, r) {
      if (!r) return;

      // If a service worker is already waiting to activate (from previous session), claim immediately
      if (r.waiting) {
        r.waiting.postMessage({ type: 'SKIP_WAITING' });
        notifyUpdateAvailable();
      }

      // Listen for newly installed updates
      r.addEventListener('updatefound', () => {
        const newWorker = r.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
            notifyUpdateAvailable();
          }
        });
      });

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

      // 3. Periodic check every 15 seconds
      const interval = setInterval(checkForUpdate, 15 * 1000);

      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', checkForUpdate);
        window.removeEventListener('online', checkForUpdate);
      };
    },
    onNeedRefresh() {
      notifyUpdateAvailable();
      updateServiceWorker(true);
    },
    onOfflineReady() {
      console.info('[Cinestream PWA] Ready to work offline.');
    },
  });

  // Listen for controllerchange: when new service worker takes over, notify & reload smoothly
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    let refreshing = false;
    const handleControllerChange = () => {
      notifyUpdateAvailable();

      if (refreshing) return;
      // Don't auto-reload abruptly if user is currently watching video
      const isVideoPlaying = document.querySelector('video') && !document.querySelector('video')?.paused;
      if (isVideoPlaying) {
        console.info('[Cinestream PWA] Update ready, deferring reload until video ends or user taps update.');
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

// Auto-recover from stale stylesheet or missing asset errors after deployment
if (typeof window !== 'undefined') {
  window.addEventListener(
    'error',
    (e) => {
      const target = e.target as HTMLElement | null;
      if (target && target.tagName === 'LINK' && (target as HTMLLinkElement).rel === 'stylesheet') {
        const key = 'cinestream_stylesheet_recover';
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, '1');
          console.warn('[Cinestream] Stylesheet failed to load, performing reload to sync latest assets...');
          window.location.reload();
        }
      }
    },
    true
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ServiceWorkerManager />
    <App />
  </StrictMode>,
)
