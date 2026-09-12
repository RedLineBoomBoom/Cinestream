import React, { useState } from 'react';
import {
  Volume2,
  Zap,
  Check,
  X,
  Info,
  Headphones,
  ExternalLink,
  Sparkles,
  Sliders,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import type { Server } from '../../types/media';
import { useLanguage } from '../../context/LanguageContext';
import { useSound } from '../../context/SoundContext';
import { formatServerName } from '../../utils/formatters';

interface AudioBoosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioBoost: number;
  onAudioBoostChange: (level: number) => void;
  isDialogueBoost: boolean;
  onDialogueBoostChange: (enabled: boolean) => void;
  isEmbedStream: boolean;
  onMaxVolume: () => void;
  activeServer?: Server;
  availableServers?: Server[];
  onSelectServer?: (server: Server) => void;
  videoSource?: string;
  mediaTitle?: string;
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
  activeServer,
  availableServers = [],
  onSelectServer,
  videoSource,
}) => {
  const { language } = useLanguage();
  const { playClick, playHover, playSuccess } = useSound();
  const [maximizedToast, setMaximizedToast] = useState(false);
  const [serverToast, setServerToast] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleMaxClick = () => {
    playSuccess();
    onMaxVolume();
    setMaximizedToast(true);
    setTimeout(() => setMaximizedToast(false), 2600);
  };

  const handleSwitchServer = (server: Server) => {
    playSuccess();
    onSelectServer?.(server);
    const locName = formatServerName(server.name, language);
    const clean = locName.split('•')[1]?.trim() || locName;
    setServerToast(clean);
    setTimeout(() => setServerToast(null), 3000);
  };

  const handleOpenDirect = () => {
    playClick();
    if (videoSource) {
      window.open(videoSource, '_blank', 'noopener,noreferrer');
    }
  };

  // Find high-audio recommendations among available servers
  const recommendedServers = availableServers.filter((srv) => {
    const id = (srv.id || '').toLowerCase();
    const name = (srv.name || '').toLowerCase();
    return (
      id.includes('vidlink') ||
      name.includes('vidlink') ||
      id.includes('multiembed') ||
      name.includes('multistream') ||
      id.includes('vidsrc') ||
      name.includes('vidsrc')
    );
  });

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-[#141414] border border-white/15 rounded-2xl p-5 sm:p-6 shadow-2xl overflow-hidden flex flex-col gap-4 max-h-[90dvh] overflow-y-auto no-scrollbar"
      >
        {/* Ambient decorative background glows */}
        <div className="absolute -top-24 -right-24 w-60 h-60 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 rounded-full bg-red-600/10 blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-black font-black">
              <Volume2 className="w-5 h-5 text-black" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                <span>{language === 'en' ? 'Audio Booster & Fix' : 'Solusi Audio & Penguat Suara'}</span>
                {isEmbedStream ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Embed Stream
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {Math.round(audioBoost * 100)}% Boost
                  </span>
                )}
              </h3>
              <p className="text-xs text-white/60">
                {language === 'en'
                  ? 'Fix quiet dialogue & maximize volume on mobile & speakers'
                  : 'Atasi suara vokal/dialog kecil & maksimalkan audio di HP & speaker'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success toast when switching server */}
        {serverToast && (
          <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {language === 'en'
                ? `Switched to ${serverToast} for louder audio!`
                : `Beralih ke ${serverToast} untuk audio lebih kencang!`}
            </span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CASE A: EMBED STREAM MODE (Almost all Movies/Series)                     */}
        {/* ========================================================================= */}
        {isEmbedStream ? (
          <div className="space-y-3.5 relative z-10">
            {/* 1. Transparent explanation of why embed audio is quiet */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-slate-300 text-xs leading-relaxed flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">
                  {language === 'en' ? 'Why is the movie audio quiet?' : 'Mengapa audio film/series bisa sangat kecil?'}
                </p>
                <p className="text-[11px] text-white/60 mt-0.5">
                  {language === 'en'
                    ? 'Many films use 5.1 surround sound where dialogue is encoded at low levels. Embed iframes also isolate audio from browser extensions. Use the solutions below to fix it:'
                    : 'Banyak film menggunakan audio surround 5.1 (dialog terpisah di channel tengah). Pemutar pihak ketiga juga mengisolasi audio. Gunakan solusi terbukti di bawah ini:'}
                </p>
              </div>
            </div>

            {/* 2. SOLUTION #1: Switch to High-Volume Stereo Server */}
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    {language === 'en' ? 'Solution 1: Switch to Loud Stereo Server' : 'Solusi 1: Ganti ke Server Audio Kencang'}
                  </h4>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-semibold">
                  {language === 'en' ? 'Recommended' : 'Sangat Direkomendasikan'}
                </span>
              </div>
              <p className="text-[11px] text-white/70">
                {language === 'en'
                  ? 'Server 6 (VidLink) and Server 4 use 2.0 Stereo re-encoding with boosted, clear dialogue:'
                  : 'Server 6 (VidLink) dan Server 4 menggunakan re-encode Stereo 2.0 dengan normalisasi vokal kencang & jernih:'}
              </p>

              <div className="grid grid-cols-1 gap-2 pt-1">
                {recommendedServers.map((srv) => {
                  const isActive = srv.id === activeServer?.id;
                  const isVidLink = srv.id.includes('vidlink') || srv.name.toLowerCase().includes('vidlink');
                  const isMulti = srv.id.includes('multiembed') || srv.name.toLowerCase().includes('multistream');

                  return (
                    <button
                      key={srv.id}
                      onClick={() => handleSwitchServer(srv)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isActive
                          ? 'bg-amber-500/20 border-amber-400/60 text-amber-200 shadow-sm'
                          : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08] hover:border-amber-400/40 text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                          isActive ? 'bg-amber-400 text-black' : 'bg-white/10 text-white'
                        }`}>
                          {isVidLink ? 'S6' : isMulti ? 'S4' : 'S1'}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">
                            {formatServerName(srv.name, language)}
                          </p>
                          <p className="text-[10px] text-amber-300/80 font-mono">
                            {isVidLink
                              ? (language === 'en' ? '🔊 Stereo 2.0 Loud & Clear Dialogue' : '🔊 Audio Stereo 2.0 Kencang & Vokal Jernih')
                              : isMulti
                              ? (language === 'en' ? '🔊 Multi-host Alternate Audio' : '🔊 Multi-Sumber dengan Opsi Audio')
                              : (language === 'en' ? '🔊 High Master Loudness' : '🔊 Master Volume Tinggi')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {isActive ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-400 text-black">
                            {language === 'en' ? 'Active' : 'Sedang Aktif'}
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-500 text-black hover:bg-amber-400 flex items-center gap-1">
                            <span>{language === 'en' ? 'Switch' : 'Pilih'}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. SOLUTION #2: The In-Player Volume Slider (CRITICAL!) */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  {language === 'en' ? 'Solution 2: Check Volume Inside Video Screen' : 'Solusi 2: Cek Penggeser Volume di Video'}
                </h4>
              </div>
              <div className="text-[11px] text-slate-300 leading-relaxed space-y-1.5 bg-black/40 p-2.5 rounded-lg border border-white/5 font-sans">
                <p className="font-semibold text-emerald-300">
                  {language === 'en'
                    ? '⚠️ Most embed players start at 50% internal volume by default!'
                    : '⚠️ Pemutar video bawaan server seringkali menyetel volume ke 50% atau Mute!'}
                </p>
                <ol className="list-decimal list-inside space-y-1 text-white/80">
                  <li>
                    {language === 'en'
                      ? 'Tap the video screen once to reveal the player controls.'
                      : 'Ketuk layar video sekali untuk memunculkan tombol kontrol server.'}
                  </li>
                  <li>
                    {language === 'en'
                      ? 'Find the speaker icon 🔊 at the bottom right of the video.'
                      : 'Cari ikon speaker 🔊 di pojok kanan bawah video (di samping gear / fullscreen).'}
                  </li>
                  <li>
                    {language === 'en'
                      ? 'Drag the volume slider all the way to 100% (far right).'
                      : 'Geser penggeser volume ke paling kanan (100%).'}
                  </li>
                </ol>
              </div>
            </div>

            {/* 4. SOLUTION #3 & #4: Direct Full-Window & Force Max Signals */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={handleOpenDirect}
                onMouseEnter={playHover}
                className="py-2.5 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-brand-champagne" />
                <span>{language === 'en' ? 'Open in Full Tab ↗' : 'Buka di Tab Penuh ↗'}</span>
              </button>

              <button
                onClick={handleMaxClick}
                onMouseEnter={playHover}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-black text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-black stroke-none" />
                <span>{language === 'en' ? 'Send Max Signal' : 'Kirim Sinyal Max Volume'}</span>
              </button>
            </div>

            {maximizedToast && (
              <div className="text-center text-xs font-semibold text-emerald-400 animate-in fade-in flex items-center justify-center gap-1.5">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>{language === 'en' ? 'Volume 100% signals sent to iframe!' : 'Sinyal volume 100% dikirim ke iframe!'}</span>
              </div>
            )}
          </div>
        ) : (
          /* ========================================================================= */
          /* CASE B: NATIVE VIDEO MODE (Direct MP4 / HLS Streams)                      */
          /* ========================================================================= */
          <div className="space-y-4 relative z-10">
            {/* 1-Click Instant Max Volume Button */}
            <div>
              <button
                onClick={handleMaxClick}
                onMouseEnter={playHover}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-400 hover:to-red-500 active:scale-[0.98] text-black font-black text-xs sm:text-sm tracking-wide shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-black stroke-none animate-pulse" />
                <span>
                  {language === 'en' ? '⚡ Max Volume Now (100%)' : '⚡ Volume Maksimal Sekarang (100%)'}
                </span>
              </button>
              {maximizedToast && (
                <div className="text-center text-xs font-semibold text-emerald-400 pt-2 animate-in fade-in flex items-center justify-center gap-1.5">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>{language === 'en' ? 'Volume maximized!' : 'Volume dimaksimalkan!'}</span>
                </div>
              )}
            </div>

            {/* Web Audio API Hardware Amplification Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/80 flex items-center justify-between">
                <span>{language === 'en' ? 'Hardware Audio Boost (GainNode)' : 'Penguat Gain Hardware (GainNode)'}</span>
                <span className="text-amber-300 font-mono text-[11px]">
                  {audioBoost > 1.0
                    ? `+${Math.round((audioBoost - 1.0) * 100)}% Boost Aktif`
                    : 'Level Normal (100%)'}
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

            {/* Dialogue & Vocal Enhancer Compressor */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-violet-500/20 text-violet-300 shrink-0 mt-0.5">
                  <Headphones className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">
                    {language === 'en' ? 'Dialogue Clarity (Compressor)' : 'Kejernihan Dialog (Kompresor)'}
                  </h4>
                  <p className="text-[11px] text-white/60 leading-relaxed">
                    {language === 'en'
                      ? 'Compresses dynamic range to elevate quiet speech above loud sound effects.'
                      : 'Menekan rentang dinamis untuk menaikkan vokal/dialog di atas efek suara latar.'}
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
                aria-label="Toggle Dialogue Clarity"
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    isDialogueBoost ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* Practical Footer Tip */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-white/50 text-[11px] leading-relaxed flex items-start gap-2 relative z-10">
          <Info className="w-4 h-4 text-white/40 shrink-0 mt-0.5" />
          <p>
            {language === 'en'
              ? 'Tip: If using Bluetooth speakers or earphones, ensure absolute volume is unlinked in device settings for maximum output.'
              : 'Tips: Jika menggunakan speaker/headphone Bluetooth di HP, pastikan pengaturan "Absolute Volume" atau sinkronisasi volume di HP Anda aktif ke level 100%.'}
          </p>
        </div>
      </div>
    </div>
  );
};
