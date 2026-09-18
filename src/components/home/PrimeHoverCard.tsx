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

interface PrimeHoverCardProps {
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

  // Determine grid column alignment for desktop (3 columns) and tablet/mobile (2 columns)
  // Index 0, 3 (col 0): align left
  // Index 1, 4 (col 1): align center
  // Index 2, 5 (col 2): align right
  const colIndex3 = index % 3;
  const colIndex2 = index % 2;

  // Clean up timers on unmount
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

    // Delay popover expansion slightly (280ms) to avoid jitter when skimming across cards
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);

      // Delay video trailer playback by ~850ms of stable hovering
      videoTimeoutRef.current = setTimeout(() => {
        setShowVideo(true);
      }, 850);
    }, 280);
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
      ageRating: '13+',
      genres: [language === 'en' ? item.genreEn : item.genreId],
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

  // Alignment classes for desktop (lg: 3 columns) and tablet/mobile (sm: 2 columns)
  const getDesktopAlignClass = () => {
    if (colIndex3 === 0) return 'lg:left-0 lg:origin-top-left';
    if (colIndex3 === 2) return 'lg:right-0 lg:origin-top-right';
    return 'lg:left-1/2 lg:-translate-x-1/2 lg:origin-top';
  };

  const getTabletAlignClass = () => {
    if (colIndex2 === 0) return 'left-0 origin-top-left';
    return 'right-0 origin-top-right';
  };

  return (
    <div
      className={`relative ${isHovered ? 'z-50' : 'z-10'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* ── BASE STATIC CARD (Grid Placeholder) ── */}
      <div
        onClick={() => onAction(item, 'details')}
        className="group relative aspect-video rounded-xl sm:rounded-2xl overflow-hidden bg-cinema-900 border border-white/[0.08] hover:border-white/30 shadow-lg sm:shadow-xl transition-all duration-300 cursor-pointer"
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

      {/* ── ELEVATED PRIME VIDEO-STYLE HOVER CARD (Desktop / Tablet) ── */}
      {isHovered && (
        <div
          className={`hidden sm:block absolute -top-3 sm:-top-5 z-50 w-[118%] sm:w-[124%] lg:w-[128%] min-w-[280px] max-w-[520px] rounded-2xl overflow-hidden bg-[#0c0f17] border border-white/20 shadow-[0_25px_60px_rgba(0,0,0,0.95)] animate-in fade-in zoom-in-95 duration-200 ${getTabletAlignClass()} ${getDesktopAlignClass()}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top 16:9 Media Preview Area */}
          <div className="relative aspect-video w-full overflow-hidden bg-black cursor-pointer" onClick={() => onAction(item, 'play')}>
            {/* Backdrop Image */}
            <img
              src={item.backdrop}
              alt={item.title}
              className={`w-full h-full object-cover object-center filter brightness-95 transition-opacity duration-700 ${
                showVideo && trailerKey ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
            />

            {/* Auto-playing Trailer (YouTube IFrame Embed) */}
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
                  className="w-full h-full object-cover scale-[1.35] pointer-events-none filter brightness-95"
                />
              </div>
            )}

            {/* Audio Mute/Unmute Toggle Button */}
            {showVideo && trailerKey && (
              <button
                type="button"
                onClick={toggleMute}
                className="absolute bottom-3 right-3 z-30 w-8 h-8 rounded-full bg-black/75 hover:bg-black text-white border border-white/25 backdrop-blur-md flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer pointer-events-auto"
                title={isMuted ? (language === 'en' ? 'Unmute' : 'Aktifkan Suara') : (language === 'en' ? 'Mute' : 'Bisukan')}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-slate-300" />
                ) : (
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                )}
              </button>
            )}

            {/* Top Badge: Type & Rating */}
            <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between pointer-events-none z-20">
              <span className="px-2 py-0.5 rounded bg-black/75 backdrop-blur-md border border-white/15 text-[10px] font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1">
                {item.type === 'movie' ? <Film className="w-2.5 h-2.5" /> : <Tv className="w-2.5 h-2.5" />}
                <span>{item.type === 'movie' ? 'Movie' : 'Series'}</span>
              </span>

              <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/75 backdrop-blur-md border border-white/15 text-[11px] font-bold text-amber-400">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>{item.rating.toFixed(1)}</span>
              </div>
            </div>

            {/* Bottom Gradient Fade */}
            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#0c0f17] to-transparent pointer-events-none" />
          </div>

          {/* Bottom Card Content (Prime Video Styling) */}
          <div className="p-3.5 sm:p-4 space-y-2.5">
            {/* Title */}
            <h4
              onClick={() => onAction(item, 'details')}
              className="text-sm sm:text-base font-bold text-white hover:text-amber-300 transition-colors cursor-pointer line-clamp-1 drop-shadow-sm"
            >
              {item.title}
            </h4>

            {/* Action Buttons Row */}
            <div className="flex items-center gap-2 pt-0.5">
              {/* Play Button */}
              <button
                type="button"
                onClick={() => onAction(item, 'play')}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white hover:bg-slate-200 text-black flex items-center justify-center font-bold shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                title={language === 'en' ? 'Play Now' : 'Putar Sekarang'}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                ) : (
                  <Play className="w-4 h-4 fill-black text-black ml-0.5" />
                )}
              </button>

              {/* Watchlist Toggle Button */}
              <button
                type="button"
                onClick={handleWatchlistToggle}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer ${
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
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : (
                  <Plus className="w-4 h-4 stroke-[3]" />
                )}
              </button>

              {/* Info / Details Button */}
              <button
                type="button"
                onClick={() => onAction(item, 'details')}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
                title={language === 'en' ? 'Details' : 'Detail'}
              >
                <Info className="w-4 h-4" />
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
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer no-underline ml-auto"
                title={language === 'en' ? 'Open in new tab' : 'Buka di tab baru'}
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Trending Category Line (Prime Video signature green indicator) */}
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="line-clamp-1">
                #{index + 1} {language === 'en' ? `in ${genreName}` : `di ${genreName}`}
              </span>
            </div>

            {/* Metadata Pills Row (MOST LIKED, Age, Quality, Year, Rating) */}
            <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-[11px] font-semibold text-slate-300">
              <span className="px-1.5 py-0.5 rounded border border-white/40 text-[9px] font-bold text-white tracking-wider uppercase">
                MOST LIKED
              </span>
              <span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-[9px] font-bold text-slate-300">
                16+
              </span>
              <span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-[9px] font-mono font-bold text-slate-300">
                1080p FHD
              </span>
              <span>{item.year}</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300">{displayGenre}</span>
            </div>

            {/* 2-3 Line Synopsis */}
            <p className="text-[11px] sm:text-xs text-slate-300/90 line-clamp-2 sm:line-clamp-3 leading-relaxed font-light">
              {displaySynopsis}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
