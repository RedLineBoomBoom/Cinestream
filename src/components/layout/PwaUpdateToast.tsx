import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToUpdate, applyAppUpdate, APP_VERSION } from '../../utils/pwaUpdate';
import { useLanguage } from '../../context/LanguageContext';

export const PwaUpdateToast: React.FC = () => {
  const { language } = useLanguage();
  const [showToast, setShowToast] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Check if dismissed in this session
    const isDismissed = sessionStorage.getItem(`cinestream_dismissed_update_${APP_VERSION}`) === 'true';
    if (isDismissed) return;

    const unsubscribe = subscribeToUpdate((available) => {
      if (available) {
        setShowToast(true);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await applyAppUpdate();
    } catch {
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setShowToast(false);
    try {
      sessionStorage.setItem(`cinestream_dismissed_update_${APP_VERSION}`, 'true');
    } catch {}
  };

  return (
    <AnimatePresence>
      {showToast && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -15, scale: 0.95 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="fixed top-18 sm:top-20 left-1/2 -translate-x-1/2 z-[999] w-[calc(100%-24px)] max-w-lg pointer-events-auto"
        >
          <div className="relative overflow-hidden rounded-2xl bg-[#0f1015]/95 border border-emerald-500/40 p-3.5 sm:p-4 backdrop-blur-2xl shadow-2xl shadow-emerald-950/40 text-white flex items-center justify-between gap-3 sm:gap-4">
            {/* Subtle glow backdrop */}
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent blur-xl pointer-events-none" />

            {/* Left: Icon & Text */}
            <div className="relative flex items-center gap-3 min-w-0">
              <div className="relative flex-shrink-0 w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shadow-inner">
                <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0f1015] animate-ping" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                    {language === 'en'
                      ? `Cinestream v${APP_VERSION} Available`
                      : `Pembaruan Cinestream v${APP_VERSION}`}
                  </h4>
                  <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/25 border border-emerald-400/40 text-emerald-300">
                    New
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-300 truncate mt-0.5">
                  {language === 'en'
                    ? 'Latest features & optimizations are ready to apply.'
                    : 'Fitur baru dan peningkatan performa siap digunakan.'}
                </p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="relative flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={handleUpdate}
                disabled={isUpdating}
                className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/30 transition-all hover:scale-[1.03] active:scale-[0.98] disabled:opacity-60 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
                <span>
                  {isUpdating
                    ? language === 'en'
                      ? 'Updating...'
                      : 'Memperbarui...'
                    : language === 'en'
                    ? 'Update Now'
                    : 'Perbarui Sekarang'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="w-7 h-7 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title={language === 'en' ? 'Dismiss' : 'Tutup'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
