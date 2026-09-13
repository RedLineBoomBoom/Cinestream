import React, { useState } from 'react';
import {
  CheckCircle2,
  RotateCcw,
  Play,
  Star,
  Calendar,
  Film,
  Tv,
  ExternalLink,
} from 'lucide-react';
import type { MediaItem } from '../../types/media';
import { useWatchlist } from '../../context/WatchlistContext';
import { useSound } from '../../context/SoundContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatRelativeDate, getMediaTitle, getMediaPoster, getMediaBackdrop } from '../../utils/formatters';
import { getAbsoluteWatchUrl } from '../../utils/navigation';

interface WatchedViewProps {
  onPlayMedia: (media: MediaItem, resumeTime?: number, episodeId?: string) => void;
  onGoHistory: () => void;
  onGoHome: () => void;
}

export const WatchedView: React.FC<WatchedViewProps> = ({
  onPlayMedia,
  onGoHistory,
  onGoHome,
}) => {
  const { historyItems, toggleCompleted } = useWatchlist();
  const { playClick, playHover, playSuccess } = useSound();
  const { t, language } = useLanguage();

  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'movie' | 'series'>('all');

  const watchedItems = historyItems.filter((h) => h.completed);
  const movieCount = watchedItems.filter((h) => h.media?.type === 'movie' && !h.episodeId).length;
  const seriesCount = watchedItems.filter((h) => h.media?.type !== 'movie' || Boolean(h.episodeId)).length;

  const displayedItems = watchedItems.filter((h) => {
    if (filter === 'movie') return h.media?.type === 'movie' && !h.episodeId;
    if (filter === 'series') return h.media?.type !== 'movie' || Boolean(h.episodeId);
    return true;
  });

  const handleUnmark = (item: (typeof watchedItems)[number]) => {
    playClick();
    const itemKey = item.historyId || (item.episodeId ? `${item.mediaId}__ep_${item.episodeId}` : item.mediaId);
    setRevertingId(itemKey);
    setTimeout(() => {
      toggleCompleted(item.historyId || item.mediaId, item.episodeId, item.media);
      setRevertingId(null);
    }, 300);
  };

  const handlePlay = (item: (typeof watchedItems)[number]) => {
    playSuccess();
    if (item.media) {
      onPlayMedia(item.media, 0, item.episodeId);
    }
  };

  return (
    <div className="pt-28 pb-20 px-4 sm:px-8 lg:px-12 3xl:px-16 max-w-[1720px] 2xl:max-w-[1880px] 3xl:max-w-[2200px] 4xl:max-w-[2600px] mx-auto space-y-8 min-h-[75vh]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.07] pb-6">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-400/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-display font-medium text-white tracking-wide uppercase">
                {t('watchedTitle')}
              </h1>
              <span className="text-xs font-mono text-emerald-300 bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/25 font-bold">
                {watchedItems.length} {t('watchedCount')}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 font-light mt-1 max-w-2xl leading-relaxed">
              {t('watchedSubtitle')}
            </p>
          </div>
        </div>
        <button
          onClick={() => { playClick(); onGoHistory(); }}
          onMouseEnter={playHover}
          className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white text-xs font-medium transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {language === 'en' ? 'Watch History' : 'Riwayat Tonton'}
        </button>
      </div>

      {/* Filter Tabs */}
      {watchedItems.length > 0 && (
        <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => { playClick(); setFilter('all'); }}
            className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
              filter === 'all'
                ? 'bg-white text-black font-bold shadow-md'
                : 'bg-white/[0.04] text-neutral-300 hover:text-white hover:bg-white/10'
            }`}
          >
            {language === 'en' ? 'All' : 'Semua'} ({watchedItems.length})
          </button>
          <button
            type="button"
            onClick={() => { playClick(); setFilter('movie'); }}
            className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
              filter === 'movie'
                ? 'bg-[#E50914] text-white font-bold shadow-glow-red'
                : 'bg-white/[0.04] text-neutral-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <span>{t('filterMovies')} ({movieCount})</span>
          </button>
          <button
            type="button"
            onClick={() => { playClick(); setFilter('series'); }}
            className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
              filter === 'series'
                ? 'bg-[#E50914] text-white font-bold shadow-glow-red'
                : 'bg-white/[0.04] text-neutral-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <span>{t('filterSeries')} ({seriesCount})</span>
          </button>
        </div>
      )}

      {/* Empty State */}
      {watchedItems.length === 0 ? (
        <div className="py-24 text-center text-slate-400 space-y-4 max-w-md mx-auto">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500/50" />
          </div>
          <h3 className="text-base font-display font-medium text-white tracking-wide">
            {t('emptyWatchedTitle')}
          </h3>
          <p className="text-xs text-slate-400 font-light leading-relaxed">
            {t('emptyWatchedDesc')}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => { playClick(); onGoHistory(); }}
              onMouseEnter={playHover}
              className="px-5 py-2.5 rounded-full bg-white/[0.05] border border-white/10 text-slate-200 text-xs font-semibold hover:bg-white/[0.1] transition-all cursor-pointer"
            >
              {language === 'en' ? 'Go to History' : 'Ke Riwayat Tonton'}
            </button>
            <button
              onClick={() => { playClick(); onGoHome(); }}
              onMouseEnter={playHover}
              className="px-5 py-2.5 rounded-full bg-[#E50914] hover:bg-[#F40612] text-white text-xs font-bold shadow-glow-red transition-all cursor-pointer"
            >
              {t('exploreMovies')}
            </button>
          </div>
        </div>
      ) : displayedItems.length === 0 ? (
        <div className="py-20 text-center text-slate-400 space-y-3">
          <p className="text-sm text-slate-300">
            {language === 'en'
              ? `No completed ${filter === 'movie' ? 'movies' : 'series'} found.`
              : `Tidak ada ${filter === 'movie' ? 'film' : 'series'} yang telah selesai ditonton.`}
          </p>
          <button
            onClick={() => { playClick(); setFilter('all'); }}
            className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/10 text-white text-xs font-semibold transition-all cursor-pointer"
          >
            {language === 'en' ? 'Show All' : 'Tampilkan Semua'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-7 4xl:grid-cols-8 gap-4 sm:gap-6">
          {displayedItems.map((histItem) => {
            const media = histItem.media;
            if (!media) return null;
            const itemKey = histItem.historyId || (histItem.episodeId ? `${histItem.mediaId}__ep_${histItem.episodeId}` : histItem.mediaId);
            const isReverting = revertingId === itemKey;
            const isSeriesEpisode = media.type !== 'movie' || Boolean(histItem.episodeId || histItem.episodeNumber);

            return (
              <div
                key={itemKey}
                className={`group relative flex flex-col rounded-lg sm:rounded-xl overflow-hidden bg-[#181818] border border-emerald-500/30 hover:border-emerald-400/70 transition-all duration-300 shadow-netflix-card hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-950/25 ${isReverting ? 'opacity-40 scale-95' : ''}`}
              >
                {/* Poster & Badges Container */}
                <div className="relative aspect-[2/3] overflow-hidden bg-[#1f1f1f]">
                  <img
                    src={histItem.episodeThumbnail || getMediaPoster(media, language) || getMediaBackdrop(media, language) || media.poster || media.backdrop}
                    alt={getMediaTitle(media, language)}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        getMediaBackdrop(media, language) || media.backdrop || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=500&auto=format&fit=crop';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-black/20 to-transparent group-hover:from-black/80 transition-all" />

                  {/* Top Right: Completed Badge */}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-md sm:rounded-lg font-bold bg-emerald-600/90 text-white border border-emerald-400/40 backdrop-blur-md text-[10px] sm:text-[11px] uppercase tracking-wider shadow-md">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{t('completed')}</span>
                  </div>

                  {/* Top Left: Series Episode Badge or Movie Rating */}
                  {isSeriesEpisode ? (
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2.5 py-1 rounded-md sm:rounded-lg bg-black/80 backdrop-blur-md border border-emerald-400/40 text-[11px] sm:text-xs font-mono font-bold text-emerald-300 shadow-md">
                      S{histItem.seasonNumber ?? 1}:E{histItem.episodeNumber ?? 1}
                    </div>
                  ) : media.rating > 0 ? (
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-md sm:rounded-lg bg-black/80 backdrop-blur-md border border-white/20 text-[11px] sm:text-xs font-bold text-white shadow-md">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{media.rating.toFixed(1)}</span>
                    </div>
                  ) : null}

                  {/* Hover Overlay Action Buttons */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 p-3 sm:p-4 opacity-0 group-hover:opacity-100 transition-opacity bg-black/65 backdrop-blur-[2px]">
                    <button
                      onClick={() => handlePlay(histItem)}
                      onMouseEnter={playHover}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-white hover:bg-white/90 text-black font-bold text-xs sm:text-sm shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-black text-black" />
                      <span>{language === 'en' ? 'Play Again' : 'Tonton Ulang'}</span>
                    </button>

                    <button
                      onClick={() => handleUnmark(histItem)}
                      onMouseEnter={playHover}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium text-xs sm:text-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{t('markAsUnwatched')}</span>
                    </button>

                    <a
                      href={getAbsoluteWatchUrl(media.id, histItem.episodeId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        e.stopPropagation();
                        playClick();
                      }}
                      onMouseEnter={playHover}
                      title={t('openInNewTabTooltip')}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-black/50 hover:bg-brand-gold/20 hover:border-brand-gold/40 border border-white/15 text-slate-200 hover:text-brand-gold font-medium text-xs sm:text-sm transition-all hover:scale-105 active:scale-95 no-underline cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-brand-gold" />
                      <span>{t('openInNewTab')}</span>
                    </a>
                  </div>
                </div>

                {/* Card Info Footer (Larger, highly legible title & typography) */}
                <div className="p-3.5 sm:p-4 space-y-2 flex-1 flex flex-col justify-between bg-[#181818]">
                  <div>
                    {/* Media Title */}
                    <h4 className="font-sans font-bold text-white text-sm sm:text-base line-clamp-1 leading-snug group-hover:text-emerald-300 transition-colors">
                      {getMediaTitle(media, language)}
                    </h4>

                    {/* Series Episode Subtitle */}
                    {isSeriesEpisode && (
                      <div className="mt-1.5 flex items-center gap-1.5 min-w-0">
                        <span className="text-[10.5px] sm:text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                          S{histItem.seasonNumber ?? 1}:E{histItem.episodeNumber ?? 1}
                        </span>
                        <p className="text-xs sm:text-[13px] text-emerald-400/95 font-medium truncate">
                          {histItem.episodeTitle || `${t('episodeProgress')} ${histItem.episodeNumber ?? 1}`}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Metadata Row: Media Type, Year & Relative Timestamp */}
                  <div className="flex items-center gap-2.5 text-xs sm:text-[12.5px] text-slate-400 font-normal pt-1.5 border-t border-white/[0.06]">
                    <span className="flex items-center gap-1.5 text-slate-300 font-medium shrink-0">
                      {media.type === 'movie' ? (
                        <Film className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <Tv className="w-3.5 h-3.5 text-emerald-400/80" />
                      )}
                      <span>{media.year}</span>
                    </span>

                    {histItem.lastWatched && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-white/25 shrink-0" />
                        <span className="flex items-center gap-1.5 text-slate-400 truncate">
                          <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{formatRelativeDate(histItem.lastWatched, language)}</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
