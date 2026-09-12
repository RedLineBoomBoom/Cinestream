import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  X,
  ExternalLink,
  CheckCircle2,
  Globe2,
  Server,
  Zap,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useSound } from '../../context/SoundContext';

interface VpnDnsNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VpnDnsNoticeModal: React.FC<VpnDnsNoticeModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t, language } = useLanguage();
  const { playClick, playHover } = useSound();
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDismiss = () => {
    playClick();
    try {
      if (dontShowAgain) {
        localStorage.setItem('cinestream_vpn_notice_dismissed', 'true');
      }
      sessionStorage.setItem('cinestream_vpn_notice_dismissed', 'true');
    } catch {}
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto overscroll-contain"
      onClick={handleDismiss}
      role="dialog"
      aria-modal="true"
      aria-labelledby="vpn-dns-notice-title"
    >
      <div
        className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#1c120c] via-cinema-950 to-black border border-amber-500/40 p-5 sm:p-7 shadow-2xl shadow-amber-950/40 overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-red-600/15 blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          onMouseEnter={playHover}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-all cursor-pointer border border-white/10"
          title={language === 'en' ? 'Close' : 'Tutup'}
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Header with Icon & Badges */}
        <div className="flex items-start gap-3.5 sm:gap-4 relative z-10">
          <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 flex items-center justify-center text-cinema-950 font-black shadow-lg shadow-amber-500/25 shrink-0">
            <ShieldAlert className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2] text-cinema-950" />
          </div>

          <div className="min-w-0 flex-1 pr-6">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider font-bold text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                {t('vpnDnsNoticeBadge')}
              </span>
              <span className="text-[10px] font-mono text-white/50 bg-white/5 px-2 py-0.5 rounded-full">
                DNS 1.1.1.1 / WARP
              </span>
            </div>

            <h2
              id="vpn-dns-notice-title"
              className="text-lg sm:text-xl font-display font-bold text-white tracking-wide leading-tight"
            >
              {t('vpnDnsNoticeTitle')}
            </h2>
          </div>
        </div>

        {/* Main Highlight Callout Box */}
        <div className="mt-4 p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-red-500/10 border border-amber-500/35 relative z-10">
          <p className="text-xs sm:text-sm font-medium text-amber-100 leading-relaxed">
            📢 <strong className="text-white font-bold">{t('vpnDnsNoticeHighlight')}</strong>
          </p>
          <p className="text-[11px] sm:text-xs text-slate-300/90 mt-1.5 leading-normal">
            {t('vpnDnsNoticeDesc')}
          </p>
        </div>

        {/* 3 Solution Cards */}
        <div className="mt-3.5 sm:mt-4 space-y-2.5 relative z-10">
          {/* Solution 1: Gunakan VPN */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 transition-colors flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 shrink-0 mt-0.5">
              <Globe2 className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-xs sm:text-sm font-bold text-white">
                  1. {t('vpnDnsTipVpnTitle')}
                </h3>
                <a
                  href="https://1.1.1.1/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-amber-300 hover:text-amber-200 hover:underline"
                >
                  <span>{t('vpnDnsOpenCloudflare')}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 leading-relaxed">
                {t('vpnDnsTipVpnDesc')}
              </p>
            </div>
          </div>

          {/* Solution 2: Ganti DNS Cloudflare */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 transition-colors flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
              <Zap className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xs sm:text-sm font-bold text-white">
                2. {t('vpnDnsTipDnsTitle')}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 leading-relaxed">
                {t('vpnDnsTipDnsDesc')}
              </p>
              <div className="mt-1.5 flex items-center gap-1.5 flex-wrap text-[10px] font-mono">
                <span className="px-2 py-0.5 rounded bg-black/60 text-amber-300 border border-white/10 font-semibold">
                  IPv4: 1.1.1.1 & 1.0.0.1
                </span>
                <span className="px-2 py-0.5 rounded bg-black/60 text-slate-300 border border-white/10">
                  DoH: 1dot1dot1dot1.cloudflare-dns.com
                </span>
              </div>
            </div>
          </div>

          {/* Solution 3: Server S1-S6 / Tab Penuh */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 transition-colors flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-[#E50914]/20 text-[#E50914] shrink-0 mt-0.5">
              <Server className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xs sm:text-sm font-bold text-white">
                3. {t('vpnDnsTipServerTitle')}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 leading-relaxed">
                {t('vpnDnsTipServerDesc')}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-5 sm:mt-6 pt-3.5 sm:pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10">
          <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white transition-colors text-xs self-start sm:self-auto">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-black/40 text-amber-500 focus:ring-amber-500 focus:ring-offset-0 cursor-pointer accent-amber-500"
            />
            <span>{t('vpnDnsDontShowAgain')}</span>
          </label>

          <button
            onClick={handleDismiss}
            onMouseEnter={playHover}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#E50914] via-orange-600 to-amber-500 hover:from-red-600 hover:to-amber-400 text-white font-bold text-xs sm:text-sm tracking-wide shadow-lg shadow-red-600/30 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            <span>{t('vpnDnsUnderstandBtn')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
