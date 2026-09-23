import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  X,
  Send,
  CheckCircle2,
  Tv,
  Film,
  Server as ServerIcon,
  VolumeX,
  MessageSquareOff,
  VideoOff,
  Hourglass,
  HelpCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import type { MediaItem, Server, Episode } from '../../types/media';
import { useLanguage } from '../../context/LanguageContext';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useSound } from '../../context/SoundContext';
import { useAuth } from '../../context/AuthContext';
import { useUserProfile } from '../../context/UserProfileContext';
import { submitStreamReport, type IssueType } from '../../services/reportService';
import { formatServerName, getMediaTitle } from '../../utils/formatters';

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  media: MediaItem;
  currentEpisode?: Episode;
  activeServer: Server;
  onSwitchServerPrompt?: () => void;
}

export const ReportIssueModal: React.FC<ReportIssueModalProps> = ({
  isOpen,
  onClose,
  media,
  currentEpisode,
  activeServer,
  onSwitchServerPrompt,
}) => {
  const { language } = useLanguage();
  const { playClick, playSuccess, playHover } = useSound();
  const { user } = useAuth();
  const { profile } = useUserProfile();

  useBodyScrollLock(isOpen);

  const [selectedIssue, setSelectedIssue] = useState<IssueType>('playback_error');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setSelectedIssue('playback_error');
      setDescription('');
      setIsSubmitting(false);
      setIsSubmitted(false);
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const displayTitle = getMediaTitle(media, language);
  const serverDisplayName = formatServerName(activeServer.name, language);

  const issueOptions: { id: IssueType; labelId: string; labelEn: string; icon: React.ComponentType<{ className?: string }> }[] = [
    {
      id: 'playback_error',
      labelId: 'Video Rusak / 404 / Layar Hitam',
      labelEn: 'Playback Error / 404 / Black Screen',
      icon: VideoOff,
    },
    {
      id: 'subtitle_error',
      labelId: 'Subtitle Hilang / Rusak / Desync',
      labelEn: 'Subtitles Missing / Broken / Desync',
      icon: MessageSquareOff,
    },
    {
      id: 'audio_sync',
      labelId: 'Suara Bisu / Desync Audio',
      labelEn: 'Audio Muted / Audio Desync',
      icon: VolumeX,
    },
    {
      id: 'slow_buffer',
      labelId: 'Buffering Parah / Macet Total',
      labelEn: 'Constant Buffering / Freezing',
      icon: Hourglass,
    },
    {
      id: 'wrong_content',
      labelId: 'Episode / Judul Salah',
      labelEn: 'Wrong Episode / Incorrect Movie',
      icon: AlertTriangle,
    },
    {
      id: 'other',
      labelId: 'Masalah Teknis Lainnya',
      labelEn: 'Other Technical Issue',
      icon: HelpCircle,
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    playClick();
    setIsSubmitting(true);

    const reporterName = profile?.name || user?.email?.split('@')[0] || 'Pengunjung (Guest)';
    const reporterEmail = user?.email || undefined;
    const userId = user?.id || undefined;

    const targetTmdbId = media.tmdbId || (() => {
      if (media.id.startsWith('tmdb-movie-')) return Number(media.id.replace('tmdb-movie-', ''));
      if (media.id.startsWith('tmdb-tv-')) return Number(media.id.replace('tmdb-tv-', ''));
      return undefined;
    })();

    await submitStreamReport({
      mediaId: media.id,
      tmdbId: targetTmdbId,
      mediaTitle: displayTitle,
      mediaType: media.type,
      seasonNumber: currentEpisode?.seasonNumber,
      episodeNumber: currentEpisode?.episodeNumber,
      serverId: activeServer.id,
      serverName: serverDisplayName,
      issueType: selectedIssue,
      description: description.trim() || undefined,
      reportedBy: reporterName,
      userEmail: reporterEmail,
      userId: userId,
    });

    setIsSubmitting(false);
    setIsSubmitted(true);
    playSuccess();

    // Auto-close after 3 seconds
    setTimeout(() => {
      onClose();
    }, 2800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200 overscroll-contain">
      {/* Backdrop */}
      <div
        onClick={() => !isSubmitting && onClose()}
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity touch-none"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg rounded-3xl bg-[#141414] border border-white/10 shadow-2xl p-6 sm:p-7 z-10 overflow-hidden text-slate-100 animate-in zoom-in-95 duration-200">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={() => {
            playClick();
            onClose();
          }}
          disabled={isSubmitting}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer disabled:opacity-50"
          title="Tutup"
        >
          <X className="w-4 h-4" />
        </button>

        {isSubmitted ? (
          /* Success View */
          <div className="py-8 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-950/50 animate-bounce">
              <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-display font-bold text-white">
                {language === 'en' ? 'Report Received!' : 'Laporan Berhasil Diterima!'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-sm mx-auto leading-relaxed">
                {language === 'en'
                  ? 'Thank you for reporting. Our admin team will investigate and optimize this stream server shortly.'
                  : 'Terima kasih atas laporan Anda. Tim admin akan segera memeriksa dan memperbaiki server tayangan ini.'}
              </p>
            </div>

            <button
              onClick={() => {
                playClick();
                onClose();
              }}
              className="mt-4 px-6 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all cursor-pointer"
            >
              {language === 'en' ? 'Close' : 'Tutup'}
            </button>
          </div>
        ) : (
          /* Form View */
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 shadow-sm shrink-0">
                <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-display font-bold text-white tracking-tight">
                  {language === 'en' ? 'Report Stream Issue' : 'Laporkan Masalah Video'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {language === 'en'
                    ? 'Help us keep all streaming servers fast, stable, and accurate.'
                    : 'Bantu kami menjaga seluruh server tayangan tetap lancar dan tepat.'}
                </p>
              </div>
            </div>

            {/* Target Media & Server Info Badge */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-white truncate">
                {media.type === 'movie' ? (
                  <Film className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                ) : (
                  <Tv className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                )}
                <span className="truncate">{displayTitle}</span>
                {currentEpisode && (
                  <span className="px-2 py-0.5 rounded bg-white/10 text-amber-300 font-mono text-[10px] shrink-0 font-bold">
                    S{currentEpisode.seasonNumber ?? 1}:E{currentEpisode.episodeNumber}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/5">
                <span className="flex items-center gap-1.5">
                  <ServerIcon className="w-3 h-3 text-cyan-400" />
                  <span>{language === 'en' ? 'Active Server:' : 'Server Aktif:'}</span>
                  <strong className="text-slate-200">{serverDisplayName}</strong>
                </span>

                {onSwitchServerPrompt && (
                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      onClose();
                      onSwitchServerPrompt();
                    }}
                    className="text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 font-semibold cursor-pointer text-[10px]"
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>{language === 'en' ? 'Try Switch Server' : 'Coba Ganti Server'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Issue Selector Chips */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                {language === 'en' ? 'What seems to be the problem?' : 'Apa kendala yang Anda alami?'}
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {issueOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = selectedIssue === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        playClick();
                        setSelectedIssue(opt.id);
                      }}
                      onMouseEnter={playHover}
                      className={`flex items-center gap-2.5 p-3 rounded-xl text-left text-xs transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-red-600/20 border-red-500/60 text-white font-semibold shadow-md shadow-red-950/40'
                          : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.06] text-slate-300'
                      }`}
                    >
                      <div className={`p-1 rounded-lg ${isSelected ? 'bg-red-500/30 text-red-300' : 'bg-white/5 text-slate-400'}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="leading-snug">
                        {language === 'en' ? opt.labelEn : opt.labelId}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Description */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                {language === 'en' ? 'Additional Notes (Optional)' : 'Catatan Tambahan (Opsional)'}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder={
                  language === 'en'
                    ? 'E.g., video stops at 14:20, or Indonesian subs are missing.'
                    : 'Contoh: video berhenti di menit 14:20, atau subtitle Bahasa Indonesia tidak keluar.'
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  playClick();
                  onClose();
                }}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer disabled:opacity-50"
              >
                {language === 'en' ? 'Cancel' : 'Batal'}
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:brightness-110 active:scale-95 text-xs font-bold text-white shadow-lg shadow-red-950/60 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>{language === 'en' ? 'Sending Report...' : 'Mengirim Laporan...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>{language === 'en' ? 'Submit Report' : 'Kirim Laporan'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
