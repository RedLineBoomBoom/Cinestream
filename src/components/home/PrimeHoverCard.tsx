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
  X,
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

export interface PrimeShowcaseGridProps {
  items: ShowcaseMediaDef[];
  genreName: string;
  loadingMediaId: string | number | null;
  onAction: (item: ShowcaseMediaDef, action: 'play' | 'details') => void;
}

// Module-level cache for trailer keys to avoid redundant network roundtrips
const trailerCache = new Map<number, string | null>();

export const PrimeShowcaseGrid: React.FC<PrimeShowcaseGridProps> = ({
  items,
  genreName,
  loadingMediaId,
  onAction,
}) => {
  const { language } = useLanguage();
  const { playHover, playClick, playSuccess } = useSound();
  const { isInWatchlist, toggleWatchlist } = useWatchlist();

  // Active item shown in the centered grand popover
  const [activeItem, setActiveItem] = useState<{
    item: ShowcaseMediaDef;
    index: number;
  } | null>(null);

  const [showVideo, setShowVideo] = useState(false);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);

  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const leaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const videoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
      if (videoTimerRef.current) clearTimeout(videoTimerRef.current);
    };
  }, []);

  // When activeItem changes, trigger trailer prefetch & delayed autoplay
  useEffect(() => {
    if (videoTimerRef.current) clearTimeout(videoTimerRef.current);
    setShowVideo(false);
    setIsMuted(true);

    if (!activeItem) {
      setTrailerKey(null);
      return;
    }

    const { item } = activeItem;

    // Prefetch or retrieve trailer key
    if (trailerCache.has(item.tmdbId)) {
      setTrailerKey(trailerCache.get(item.tmdbId) || null);
    } else {
      fetchTrailerForMedia(item.tmdbId, item.type, item.title)
        .then((res) => {
          const key = res?.key || null;
          trailerCache.set(item.tmdbId, key);
          setTrailerKey(key);
        })
        .catch(() => {
          trailerCache.set(item.tmdbId, null);
        });
    }

    // Delayed trailer autoplay: start after 700ms of stable focus
    videoTimerRef.current = setTimeout(() => {
      setShowVideo(true);
    }, 700);

    return () => {
      if (videoTimerRef.current) clearTimeout(videoTimerRef.current);
    };
  }, [activeItem?.item.id]);

  // Card hover handlers
  const handleCardMouseEnter = (item: ShowcaseMediaDef, index: number) => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }

    playHover();

    // If a popover is already open, immediately switch to the new card
    if (activeItem) {
      setActiveItem({ item, index });
      return;
    }

    // If popover is not yet open, open after slight delay (200ms) to avoid accidental skim triggers
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setActiveItem({ item, index });
    }, 200);
  };

  const handleCardMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }

    // Start graceful leave timer: allows moving mouse into the centered popover without flickering
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    leaveTimerRef.current = setTimeout(() => {
      setActiveItem(null);
    }, 350);
  };

  // Popover hover handlers
  const handlePopoverMouseEnter = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  };

  const handlePopoverMouseLeave = () => {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    leaveTimerRef.current = setTimeout(() => {
      setActiveItem(null);
    }, 300);
  };

  const handleClosePopover = () => {
    playClick();
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    if (videoTimerRef.current) clearTimeout(videoTimerRef.current);
    setActiveItem(null);
    setShowVideo(false);
  };

  // Mute toggle handler
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

  // Watchlist toggle handler
  const handleWatchlistToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeItem) return;
    const { item } = activeItem;

    const isMovie = item.type === 'movie';
    const displayGenre = language === 'en' ? item.genreEn : item.genreId;
    const displaySynopsis = language === 'en' ? item.synopsisEn : item.synopsisId;

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

  const isBookmarked = activeItem
    ? isInWatchlist(String(activeItem.item.id || activeItem.item.tmdbId))
    : false;

  const activeGenreName = activeItem
    ? language === 'en'
      ? activeItem.item.genreEn
      : activeItem.item.genreId
    : '';

  const activeSynopsis = activeItem
    ? language === 'en'
      ? activeItem.item.synopsisEn
      : activeItem.item.synopsisId
    : '';

  return (
    <div className="relative">
      {/* ── 6 LANDSCAPE / BACKDROP GRID CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 lg:gap-5">
        {items.map((item, index) => {
          const isLoading = loadingMediaId === item.id;
          const displayGenre = language === 'en' ? item.genreEn : item.genreId;
          const displaySynopsis = language === 'en' ? item.synopsisEn : item.synopsisId;
          const isCurrentActive = activeItem?.item.id === item.id;

          return (
            <div
              key={item.id}
              onClick={() => onAction(item, 'details')}
              onMouseEnter={() => handleCardMouseEnter(item, index)}
              onMouseLeave={handleCardMouseLeave}
              className={`group relative aspect-video rounded-xl sm:rounded-2xl overflow-hidden bg-cinema-900 border transition-all duration-300 cursor-pointer shadow-lg sm:shadow-xl ${
                isCurrentActive
                  ? 'border-white/50 ring-2 ring-white/30 scale-[1.01]'
                  : 'border-white/[0.08] hover:border-white/30 hover:-translate-y-0.5'
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

              {/* Gradient Vignette Overlay */}
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

              {/* Bottom Content: Title, Metadata, Synopsis */}
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

              {/* Mobile / Tablet Quick-Play Button */}
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
          );
        })}
      </div>

      {/* ── AMBIENT SOFT BACKDROP DIM OVERLAY WHEN POPOVER IS ACTIVE ── */}
      {activeItem && (
        <div
          onClick={handleClosePopover}
          className="hidden sm:block absolute -inset-4 bg-black/45 backdrop-blur-[2px] rounded-3xl z-40 transition-opacity duration-300 animate-in fade-in"
        />
      )}

      {/* ── GRAND CENTERED FLOATING PRIME VIDEO POPOVER ── */}
      {activeItem && (
        <div
          onMouseEnter={handlePopoverMouseEnter}
          onMouseLeave={handlePopoverMouseLeave}
          onClick={(e) => e.stopPropagation()}
          className="hidden sm:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[92vw] sm:w-[580px] md:w-[660px] lg:w-[740px] max-w-[760px] rounded-2xl sm:rounded-3xl overflow-hidden bg-[#0c0f17] border border-white/25 shadow-[0_30px_90px_rgba(0,0,0,0.98)] ring-1 ring-white/15 animate-in fade-in zoom-in-95 duration-200 select-none"
        >
          {/* Top 16:9 Media Preview Area */}
          <div
            className="relative aspect-video w-full overflow-hidden bg-black cursor-pointer"
            onClick={() => onAction(activeItem.item, 'play')}
          >
            {/* Backdrop Image */}
            <img
              src={activeItem.item.backdrop}
              alt={activeItem.item.title}
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
                  title={`${activeItem.item.title} Official Trailer`}
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

            {/* Top-Left Badge: Type & Rating */}
            <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex items-center gap-2 pointer-events-none z-20">
              <span className="px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md border border-white/20 text-[11px] font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                {activeItem.item.type === 'movie' ? (
                  <Film className="w-3 h-3 text-amber-400" />
                ) : (
                  <Tv className="w-3 h-3 text-sky-400" />
                )}
                <span>{activeItem.item.type === 'movie' ? 'Movie' : 'Series'}</span>
              </span>

              <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md border border-white/20 text-[11px] font-bold text-amber-400 shadow-md">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{activeItem.item.rating.toFixed(1)}</span>
              </div>
            </div>

            {/* Top-Right Dismiss Button (✕) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClosePopover();
              }}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 w-8 h-8 rounded-full bg-black/80 hover:bg-black text-white border border-white/25 backdrop-blur-md flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer pointer-events-auto"
              title={language === 'en' ? 'Close Preview' : 'Tutup Pratinjau'}
            >
              <X className="w-4 h-4 text-slate-300 hover:text-white" />
            </button>

            {/* Bottom-Right Audio Mute/Unmute Toggle Button */}
            {showVideo && trailerKey && (
              <button
                type="button"
                onClick={toggleMute}
                className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-30 w-9 h-9 rounded-full bg-black/80 hover:bg-black text-white border border-white/25 backdrop-blur-md flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer pointer-events-auto"
                title={isMuted ? (language === 'en' ? 'Unmute' : 'Aktifkan Suara') : (language === 'en' ? 'Mute' : 'Bisukan')}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-slate-300" />
                ) : (
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                )}
              </button>
            )}

            {/* Bottom Gradient Fade */}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0c0f17] via-[#0c0f17]/60 to-transparent pointer-events-none" />
          </div>

          {/* Bottom Card Content (Prime Video Styling - Large & Spacious) */}
          <div className="p-4 sm:p-5 lg:p-6 space-y-3 sm:space-y-3.5">
            {/* Title */}
            <h3
              onClick={() => onAction(activeItem.item, 'details')}
              className="text-lg sm:text-xl lg:text-2xl font-bold text-white hover:text-amber-300 transition-colors cursor-pointer line-clamp-1 drop-shadow-sm tracking-wide"
            >
              {activeItem.item.title}
            </h3>

            {/* Action Buttons Row */}
            <div className="flex items-center gap-3 pt-0.5">
              {/* Play Button */}
              <button
                type="button"
                onClick={() => onAction(activeItem.item, 'play')}
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white hover:bg-slate-200 text-black flex items-center justify-center font-bold shadow-xl transition-transform hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                title={language === 'en' ? 'Play Now' : 'Putar Sekarang'}
              >
                {loadingMediaId === activeItem.item.id ? (
                  <Loader2 className="w-5 h-5 animate-spin text-black" />
                ) : (
                  <Play className="w-5 h-5 fill-black text-black ml-0.5" />
                )}
              </button>

              {/* Watchlist Toggle Button */}
              <button
                type="button"
                onClick={handleWatchlistToggle}
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full border flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0 ${
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
                  <Check className="w-5 h-5 stroke-[3] text-white" />
                ) : (
                  <Plus className="w-5 h-5 stroke-[3] text-white" />
                )}
              </button>

              {/* Info / Details Button */}
              <button
                type="button"
                onClick={() => onAction(activeItem.item, 'details')}
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                title={language === 'en' ? 'Details' : 'Detail'}
              >
                <Info className="w-5 h-5" />
              </button>

              {/* External Link */}
              <a
                href={getAbsoluteWatchUrl(String(activeItem.item.id || activeItem.item.tmdbId))}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                  playClick();
                }}
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer no-underline ml-auto shrink-0"
                title={language === 'en' ? 'Open in new tab' : 'Buka di tab baru'}
              >
                <ExternalLink className="w-5 h-5" />
              </a>
            </div>

            {/* Trending Category Line (Prime Video Signature Green) */}
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-400">
              <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="line-clamp-1">
                #{activeItem.index + 1} {language === 'en' ? `in ${genreName}` : `dalam ${genreName}`}
              </span>
            </div>

            {/* Metadata Pills Row (MOST LIKED, Age, Quality, Year, Rating) */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-300">
              <span className="px-2 py-0.5 rounded border border-white/40 text-[10px] sm:text-[11px] font-bold text-white tracking-wider uppercase">
                MOST LIKED
              </span>
              <span className="px-2 py-0.5 rounded bg-white/10 border border-white/20 text-[10px] sm:text-[11px] font-bold text-slate-300">
                16+
              </span>
              <span className="px-2 py-0.5 rounded bg-white/10 border border-white/20 text-[10px] sm:text-[11px] font-mono font-bold text-slate-300">
                1080p FHD
              </span>
              <span>{activeItem.item.year}</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300">{activeGenreName}</span>
            </div>

            {/* 2-3 Line Full Readable Synopsis */}
            <p className="text-xs sm:text-sm text-slate-300/95 line-clamp-3 leading-relaxed font-light">
              {activeSynopsis}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// Backwards-compatible export
export const PrimeHoverCard = PrimeShowcaseGrid;
