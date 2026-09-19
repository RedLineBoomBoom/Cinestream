import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Tablet, Monitor, Share, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
const DISMISS_DAYS = 7; // re-prompt after 7 days

export const PwaInstallPrompt: React.FC = () => {
  const { language } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [deviceClass, setDeviceClass] = useState<DeviceClass>('mobile');
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // 1. If already installed as standalone PWA, skip
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    // 2. Check persistent dismissal (up to 7 days)
    try {
      const until = localStorage.getItem(DISMISS_KEY);
      if (until && Date.now() < parseInt(until, 10)) return;
    } catch {}

    // 3. Detect device
    const dc = getDeviceClass();
    setDeviceClass(dc);

    // 4. Detect iOS Safari (excludes Chrome/Firefox on iOS)
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua) && !/crios|fxios/.test(ua);
    setIsIOS(isIosDevice);

    // 5. Capture Android/Chrome native prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Delay to not interrupt the initial page experience
      setTimeout(() => setIsVisible(true), 4000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // 6. iOS: show after 5s delay
    let iosTimer: ReturnType<typeof setTimeout> | undefined;
    if (isIosDevice) {
      iosTimer = setTimeout(() => setIsVisible(true), 5000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    if (!deferredPrompt) return;

    setIsInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.warn('PWA install prompt failed:', err);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
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

            {/* iOS Step-by-step Guide */}
            {showIOSGuide && isIOS && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-3 rounded-xl bg-white/[0.05] border border-white/10 space-y-2"
              >
                <p className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                  {language === 'en' ? 'How to install on iOS:' : 'Cara pasang di iPhone / iPad:'}
                </p>
                <div className="space-y-1.5 text-[11px] text-slate-300">
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
                      {language === 'en' ? 'Tap' : 'Pilih'}{' '}
                      <Plus className="inline w-3 h-3 mx-0.5 text-blue-400" />
                      {' '}<strong>{language === 'en' ? 'Add to Home Screen' : 'Tambah ke Layar Utama'}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#E50914]/20 text-[#E50914] flex items-center justify-center text-[10px] font-black shrink-0">3</span>
                    <span>{language === 'en' ? 'Tap ' : 'Ketuk '}<strong>{language === 'en' ? 'Add' : 'Tambah'}</strong></span>
                  </div>
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
                    : isIOS && showIOSGuide
                    ? (language === 'en' ? 'See steps above ↑' : 'Lihat langkah di atas ↑')
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
