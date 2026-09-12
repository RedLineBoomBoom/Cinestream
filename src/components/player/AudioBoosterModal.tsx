import React from 'react';
import {
  Volume2,
  Zap,
  Sparkles,
  Check,
  X,
  Info,
  ChevronRight,
  Headphones,
} from 'lucide-react';
import type { Server } from '../../types/media';
import { useLanguage } from '../../context/LanguageContext';
import { useSound } from '../../context/SoundContext';
import { formatServerName } from '../../utils/formatters';

interface AudioBoosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioBoost: number;
  onChangeAudioBoost: (level: number) => void;
  isDialogueBoost: boolean;
  onToggleDialogueBoost: () => void;
  onMaximizeVolume: () => void;
  availableServers: Server[];
  activeServerId: string;
  onSelectServer?: (server: Server) => void;
  isEmbed: boolean;
}

const BOOST_LEVELS = [
  { value: 1.0, label: '100%', sublabel: 'Normal', color: 'border-white/20 hover:border-white/40' },
  { value: 1.5, label: '150%', sublabel: 'Kencang', color: 'border-amber-400/40 hover:border-amber-400' },
  { value: 2.0, label: '200%', sublabel: 'Super Boost', color: 'border-orange-500/40 hover:border-orange-500' },
  { value: 3.0, label: '300%', sublabel: 'Turbo Max 🔥', color: 'border-red-500/50 hover:border-red-500 shadow-glow-red' },
];

export const AudioBoosterModal: React.FC<AudioBoosterModalProps> = ({
  isOpen,
  onClose,
  audioBoost,
  onChangeAudioBoost,
  isDialogueBoost,
  onToggleDialogueBoost,
  onMaximizeVolume,
  availableServers,
  activeServerId,
  onSelectServer,
}) => {
  const { t, language } = useLanguage();
  const { playClick, playHover, playSuccess } = useSound();
  const [maximizedToast, setMaximizedToast] = React.useState(false);

  if (!isOpen) return null;

  const handleMaxClick = () => {
    playSuccess();
    onMaximizeVolume();
    setMaximizedToast(true);
    setTimeout(() => setMaximizedToast(false), 2600);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-[#141414] border border-white/15 rounded-2xl p-5 sm:p-6 shadow-2xl overflow-hidden flex flex-col gap-4 max-h-[92vh] overflow-y-auto no-scrollbar"
      >
        {/* Background decorative glow */}
        <div className="absolute -top-24 -right-24 w-60 h-60 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 rounded-full bg-red-600/15 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-cinema-950 font-black">
              <Volume2 className="w-5 h-5 text-black" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-white flex items-center gap-2">
                <span>{t('audioBoosterTitle')}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {Math.round(audioBoost * 100)}%
                </span>
              </h3>
              <p className="text-xs text-white/60 font-sans">
                {t('audioBoosterDesc')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1-Click Instant Max Volume Button */}
        <div className="relative z-10">
          <button
            onClick={handleMaxClick}
            onMouseEnter={playHover}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-400 hover:to-red-500 active:scale-[0.98] text-cinema-950 font-black text-xs sm:text-sm tracking-wide shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-cinema-950 stroke-none animate-pulse" />
            <span>{t('audioMaxFull')}</span>
          </button>
          {maximizedToast && (
            <div className="text-center text-xs font-semibold text-emerald-400 pt-2 animate-fade-in flex items-center justify-center gap-1.5">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>{t('audioMaxSuccess')}</span>
            </div>
          )}
        </div>

        {/* Boost Level Selector */}
        <div className="space-y-2 relative z-10">
          <label className="text-xs font-semibold text-white/80 flex items-center justify-between">
            <span>{t('audioBoostLevel')}</span>
            <span className="text-brand-champagne font-mono text-[11px]">
              {audioBoost > 1.0 ? `+${Math.round((audioBoost - 1.0) * 100)}% Boost Aktif` : 'Level Normal'}
            </span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {BOOST_LEVELS.map((lvl) => {
              const isSelected = Math.abs(audioBoost - lvl.value) < 0.05;
              return (
                <button
                  key={lvl.value}
                  onClick={() => {
                    playClick();
                    onChangeAudioBoost(lvl.value);
                  }}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-cinema-950 border-amber-400 font-bold shadow-lg shadow-amber-500/20'
                      : `bg-white/[0.04] text-white/90 ${lvl.color}`
                  }`}
                >
                  <span className="text-sm font-black font-mono">{lvl.label}</span>
                  <span className={`text-[10px] ${isSelected ? 'text-cinema-950/80 font-semibold' : 'text-white/50'}`}>
                    {lvl.sublabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dialogue & Vocal Enhancer Switch */}
        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-violet-500/20 text-violet-300 shrink-0 mt-0.5">
              <Headphones className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white">
                {t('dialogueClarity')}
              </h4>
              <p className="text-[11px] text-white/60 leading-relaxed">
                {t('dialogueClarityDesc')}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playClick();
              onToggleDialogueBoost();
            }}
            className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
              isDialogueBoost ? 'bg-emerald-500' : 'bg-white/20'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                isDialogueBoost ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Server Audio Switcher Recommendations */}
        <div className="space-y-2 relative z-10">
          <label className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-gold" />
            <span>{t('recommendedAudioServers')}</span>
          </label>
          <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto no-scrollbar">
            {availableServers.map((srv, idx) => {
              const isActive = srv.id === activeServerId;
              const isVidLink = srv.id.includes('vidlink') || srv.name.toLowerCase().includes('vidlink');
              const isMulti = srv.id.includes('multiembed') || srv.name.toLowerCase().includes('multistream');
              const isSmashy = srv.id.includes('smashy') || srv.name.toLowerCase().includes('smashy');
              const isRecommendedAudio = isVidLink || isMulti || isSmashy;

              const audioTag = isVidLink
                ? '🔊 Stereo Kencang & Jernih'
                : isMulti
                ? '🔊 Stereo Multi-Host'
                : isSmashy
                ? '🔊 Sub Indo Stereo'
                : 'FHD Standard';

              return (
                <button
                  key={srv.id}
                  onClick={() => {
                    playClick();
                    onSelectServer?.(srv);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isActive
                      ? 'bg-brand-gold/15 border-brand-gold/40 text-brand-champagne shadow-sm'
                      : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.06] hover:border-white/15 text-white/80'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-white/10 text-[10px] font-bold flex items-center justify-center shrink-0">
                      S{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">
                        {formatServerName(srv.name, language)}
                      </p>
                      <p className={`text-[10px] font-mono ${isRecommendedAudio ? 'text-emerald-400 font-semibold' : 'text-white/40'}`}>
                        {audioTag}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {isActive ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-brand-gold text-cinema-950">
                        Aktif
                      </span>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-white/30" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Practical Audio Tip */}
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200/90 text-[11px] leading-relaxed flex items-start gap-2 relative z-10">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p>{t('audioTipIframe')}</p>
        </div>
      </div>
    </div>
  );
};
