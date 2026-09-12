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
      className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={handleDismiss}
      role="dialog"
      aria-modal="true"
      aria-labelledby="vpn-dns-notice-title"
    >
      {/* Backdrop overlay for reliable outside click */}
      <div className="absolute inset-0" onClick={handleDismiss} />

      {/* Main Modal Card */}
      <div
        className="relative z-10 w-full max-w-lg sm:max-w-xl max-h-[85dvh] sm:max-h-[88vh] flex flex-col rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#1c120c] via-cinema-950 to-black border border-amber-500/40 shadow-2xl shadow-amber-950/50 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-red-600/15 blur-3xl pointer-events-none" />

        {/* --- HEADER (Pinned at Top / Never Cut Off) --- */}
        <div className="shrink-0 p-3.5 sm:p-5 border-b border-white/10 bg-black/40 backdrop-blur-sm relative z-10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 flex items-center justify-center text-cinema-950 font-black shadow-md shadow-amber-500/25 shrink-0">
              <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2] text-cinema-950" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                <span className="text-[9.5px] sm:text-[10.5px] font-mono uppercase tracking-wider font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                  {t('vpnDnsNoticeBadge')}
                </span>
                <span className="text-[9.5px] font-mono text-white/50 bg-white/5 px-2 py-0.5 rounded-full">
                  DNS 1.1.1.1
                </span>
              </div>

              <h2
                id="vpn-dns-notice-title"
                className="text-sm sm:text-base md:text-lg font-display font-bold text-white tracking-wide leading-tight truncate"
              >
                {t('vpnDnsNoticeTitle')}
              </h2>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={handleDismiss}
            onMouseEnter={playHover}
            className="p-1.5 sm:p-2 rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-all cursor-pointer border border-white/10 shrink-0"
            title={language === 'en' ? 'Close' : 'Tutup'}
            aria-label={language === 'en' ? 'Close' : 'Tutup'}
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* --- SCROLLABLE BODY (Touch-Enabled & Bounded) --- */}
        <div
          className="flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-5 space-y-2.5 sm:space-y-3 custom-scrollbar relative z-10"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* Main Highlight Callout Box */}
          <div className="p-2.5 sm:p-3.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-red-500/10 border border-amber-500/35">
            <p className="text-xs sm:text-sm font-medium text-amber-100 leading-relaxed">
              📢 <strong className="text-white font-bold">{t('vpnDnsNoticeHighlight')}</strong>
            </p>
            <p className="text-[11px] sm:text-xs text-slate-300/90 mt-1 leading-normal">
              {t('vpnDnsNoticeDesc')}
            </p>
          </div>

          {/* 3 Solution Cards */}
          <div className="space-y-2 sm:space-y-2.5">
            {/* Solution 1: Gunakan VPN */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 transition-colors flex items-start gap-2.5 sm:gap-3">
              <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 shrink-0 mt-0.5">
                <Globe2 className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="text-xs sm:text-[13px] font-bold text-white">
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
            <div className="p-2.5 sm:p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 transition-colors flex items-start gap-2.5 sm:gap-3">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                <Zap className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-xs sm:text-[13px] font-bold text-white">
                  2. {t('vpnDnsTipDnsTitle')}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 leading-relaxed">
                  {t('vpnDnsTipDnsDesc')}
                </p>
                <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[9.5px] sm:text-[10px] font-mono">
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
            <div className="p-2.5 sm:p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 transition-colors flex items-start gap-2.5 sm:gap-3">
              <div className="p-1.5 rounded-lg bg-[#E50914]/20 text-[#E50914] shrink-0 mt-0.5">
                <Server className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-xs sm:text-[13px] font-bold text-white">
                  3. {t('vpnDnsTipServerTitle')}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 leading-relaxed">
                  {t('vpnDnsTipServerDesc')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* --- FOOTER (Pinned at Bottom / Never Cut Off) --- */}
        <div className="shrink-0 p-3 sm:p-4 border-t border-white/10 bg-black/60 backdrop-blur-md relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white transition-colors text-[11px] sm:text-xs self-start sm:self-auto">
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
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#E50914] via-orange-600 to-amber-500 hover:from-red-600 hover:to-amber-400 text-white font-bold text-xs sm:text-sm tracking-wide shadow-lg shadow-red-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0"
          >
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            <span>{t('vpnDnsUnderstandBtn')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
