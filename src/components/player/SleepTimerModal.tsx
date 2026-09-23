import React from 'react';
import { Moon, X, Clock, Check, PowerOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext';

export type SleepTimerOption = 15 | 30 | 45 | 60 | 90 | 'end-of-episode' | null;

interface SleepTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeOption: SleepTimerOption;
  remainingSeconds: number | null;
  onSelectOption: (option: SleepTimerOption) => void;
  hasEpisode?: boolean;
  isMovie?: boolean;
}

export const SleepTimerModal: React.FC<SleepTimerModalProps> = ({
  isOpen,
  onClose,
  activeOption,
  remainingSeconds,
  onSelectOption,
  hasEpisode = false,
  isMovie = false,
}) => {
  const { language } = useLanguage();

  if (!isOpen) return null;

  const formatRemaining = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const timerOptions: { label: string; value: SleepTimerOption; desc?: string }[] = [
    { label: language === 'en' ? 'Off' : 'Nonaktif', value: null },
    { label: '15 ' + (language === 'en' ? 'Minutes' : 'Menit'), value: 15 },
    { label: '30 ' + (language === 'en' ? 'Minutes' : 'Menit'), value: 30 },
    { label: '45 ' + (language === 'en' ? 'Minutes' : 'Menit'), value: 45 },
    { label: '60 ' + (language === 'en' ? 'Minutes' : 'Menit'), value: 60 },
    { label: '90 ' + (language === 'en' ? 'Minutes' : 'Menit'), value: 90 },
    {
      label: language === 'en'
        ? (hasEpisode ? 'End of Episode' : isMovie ? 'End of Movie' : 'End of Video')
        : (hasEpisode ? 'Akhir Episode Ini' : isMovie ? 'Akhir Film Ini' : 'Akhir Tayangan Ini'),
      value: 'end-of-episode' as SleepTimerOption,
      desc: language === 'en'
        ? (hasEpisode ? 'Pauses when this episode ends' : isMovie ? 'Pauses when this movie finishes' : 'Pauses when current playback finishes')
        : (hasEpisode ? 'Dijeda saat episode ini selesai' : isMovie ? 'Dijeda saat film ini selesai' : 'Dijeda saat tayangan ini selesai'),
    },
  ];

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-sm rounded-3xl bg-[#12131a] border border-white/10 shadow-2xl p-6 text-white overflow-hidden"
        >
          {/* Ambient Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  {language === 'en' ? 'Sleep Timer' : 'Pengatur Waktu Tidur'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {language === 'en'
                    ? 'Auto-pause playback when you fall asleep'
                    : 'Jeda tayangan otomatis saat Anda tertidur'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Active Countdown Banner (if running) */}
          {activeOption !== null && (
            <div className="my-4 p-3 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold">
                <Clock className="w-4 h-4 animate-pulse text-indigo-400" />
                <span>
                  {activeOption === 'end-of-episode'
                    ? (language === 'en' ? 'Active: End of Video' : 'Aktif: Akhir Tayangan')
                    : (language === 'en' ? 'Time remaining:' : 'Sisa waktu:')}
                </span>
              </div>
              <span className="font-mono text-sm font-black text-indigo-200">
                {remainingSeconds !== null && remainingSeconds > 0
                  ? formatRemaining(remainingSeconds)
                  : activeOption === 'end-of-episode'
                  ? (language === 'en' ? 'Until End' : 'Hingga Selesai')
                  : '0:00'}
              </span>
            </div>
          )}

          {/* Option Grid */}
          <div className="grid grid-cols-1 gap-2 pt-3">
            {timerOptions.map((opt) => {
              const isSelected = activeOption === opt.value;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => {
                    onSelectOption(opt.value);
                    onClose();
                  }}
                  className={`flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-semibold transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-indigo-600/30 border-indigo-400/60 text-white shadow-lg shadow-indigo-900/40'
                      : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/[0.06] text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="flex flex-col items-start text-left">
                    <span>{opt.label}</span>
                    {opt.desc && <span className="text-[10px] text-slate-400 font-normal">{opt.desc}</span>}
                  </div>
                  {isSelected ? (
                    <Check className="w-4 h-4 text-indigo-400" />
                  ) : opt.value === null ? (
                    <PowerOff className="w-3.5 h-3.5 text-slate-500" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
