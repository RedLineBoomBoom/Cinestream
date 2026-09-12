import React, { useEffect, useState, useCallback } from 'react';
import { Play, Pause, AlertTriangle, X, Radio, Volume2 } from 'lucide-react';
import { useWatchParty } from '../../context/WatchPartyContext';
import { useLanguage } from '../../context/LanguageContext';
import { useSound } from '../../context/SoundContext';
import { soundFX } from '../../utils/soundEffects';

export const PartySyncToast: React.FC = () => {
  const { latestSignal, clearSignal, myId } = useWatchParty();
  const { t } = useLanguage();
  const { playClick } = useSound();
  const [visible, setVisible] = useState(false);

  const isFromMe = Boolean(
    latestSignal &&
    (latestSignal.senderId === myId || latestSignal.id.startsWith('local-'))
  );

  const isPause = latestSignal?.signal.type === 'pause';

  useEffect(() => {
    if (!latestSignal) {
      setVisible(false);
      return;
    }

    setVisible(true);

    // If alert is from another peer, ring attention chime so watching peers immediately notice
    if (!isFromMe) {
      soundFX.alert();
    }

    // Sender gets a quick 3s toast; other users get 7.5s high-visibility warning banner
    const displayDuration = isFromMe ? 3000 : 7500;
    const timeout = setTimeout(() => {
      setVisible(false);
      setTimeout(clearSignal, 350);
    }, displayDuration);

    return () => clearTimeout(timeout);
  }, [latestSignal, isFromMe, clearSignal]);

  const handleDismiss = useCallback(() => {
    playClick();
    setVisible(false);
    setTimeout(clearSignal, 350);
  }, [playClick, clearSignal]);

  const handleApplyAction = useCallback((action: 'play' | 'pause') => {
    playClick();
    const videoEl = document.querySelector('video') as HTMLVideoElement | null;
    if (videoEl) {
      if (action === 'play') {
        videoEl.play().catch(() => {});
      } else {
        videoEl.pause();
      }
    }
    // Also dispatch event for CinematicPlayer
    window.dispatchEvent(new CustomEvent('stream:playback-control', { detail: { action } }));
    setVisible(false);
    setTimeout(clearSignal, 350);
  }, [playClick, clearSignal]);

  if (!latestSignal) return null;

  // ── Sender Feedback Toast ──
  if (isFromMe) {
    return (
      <div
        className={`fixed top-5 left-1/2 -translate-x-1/2 z-[350] transition-all duration-300 pointer-events-none ${
          visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-95'
        }`}
      >
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-cinema-900/95 border border-violet-500/40 shadow-xl backdrop-blur-xl shadow-violet-500/10 text-xs font-semibold text-violet-200">
          <Radio className="w-3.5 h-3.5 text-violet-400 animate-pulse shrink-0" />
          <span>{isPause ? t('partyPauseSent') : t('partyPlaySent')}</span>
        </div>
      </div>
    );
  }

  // ── High-Visibility Warning Alert for Other Watch Party Peers ──
  return (
    <div
      className={`fixed top-6 sm:top-8 left-1/2 -translate-x-1/2 z-[350] max-w-lg w-[94vw] sm:w-auto transition-all duration-400 ease-out ${
        visible
          ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
          : 'opacity-0 -translate-y-6 scale-95 pointer-events-none'
      }`}
    >
      <div
        className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-2xl border transition-colors ${
          isPause
            ? 'bg-gradient-to-br from-amber-950/95 via-cinema-950/95 to-amber-900/90 border-amber-500/60 shadow-amber-500/20'
            : 'bg-gradient-to-br from-emerald-950/95 via-cinema-950/95 to-emerald-900/90 border-emerald-500/60 shadow-emerald-500/20'
        }`}
      >
        {/* Glow ambient background effect */}
        <div
          className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl pointer-events-none ${
            isPause ? 'bg-amber-500/20' : 'bg-emerald-500/20'
          }`}
        />

        <div className="relative flex items-start gap-3.5">
          {/* Pulsing Animated Icon Badge */}
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${
              isPause
                ? 'bg-amber-500/25 text-amber-300 ring-2 ring-amber-400/40'
                : 'bg-emerald-500/25 text-emerald-300 ring-2 ring-emerald-400/40'
            }`}
          >
            {isPause ? (
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            ) : (
              <Play className="w-5 h-5 fill-current animate-pulse ml-0.5" />
            )}
          </div>

          {/* Alert Content */}
          <div className="flex-1 min-w-0 pr-2">
            {/* Header / Sub-title */}
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-md flex items-center gap-1 ${
                  isPause
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                }`}
              >
                <Volume2 className="w-3 h-3 animate-pulse" />
                {isPause ? t('partyAlertTitle') : t('partyPlayAlertTitle')}
              </span>
            </div>

            {/* Main Message */}
            <p className="text-sm sm:text-base font-bold text-white leading-snug">
              <span
                className={`underline decoration-2 ${
                  isPause ? 'text-amber-300 decoration-amber-400/60' : 'text-emerald-300 decoration-emerald-400/60'
                }`}
              >
                {latestSignal.senderName}
              </span>{' '}
              {isPause ? t('partyPauseAlertDesc') : t('partyPlayAlertDesc')}
            </p>

            {/* Instruction Hint */}
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {isPause ? t('partyPauseAlertHint') : t('partyPlayAlertHint')}
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 mt-3.5">
              {isPause ? (
                <button
                  onClick={() => handleApplyAction('pause')}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-cinema-950 text-xs font-bold transition-all shadow-md shadow-amber-500/30 active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>{t('partyPauseMyVideo')}</span>
                </button>
              ) : (
                <button
                  onClick={() => handleApplyAction('play')}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-cinema-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/30 active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{t('partyPlayMyVideo')}</span>
                </button>
              )}

              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white text-xs font-semibold transition-all border border-white/10 cursor-pointer active:scale-95"
              >
                {t('partyAlertDismiss')}
              </button>
            </div>
          </div>

          {/* Close X */}
          <button
            onClick={handleDismiss}
            aria-label="Close notification"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

