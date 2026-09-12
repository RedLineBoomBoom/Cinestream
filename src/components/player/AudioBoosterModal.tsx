import React from 'react';
import {
  Volume2,
  Zap,
  Check,
  X,
  Info,
  Headphones,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useSound } from '../../context/SoundContext';

interface AudioBoosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioBoost: number;
  onAudioBoostChange: (level: number) => void;
  isDialogueBoost: boolean;
  onDialogueBoostChange: (enabled: boolean) => void;
  isEmbedStream: boolean;
  onMaxVolume: () => void;
}

const BOOST_LEVELS = [
  { value: 1.0, label: '100%', sublabel: 'Normal', color: 'border-white/20 hover:border-white/40' },
  { value: 1.5, label: '150%', sublabel: 'Kencang', color: 'border-amber-400/40 hover:border-amber-400' },
  { value: 2.0, label: '200%', sublabel: 'Super Boost', color: 'border-orange-500/40 hover:border-orange-500' },
  { value: 3.0, label: '300%', sublabel: 'Turbo Max 🔥', color: 'border-red-500/50 hover:border-red-500' },
];

export const AudioBoosterModal: React.FC<AudioBoosterModalProps> = ({
  isOpen,
  onClose,
  audioBoost,
  onAudioBoostChange,
  isDialogueBoost,
  onDialogueBoostChange,
  isEmbedStream,
  onMaxVolume,
}) => {
  const { language } = useLanguage();
  const { playClick, playHover, playSuccess } = useSound();
  const [maximizedToast, setMaximizedToast] = React.useState(false);

  if (!isOpen) return null;

  const handleMaxClick = () => {
    playSuccess();
    onMaxVolume();
    setMaximizedToast(true);
    setTimeout(() => setMaximizedToast(false), 2600);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-[#141414] border border-white/15 rounded-2xl p-5 sm:p-6 shadow-2xl overflow-hidden flex flex-col gap-4 max-h-[90dvh] overflow-y-auto no-scrollbar"
      >
        {/* Background decorative glows */}
        <div className="absolute -top-24 -right-24 w-60 h-60 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 rounded-full bg-red-600/10 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Volume2 className="w-5 h-5 text-black" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                <span>{language === 'en' ? 'Audio Booster' : 'Penguat Audio'}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {Math.round(audioBoost * 100)}%
                </span>
              </h3>
              <p className="text-xs text-white/60">
                {language === 'en'
                  ? 'Amplify volume when device & speaker are already at max'
                  : 'Perkuat volume saat perangkat & speaker sudah di volume maksimal'}
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
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-400 hover:to-red-500 active:scale-[0.98] text-black font-black text-xs sm:text-sm tracking-wide shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-black stroke-none animate-pulse" />
            <span>
              {language === 'en' ? '⚡ Max Volume Now' : '⚡ Volume Maksimal Sekarang'}
            </span>
          </button>
          {maximizedToast && (
            <div className="text-center text-xs font-semibold text-emerald-400 pt-2 animate-in fade-in flex items-center justify-center gap-1.5">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>{language === 'en' ? 'Volume maximized!' : 'Volume dimaksimalkan!'}</span>
            </div>
          )}
        </div>

        {/* Boost Level Selector */}
        <div className="space-y-2 relative z-10">
          <label className="text-xs font-semibold text-white/80 flex items-center justify-between">
            <span>{language === 'en' ? 'Boost Level' : 'Level Boost'}</span>
            <span className="text-amber-300 font-mono text-[11px]">
              {audioBoost > 1.0
                ? `+${Math.round((audioBoost - 1.0) * 100)}% ${language === 'en' ? 'Boost Active' : 'Boost Aktif'}`
                : language === 'en' ? 'Normal Level' : 'Level Normal'}
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
                    onAudioBoostChange(lvl.value);
                  }}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-lg shadow-amber-500/20'
                      : `bg-white/[0.04] text-white/90 ${lvl.color}`
                  }`}
                >
                  <span className="text-sm font-black font-mono">{lvl.label}</span>
                  <span className={`text-[10px] ${isSelected ? 'text-black/70 font-semibold' : 'text-white/50'}`}>
                    {lvl.sublabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dialogue & Vocal Enhancer Switch (native video only) */}
        {!isEmbedStream && (
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3 relative z-10">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-violet-500/20 text-violet-300 shrink-0 mt-0.5">
                <Headphones className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white">
                  {language === 'en' ? 'Dialogue Clarity' : 'Kejernihan Dialog'}
                </h4>
                <p className="text-[11px] text-white/60 leading-relaxed">
                  {language === 'en'
                    ? 'Compressor to boost voice & dialogue over background music (native video only)'
                    : 'Kompresor untuk memperkuat suara & dialog di atas musik latar (video native saja)'}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                playClick();
                onDialogueBoostChange(!isDialogueBoost);
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
        )}

        {/* Tip for embed streams */}
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200/90 text-[11px] leading-relaxed flex items-start gap-2 relative z-10">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p>
            {isEmbedStream
              ? (language === 'en'
                  ? '💡 For embed streams, try "Max Volume Now" first. The boost button sends volume commands to the player inside the iframe. If audio is still low, try switching to Server 3 (MultiStream) or Server 6 (VidLink) which tend to have louder audio.'
                  : '💡 Untuk embed stream, coba "Volume Maksimal Sekarang" terlebih dahulu. Tombol boost mengirim perintah volume ke player di dalam iframe. Jika audio masih kecil, coba ganti ke Server 3 (MultiStream) atau Server 6 (VidLink) yang cenderung memiliki audio lebih kencang.')
              : (language === 'en'
                  ? '💡 Boost amplifies audio using Web Audio API GainNode. For 5.1 surround content mixed for home theater, dialogue may naturally sound lower — use Dialogue Clarity mode to enhance speech.'
                  : '💡 Boost memperkuat audio menggunakan Web Audio API GainNode. Untuk konten 5.1 surround yang di-mix untuk home theater, dialog mungkin terdengar lebih pelan secara alami — gunakan mode Kejernihan Dialog untuk memperkuat suara.')}
          </p>
        </div>
      </div>
    </div>
  );
};
