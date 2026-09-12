import React, { useRef } from 'react';
import { Play, X, Clock, Sparkles, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import type { MediaItem } from '../../types/media';
import { useWatchlist } from '../../context/WatchlistContext';
import { useSound } from '../../context/SoundContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatRemainingTime, formatGenre, getMediaTitle, getMediaPoster, getMediaBackdrop } from '../../utils/formatters';

interface ContinueWatchingRowProps {
  onPlayMedia: (media: MediaItem, resumeTime?: number, episodeId?: string) => void;
  onOpenDetails: (media: MediaItem) => void;
}

export const ContinueWatchingRow: React.FC<ContinueWatchingRowProps> = ({
  onPlayMedia,
  onOpenDetails,
}) => {
  const { historyItems, removeHistoryItem } = useWatchlist();
  const { playClick, playHover, playWhoosh } = useSound();
  const { t, language } = useLanguage();
  const sliderRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    playClick();
    if (!sliderRef.current) return;
    const { scrollLeft, clientWidth } = sliderRef.current;
    const scrollAmount = clientWidth * 0.75;
    sliderRef.current.scrollTo({
      left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
      behavior: 'smooth',
    });
  };

  // Filter items that are in-progress (not completed and have progress > 0)
  const inProgressItems = historyItems.filter(
    (item) => !item.completed && item.currentTime > 0 && item.duration > 0 && Boolean(item.media)
  );

  if (inProgressItems.length === 0) {
    return null;
  }

  return (
    <section className="relative z-10 max-w-[1720px] 2xl:max-w-[1880px] 3xl:max-w-[2200px] 4xl:max-w-[2600px] mx-auto px-4 sm:px-8 lg:px-12 3xl:px-16 my-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-[#E50914] flex items-center justify-center text-white shadow-md shadow-red-900/40 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>{t('continueWatchingShelf')}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white font-bold">
                {inProgressItems.length}
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-normal mt-0.5">
              {t('continueWatchingDesc')}
            </p>
          </div>
        </div>

        {/* Mobile Swipe Hint & Navigation Controls */}
        {inProgressItems.length > 1 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] text-slate-400 font-light flex items-center gap-0.5 sm:hidden mr-1 select-none">
              <ChevronRight className="w-3 h-3 text-[#E50914] animate-pulse" />
              <span>{language === 'en' ? 'Swipe' : 'Geser'}</span>
            </span>

            <button
              type="button"
              onClick={() => scroll('left')}
              className="p-1.5 rounded-full bg-white/[0.04] hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 active:scale-95 transition-all cursor-pointer"
              title={language === 'en' ? 'Previous' : 'Sebelumnya'}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              className="p-1.5 rounded-full bg-white/[0.04] hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 active:scale-95 transition-all cursor-pointer"
              title={language === 'en' ? 'Next' : 'Berikutnya'}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Cards Highlight Carousel (Swipeable horizontal slider on mobile, responsive grid on desktop) */}
      <div
        ref={sliderRef}
        className="flex sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 4xl:grid-cols-7 gap-3.5 sm:gap-5 overflow-x-auto sm:overflow-visible no-scrollbar scroll-smooth snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0 pb-3 sm:pb-0 pt-1"
      >
        {inProgressItems.slice(0, 10).map((item) => {
          const itemKey = item.historyId || (item.episodeId ? `${item.mediaId}__ep_${item.episodeId}` : item.mediaId);
          const isSeriesEpisode = (item.media?.type !== 'movie') || Boolean(item.episodeId || item.episodeNumber);
          const rawPercent = item.duration > 0 ? (item.currentTime / item.duration) * 100 : 0;
          const displayPercent = Math.min(100, Math.max(0, Math.round(rawPercent)));
          const barWidthPercent = item.completed
            ? 100
            : rawPercent > 0
            ? Math.min(100, Math.max(1, rawPercent))
            : 0;
          const remainingText = formatRemainingTime(item.currentTime, item.duration, language);

          const displayTitle = getMediaTitle(item.media, language);
          const displayBackdrop = getMediaBackdrop(item.media, language);
          const displayPoster = getMediaPoster(item.media, language);

          return (
            <div
              key={itemKey}
              onMouseEnter={playHover}
              className="w-[82vw] max-w-[320px] xs:w-[76vw] sm:w-auto shrink-0 snap-start group relative flex flex-col rounded-xl sm:rounded-lg overflow-hidden bg-[#181818] border border-white/[0.08] hover:border-white/30 transition-all duration-300 sm:hover:scale-[1.03] shadow-lg sm:hover:shadow-2xl hover:shadow-black/95"
            >
              {/* Thumbnail Container */}
              <a
                href={`#/watch/${item.media.id}${item.episodeId ? `?ep=${item.episodeId}` : ''}`}
                onClick={(e) => {
                  if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) {
                    return;
                  }
                  e.preventDefault();
                  playWhoosh();
                  onPlayMedia(item.media, item.currentTime, item.episodeId);
                }}
                className="relative aspect-video w-full overflow-hidden bg-[#141414] cursor-pointer block no-underline text-inherit"
              >
                <img
                  src={item.episodeThumbnail || displayBackdrop || displayPoster || item.media.backdrop || item.media.poster}
                  alt={displayTitle}
                  loading="lazy"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 brightness-90 group-hover:brightness-100"
                />

                {/* Dark Vignette Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-transparent to-black/30" />

                {/* Big Center Play Icon Button - Netflix White Circle */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-2xl group-hover:scale-110 transition-all duration-200">
                    <Play className="w-5 h-5 ml-0.5 fill-black" />
                  </div>
                </div>

                {/* Top Floating Badges */}
                <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none">
                  <span className="text-[10px] font-sans uppercase tracking-wider px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-white border border-white/10 font-bold flex items-center gap-1">
                    <span>{item.media.type === 'movie' ? t('badgeFilm') : t('badgeSeries')}</span>
                    {isSeriesEpisode && (
                      <span className="text-[#46d369] font-mono font-bold">
                        • S{item.seasonNumber ?? 1}:E{item.episodeNumber ?? 1}
                      </span>
                    )}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Open in New Tab Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        playClick();
                        const url = `${window.location.origin}${window.location.pathname}#/watch/${item.media.id}${item.episodeId ? `?ep=${item.episodeId}` : ''}`;
                        window.open(url, '_blank', 'noopener,noreferrer');
                      }}
                      title={t('openInNewTabTooltip') || (language === 'en' ? 'Open in new tab' : 'Buka di tab baru')}
                      className="pointer-events-auto w-7 h-7 rounded-full bg-black/60 hover:bg-white/20 text-white flex items-center justify-center transition-all border border-white/20 hover:border-white cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>

                    {/* Dismiss / Remove Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        playClick();
                        removeHistoryItem(item.historyId || item.mediaId, item.episodeId);
                      }}
                      title={t('removeFromHistory')}
                      className="pointer-events-auto w-7 h-7 rounded-full bg-black/60 hover:bg-[#E50914] text-white flex items-center justify-center transition-all border border-white/20 hover:border-[#E50914] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Bottom Remaining Time Tag */}
                <div className="absolute bottom-2.5 right-2.5 pointer-events-none">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/80 text-white backdrop-blur-md border border-white/10 font-medium">
                    {remainingText}
                  </span>
                </div>

                {/* Progress Bar at bottom of thumbnail - Netflix Red */}
                <div className="absolute bottom-0 inset-x-0 h-1 bg-white/25">
                  <div
                    className="h-full bg-[#E50914] shadow-glow-red transition-all duration-300"
                    style={{ width: `${barWidthPercent}%` }}
                  />
                </div>
              </a>

              {/* Info & Action Row */}
              <div className="p-3.5 flex flex-col justify-between gap-2 flex-1">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      onClick={() => {
                        playClick();
                        onOpenDetails(item.media);
                      }}
                      className="font-sans font-bold text-white text-xs sm:text-sm truncate group-hover:text-white transition-colors cursor-pointer"
                    >
                      {displayTitle}
                    </h3>
                    <span className="text-[10px] font-mono text-[#E50914] font-bold shrink-0">
                      {displayPercent}%
                    </span>
                  </div>

                  {item.episodeTitle ? (
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs">
                      <span className="font-mono font-bold text-[9.5px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shrink-0">
                        S{item.seasonNumber ?? 1}:E{item.episodeNumber ?? 1}
                      </span>
                      <p className="text-[11px] text-brand-champagne/90 truncate font-light">
                        {item.episodeTitle}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {item.media.year} • {formatGenre(item.media.genres[0], language) || (language === 'en' ? 'Cinema' : 'Sinema')}
                    </p>
                  )}
                </div>

                {/* Bottom Buttons */}
                <div className="flex items-center gap-1.5 pt-1 border-t border-white/[0.05]">
                  <button
                    type="button"
                    onClick={() => {
                      playWhoosh();
                      onPlayMedia(item.media, item.currentTime, item.episodeId);
                    }}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-[#E50914]/25 hover:bg-[#E50914]/45 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 min-w-0 border border-[#E50914]/20 hover:border-[#E50914]/50"
                  >
                    <Play className="w-3 h-3 fill-current shrink-0" />
                    <span className="truncate">{language === 'en' ? 'Continue' : 'Lanjutkan'} · {displayPercent}%</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      onOpenDetails(item.media);
                    }}
                    title={t('detailsReviews')}
                    className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.12] text-slate-400 hover:text-white border border-white/[0.08] transition-all shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
