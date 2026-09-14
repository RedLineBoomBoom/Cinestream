import React, { useState, useEffect } from 'react';
import { Play, Star, Plus, Check, Info, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import type { MediaItem } from '../../types/media';
import { useWatchlist } from '../../context/WatchlistContext';
import { useSound } from '../../context/SoundContext';
import { useLanguage } from '../../context/LanguageContext';
import { getSeriesStatus, formatGenre, getMediaTitle, getMediaPoster, getMediaBackdrop, formatMediaDuration, getMediaSynopsis } from '../../utils/formatters';
import { useAutoTranslateSynopsis } from '../../services/translator';
import { getAbsoluteWatchUrl } from '../../utils/navigation';

interface MovieCardProps {
  media: MediaItem;
  onPlay: (media: MediaItem) => void;
  onOpenDetails: (media: MediaItem) => void;
  progressPercent?: number;
  showSynopsis?: boolean;
  forceFullSynopsis?: boolean;
}

export const MovieCard: React.FC<MovieCardProps> = ({
  media,
  onPlay,
  onOpenDetails,
  progressPercent,
  showSynopsis = false,
  forceFullSynopsis = false,
}) => {
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const { playClick, playHover, playSuccess } = useSound();
  const { t, language } = useLanguage();
  const durationLabel = formatMediaDuration(media, language);

  const isBookmarked = isInWatchlist(media.id);

  const handleBookmarkToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const added = toggleWatchlist(media.id, media);
    if (added) {
      playSuccess();
    } else {
      playClick();
    }
  };

  const getTypeLabel = (type: MediaItem['type']) => {
    switch (type) {
      case 'movie': return t('badgeFilm');
      case 'series': return t('badgeSeries');
      case 'anime': return t('badgeAnime');
      case 'drama': return t('badgeDrama');
      default: return t('badgeFilm');
    }
  };

  const displayTitle = getMediaTitle(media, language);
  const displayPoster = getMediaPoster(media, language);

  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);
  const { synopsis: autoSynopsis } = useAutoTranslateSynopsis(
    showSynopsis ? media : null,
    language
  );
  const fallbackSynopsis = getMediaSynopsis(media, language);
  const displaySynopsis = autoSynopsis || fallbackSynopsis;

  const [imgSrc, setImgSrc] = useState(displayPoster);

  useEffect(() => {
    setImgSrc(displayPoster);
  }, [displayPoster]);

  const handleImageError = () => {
    const displayBackdrop = getMediaBackdrop(media, language);
    if (imgSrc !== displayBackdrop && displayBackdrop) {
      setImgSrc(displayBackdrop);
    }
  };

  return (
    <div
      role="article"
      tabIndex={0}
      onClick={(e) => {
        // If holding modifier key (Ctrl, Cmd, Shift), open in new tab
        if (e.ctrlKey || e.metaKey || e.shiftKey) {
          window.open(getAbsoluteWatchUrl(media.id), '_blank', 'noopener,noreferrer');
          return;
        }
        playClick();
        onOpenDetails(media);
      }}
      onAuxClick={(e) => {
        // Middle click (scroll-wheel click) opens in new tab
        if (e.button === 1) {
          e.preventDefault();
          window.open(getAbsoluteWatchUrl(media.id), '_blank', 'noopener,noreferrer');
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          playClick();
          onOpenDetails(media);
        }
      }}
      onMouseEnter={playHover}
      className="group relative flex flex-col h-full rounded-md sm:rounded-lg overflow-hidden cursor-pointer select-none transition-all duration-300 hover:scale-[1.04] hover:z-20 hover:shadow-2xl hover:shadow-black/95 border border-white/[0.08] hover:border-white/30 bg-[#181818] block no-underline text-inherit"
    >
      {/* Poster Image Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#1f1f1f]">
        <img
          src={imgSrc}
          alt={displayTitle}
          loading="lazy"
          onError={handleImageError}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 brightness-[0.9] group-hover:brightness-100"
        />

        {/* Cinematic Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

        {/* Top Badges - Ultra-slim single row */}
        <div className="absolute top-2 inset-x-2 flex items-center justify-between pointer-events-none">
          {/* Left: Single slim chip (ON GOING w/ Season, SERIES, ANIME, or HD) */}
          {(() => {
            const seriesStatus = getSeriesStatus(media);
            if (seriesStatus?.isOngoing) {
              // Show season indicator when we know the ongoing season
              const seasonLabel = seriesStatus.ongoingSeasonLabel
                || (seriesStatus.currentSeason ? `S${seriesStatus.currentSeason} ON GOING` : 'ON GOING');
              return (
                <span className="text-[8.5px] font-sans font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-md flex items-center gap-1 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span>{seasonLabel}</span>
                </span>
              );
            }
            if (seriesStatus?.completedSeasonsLabel) {
              return (
                <span className="text-[8.5px] font-sans font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md flex items-center gap-1 shadow-sm">
                  <span className="text-[9px] leading-none">✓</span>
                  <span>{seriesStatus.completedSeasonsLabel}</span>
                </span>
              );
            }
            if (media.type === 'series') {
              return (
                <span className="text-[8.5px] font-sans font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-black/70 text-slate-200 border border-white/15 backdrop-blur-md shadow-sm">
                  {getTypeLabel(media.type)}
                </span>
              );
            }
            if (media.type === 'anime') {
              return (
                <span className="text-[8.5px] font-sans font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30 backdrop-blur-md shadow-sm">
                  {getTypeLabel(media.type)}
                </span>
              );
            }
            if (media.quality) {
              return (
                <span className="text-[8.5px] font-mono tracking-wider font-semibold px-2 py-0.5 rounded border backdrop-blur-md shadow-sm bg-black/60 text-white border-white/20 uppercase">
                  HD
                </span>
              );
            }
            return (
              <span className="text-[8.5px] font-sans tracking-wider uppercase px-2 py-0.5 rounded bg-black/60 text-slate-300 border border-white/15 backdrop-blur-md shadow-sm">
                {getTypeLabel(media.type)}
              </span>
            );
          })()}

          {/* Right: Compact Rating Badge */}
          {media.rating > 0 && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md border border-white/10 text-[9.5px] font-semibold text-white shadow-sm">
              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
              <span>{media.rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Continue Watching Progress Line - Netflix Red */}
        {progressPercent !== undefined && progressPercent > 0 && (
          <div className="absolute bottom-0 inset-x-0 h-1 bg-white/25">
            <div
              className="h-full bg-[#E50914] shadow-glow-red"
              style={{ width: `${Math.min(100, progressPercent)}%` }}
            />
          </div>
        )}

        {/* Desktop-Only Hover Action Buttons - Netflix Style */}
        <div className="hidden md:flex absolute inset-0 items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60 backdrop-blur-[2px]">
          {/* Play Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              playClick();
              onPlay(media);
            }}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white text-black flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer"
            title={t('playTooltip')}
          >
            <Play className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5 fill-black" />
          </button>

          {/* Open in New Tab Button */}
          <a
            href={getAbsoluteWatchUrl(media.id)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.stopPropagation();
              playClick();
            }}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/60 border border-white/30 text-white hover:bg-white/20 hover:border-white flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-lg cursor-pointer no-underline"
            title={t('openInNewTabTooltip') || (language === 'en' ? 'Open in new tab' : 'Buka di tab baru')}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {/* Bookmark Button */}
          <button
            type="button"
            onClick={handleBookmarkToggle}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center border transition-all duration-200 hover:scale-110 cursor-pointer ${
              isBookmarked
                ? 'bg-[#E50914] border-[#E50914] text-white shadow-glow-red'
                : 'bg-black/60 border-white/30 text-white hover:border-white hover:bg-white/20'
            }`}
            title={isBookmarked ? t('removeWatchlistTooltip') : t('addWatchlistTooltip')}
          >
            {isBookmarked ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Plus className="w-3.5 h-3.5 stroke-[3]" />}
          </button>

          {/* Info Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              playClick();
              onOpenDetails(media);
            }}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/60 border border-white/30 text-white hover:border-white hover:bg-white/20 flex items-center justify-center transition-all duration-200 hover:scale-110 cursor-pointer"
            title={t('detailsTooltip')}
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile Quick Action Buttons (Compact, non-intrusive bottom-right controls on poster) */}
        <div className="md:hidden absolute bottom-2 right-2 z-10 flex items-center gap-1.5 pointer-events-auto">
          {/* Open in New Tab Button (Mobile) */}
          <a
            href={getAbsoluteWatchUrl(media.id)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.stopPropagation();
              playClick();
            }}
            className="w-7 h-7 rounded-full bg-black/60 border border-white/25 text-white/90 active:bg-white/20 flex items-center justify-center shadow-md backdrop-blur-md transition-all active:scale-90 no-underline cursor-pointer"
            title={t('openInNewTabTooltip') || (language === 'en' ? 'Open in new tab' : 'Buka di tab baru')}
          >
            <ExternalLink className="w-3 h-3" />
          </a>

          {/* Bookmark Button */}
          <button
            type="button"
            onClick={handleBookmarkToggle}
            className={`w-7 h-7 rounded-full flex items-center justify-center shadow-md backdrop-blur-md transition-all active:scale-90 ${
              isBookmarked
                ? 'bg-[#E50914] text-white shadow-glow-red'
                : 'bg-black/60 border border-white/25 text-white/90 active:bg-white/20'
            }`}
            title={isBookmarked ? t('removeWatchlistTooltip') : t('addWatchlistTooltip')}
          >
            {isBookmarked ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <Plus className="w-3.5 h-3.5 stroke-[2.5]" />}
          </button>

          {/* Play Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              playClick();
              onPlay(media);
            }}
            className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-lg active:scale-90 transition-transform cursor-pointer"
            title={t('playTooltip')}
          >
            <Play className="w-3.5 h-3.5 ml-0.5 fill-black text-black" />
          </button>
        </div>
      </div>

      {/* Info Title & Subtitle Footer */}
      <div className="p-3 sm:p-3.5 flex flex-col justify-between gap-1.5 flex-1 bg-[#181818]">
        <div className="flex items-start gap-2">
          <h4 className="font-sans font-bold text-white text-xs sm:text-sm line-clamp-2 group-hover:text-white transition-colors tracking-normal flex-1 leading-snug">
            <a
              href={getAbsoluteWatchUrl(media.id)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                // If normal left-click without modifier keys, trigger in-app details instead of navigating current tab
                if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                  e.preventDefault();
                  e.stopPropagation();
                  playClick();
                  onOpenDetails(media);
                }
              }}
              className="hover:underline text-inherit no-underline"
            >
              {displayTitle}
            </a>
          </h4>
        </div>

        <div className="flex items-center justify-between gap-2.5 min-w-0 text-[10.5px] text-slate-400 font-normal">
          <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
            <span className="shrink-0 text-white/90 font-medium">{media.year}</span>
            <span className="w-0.5 h-0.5 rounded-full bg-white/30 shrink-0" />
            <span className="truncate text-slate-300">{formatGenre(media.genres[0], language)}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {durationLabel ? (
              <span className="text-slate-300 font-mono text-[10px]">
                {durationLabel}
              </span>
            ) : null}
            {durationLabel ? (
              <span className="w-0.5 h-0.5 rounded-full bg-white/30" />
            ) : null}
            <span className="text-white/90 font-mono text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded border border-white/20 bg-white/5">
              HD
            </span>
          </div>
        </div>

        {showSynopsis && displaySynopsis ? (
          <div
            className="mt-1 border-t border-white/[0.05] pt-1.5 transition-all text-left"
            onClick={(e) => {
              // Allow clicking anywhere on the synopsis area to toggle full text
              e.preventDefault();
              e.stopPropagation();
              setIsSynopsisExpanded((prev) => !prev);
            }}
          >
            <p
              title={displaySynopsis}
              className={`text-[10px] sm:text-[10.5px] text-slate-300/90 font-light leading-relaxed select-text transition-all ${
                forceFullSynopsis || isSynopsisExpanded ? '' : 'line-clamp-3'
              }`}
            >
              {displaySynopsis}
              {displaySynopsis.length > 110 && !forceFullSynopsis && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsSynopsisExpanded((prev) => !prev);
                  }}
                  className="inline-flex items-center gap-0.5 text-brand-gold hover:text-brand-champagne font-medium ml-1.5 cursor-pointer underline decoration-brand-gold/40 hover:decoration-brand-gold transition-colors"
                >
                  <span>
                    {isSynopsisExpanded
                      ? (language === 'en' ? 'Show less' : 'Sembunyikan')
                      : (language === 'en' ? 'Read more' : 'Selengkapnya')}
                  </span>
                  {isSynopsisExpanded ? (
                    <ChevronUp className="w-2.5 h-2.5" />
                  ) : (
                    <ChevronDown className="w-2.5 h-2.5" />
                  )}
                </button>
              )}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
};
