import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Info,
  ExternalLink,
  Star,
  Plus,
  Check,
  Volume2,
  VolumeX,
  TrendingUp,
  Film,
  Tv,
  Loader2,
} from 'lucide-react';
import type { MediaItem } from '../../types/media';
import { useWatchlist } from '../../context/WatchlistContext';
import { useSound } from '../../context/SoundContext';
import { useLanguage } from '../../context/LanguageContext';
import { getAbsoluteWatchUrl } from '../../utils/navigation';
import { fetchTrailerForMedia } from '../../services/tmdb';
import { createMovieServers, createTvServers } from '../../data/mockCatalog';

export interface ShowcaseMediaDef {
  id: number | string;
  tmdbId: number;
  type: 'movie' | 'tv';
  title: string;
  poster: string;
  backdrop: string;
  year: number;
  rating: number;
  genreEn: string;
  genreId: string;
  taglineEn?: string;
  taglineId?: string;
  synopsisEn: string;
  synopsisId: string;
  logoArt?: string;
}

export interface PrimeHoverCardProps {
  item: ShowcaseMediaDef;
  index: number;
  genreName: string;
  isLoading: boolean;
  onAction: (item: ShowcaseMediaDef, action: 'play' | 'details') => void;
}

// Module-level cache for trailer keys to avoid redundant network roundtrips
const trailerCache = new Map<number, string | null>();

export const PrimeHoverCard: React.FC<PrimeHoverCardProps> = ({
  item,
  index,
  genreName,
  isLoading,
  onAction,
}) => {
  const { language } = useLanguage();
  const { playHover, playClick, playSuccess } = useSound();
  const { isInWatchlist, toggleWatchlist } = useWatchlist();

  const [isHovered, setIsHovered] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [trailerKey, setTrailerKey] = useState<string | null>(() => {
    return trailerCache.get(item.tmdbId) ?? null;
  });
  const [isMuted, setIsMuted] = useState(true);

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const videoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const displayGenre = language === 'en' ? item.genreEn : item.genreId;
  const displaySynopsis = language === 'en' ? item.synopsisEn : item.synopsisId;
  const isBookmarked = isInWatchlist(String(item.id || item.tmdbId));

  // Desktop 3-column layout (lg):
  // colIndex3 === 0 (left edge): shift inward toward center (left-0, origin-left)
  // colIndex3 === 1 (center): perfectly centered (left-1/2, origin-center)
  // colIndex3 === 2 (right edge): shift inward toward center (right-0, origin-right)
  const colIndex3 = index % 3;
  // Tablet 2-column layout (sm):
  const colIndex2 = index % 2;

  const getEdgePositionClasses = () => {
    const smPos =
      colIndex2 === 0
        ? 'sm:left-0 sm:right-auto sm:translate-x-0 sm:origin-left'
        : 'sm:left-auto sm:right-0 sm:translate-x-0 sm:origin-right';

    let lgPos = '';
    if (colIndex3 === 0) {
      lgPos = 'lg:left-0 lg:right-auto lg:translate-x-0 lg:origin-left';
    } else if (colIndex3 === 2) {
      lgPos = 'lg:left-auto lg:right-0 lg:translate-x-0 lg:origin-right';
    } else {
      lgPos = 'lg:left-1/2 lg:right-auto lg:-translate-x-1/2 lg:origin-center';
    }

    return `left-1/2 -translate-x-1/2 origin-center ${smPos} ${lgPos}`;
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (videoTimeoutRef.current) clearTimeout(videoTimeoutRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    playHover();

    // Start trailer prefetch immediately if not in cache
    if (!trailerCache.has(item.tmdbId)) {
      fetchTrailerForMedia(item.tmdbId, item.type, item.title)
        .then((res) => {
          const key = res?.key || null;
          trailerCache.set(item.tmdbId, key);
          setTrailerKey(key);
        })
        .catch(() => {
          trailerCache.set(item.tmdbId, null);
        });
    } else {
      setTrailerKey(trailerCache.get(item.tmdbId) || null);
    }

    // Smooth hover trigger with short delay (200ms) to ignore fast skimming
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);

      // Delayed trailer autoplay: start after 700ms of stable hovering
      videoTimeoutRef.current = setTimeout(() => {
        setShowVideo(true);
      }, 700);
    }, 200);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (videoTimeoutRef.current) clearTimeout(videoTimeoutRef.current);

    setIsHovered(false);
    setShowVideo(false);
    setIsMuted(true);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    playClick();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    try {
      const win = iframeRef.current?.contentWindow;
      if (win) {
        win.postMessage(
          JSON.stringify({
            event: 'command',
            func: nextMuted ? 'mute' : 'unMute',
            args: [],
          }),
          '*'
        );
        if (!nextMuted) {
          win.postMessage(
            JSON.stringify({
              event: 'command',
              func: 'setVolume',
              args: [100],
            }),
            '*'
          );
        }
      }
    } catch {}
  };

  const handleWatchlistToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const isMovie = item.type === 'movie';
    const syntheticMedia: MediaItem = {
      id: String(item.id || item.tmdbId),
      tmdbId: item.tmdbId,
      title: item.title,
      type: isMovie ? 'movie' : 'series',
      poster: item.poster,
      backdrop: item.backdrop,
      rating: item.rating,
      year: item.year,
      releaseDate: String(item.year),
      duration: isMovie ? '120 min' : '45 min',
      quality: '1080p FHD',
      ageRating: '17+',
      genres: [displayGenre],
      country: 'United States',
      director: 'Warner Bros / HBO Discovery',
      cast: [],
      audioTracks: ['English (Original)', 'Indonesian'],
      subtitles: ['Indonesia', 'English'],
      synopsis: displaySynopsis,
      synopsisEn: item.synopsisEn,
      synopsisId: item.synopsisId,
      servers: isMovie
        ? createMovieServers(item.tmdbId)
        : createTvServers(item.tmdbId, 1, 1),
    };

    const added = toggleWatchlist(String(item.id || item.tmdbId), syntheticMedia);
    if (added) playSuccess();
    else playClick();
  };

  return (
    <div
      className={`relative ${isHovered ? 'z-50' : 'z-10'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* ── BASE STATIC CARD (Grid Item) ── */}
      <div
        onClick={() => onAction(item, 'details')}
        className={`group relative aspect-video rounded-xl sm:rounded-2xl overflow-hidden bg-cinema-900 border transition-all duration-300 cursor-pointer shadow-lg sm:shadow-xl ${
          isHovered
            ? 'border-white/40 ring-1 ring-white/20'
            : 'border-white/[0.08] hover:border-white/30'
        }`}
      >
        {/* Backdrop Image */}
        <img
          src={item.backdrop}
          alt={item.title}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = item.poster;
          }}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 filter brightness-90 group-hover:brightness-100"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90 group-hover:opacity-80 transition-opacity" />

        {/* Top Badges: Type & Rating */}
        <div className="absolute top-2 left-2 right-2 sm:top-3 sm:left-3 sm:right-3 flex items-center justify-between pointer-events-none z-10">
          <span className="px-1.5 sm:px-2 py-0.5 rounded bg-black/70 backdrop-blur-md border border-white/10 text-[9px] sm:text-[10px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1">
            {item.type === 'movie' ? <Film className="w-2.5 h-2.5" /> : <Tv className="w-2.5 h-2.5" />}
            <span>{item.type === 'movie' ? 'Movie' : 'Series'}</span>
          </span>

          <div className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded bg-black/70 backdrop-blur-md border border-white/10 text-[9px] sm:text-[11px] font-bold text-amber-400">
            <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-amber-400 text-amber-400" />
            <span>{item.rating.toFixed(1)}</span>
          </div>
        </div>

        {/* Bottom Content: Title & Metadata */}
        <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-3 sm:right-3 z-10 space-y-0.5 sm:space-y-1 pr-7 sm:pr-0">
          <h3 className="text-xs sm:text-sm lg:text-base font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-1 drop-shadow-md">
            {item.title}
          </h3>
          <div className="flex items-center gap-1.5 text-[9px] sm:text-[11px] text-amber-300/90 font-medium">
            <span>{item.year}</span>
            <span>•</span>
            <span className="line-clamp-1 text-slate-300 font-normal">{displayGenre}</span>
          </div>
          <p className="hidden xs:line-clamp-2 text-[10px] sm:text-[11px] text-slate-300/90 font-light leading-relaxed">
            {displaySynopsis}
          </p>
        </div>

        {/* Mobile Quick-Play Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAction(item, 'play');
          }}
          className="md:hidden absolute bottom-2 right-2 z-20 w-7 h-7 rounded-full bg-[#E50914] text-white flex items-center justify-center shadow-md active:scale-90 transition-transform"
          aria-label="Play Now"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
          )}
        </button>
      </div>

      {/* ── SMOOTH FLOATING WIDESCREEN LANDSCAPE HOVER CARD ── */}
      {/* Kept in DOM with hardware-accelerated cubic-bezier transitions for silky smooth enter & exit */}
      <div
        className={`hidden sm:block absolute top-1/2 -translate-y-1/2 z-50 w-[124%] sm:w-[130%] lg:w-[134%] aspect-[16/10.5] rounded-2xl overflow-hidden bg-[#0c0f17] border border-white/25 shadow-[0_25px_65px_rgba(0,0,0,0.96)] ring-1 ring-white/15 select-none transition-all duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] ${getEdgePositionClasses()} ${
          isHovered
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-95 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Full-Bleed 16:9 Media Area */}
        <div
          className="relative w-full h-full overflow-hidden bg-black cursor-pointer"
          onClick={() => onAction(item, 'play')}
        >
          {/* Backdrop Image */}
          <img
            src={item.backdrop}
            alt={item.title}
            className={`w-full h-full object-cover object-center filter brightness-95 transition-opacity duration-700 ${
              showVideo && trailerKey ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          />

          {/* Auto-playing Trailer (YouTube IFrame Embed with Zero UI Overlay) */}
          {showVideo && trailerKey && (
            <div className="absolute inset-0 bg-black pointer-events-none overflow-hidden animate-in fade-in duration-500">
              <iframe
                ref={iframeRef}
                src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&iv_load_policy=3&disablekb=1&loop=1&playlist=${trailerKey}${
                  typeof window !== 'undefined' && window.location.origin
                    ? `&origin=${encodeURIComponent(window.location.origin)}`
                    : ''
                }`}
                title={`${item.title} Trailer`}
                allow="autoplay; encrypted-media"
                onLoad={() => {
                  try {
                    iframeRef.current?.contentWindow?.postMessage(
                      JSON.stringify({ event: 'listening' }),
                      '*'
                    );
                  } catch {}
                }}
                className="absolute -top-[14%] -bottom-[14%] -left-[10%] -right-[10%] w-[120%] h-[128%] pointer-events-none filter brightness-95"
              />
            </div>
          )}

          {/* Top Bar: Type (Left) & Controls/Rating (Right) */}
          <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between pointer-events-none z-20">
            <span className="px-2 py-0.5 rounded bg-black/80 backdrop-blur-md border border-white/20 text-[10px] font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1 shadow-md">
              {item.type === 'movie' ? (
                <Film className="w-2.5 h-2.5 text-amber-400" />
              ) : (
                <Tv className="w-2.5 h-2.5 text-sky-400" />
              )}
              <span>{item.type === 'movie' ? 'Movie' : 'Series'}</span>
            </span>

            {/* Right Group: Mute Button & Rating Badge Side-by-Side */}
            <div className="flex items-center gap-2 pointer-events-auto">
              {/* Audio Mute/Unmute Toggle Button */}
              {showVideo && trailerKey && (
                <button
                  type="button"
                  onClick={toggleMute}
                  className="w-7 h-7 rounded-full bg-black/80 hover:bg-black text-white border border-white/25 backdrop-blur-md flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                  title={isMuted ? (language === 'en' ? 'Unmute' : 'Aktifkan Suara') : (language === 'en' ? 'Mute' : 'Bisukan')}
                >
                  {isMuted ? (
                    <VolumeX className="w-3.5 h-3.5 text-slate-300" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </button>
              )}

              {/* Star Rating Badge */}
              <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md border border-white/20 text-[11px] font-bold text-amber-400 shadow-md">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>{item.rating.toFixed(1)}</span>
              </div>
            </div>
          </div>

          {/* Compact bottom gradient - covers only lower ~38% so trailer stays bright, clear & unobstructed */}
          <div className="absolute inset-x-0 bottom-0 h-[38%] sm:h-[40%] bg-gradient-to-t from-[#0c0f17] from-10% via-[#0c0f17]/85 to-transparent pointer-events-none" />

          {/* Bottom Content Area: Cleanly Arranged in Widescreen Landscape */}
          <div className="absolute bottom-0 inset-x-0 p-3 sm:p-3.5 z-20 space-y-1.5 sm:space-y-2">
            {/* Row 1: Title & Trending Green Badge */}
            <div className="flex items-center justify-between gap-2">
              <h4
                onClick={(e) => {
                  e.stopPropagation();
                  onAction(item, 'details');
                }}
                className="text-sm sm:text-base font-bold text-white hover:text-amber-300 transition-colors cursor-pointer line-clamp-1 drop-shadow-md"
              >
                {item.title}
              </h4>

              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 shrink-0">
                <TrendingUp className="w-3 h-3 text-emerald-400" />
                <span className="line-clamp-1">
                  #{index + 1} {genreName}
                </span>
              </div>
            </div>

            {/* Row 2: Action Buttons & Metadata Pills */}
            <div className="flex items-center justify-between gap-2">
              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Play Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction(item, 'play');
                  }}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white hover:bg-slate-200 text-black flex items-center justify-center font-bold shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                  title={language === 'en' ? 'Play Now' : 'Putar Sekarang'}
                >
                  {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-black text-black ml-0.5" />
                  )}
                </button>

                {/* Watchlist Toggle Button */}
                <button
                  type="button"
                  onClick={handleWatchlistToggle}
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0 ${
                    isBookmarked
                      ? 'bg-[#E50914] border-[#E50914] text-white shadow-glow-red'
                      : 'bg-white/10 hover:bg-white/20 border-white/25 text-white'
                  }`}
                  title={
                    isBookmarked
                      ? language === 'en'
                        ? 'Remove from Watchlist'
                        : 'Hapus dari Daftar Pantau'
                      : language === 'en'
                      ? 'Add to Watchlist'
                      : 'Tambah ke Daftar Pantau'
                  }
                >
                  {isBookmarked ? (
                    <Check className="w-3.5 h-3.5 stroke-[3] text-white" />
                  ) : (
                    <Plus className="w-3.5 h-3.5 stroke-[3] text-white" />
                  )}
                </button>

                {/* Details Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction(item, 'details');
                  }}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                  title={language === 'en' ? 'Details' : 'Detail'}
                >
                  <Info className="w-3.5 h-3.5" />
                </button>

                {/* External Link */}
                <a
                  href={getAbsoluteWatchUrl(String(item.id || item.tmdbId))}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.stopPropagation();
                    playClick();
                  }}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer no-underline shrink-0"
                  title={language === 'en' ? 'Open in new tab' : 'Buka di tab baru'}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Metadata Pills */}
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-300">
                <span className="px-1.5 py-0.5 rounded border border-white/40 text-[8.5px] font-bold text-white tracking-wider uppercase">
                  MOST LIKED
                </span>
                <span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-[8.5px] font-bold text-slate-300">
                  16+
                </span>
                <span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-[8.5px] font-mono font-bold text-slate-300">
                  FHD
                </span>
                <span>{item.year}</span>
              </div>
            </div>

            {/* Row 3: 1-2 Line Readable Synopsis */}
            <p className="text-[11px] sm:text-xs text-slate-300/90 line-clamp-1 sm:line-clamp-2 leading-relaxed font-light">
              {displaySynopsis}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
