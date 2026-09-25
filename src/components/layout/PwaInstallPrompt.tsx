import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Tablet, Monitor, Share, Plus, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { useLanguage } from '../../context/LanguageContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type DeviceClass = 'mobile' | 'tablet' | 'desktop';

const getDeviceClass = (): DeviceClass => {
  if (typeof window === 'undefined') return 'mobile';
  const w = window.innerWidth;
  if (w >= 1024) return 'desktop';
  if (w >= 640) return 'tablet';
  return 'mobile';
};

const DISMISS_KEY = 'cinestream_pwa_dismissed_until';
const DISMISS_HOURS = 24; // Re-prompt after 24 hours if dismissed

export const PwaInstallPrompt: React.FC = () => {
  const { language } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window !== 'undefined' && (window as any).__cinestreamDeferredPrompt) {
      return (window as any).__cinestreamDeferredPrompt;
    }
    return null;
  });
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [deviceClass, setDeviceClass] = useState<DeviceClass>('mobile');
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // 0. If in native APK app (Capacitor), never show PWA install prompt
    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) return;

    // 1. If already installed as standalone PWA, skip
    const isStandalone =
      (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) ||
      (typeof window !== 'undefined' && (window.navigator as unknown as { standalone?: boolean }).standalone === true);
    if (isStandalone) return;

    // 2. Detect device
    const dc = getDeviceClass();
    setDeviceClass(dc);

    // 3. Detect iOS Safari
    const ua = typeof window !== 'undefined' ? window.navigator.userAgent.toLowerCase() : '';
    const isIosDevice = /iphone|ipad|ipod/.test(ua) && !/crios|fxios/.test(ua);
    setIsIOS(isIosDevice);

    // 4. Check persistent dismissal (allow manual open or query param ?pwa=1 to override)
    const hasForceParam = typeof window !== 'undefined' && (window.location.search.includes('pwa=1') || window.location.search.includes('install=1'));
    let isDismissed = false;
    try {
      const until = localStorage.getItem(DISMISS_KEY);
      if (until && Date.now() < parseInt(until, 10)) {
        isDismissed = true;
      }
    } catch {}

    // Check if early prompt was already captured in index.html
    if (typeof window !== 'undefined' && (window as any).__cinestreamDeferredPrompt) {
      setDeferredPrompt((window as any).__cinestreamDeferredPrompt);
    }

    // 5. Capture native prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      (window as any).__cinestreamDeferredPrompt = promptEvent;
      if (!isDismissed || hasForceParam) {
        setIsVisible(true);
      }
    };

    const handlePromptReady = (e: any) => {
      const promptEvent = e.detail || (window as any).__cinestreamDeferredPrompt;
      if (promptEvent) {
        setDeferredPrompt(promptEvent);
      }
      if (!isDismissed || hasForceParam) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('cinestream:pwa-prompt-ready', handlePromptReady);

    // 6. Universal visibility timer: on ALL browser devices (Chrome, Edge, Firefox, Safari, Samsung Internet, etc.)
    // Show after initial page experience (3.5s delay)
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (!isDismissed || hasForceParam) {
      timer = setTimeout(() => {
        setIsVisible(true);
      }, 3500);
    }

    // 7. Manual trigger listener from any button in the app (Navbar, Profile, Footer)
    const handleManualOpen = () => {
      setIsVisible(true);
      setShowGuide(false);
      try {
        localStorage.removeItem(DISMISS_KEY);
      } catch {}
    };
    window.addEventListener('cinestream:open-pwa-install', handleManualOpen);

    // 8. Dismiss on successful installation
    const handleAppInstalled = () => {
      setIsVisible(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('cinestream:pwa-prompt-ready', handlePromptReady);
      window.removeEventListener('cinestream:open-pwa-install', handleManualOpen);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    // If native browser prompt is available (Chrome, Edge, Samsung Internet)
    if (deferredPrompt) {
      setIsInstalling(true);
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsVisible(false);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.warn('PWA install prompt error:', err);
        setShowGuide(true);
      } finally {
        setIsInstalling(false);
      }
      return;
    }

    // If deferredPrompt is NOT available (iOS Safari, Firefox, or browser already handled)
    // Toggle the visual step-by-step installation instructions for this browser/device
    setShowGuide(true);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      const until = Date.now() + DISMISS_HOURS * 60 * 60 * 1000;
      localStorage.setItem(DISMISS_KEY, String(until));
    } catch {}
  };

  if (!isVisible) return null;

  // Tablet/desktop → anchored bottom-right like a toast
  // Mobile → bottom full-width card
  const isTabletOrDesktop = deviceClass !== 'mobile';
  const DeviceIcon = deviceClass === 'desktop' ? Monitor : deviceClass === 'tablet' ? Tablet : Smartphone;

  return (
    <AnimatePresence>
      <motion.div
        key="pwa-prompt"
        initial={{ opacity: 0, y: 60, scale: 0.93 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 60, scale: 0.93 }}
        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
        className={`fixed z-[9999] ${
          isTabletOrDesktop
            ? 'bottom-6 right-5 max-w-[360px] w-[360px]'
            : 'bottom-[calc(56px+env(safe-area-inset-bottom,0px)+12px)] left-3 right-3 max-w-[420px] mx-auto'
        }`}
      >
        <div className="relative rounded-2xl overflow-hidden border border-white/[0.12] shadow-[0_20px_60px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.06)] bg-[#141414]/98 backdrop-blur-2xl">
          {/* Red accent top bar */}
          <div className="h-[3px] bg-gradient-to-r from-[#E50914] via-red-500 to-transparent" />

          <div className="p-4 space-y-3">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#E50914] to-red-900 flex items-center justify-center shadow-lg shadow-red-900/50 shrink-0">
                <DeviceIcon className="w-5 h-5 text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-white leading-tight">
                  {language === 'en' ? 'Install Cinestream' : 'Pasang Cinestream'}
                </h4>
                <p className="text-[11.5px] text-slate-400 leading-snug mt-0.5">
                  {language === 'en'
                    ? `Add to your ${deviceClass === 'tablet' ? 'tablet' : deviceClass === 'desktop' ? 'desktop' : 'home screen'} for fullscreen streaming.`
                    : `Pasang ke ${deviceClass === 'tablet' ? 'tablet' : deviceClass === 'desktop' ? 'desktop' : 'layar utama'} untuk nonton layar penuh.`}
                </p>
              </div>

              <button
                type="button"
                onClick={handleDismiss}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors shrink-0 -mt-0.5 -mr-0.5 cursor-pointer"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-1.5">
              {[
                language === 'en' ? '✦ Fullscreen' : '✦ Layar Penuh',
                language === 'en' ? '✦ Offline Cache' : '✦ Cache Offline',
                language === 'en' ? '✦ No Browser Bar' : '✦ Tanpa Bilah Browser',
              ].map((f) => (
                <span key={f} className="text-[10.5px] font-medium text-slate-300 bg-white/[0.06] border border-white/[0.08] px-2 py-0.5 rounded-full">
                  {f}
                </span>
              ))}
            </div>

            {/* Step-by-step Installation Guide tailored per device/browser */}
            {showGuide && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-3 rounded-xl bg-white/[0.05] border border-white/10 space-y-2"
              >
                <p className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                  {isIOS
                    ? (language === 'en' ? 'How to install on iPhone / iPad:' : 'Cara pasang di iPhone / iPad:')
                    : deviceClass === 'desktop'
                    ? (language === 'en' ? 'How to install on PC / Mac browser:' : 'Cara pasang di browser PC / Laptop:')
                    : (language === 'en' ? 'How to install on Android browser:' : 'Cara pasang di browser Android:')}
                </p>

                <div className="space-y-1.5 text-[11px] text-slate-300">
                  {isIOS ? (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#E50914]/20 text-[#E50914] flex items-center justify-center text-[10px] font-black shrink-0">1</span>
                        <span>
                          {language === 'en' ? 'Tap' : 'Ketuk'}{' '}
                          <Share className="inline w-3 h-3 mx-0.5 text-blue-400" />
                          {' '}<strong>{language === 'en' ? 'Share' : 'Bagikan'}</strong>{' '}
                          {language === 'en' ? 'in Safari' : 'di Safari'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#E50914]/20 text-[#E50914] flex items-center justify-center text-[10px] font-black shrink-0">2</span>
                        <span>
                          {language === 'en' ? 'Scroll & tap' : 'Pilih'}{' '}
                          <Plus className="inline w-3 h-3 mx-0.5 text-blue-400" />
                          {' '}<strong>{language === 'en' ? 'Add to Home Screen' : 'Tambah ke Layar Utama'}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#E50914]/20 text-[#E50914] flex items-center justify-center text-[10px] font-black shrink-0">3</span>
                        <span>{language === 'en' ? 'Tap ' : 'Ketuk '}<strong>{language === 'en' ? 'Add' : 'Tambah'}</strong></span>
                      </div>
                    </>
                  ) : deviceClass === 'desktop' ? (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#E50914]/20 text-[#E50914] flex items-center justify-center text-[10px] font-black shrink-0">1</span>
                        <span>
                          {language === 'en'
                            ? 'Look at the address bar (URL) at the top and click'
                            : 'Lihat bilah alamat URL browser di atas dan klik'}{' '}
                          <Download className="inline w-3 h-3 mx-0.5 text-red-500" />
                          {' '}<strong>{language === 'en' ? 'Install' : 'Instal'}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#E50914]/20 text-[#E50914] flex items-center justify-center text-[10px] font-black shrink-0">2</span>
                        <span>
                          {language === 'en'
                            ? 'Or click browser menu (⋮) > select "Install Cinestream"'
                            : 'Atau klik menu titik tiga (⋮) > pilih "Instal Cinestream"'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#E50914]/20 text-[#E50914] flex items-center justify-center text-[10px] font-black shrink-0">3</span>
                        <span>{language === 'en' ? 'Click ' : 'Klik '}<strong>{language === 'en' ? 'Install' : 'Instal'}</strong></span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#E50914]/20 text-[#E50914] flex items-center justify-center text-[10px] font-black shrink-0">1</span>
                        <span>
                          {language === 'en' ? 'Tap browser menu' : 'Ketuk menu browser'}{' '}
                          <MoreVertical className="inline w-3 h-3 mx-0.5 text-slate-300" />
                          {' '}(<strong>⋮</strong>) {language === 'en' ? 'at top-right' : 'di pojok kanan atas'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#E50914]/20 text-[#E50914] flex items-center justify-center text-[10px] font-black shrink-0">2</span>
                        <span>
                          {language === 'en' ? 'Select' : 'Pilih'}{' '}
                          <strong>{language === 'en' ? 'Install app / Add to Home screen' : 'Instal aplikasi / Tambahkan ke Layar Utama'}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#E50914]/20 text-[#E50914] flex items-center justify-center text-[10px] font-black shrink-0">3</span>
                        <span>{language === 'en' ? 'Confirm and tap ' : 'Konfirmasi dan pilih '}<strong>{language === 'en' ? 'Install' : 'Pasang'}</strong></span>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleInstall}
                disabled={isInstalling}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-[#E50914] hover:bg-[#f40612] active:scale-95 text-white font-bold text-xs shadow-lg shadow-red-900/40 transition-all cursor-pointer disabled:opacity-70"
              >
                <Download className="w-3.5 h-3.5" />
                <span>
                  {isInstalling
                    ? (language === 'en' ? 'Installing…' : 'Memasang…')
                    : showGuide
                    ? (language === 'en' ? 'Follow steps above ↑' : 'Ikuti langkah di atas ↑')
                    : (language === 'en' ? 'Install App' : 'Pasang Aplikasi')}
                </span>
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="py-2.5 px-3.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] text-slate-400 hover:text-white font-medium text-xs transition-colors cursor-pointer border border-white/[0.08]"
              >
                {language === 'en' ? 'Later' : 'Nanti'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
