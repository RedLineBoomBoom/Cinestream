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

  const watchedItems = historyItems.filter((h) => h.completed);

  const handleUnmark = (item: (typeof watchedItems)[number]) => {
    playClick();
    const itemKey = item.historyId || (item.episodeId ? `${item.mediaId}__ep_${item.episodeId}` : item.mediaId);
    setRevertingId(itemKey);
    setTimeout(() => {
      toggleCompleted(item.historyId || item.mediaId, item.episodeId);
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
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8 4xl:grid-cols-9 gap-4 sm:gap-5">
          {watchedItems.map((histItem) => {
            const media = histItem.media;
            if (!media) return null;
            const itemKey = histItem.historyId || (histItem.episodeId ? `${histItem.mediaId}__ep_${histItem.episodeId}` : histItem.mediaId);
            const isReverting = revertingId === itemKey;
            const isSeriesEpisode = media.type !== 'movie' || Boolean(histItem.episodeId || histItem.episodeNumber);

            return (
              <div
                key={itemKey}
                className={`group relative flex flex-col rounded-md sm:rounded-lg overflow-hidden bg-[#181818] border border-emerald-500/30 hover:border-emerald-400/60 transition-all duration-300 shadow-netflix-card hover:-translate-y-1 ${isReverting ? 'opacity-40 scale-95' : ''}`}
              >
                <div className="relative aspect-[2/3] overflow-hidden">
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
                  <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded font-bold bg-emerald-600 backdrop-blur-md text-[9px] text-white uppercase tracking-wide">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>{t('completed')}</span>
                  </div>
                  {isSeriesEpisode && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-md border border-emerald-400/30 text-[9.5px] font-mono font-bold text-emerald-300">
                      S{histItem.seasonNumber ?? 1}:E{histItem.episodeNumber ?? 1}
                    </div>
                  )}
                  {!isSeriesEpisode && media.rating > 0 && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-md border border-white/10 text-[9.5px] font-bold text-white">
                      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                      {media.rating.toFixed(1)}
                    </div>
                  )}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-[2px]">
                    <button
                      onClick={() => handlePlay(histItem)}
                      onMouseEnter={playHover}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-md bg-white hover:bg-white/85 text-black font-black text-xs shadow-xl hover:scale-105 transition-transform cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-black text-black" />
                      <span>{language === 'en' ? 'Play Again' : 'Tonton Ulang'}</span>
                    </button>
                    <button
                      onClick={() => handleUnmark(histItem)}
                      onMouseEnter={playHover}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-medium text-xs transition-all hover:scale-105 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{t('markAsUnwatched')}</span>
                    </button>
                    <a
                      href={`${window.location.origin}${window.location.pathname}#/watch/${media.id}${histItem.episodeId ? `?ep=${histItem.episodeId}` : ''}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        e.stopPropagation();
                        playClick();
                      }}
                      onMouseEnter={playHover}
                      title={t('openInNewTabTooltip')}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 hover:bg-brand-gold/20 hover:border-brand-gold/40 border border-white/10 text-slate-300 hover:text-brand-gold font-medium text-xs transition-all hover:scale-105 no-underline cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3 text-brand-gold" />
                      <span>{t('openInNewTab')}</span>
                    </a>
                  </div>
                </div>
                <div className="p-2.5 space-y-1">
                  <h4 className="font-display font-medium text-white text-xs line-clamp-1 group-hover:text-emerald-300 transition-colors">
                    {getMediaTitle(media, language)}
                  </h4>
                  {isSeriesEpisode && histItem.episodeTitle ? (
                    <p className="text-[10px] text-emerald-400/90 truncate font-mono">
                      S{histItem.seasonNumber ?? 1}:E{histItem.episodeNumber ?? 1} • {histItem.episodeTitle}
                    </p>
                  ) : null}
                  <div className="flex items-center gap-2 text-[9.5px] text-slate-500">
                    <span className="flex items-center gap-0.5">
                      {media.type === 'movie' ? (
                        <Film className="w-2.5 h-2.5" />
                      ) : (
                        <Tv className="w-2.5 h-2.5" />
                      )}
                      {media.year}
                    </span>
                    {histItem.lastWatched && (
                      <>
                        <span className="w-0.5 h-0.5 rounded-full bg-slate-600" />
                        <span className="flex items-center gap-0.5">
                          <Calendar className="w-2.5 h-2.5" />
                          {formatRelativeDate(histItem.lastWatched, language)}
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
