/**
 * PWA Update & Cache-Busting Manager for Cinestream
 * Ensures instant sync across mobile, tablet, desktop PWAs, and browsers.
 */

export const APP_VERSION = '1.4.7';
export const UPDATE_AVAILABLE_EVENT = 'cinestream:sw-update-available';

type UpdateCallback = (available: boolean) => void;
const subscribers = new Set<UpdateCallback>();

let isUpdateReady = false;

export function getIsUpdateReady(): boolean {
  return isUpdateReady;
}

export function notifyUpdateAvailable() {
  if (isUpdateReady) return;
  isUpdateReady = true;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(UPDATE_AVAILABLE_EVENT, { detail: { version: APP_VERSION } }));
  }
  subscribers.forEach((cb) => {
    try {
      cb(true);
    } catch (e) {
      console.warn('Update listener error:', e);
    }
  });
}

export function subscribeToUpdate(callback: UpdateCallback): () => void {
  subscribers.add(callback);
  if (isUpdateReady) {
    callback(true);
  }

  const handleCustomEvent = () => callback(true);
  if (typeof window !== 'undefined') {
    window.addEventListener(UPDATE_AVAILABLE_EVENT, handleCustomEvent);
  }

  return () => {
    subscribers.delete(callback);
    if (typeof window !== 'undefined') {
      window.removeEventListener(UPDATE_AVAILABLE_EVENT, handleCustomEvent);
    }
  };
}

/**
 * Actively triggers a check for new Service Worker across all devices
 */
export async function checkForAppUpdate(): Promise<{ hasUpdate: boolean; message: string }> {
  if (typeof window === 'undefined') {
    return { hasUpdate: false, message: 'SSR' };
  }

  if (!navigator.onLine) {
    return { hasUpdate: false, message: 'Offline' };
  }

  if (!('serviceWorker' in navigator)) {
    return { hasUpdate: false, message: 'Service worker not supported' };
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    if (registrations.length === 0) {
      return { hasUpdate: false, message: 'No registration active' };
    }

    let foundNew = false;

    for (const reg of registrations) {
      // Check if one is already waiting
      if (reg.waiting) {
        foundNew = true;
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        notifyUpdateAvailable();
        break;
      }

      // Explicitly ask the browser to check the server for sw.js byte difference
      try {
        await reg.update();
        const currentReg = reg as ServiceWorkerRegistration;
        if (currentReg.waiting || currentReg.installing) {
          foundNew = true;
          if (currentReg.waiting) {
            currentReg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          notifyUpdateAvailable();
          break;
        }
      } catch (err) {
        console.warn('SW update check error:', err);
      }
    }

    if (foundNew) {
      return { hasUpdate: true, message: 'Versi baru ditemukan dan siap dipasang!' };
    }

    return { hasUpdate: false, message: 'Cinestream sudah versi terbaru (' + APP_VERSION + ')' };
  } catch (err) {
    console.warn('Failed to check for update:', err);
    return { hasUpdate: false, message: 'Gagal memeriksa pembaruan' };
  }
}

/**
 * Applies pending update immediately and reloads the current page
 */
export async function applyAppUpdate(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }
    }
  } catch (err) {
    console.warn('Error applying SW update:', err);
  }

  // Small timeout to allow skip_waiting to take effect before reload
  setTimeout(() => {
    window.location.reload();
  }, 100);
}

/**
 * Hard-refreshes the app and clears caches (for troubleshooting or instant device cache refresh)
 */
export async function forceHardRefresh(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    // 1. Clear caches
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }

    // 2. Tell SW to skip waiting
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        reg.unregister().catch(() => {});
      }
    }
  } catch (err) {
    console.warn('Hard refresh error:', err);
  }

  // Reload buster
  const url = new URL(window.location.href);
  url.searchParams.set('_r', Date.now().toString());
  window.location.href = url.toString();
}
