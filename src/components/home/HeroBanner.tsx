import React, { useState, useEffect, useRef } from 'react';
import { Play, Info, Plus, Check, ExternalLink, Volume2, VolumeX } from 'lucide-react';
import type { MediaItem } from '../../types/media';
import { useWatchlist } from '../../context/WatchlistContext';
import { useSound } from '../../context/SoundContext';
import { useLanguage } from '../../context/LanguageContext';
import { fetchLogoForMedia, fetchTrailerForMedia } from '../../services/tmdb';
import { useAutoTranslateSynopsis } from '../../services/translator';
import { formatGenre, getMediaTitle, getMediaBackdrop } from '../../utils/formatters';
import { getMediaWatchUrl, getAbsoluteWatchUrl } from '../../utils/navigation';

interface HeroBannerProps {
  featuredItems: MediaItem[];
  onPlay: (media: MediaItem) => void;
  onOpenDetails: (media: MediaItem) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  featuredItems,
  onPlay,
  onOpenDetails,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const { playClick, playHover, playSuccess, playWhoosh } = useSound();
  const { t, language } = useLanguage();

  const currentMedia = featuredItems[currentIndex] || featuredItems[0];
  const displayTitle = getMediaTitle(currentMedia, language);
  // Keep banner backdrop image fixed and stable across language toggles
  const displayBackdrop = currentMedia?.backdrop || currentMedia?.backdropEn || currentMedia?.backdropId || getMediaBackdrop(currentMedia);
  const isBookmarked = currentMedia ? isInWatchlist(currentMedia.id) : false;
  const { synopsis: autoHeroSynopsis } = useAutoTranslateSynopsis(currentMedia, language);

  const [mediaLogo, setMediaLogo] = useState<string | undefined>(currentMedia?.logoUrl);

  // YouTube Trailer State (Auto-plays after viewing photo for a few moments)
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isBannerInView, setIsBannerInView] = useState(true);
  const bannerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Helper to immediately terminate YouTube video playback and buffer downloads
  const stopTrailerPlayback = () => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: 'stopVideo', args: [] }),
        '*'
      );
    } catch {}
    setShowTrailer(false);
  };

  // Toggle trailer mute state seamlessly via postMessage
  const toggleTrailerMute = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playClick();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    try {
      const targetWin = iframeRef.current?.contentWindow;
      if (targetWin) {
        if (nextMuted) {
          targetWin.postMessage(
            JSON.stringify({
              event: 'command',
              func: 'mute',
              args: [],
            }),
            '*'
          );
        } else {
          targetWin.postMessage(
            JSON.stringify({
              event: 'command',
              func: 'unMute',
              args: [],
            }),
            '*'
          );
          targetWin.postMessage(
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

  // Touch swipe support for mobile hero banner switching
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > 45;
    const isRightSwipe = distance < -45;

    if (isLeftSwipe && featuredItems.length > 1) {
      playClick();
      stopTrailerPlayback();
      setCurrentIndex((prev) => (prev + 1) % featuredItems.length);
    } else if (isRightSwipe && featuredItems.length > 1) {
      playClick();
      stopTrailerPlayback();
      setCurrentIndex((prev) => (prev - 1 + featuredItems.length) % featuredItems.length);
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Stop trailer and cut bandwidth immediately when user scrolls away from the banner
  useEffect(() => {
    const el = bannerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const inView = entry.isIntersecting && entry.intersectionRatio >= 0.25;
        setIsBannerInView(inView);
        if (!inView) {
          stopTrailerPlayback();
        }
      },
      { threshold: [0, 0.25, 0.5] }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Stop trailer and cut bandwidth when browser tab is hidden or minimized
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopTrailerPlayback();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Fetch official YouTube trailer key whenever the current hero item changes
  useEffect(() => {
    let isMounted = true;
    setShowTrailer(false);
    setTrailerKey(null);
    setIsMuted(true);

    if (currentMedia?.trailerYoutubeKey) {
      setTrailerKey(currentMedia.trailerYoutubeKey);
    } else if (currentMedia?.tmdbId) {
      fetchTrailerForMedia(currentMedia.tmdbId, currentMedia.type, currentMedia.title).then((tr) => {
        if (isMounted && tr?.key) {
          setTrailerKey(tr.key);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [currentMedia?.id, currentMedia?.tmdbId, currentMedia?.type, currentMedia?.title, currentMedia?.trailerYoutubeKey]);

  // Auto-play trailer after viewing the photo for 3.5 seconds, only if banner is actively in viewport & trailer exists
  useEffect(() => {
    if (!isBannerInView || !trailerKey) {
      setShowTrailer(false);
      return;
    }

    const timer = setTimeout(() => {
      setShowTrailer(true);
    }, 3500);

    return () => {
      clearTimeout(timer);
    };
  }, [currentMedia?.id, isBannerInView, trailerKey]);

  // Listen to YouTube player state: let trailer play until the end, then advance to next banner highlight
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (typeof event.origin === 'string' && !event.origin.includes('youtube')) return;

      try {
        let data = event.data;
        if (typeof data === 'string') {
          if (data.startsWith('{') && data.endsWith('}')) {
            data = JSON.parse(data);
          } else {
            return;
          }
        }

        if (!data || typeof data !== 'object') return;

        // YouTube IFrame API reports ended state via:
        // 1. data.event === 'onStateChange' with data.info === 0 (0 = YT.PlayerState.ENDED)
        // 2. data.event === 'infoDelivery' with data.info?.playerState === 0
        const isEnded =
          (data.event === 'onStateChange' && (data.info === 0 || data.info?.playerState === 0)) ||
          (data.event === 'infoDelivery' && data.info?.playerState === 0);

        // Also check if current play time reached near end of duration
        const isNearEnd =
          data.info &&
          typeof data.info.currentTime === 'number' &&
          typeof data.info.duration === 'number' &&
          data.info.duration > 0 &&
          data.info.currentTime >= data.info.duration - 0.5;

        if (isEnded || isNearEnd) {
          // Trailer reached the very end! Advance smoothly to next banner
          setShowTrailer(false);
          setIsMuted(true);
          setCurrentIndex((prev) => (prev + 1) % featuredItems.length);
        }
      } catch {
        // Ignore non-json or unrelated messages
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [featuredItems.length]);

  useEffect(() => {
    let isMounted = true;
    if (currentMedia?.logoUrl) {
      setMediaLogo(currentMedia.logoUrl);
    } else if (currentMedia?.tmdbId) {
      fetchLogoForMedia(currentMedia.tmdbId, currentMedia.type).then((logo) => {
        if (isMounted && logo) {
          setMediaLogo(logo);
        }
      });
    } else {
      setMediaLogo(undefined);
    }
    return () => {
      isMounted = false;
    };
  }, [currentMedia?.id, currentMedia?.logoUrl, currentMedia?.tmdbId, currentMedia?.type]);

  // Carousel slide timer:
  // - If trailer is actively playing, DO NOT auto-advance on timer; let it play until it ends!
  // - If trailer is not playing (e.g. photo only, or no trailer available), advance every 12 seconds.
  useEffect(() => {
    if (featuredItems.length <= 1) return;

    // When trailer is actively playing, let the trailer play completely until it ends!
    if (showTrailer) {
      // Safety fallback: only if the ended event is completely blocked or dropped (e.g. strict adblocker),
      // advance after 210s (3.5 minutes) so the carousel doesn't remain frozen indefinitely.
      const safetyTimeout = setTimeout(() => {
        setShowTrailer(false);
        setIsMuted(true);
        setCurrentIndex((prev) => (prev + 1) % featuredItems.length);
      }, 210000);
      return () => clearTimeout(safetyTimeout);
    }

    // When trailer is NOT playing:
    // If no trailer is available or banner is out of view, advance slide on timer
    if (!trailerKey || !isBannerInView) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % featuredItems.length);
      }, isBannerInView ? 12000 : 16000);
      return () => clearInterval(interval);
    }
  }, [featuredItems.length, showTrailer, trailerKey, isBannerInView]);

  const formatDuration = (dur?: string) => {
    if (!dur) return '';
    if (language === 'en') {
      return dur.replace(/j\b/g, 'h').replace(/m\b/g, 'm');
    }
    return dur;
  };

  if (!currentMedia) return null;

  return (
    <div
      ref={bannerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative w-full min-h-[580px] sm:min-h-[600px] lg:h-[82vh] lg:min-h-[620px] lg:max-h-[860px] 2xl:max-h-[920px] 3xl:max-h-[1050px] 4xl:max-h-[1200px] flex items-end justify-start pb-6 sm:pb-10 lg:pb-14 pt-20 sm:pt-24 lg:pt-28 select-none"
    >
      {/* Full bleed cinematic backdrop */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Photo Backdrop */}
        <img
          key={currentMedia.id}
          src={displayBackdrop || currentMedia.backdrop}
          alt={displayTitle}
          className={`w-full h-full object-cover object-center scale-[1.03] animate-ken-burns filter brightness-90 transition-opacity duration-1000 ${
            showTrailer && trailerKey ? 'opacity-25 blur-sm scale-105' : 'opacity-100'
          }`}
        />

        {/* Cinematic Auto-playing YouTube Trailer (480p, Muted, Netflix-style) */}
        {showTrailer && trailerKey && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden transition-opacity duration-1000 animate-in fade-in">
            <iframe
              ref={iframeRef}
              src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&iv_load_policy=3&disablekb=1&vq=medium${typeof window !== 'undefined' && window.location.origin ? `&origin=${encodeURIComponent(window.location.origin)}` : ''}`}
              title={`${displayTitle} Official Trailer`}
              allow="autoplay; encrypted-media"
              onLoad={() => {
                try {
                  // Register listening with YouTube IFrame API to receive playback and ended events
                  iframeRef.current?.contentWindow?.postMessage(
                    JSON.stringify({ event: 'listening' }),
                    '*'
                  );
                  // Explicitly lock playback quality to 480p ('medium')
                  iframeRef.current?.contentWindow?.postMessage(
                    JSON.stringify({ event: 'command', func: 'setPlaybackQuality', args: ['medium'] }),
                    '*'
                  );
                } catch {}
              }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[115vw] h-[115vh] min-w-[177.77vh] min-h-[56.25vw] pointer-events-none scale-105 filter brightness-95 contrast-105"
            />
          </div>
        )}

        {/* Bottom gradient — tall so fully solid before hitting bottom edge */}
        <div
          className="absolute inset-x-0 bottom-0 pointer-events-none"
          style={{
            height: '70%',
            background: 'linear-gradient(to top, #141414 0%, #141414 20%, rgba(20,20,20,0.92) 50%, rgba(20,20,20,0.5) 75%, transparent 100%)',
          }}
        />
        {/* Left vignette for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/80 to-transparent lg:w-[70%] w-full pointer-events-none" />
        {/* Top navbar fade */}
        <div className="absolute top-0 inset-x-0 h-36 sm:h-44 bg-gradient-to-b from-black/85 via-black/35 to-transparent pointer-events-none" />
      </div>

      {/* Hero Content */}
      <div className="relative z-10 max-w-[1720px] 2xl:max-w-[1880px] 3xl:max-w-[2200px] 4xl:max-w-[2600px] mx-auto px-4 sm:px-8 lg:px-12 3xl:px-16 w-full">
        <div className="max-w-xl sm:max-w-2xl lg:max-w-3xl 3xl:max-w-4xl space-y-3 sm:space-y-4 lg:space-y-5">
          {/* Netflix Signature Metadata Badges */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 text-xs">
            {/* Top 10 / Trending Badge */}
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#E50914] text-white text-[10px] sm:text-[11px] font-black uppercase tracking-wider shadow-md shadow-red-900/40">
              <span>TOP 10</span>
            </div>

            {/* Release Year */}
            {currentMedia.year ? (
              <span className="text-white font-bold text-xs sm:text-sm tracking-wide">
                {currentMedia.year}
              </span>
            ) : null}

            {/* Age Rating Box */}
            <span className="px-1.5 py-0.5 border border-white/30 text-white/90 text-[9px] sm:text-[10px] font-bold rounded-sm uppercase tracking-wider">
              16+
            </span>

            {/* Quality Badge */}
            <span className="px-1.5 py-0.5 border border-white/30 text-white/85 text-[9px] sm:text-[10px] font-mono font-semibold rounded-sm">
              HD
            </span>

            <span className="text-[11px] sm:text-xs text-white/70 font-medium">
              {formatDuration(currentMedia.duration)} • {language === 'en' ? 'Subtitles' : 'Subtitle'}
            </span>
          </div>

          {/* Grand Cinematic Title - Official Logo Image or Modern High-Impact Typography */}
          {mediaLogo ? (
            <div className="py-1 sm:py-2 animate-in fade-in zoom-in-95 duration-500 min-h-[60px] sm:min-h-[90px] flex items-center">
              <img
                key={mediaLogo}
                src={mediaLogo}
                alt={displayTitle}
                className="max-h-20 sm:max-h-28 md:max-h-36 max-w-[85%] sm:max-w-[480px] w-auto object-contain drop-shadow-[0_12px_30px_rgba(0,0,0,0.9)] filter brightness-110 select-none pointer-events-none"
                onError={() => {
                  setMediaLogo(undefined);
                }}
              />
              <h1 className="sr-only">{displayTitle}</h1>
            </div>
          ) : (
            <h1 className="text-3xl sm:text-5xl lg:text-7xl xl:text-8xl font-display font-black text-white tracking-tight uppercase leading-[0.98] drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)]">
              {displayTitle}
            </h1>
          )}

          {/* Director & Genre Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <span className="text-white/90 font-semibold text-[11px] sm:text-xs uppercase tracking-wider">
              {currentMedia.director ? (language === 'en' ? `Directed by ${currentMedia.director}` : `Karya ${currentMedia.director}`) : (currentMedia.type === 'movie' ? (language === 'en' ? 'Movie' : 'Film') : (language === 'en' ? 'Series' : 'Serial'))}
            </span>
            <span className="text-white/40 hidden sm:inline">•</span>
            <div className="flex flex-wrap gap-1.5">
              {currentMedia.genres.slice(0, 3).map((g) => (
                <span
                  key={g}
                  className="px-2 sm:px-2.5 py-0.5 rounded-full bg-white/10 border border-white/10 text-white/90 text-[10px] sm:text-[11px] font-medium"
                >
                  {formatGenre(g, language)}
                </span>
              ))}
              {currentMedia.genres.length > 3 && (
                <span className="hidden sm:inline-flex px-2 sm:px-2.5 py-0.5 rounded-full bg-white/10 border border-white/10 text-white/90 text-[10px] sm:text-[11px] font-medium">
                  {formatGenre(currentMedia.genres[3], language)}
                </span>
              )}
            </div>
          </div>

          {/* Synopsis */}
          <p className="text-xs sm:text-sm lg:text-base text-white/80 font-normal max-w-2xl line-clamp-2 sm:line-clamp-3 leading-relaxed drop-shadow-md transition-opacity duration-300">
            {autoHeroSynopsis || currentMedia.synopsis}
          </p>

          {/* Action CTAs - Signature Netflix Play & More Info Buttons */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1 sm:pt-2">
            {/* Netflix Iconic Solid White Play Button */}
            <a
              href={getMediaWatchUrl(currentMedia.id)}
              onClick={(e) => {
                if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) {
                  return;
                }
                e.preventDefault();
                playClick();
                stopTrailerPlayback();
                onPlay(currentMedia);
              }}
              onMouseEnter={playHover}
              className="flex items-center justify-center gap-2 sm:gap-3 px-5 sm:px-8 py-2.5 sm:py-3.5 rounded-md bg-white hover:bg-white/80 active:scale-95 text-black font-black text-xs sm:text-base tracking-wide shadow-2xl transition-all duration-200 no-underline cursor-pointer flex-1 sm:flex-initial"
            >
              <Play className="w-4 h-4 sm:w-6 sm:h-6 fill-black text-black" />
              <span>{currentMedia.type === 'movie' ? t('watchMovie') : t('watchSeries')}</span>
            </a>

            {/* Netflix Iconic Translucent Info Button */}
            <button
              onClick={() => {
                playClick();
                playWhoosh();
                stopTrailerPlayback();
                onOpenDetails(currentMedia);
              }}
              onMouseEnter={playHover}
              className="flex items-center justify-center gap-2 px-4 sm:px-7 py-2.5 sm:py-3.5 rounded-md bg-white/25 hover:bg-white/20 active:scale-95 text-white font-bold text-xs sm:text-base tracking-wide backdrop-blur-md transition-all duration-200 flex-1 sm:flex-initial"
            >
              <Info className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              <span>{t('detailsReviews')}</span>
            </button>

            {/* Open in New Tab Button */}
            <a
              href={getAbsoluteWatchUrl(currentMedia.id)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                playClick();
                stopTrailerPlayback();
              }}
              onMouseEnter={playHover}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-white/30 bg-black/40 hover:border-white hover:bg-white/15 text-white transition-all duration-200 shadow-md cursor-pointer flex items-center justify-center active:scale-95 shrink-0"
              title={t('openInNewTabTooltip') || (language === 'en' ? 'Open in new tab' : 'Buka di tab baru')}
            >
              <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
            </a>

            {/* Bookmark Button */}
            <button
              onClick={() => {
                const added = toggleWatchlist(currentMedia.id, currentMedia);
                if (added) playSuccess();
                else playClick();
              }}
              onMouseEnter={playHover}
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border transition-all duration-200 flex items-center justify-center active:scale-95 cursor-pointer shrink-0 ${
                isBookmarked
                  ? 'bg-[#E50914] border-[#E50914] text-white shadow-glow-red'
                  : 'bg-black/40 border-white/30 text-white hover:border-white hover:bg-white/15'
              }`}
              title={isBookmarked ? t('inWatchlist') : t('addToWatchlist')}
            >
              {isBookmarked ? <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" /> : <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" />}
            </button>
          </div>

          {/* Mobile Highlight Thumbnails Strip & Controls (< lg) */}
          <div className="flex lg:hidden flex-col gap-2 pt-2 sm:pt-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-sans font-bold tracking-[0.16em] text-[#E50914] uppercase">
                  {t('popularNow')}
                </span>
                <div className="flex items-center gap-1">
                  {featuredItems.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        playClick();
                        stopTrailerPlayback();
                        setCurrentIndex(idx);
                      }}
                      aria-label={`Highlight ${idx + 1}`}
                      className={`transition-all duration-300 rounded-full ${
                        currentIndex === idx
                          ? 'w-5 h-1.5 bg-[#E50914]'
                          : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Trailer Audio Toggle Button on Mobile */}
              {showTrailer && trailerKey && (
                <button
                  type="button"
                  onClick={toggleTrailerMute}
                  title={isMuted ? (language === 'en' ? 'Unmute Trailer' : 'Aktifkan Suara') : (language === 'en' ? 'Mute Trailer' : 'Bisukan Suara')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 hover:bg-black border border-white/25 text-white text-[10px] font-semibold backdrop-blur-md shadow-md active:scale-95"
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-300" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>{isMuted ? (language === 'en' ? 'Muted' : 'Mute') : (language === 'en' ? 'Sound On' : 'Suara On')}</span>
                </button>
              )}
            </div>

            {/* Mobile Scrollable Highlight Mini Thumbnails */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
              {featuredItems.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => {
                    playClick();
                    stopTrailerPlayback();
                    setCurrentIndex(idx);
                  }}
                  className={`relative w-20 h-12 rounded-lg overflow-hidden border shrink-0 transition-all duration-300 ${
                    currentIndex === idx
                      ? 'border-[#E50914] ring-2 ring-[#E50914]/60 scale-[1.03] shadow-lg shadow-red-950/60'
                      : 'border-white/20 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={item.backdrop || item.backdropEn || item.backdropId || item.poster}
                    alt={getMediaTitle(item, language)}
                    onError={(e) => {
                      const fallback = item.poster || item.backdrop;
                      if (fallback) {
                        (e.target as HTMLImageElement).src = fallback;
                      }
                    }}
                    className="w-full h-full object-cover"
                  />
                  <div className={`absolute inset-0 transition-colors ${currentIndex === idx ? 'bg-black/10' : 'bg-black/40'}`} />
                  <span className="absolute bottom-1 left-1.5 right-1 text-[8px] font-bold text-white line-clamp-1 drop-shadow-md text-left leading-tight">
                    {getMediaTitle(item, language)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop Controls & Carousel Thumbnails at Bottom Right */}
        <div className="hidden lg:flex items-center gap-2.5 2xl:gap-3 absolute bottom-8 sm:bottom-10 lg:bottom-12 3xl:bottom-16 right-4 sm:right-8 lg:right-12 3xl:right-16 z-20">
          {/* Audio Mute / Unmute Button for Trailer */}
          {showTrailer && trailerKey && (
            <button
              type="button"
              onClick={toggleTrailerMute}
              title={isMuted ? (language === 'en' ? 'Unmute Trailer' : 'Aktifkan Suara') : (language === 'en' ? 'Mute Trailer' : 'Bisukan Suara')}
              className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/70 hover:bg-black border border-white/25 text-white shadow-xl backdrop-blur-md transition-all hover:scale-110 active:scale-95 cursor-pointer shrink-0"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-slate-300" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          )}

          <div className="flex items-center gap-2.5 2xl:gap-3">
            <span className="text-[10px] font-sans tracking-[0.2em] text-slate-400 uppercase mr-1">
              {t('popularNow')}
            </span>
            {featuredItems.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => {
                  playClick();
                  stopTrailerPlayback();
                  setCurrentIndex(idx);
                }}
                onMouseEnter={playHover}
                className={`relative w-20 h-12 rounded-lg overflow-hidden border transition-all duration-300 ${
                  currentIndex === idx
                    ? 'border-[#E50914] scale-105 shadow-glow-red ring-1 ring-[#E50914]'
                    : 'border-white/15 opacity-50 hover:opacity-100'
                }`}
              >
                <img
                  src={item.backdrop || item.backdropEn || item.backdropId || item.poster}
                  alt={getMediaTitle(item, language)}
                  onError={(e) => {
                    const fallback = item.poster || item.backdrop;
                    if (fallback) {
                      (e.target as HTMLImageElement).src = fallback;
                    }
                  }}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/25" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
