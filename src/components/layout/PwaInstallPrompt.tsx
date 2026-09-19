import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PwaInstallPrompt: React.FC = () => {
  const { language } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // 1. If already installed or running as standalone app, do not show
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) return;

    // 2. Check if previously dismissed in this session
    try {
      if (sessionStorage.getItem('cinestream_pwa_dismissed') === 'true') return;
    } catch {}

    // 3. Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !/crios|fxios/.test(userAgent);
    setIsIOS(isIosDevice);

    // 4. Capture native beforeinstallprompt (Android Chrome, Edge, Desktop Chrome)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // For iOS, show subtle install hint after 3 seconds if not installed
    let iosTimer: NodeJS.Timeout | undefined;
    if (isIosDevice) {
      iosTimer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.warn('PWA install prompt failed:', err);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      sessionStorage.setItem('cinestream_pwa_dismissed', 'true');
    } catch {}
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="fixed bottom-20 sm:bottom-6 left-3 sm:left-6 z-50 max-w-[370px] w-[calc(100%-24px)] sm:w-auto"
      >
        <div className="relative p-3.5 sm:p-4 rounded-2xl bg-[#141414]/95 border border-white/15 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.8)] ring-1 ring-white/10 flex flex-col gap-3">
          {/* Header & Close Button */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E50914] to-red-800 flex items-center justify-center shadow-md shrink-0">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white leading-tight">
                  {language === 'en' ? 'Install Cinestream App' : 'Pasang Aplikasi Cinestream'}
                </h4>
                <p className="text-[11px] text-slate-300 leading-snug mt-0.5">
                  {language === 'en'
                    ? 'Stream faster with full screen & zero browser bars!'
                    : 'Nonton lebih cepat, layar penuh & tanpa bilah browser!'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* iOS Safari Special Step-by-step Guide */}
          {showIOSGuide && isIOS && (
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-[11.5px] text-slate-200 space-y-1">
              <p className="font-semibold text-amber-300">
                {language === 'en' ? 'How to install on iPhone/iPad:' : 'Cara pasang di iPhone/iPad:'}
              </p>
              <p>
                1. {language === 'en' ? 'Tap the Share icon ' : 'Ketuk tombol Bagikan '}
                <span className="font-mono bg-white/10 px-1 py-0.5 rounded">⎋</span> {language === 'en' ? 'in Safari.' : 'di Safari.'}
              </p>
              <p>
                2. {language === 'en' ? 'Select ' : 'Pilih '}
                <strong>{language === 'en' ? 'Add to Home Screen' : 'Tambahkan ke Layar Utama'}</strong>.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl bg-[#E50914] hover:bg-[#f40612] text-white font-semibold text-xs shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{language === 'en' ? 'Install Now' : 'Pasang Sekarang'}</span>
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 font-medium text-xs transition-colors cursor-pointer"
            >
              {language === 'en' ? 'Maybe Later' : 'Nanti Saja'}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
