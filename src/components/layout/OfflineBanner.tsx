import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext';

export const OfflineBanner: React.FC = () => {
  const { language } = useLanguage();
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowBackOnline(true);
      // Auto-hide "back online" toast after 3s
      const t = setTimeout(() => setShowBackOnline(false), 3000);
      return () => clearTimeout(t);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowBackOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const showOffline = !isOnline;
  const showOnline = isOnline && showBackOnline;

  return (
    <AnimatePresence>
      {showOffline && (
        <motion.div
          key="offline"
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed top-0 inset-x-0 z-[9998] flex items-center justify-center gap-2 px-4 py-2 bg-red-950/95 backdrop-blur-md border-b border-red-800/60 text-red-200 text-xs font-semibold shadow-lg"
          style={{ paddingTop: `max(8px, env(safe-area-inset-top, 8px))` }}
        >
          <WifiOff className="w-3.5 h-3.5 shrink-0 text-red-400" />
          <span>
            {language === 'en'
              ? 'No internet connection — browsing cached content'
              : 'Tidak ada internet — menampilkan konten cache'}
          </span>
        </motion.div>
      )}

      {showOnline && (
        <motion.div
          key="online"
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed top-0 inset-x-0 z-[9998] flex items-center justify-center gap-2 px-4 py-2 bg-emerald-950/95 backdrop-blur-md border-b border-emerald-800/60 text-emerald-200 text-xs font-semibold shadow-lg"
          style={{ paddingTop: `max(8px, env(safe-area-inset-top, 8px))` }}
        >
          <Wifi className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
          <span>
            {language === 'en' ? 'Back online!' : 'Kembali online!'}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
