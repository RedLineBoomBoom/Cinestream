import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';

/**
 * Initializes Capacitor mobile native features:
 * - Status Bar appearance (Cinema dark theme)
 * - Android hardware back button handler
 */
export function initCapacitorApp(onBackPress: () => boolean) {
  if (!Capacitor.isNativePlatform()) return;

  // Configure Status Bar
  try {
    StatusBar.setStyle({ style: Style.Dark });
    StatusBar.setBackgroundColor({ color: '#141414' });
  } catch (err) {
    console.warn('[Capacitor] Status bar configuration skipped:', err);
  }

  // Handle Android hardware back button
  try {
    const handler = CapApp.addListener('backButton', ({ canGoBack }) => {
      const handled = onBackPress();
      if (!handled) {
        if (canGoBack) {
          window.history.back();
        } else {
          CapApp.exitApp();
        }
      }
    });

    return () => {
      handler.then((h) => h.remove()).catch(() => {});
    };
  } catch (err) {
    console.warn('[Capacitor] Back button listener skipped:', err);
  }
}
