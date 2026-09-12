import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Star,
  Plus,
  Check,
  Share2,
  MessageSquare,
  ThumbsUp,
  Film,
  Tv,
  ChevronRight,
  Clock,
  Calendar,
  Sparkles,
  Volume2,
  ExternalLink,
  Award,
  Globe,
  Loader2,
  CheckCircle2,
  Clapperboard,
} from 'lucide-react';
import type { MediaItem, Server, Episode, Review } from '../../types/media';
import { FilmographyModal } from '../explore/FilmographyModal';
import { type CurationTarget, splitMultipleNames } from '../../services/curation';
import { CinematicPlayer } from '../player/CinematicPlayer';
import { ServerSelector } from '../player/ServerSelector';
import { EpisodeList } from '../player/EpisodeList';
import { MovieCard } from '../home/MovieCard';
import { useWatchlist } from '../../context/WatchlistContext';
import { useSound } from '../../context/SoundContext';
import { useLanguage } from '../../context/LanguageContext';
import { fetchImdbDetails, getImdbUrl, type ImdbDetails } from '../../services/imdb';
import {
  fetchTmdbRecommendations,
  fetchFullMediaItem,
  fetchTrailerForMedia,
  fetchLogoForMedia,
} from '../../services/tmdb';
import {
  fetchAllPortalReviews,
  type PortalBadgeInfo,
  type PortalReviewItem,
} from '../../services/portalReviews';
import { useAutoTranslateSynopsis, translateText } from '../../services/translator';
import { getSeriesStatus, formatGenre, getMediaTitle } from '../../utils/formatters';

interface WatchSectionProps {
  media: MediaItem;
  resumeTime?: number;
  resumeEpisodeId?: string;
  onBack: () => void;
  onPlayMedia: (media: MediaItem) => void;
  catalog: MediaItem[];
  onOpenWatchParty?: () => void;
  onTheaterModeChange?: (isTheater: boolean) => void;
  isMiniPlayer?: boolean;
  onToggleMiniPlayer?: () => void;
  onCloseMiniPlayer?: () => void;
}

export const WatchSection: React.FC<WatchSectionProps> = ({
  media,
  resumeTime,
  resumeEpisodeId,
  onBack,
  onPlayMedia,
  catalog,
  onOpenWatchParty,
  onTheaterModeChange,
  isMiniPlayer = false,
  onToggleMiniPlayer,
  onCloseMiniPlayer,
}) => {
  const { isInWatchlist, toggleWatchlist, historyItems, toggleCompleted } = useWatchlist();
  const isCompleted = Boolean(historyItems.find((h) => h.mediaId === media.id)?.completed);
  const { playClick, playHover, playSuccess } = useSound();
  const { t, language } = useLanguage();
  const displayTitle = getMediaTitle(media, language);

  const [activeTab, setActiveTab] = useState<'episodes' | 'info' | 'trailer' | 'reviews'>('info');
  const [activeServer, setActiveServer] = useState<Server>(() => {
    if (media.type !== 'movie' && resumeEpisodeId && media.seasons) {
      for (const season of media.seasons) {
        const found = season.episodes?.find((ep) => ep.id === resumeEpisodeId);
        if (found?.servers?.[0]) return found.servers[0];
      }
    }
    if (media.type !== 'movie' && media.seasons?.[0]?.episodes?.[0]?.servers?.[0]) {
      return media.seasons[0].episodes[0].servers[0];
    }
    return media.servers[0];
  });
  const [currentEpisode, setCurrentEpisode] = useState<Episode | undefined>(() => {
    if (media.type === 'movie') return undefined;
    if (resumeEpisodeId && media.seasons) {
      for (const season of media.seasons) {
        const found = season.episodes?.find((ep) => ep.id === resumeEpisodeId);
        if (found) return found;
      }
    }
    return media.seasons?.[0]?.episodes?.[0];
  });
  const [copiedLink, setCopiedLink] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);

  // Synchronize target episode and server when resumeEpisodeId or media changes
  useEffect(() => {
    if (media.type === 'movie') {
      setCurrentEpisode(undefined);
      setActiveServer(media.servers[0]);
      return;
    }

    if (resumeEpisodeId && media.seasons) {
      for (const season of media.seasons) {
        const found = season.episodes?.find((ep) => ep.id === resumeEpisodeId);
        if (found) {
          setCurrentEpisode(found);
          setActiveServer(found.servers?.[0] || media.servers[0]);
          return;
        }
      }
    }

    if (media.seasons && media.seasons.length > 0) {
      const firstEp = media.seasons[0].episodes?.[0];
      setCurrentEpisode(firstEp);
      setActiveServer(firstEp?.servers?.[0] || media.servers[0]);
    } else {
      setCurrentEpisode(undefined);
      setActiveServer(media.servers[0]);
    }
  }, [resumeEpisodeId, media.id, media.seasons, media.type]);

  // Sync theater mode to parent for full-page immersive effects
  useEffect(() => {
    onTheaterModeChange?.(!isMiniPlayer && isTheaterMode);
  }, [isTheaterMode, isMiniPlayer, onTheaterModeChange]);

  // Auto-scroll into view when Theater Mode is toggled
  useEffect(() => {
    if (isTheaterMode && !isMiniPlayer) {
      const el = document.getElementById('theatrical-player-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [isTheaterMode, isMiniPlayer]);

  // YouTube Trailer State
  const [trailerInfo, setTrailerInfo] = useState<{ key?: string; url: string }>({
    key: media.trailerYoutubeKey,
    url: media.trailerUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(media.title + ' official trailer')}`,
  });

  // Official Title Logo State
  const [mediaLogo, setMediaLogo] = useState<string | undefined>(media.logoUrl);

  // Duration localization helper
  const formatDuration = (dur: string) => {
    if (!dur) return '';
    if (language === 'id') return dur;
    return dur
      .replace(/j /g, 'h ')
      .replace(/j/g, 'h')
      .replace(/Musim/g, 'Season')
      .replace(/Episode/g, 'Episodes');
  };

  // Fetch YouTube Trailer & Official Logo for current media
  useEffect(() => {
    let isMounted = true;

    if (media.trailerYoutubeKey) {
      setTrailerInfo({
        key: media.trailerYoutubeKey,
        url: media.trailerUrl || `https://www.youtube.com/watch?v=${media.trailerYoutubeKey}`,
      });
    } else {
      fetchTrailerForMedia(media.tmdbId, media.type, media.title).then((tr) => {
        if (isMounted) setTrailerInfo(tr);
      });
    }

    if (media.logoUrl) {
      setMediaLogo(media.logoUrl);
    } else if (media.tmdbId) {
      fetchLogoForMedia(media.tmdbId, media.type).then((lg) => {
        if (isMounted && lg) setMediaLogo(lg);
      });
    } else {
      setMediaLogo(undefined);
    }

    return () => {
      isMounted = false;
    };
  }, [media.id, media.trailerYoutubeKey, media.trailerUrl, media.logoUrl, media.tmdbId, media.type, media.title]);

  // Live IMDb data state
  const [imdbData, setImdbData] = useState<ImdbDetails | null>(null);
  const [loadingImdb, setLoadingImdb] = useState(false);

  // Auto-translated synopsis hook with seamless language reactivity
  const {
    synopsis: autoSynopsis,
    isTranslating: isTranslatingSynopsis,
    activeLang: synopsisActiveLang,
    setActiveLang: setSynopsisActiveLang,
  } = useAutoTranslateSynopsis(media, language);

  // Reviews state
  const [reviewsList, setReviewsList] = useState<Review[]>(media.reviews || []);

  // Official Review Portals state
  const [portalBadges, setPortalBadges] = useState<PortalBadgeInfo[]>([]);
  const [portalReviews, setPortalReviews] = useState<PortalReviewItem[]>([]);
  const [loadingPortalReviews, setLoadingPortalReviews] = useState<boolean>(false);
  const [selectedPortalFilter, setSelectedPortalFilter] = useState<string>('all');
  const [translatedReviews, setTranslatedReviews] = useState<Record<string, string>>({});
  const [translatingReviewId, setTranslatingReviewId] = useState<string | null>(null);
  const [isAutoTranslatingReviews, setIsAutoTranslatingReviews] = useState<boolean>(false);
  const [manualViewOriginal, setManualViewOriginal] = useState<Record<string, boolean>>({});

  // Reset manual overrides whenever global language changes or media changes
  useEffect(() => {
    setManualViewOriginal({});
  }, [language, media.id]);

  // Automatically translate reviews to Indonesian when language is 'id'
  useEffect(() => {
    if (language !== 'id' || portalReviews.length === 0) {
      setIsAutoTranslatingReviews(false);
      return;
    }

    let isMounted = true;
    const pendingReviews = portalReviews.filter(
      (r) => !translatedReviews[r.id] && r.content && r.content.trim().length > 0
    );

    if (pendingReviews.length === 0) {
      setIsAutoTranslatingReviews(false);
      return;
    }

    setIsAutoTranslatingReviews(true);

    Promise.all(
      pendingReviews.map(async (r) => {
        try {
          const translated = await translateText(r.content, 'id');
          return { id: r.id, text: translated };
        } catch {
          return { id: r.id, text: r.content };
        }
      })
    )
      .then((results) => {
        if (!isMounted) return;
        setTranslatedReviews((prev) => {
          const next = { ...prev };
          for (const item of results) {
            if (item.text) {
              next[item.id] = item.text;
            }
          }
          return next;
        });
        setIsAutoTranslatingReviews(false);
      })
      .catch(() => {
        if (isMounted) setIsAutoTranslatingReviews(false);
      });

    return () => {
      isMounted = false;
    };
  }, [language, portalReviews, translatedReviews]);

  const handleToggleTranslateReview = async (reviewId: string, originalText: string) => {
    // If not yet translated, fetch translation immediately
    if (!translatedReviews[reviewId]) {
      setTranslatingReviewId(reviewId);
      try {
        const res = await translateText(originalText, 'id');
        if (res) {
          setTranslatedReviews((prev) => ({
            ...prev,
            [reviewId]: res,
          }));
        }
      } catch (err) {
        console.error('Failed to translate review:', err);
      } finally {
        setTranslatingReviewId(null);
      }
    }

    // Toggle individual manual override
    setManualViewOriginal((prev) => ({
      ...prev,
      [reviewId]: !prev[reviewId],
    }));
  };

  const isBookmarked = isInWatchlist(media.id);

  // Fetch live IMDb details if an IMDb ID is available
  useEffect(() => {
    let isMounted = true;
    const targetImdbId = media.imdbId;
    if (targetImdbId) {
      setLoadingImdb(true);
      fetchImdbDetails(targetImdbId).then((data) => {
        if (isMounted && data) {
          setImdbData(data);
        }
        if (isMounted) setLoadingImdb(false);
      });
    } else {
      setImdbData(null);
    }
    return () => {
      isMounted = false;
    };
  }, [media.id, media.imdbId]);

  // Fetch official reviews from the 5 portals (Metacritic, Rotten Tomatoes, Montase Film, IMDb, Letterboxd)
  useEffect(() => {
    let isMounted = true;
    setLoadingPortalReviews(true);

    fetchAllPortalReviews(media, imdbData)
      .then((data) => {
        if (isMounted) {
          setPortalBadges(data.portalBadges);
          setPortalReviews(data.reviews);
          setLoadingPortalReviews(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load official portal reviews:', err);
        if (isMounted) setLoadingPortalReviews(false);
      });

    return () => {
      isMounted = false;
    };
  }, [media.id, imdbData]);

  const activeImdbId = imdbData?.imdbId || media.imdbId;
  const activeImdbUrl = imdbData?.imdbUrl || media.imdbUrl || (activeImdbId ? getImdbUrl(activeImdbId) : 'https://www.imdb.com');
  const activeImdbRating = imdbData?.rating || media.imdbRating || media.rating;
  const activeImdbVotes = imdbData?.votes || media.imdbVotes;
  const activeImdbPlot = imdbData?.plot || media.imdbPlot;
  const activeWriter = imdbData?.writer || media.writer;
  const activeAwards = imdbData?.awards || media.awards;
  const activeDirector = imdbData?.director || media.director;

  // Initialize or reset tab and reviews when media changes
  useEffect(() => {
    if (media.seasons && media.seasons.length > 0) {
      setActiveTab('episodes');
    } else {
      setActiveTab('info');
    }
    setReviewsList(media.reviews || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [media.id, media.seasons]);

  const handleShare = () => {
    playClick();
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Filmography / Country Curation Modal State
  const [curationTarget, setCurationTarget] = useState<CurationTarget | null>(null);
  const [isCurationOpen, setIsCurationOpen] = useState(false);

  const handleOpenCuration = (target: CurationTarget) => {
    playClick();
    setCurationTarget(target);
    setIsCurationOpen(true);
  };

  // Dynamic TMDB Recommendations based on currently watched movie/series
  const [recommendations, setRecommendations] = useState<MediaItem[]>(() => {
    return catalog
      .filter((item) => item.id !== media.id && (item.type === media.type || item.genres.some((g) => media.genres.includes(g))))
      .slice(0, 6);
  });
  const [isLoadingRecs, setIsLoadingRecs] = useState<boolean>(false);
  const [loadingRecId, setLoadingRecId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const targetTmdbId = media.tmdbId || (() => {
      if (media.id.startsWith('tmdb-movie-')) return Number(media.id.replace('tmdb-movie-', ''));
      if (media.id.startsWith('tmdb-tv-')) return Number(media.id.replace('tmdb-tv-', ''));
      return undefined;
    })();

    const loadRecs = async () => {
      if (targetTmdbId) {
        setIsLoadingRecs(true);
        try {
          const recs = await fetchTmdbRecommendations(targetTmdbId, media.type, 12);
          if (isMounted && recs.length > 0) {
            setRecommendations(recs);
            setIsLoadingRecs(false);
            return;
          }
        } catch (err) {
          console.error('Failed to load TMDB recommendations:', err);
        }
      }

      if (isMounted) {
        // Fallback: genre-matched catalog if offline or no TMDB recommendations
        const fallback = catalog
          .filter((item) => item.id !== media.id && (item.type === media.type || item.genres.some((g) => media.genres.includes(g))))
          .slice(0, 6);
        setRecommendations(fallback);
        setIsLoadingRecs(false);
      }
    };

    loadRecs();
    return () => {
      isMounted = false;
    };
  }, [media.id, media.tmdbId, media.type, catalog]);

  const handleSelectRecommendation = async (rec: MediaItem) => {
    playClick();
    setLoadingRecId(rec.id);

    try {
      if (rec.tmdbId) {
        const mediaType = rec.type === 'movie' ? 'movie' : 'tv';
        const full = await fetchFullMediaItem(rec.tmdbId, mediaType);
        if (full) {
          onPlayMedia(full);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      }
    } catch (err) {
      console.error('Failed to load full recommendation item:', err);
    } finally {
      setLoadingRecId(null);
    }

    onPlayMedia(rec);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'movie': return language === 'en' ? 'Movie' : 'Koleksi Film';
      case 'series': return language === 'en' ? 'TV Series' : 'Serial Televisi';
      case 'anime': return language === 'en' ? 'Anime Series' : 'Anime Series';
      case 'drama': return language === 'en' ? 'Asian Drama' : 'Drama Asia';
      default: return language === 'en' ? 'Catalog' : 'Katalog Tayangan';
    }
  };

  const renderPortalIcon = (portalId: string) => {
    switch (portalId) {
      case 'rottentomatoes':
        return <span className="text-base select-none">🍅</span>;
      case 'imdb':
        return (
          <span className="bg-[#F5C518] text-black text-[9px] font-black px-1.5 py-0.5 rounded font-sans tracking-tight shadow-sm select-none">
            IMDb
          </span>
        );
      case 'metacritic':
        return (
          <span className="bg-[#33cc33] text-black text-[9px] font-black w-4 h-4 rounded-full inline-flex items-center justify-center font-sans shadow-sm select-none">
            M
          </span>
        );
      case 'letterboxd':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#202830] border border-orange-500/30 text-[9px] font-bold text-orange-400 select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block" />
            <span>LB</span>
          </span>
        );
      case 'montasefilm':
        return (
          <span className="bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 font-bold text-[9px] px-1.5 py-0.5 rounded tracking-wider uppercase select-none">
            Montase
          </span>
        );
      default:
        return <Film className="w-3.5 h-3.5 text-brand-gold" />;
    }
  };

  return (
    <div className={isMiniPlayer ? 'contents' : 'min-h-screen bg-cinema-950 text-white pb-20 pt-20 sm:pt-24 animate-in fade-in duration-500 relative'}>
      {/* Dynamic Ambient Glow from Media Backdrop */}
      {!isMiniPlayer && (
        <div
          className={`fixed top-0 inset-x-0 pointer-events-none transition-all duration-1000 -z-10 ${
            isTheaterMode
              ? 'h-screen bg-cover bg-center opacity-35 blur-[100px] scale-110'
              : 'h-[600px] bg-cover bg-center opacity-15 blur-3xl'
          }`}
          style={{ backgroundImage: `url(${media.backdrop})` }}
        />
      )}

      {/* Cinema Lights-Out Backdrop Dimmer for Theater Mode */}
      {!isMiniPlayer && (
        <div
          onClick={() => {
            playClick();
            setIsTheaterMode(false);
          }}
          className={`fixed inset-0 z-20 transition-all duration-700 ${
            isTheaterMode
              ? 'opacity-100 bg-black/85 backdrop-blur-md cursor-pointer pointer-events-auto'
              : 'opacity-0 pointer-events-none backdrop-blur-none'
          }`}
          title={isTheaterMode ? t('exitTheaterMode') : undefined}
        />
      )}

      <div className={isMiniPlayer ? 'contents' : 'max-w-[1560px] 2xl:max-w-[1760px] 3xl:max-w-[2100px] 4xl:max-w-[2500px] mx-auto px-4 sm:px-6 lg:px-10 3xl:px-14 space-y-6 sm:space-y-8'}>
        
        {/* Navigation Breadcrumbs & Back Button */}
        {!isMiniPlayer && (
          <div className={`flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4 transition-all duration-500 relative z-10 ${
            isTheaterMode
              ? 'opacity-20 blur-[2px] filter brightness-[0.4] hover:opacity-100 hover:blur-none hover:brightness-100'
              : 'opacity-100 blur-none'
          }`}>
            <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-400">
              <button
                onClick={() => {
                  playClick();
                  onBack();
                }}
                onMouseEnter={playHover}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-white/[0.04] hover:bg-[#E50914] hover:text-white border border-white/[0.08] text-slate-200 font-medium transition-all group shadow-sm cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                <span>{t('backToHome')}</span>
              </button>

              <span className="text-white/20 hidden sm:inline">•</span>

              <nav className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-light">
                <span className="hover:text-white cursor-pointer" onClick={onBack}>{t('navHome')}</span>
                <ChevronRight className="w-3 h-3 text-slate-600" />
                <span className="text-brand-champagne font-medium">{getTypeLabel(media.type)}</span>
                <ChevronRight className="w-3 h-3 text-slate-600" />
                <span className="text-slate-200 truncate max-w-[200px] font-medium">{displayTitle}</span>
              </nav>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => {
                  const added = toggleWatchlist(media.id, media);
                  if (added) playSuccess();
                  else playClick();
                }}
                onMouseEnter={playHover}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full border text-xs font-semibold tracking-wide transition-all ${
                  isBookmarked
                    ? 'bg-[#E50914] border-[#E50914] text-white shadow-glow-red'
                    : 'bg-white/[0.05] border-white/[0.12] text-slate-300 hover:text-white hover:bg-white/[0.1]'
                }`}
              >
                {isBookmarked ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>{t('inWatchlist')}</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>{t('addToWatchlist')}</span>
                  </>
                )}
              </button>

              {/* Quick Watch Official YouTube Trailer Button */}
              <button
                onClick={() => {
                  playClick();
                  setActiveTab('trailer');
                  const tabsEl = document.getElementById('watch-section-tabs');
                  if (tabsEl) tabsEl.scrollIntoView({ behavior: 'smooth' });
                }}
                onMouseEnter={playHover}
                className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full bg-red-600/15 hover:bg-red-600 border border-red-500/30 text-red-300 hover:text-white text-xs font-medium transition-all shadow-sm group"
              >
                <span className="text-xs group-hover:scale-110 transition-transform">▶️</span>
                <span>{t('watchTrailer')}</span>
              </button>

              <button
                onClick={handleShare}
                onMouseEnter={playHover}
                className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.1] text-slate-300 hover:text-white hover:bg-white/[0.07] text-xs font-medium transition-all cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-brand-champagne" />
                <span className="hidden xs:inline">{copiedLink ? t('copied') : t('share')}</span>
              </button>

              {/* Open in New Tab Button */}
              <a
                href={`${window.location.origin}${window.location.pathname}#/watch/${media.id}${currentEpisode ? `?ep=${currentEpisode.id}` : ''}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => playClick()}
                onMouseEnter={playHover}
                className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.1] text-slate-300 hover:text-white hover:bg-white/[0.07] text-xs font-medium transition-all no-underline cursor-pointer"
                title={t('openInNewTabTooltip') || (language === 'en' ? 'Open in new tab' : 'Buka di tab baru')}
              >
                <ExternalLink className="w-3.5 h-3.5 text-brand-champagne" />
                <span className="hidden sm:inline">{language === 'en' ? 'New Tab' : 'Tab Baru'}</span>
              </a>
            </div>
          </div>
        )}

        {/* Section 1: The Grand Theatrical Player */}
        <section
          id="theatrical-player-section"
          className={isMiniPlayer ? 'contents' : `transition-all duration-500 relative z-30 ${
            isTheaterMode
              ? '-mx-4 sm:-mx-6 lg:-mx-10 xl:-mx-[calc((100vw-100%)/2)] w-[calc(100%+2rem)] sm:w-[calc(100%+3rem)] lg:w-[calc(100%+5rem)] xl:w-screen xl:max-w-none bg-black/95 border-y border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.95)] pt-0 pb-0 ring-1 ring-white/10'
              : 'space-y-4'
          }`}
        >
          {/* Ambient Cinema Lighting Behind Video in Theater Mode */}
          {!isMiniPlayer && isTheaterMode && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
              <div
                className="absolute -inset-10 bg-cover bg-center opacity-30 blur-3xl scale-110 transition-all duration-1000"
                style={{ backgroundImage: `url(${media.backdrop})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black opacity-90" />
              <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black opacity-90" />
            </div>
          )}

          <div
            className={isMiniPlayer ? 'contents' : `transition-all duration-500 ${
              isTheaterMode
                ? 'w-full max-w-[2200px] 3xl:max-w-[2600px] mx-auto rounded-none border-none py-2 sm:py-4 flex items-center justify-center relative'
                : 'w-full'
            }`}
          >
            <CinematicPlayer
              key={`${media.id}-${currentEpisode?.id || 'main'}`}
              media={media}
              currentEpisode={currentEpisode}
              activeServer={activeServer}
              servers={currentEpisode?.servers || media.servers}
              onSelectServer={(srv) => {
                setActiveServer(srv);
              }}
              onOpenServerModal={() => {
                const el = document.getElementById('theatrical-server-selector');
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              autoPlay={false}
              resumeTime={resumeTime}
              isTheaterMode={isTheaterMode}
              onToggleTheaterMode={() => setIsTheaterMode((prev) => !prev)}
              onOpenWatchParty={onOpenWatchParty}
              isMiniPlayer={isMiniPlayer}
              onToggleMiniPlayer={onToggleMiniPlayer}
              onCloseMiniPlayer={onCloseMiniPlayer}
            />
          </div>

          {/* Real Streaming Server Selector */}
          {!isMiniPlayer && (
            <div
              id="theatrical-server-selector"
              className={`transition-all duration-300 ${
                isTheaterMode
                  ? 'max-w-[1560px] 2xl:max-w-[1760px] 3xl:max-w-[2100px] 4xl:max-w-[2500px] mx-auto px-4 sm:px-6 lg:px-10 3xl:px-14 py-4 sm:py-5 bg-cinema-950/95 border-t border-white/[0.08]'
                  : ''
              }`}
            >
              <ServerSelector
                servers={currentEpisode?.servers || media.servers}
                activeServerId={activeServer.id}
                media={media}
                onSelectServer={(srv) => {
                  setActiveServer(srv);
                }}
              />
            </div>
          )}
        </section>

        {/* Surrounding Background Content (Dimmed and Blurred in Theater Mode) */}
        {!isMiniPlayer && (
        <div className={`space-y-6 sm:space-y-8 transition-all duration-700 relative z-10 ${
          isTheaterMode
            ? 'opacity-20 blur-[3px] filter brightness-[0.4] hover:opacity-95 hover:blur-none hover:brightness-100 transition-all duration-500 pointer-events-none hover:pointer-events-auto'
            : 'opacity-100 blur-none brightness-100'
        }`}>
          {/* Section 2: Title, Metadata, Badges & Synopsis */}
          <section className="space-y-6 bg-cinema-900/40 border border-white/[0.05] rounded-3xl p-5 sm:p-8 backdrop-blur-xl">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 pb-6 border-b border-white/[0.06]">
            <div className="space-y-3 max-w-4xl">
              {/* Badges Chips */}
              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                <span className="px-3 py-1 rounded-full bg-[#E50914] text-white text-[11px] font-sans uppercase tracking-[0.18em] font-bold shadow-glow-red">
                  {media.type.toUpperCase()}
                </span>
                {(() => {
                  const seriesStatus = getSeriesStatus(media);
                  if (!seriesStatus) return null;
                  if (seriesStatus.completedSeasonsLabel && seriesStatus.ongoingSeasonLabel) {
                    return (
                      <>
                        <span className="px-3 py-1 rounded-full text-[11px] font-sans uppercase tracking-wider font-semibold border flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm">
                          <span className="text-xs leading-none">✓</span>
                          <span>{seriesStatus.completedSeasonsLabel}</span>
                        </span>
                        <span className="px-3 py-1 rounded-full text-[11px] font-sans uppercase tracking-wider font-semibold border flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                          <span>{seriesStatus.ongoingSeasonLabel}</span>
                          {seriesStatus.progressText && (
                            <span className="text-[10px] opacity-80 font-mono">({seriesStatus.progressText})</span>
                          )}
                        </span>
                      </>
                    );
                  }
                  return (
                    <span
                      className={`px-3 py-1 rounded-full text-[11px] font-sans uppercase tracking-wider font-semibold border flex items-center gap-1.5 ${seriesStatus.badgeClass}`}
                    >
                      {seriesStatus.isOngoing ? (
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      ) : (
                        <span className="text-xs leading-none">✓</span>
                      )}
                      <span>
                        {seriesStatus.isOngoing
                          ? (seriesStatus.ongoingSeasonLabel || seriesStatus.label)
                          : (seriesStatus.completedSeasonsLabel || seriesStatus.label)}
                      </span>
                      {seriesStatus.progressText && (
                        <span className="text-[10px] opacity-80 font-mono">({seriesStatus.progressText})</span>
                      )}
                    </span>
                  );
                })()}
                <span className="px-3 py-1 rounded-full bg-white/[0.05] text-slate-200 text-xs font-light border border-white/10">
                  {media.quality?.replace(/4K ULTRA HD/gi, '1080p Full HD').replace(/4K/gi, 'HD') || 'HD'}
                </span>
                {/* Official Clickable IMDb Badge */}
                <a
                  href={activeImdbUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Buka data lengkap di IMDb.com"
                  className="px-2.5 py-1 rounded-full bg-[#F5C518]/15 hover:bg-[#F5C518]/25 text-[#F5C518] border border-[#F5C518]/30 text-xs flex items-center gap-1.5 font-semibold transition-all hover:scale-105 group shadow-sm"
                >
                  <span className="bg-[#F5C518] text-black font-black text-[10px] px-1 py-0.5 rounded-sm leading-none tracking-wider">
                    IMDb
                  </span>
                  <span>{activeImdbRating.toFixed(1)}</span>
                  <Star className="w-3 h-3 fill-[#F5C518] text-[#F5C518]" />
                  {activeImdbVotes && (
                    <span className="text-[10px] text-slate-300 font-normal hidden sm:inline">
                      ({activeImdbVotes})
                    </span>
                  )}
                  <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity ml-0.5" />
                </a>
                {media.rottenTomatoes && (
                  <span className="px-2.5 py-1 rounded-full bg-white/[0.03] text-slate-300 border border-white/10 text-xs font-light">
                    {media.rottenTomatoes}% RT
                  </span>
                )}
                {/* Mark as Watched / Completed Action Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    playSuccess();
                    toggleCompleted(media.id);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm ${
                    isCompleted
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                      : 'bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/10'
                  }`}
                  title={isCompleted ? t('markAsUncompleted') : t('markAsCompleted')}
                >
                  <CheckCircle2 className={`w-3.5 h-3.5 ${isCompleted ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{isCompleted ? t('completed') : t('markAsCompleted')}</span>
                </button>
                <span className="text-xs text-slate-400 font-light tracking-wide flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  {media.year}
                  <span>•</span>
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  {formatDuration(media.duration)}
                  <span>•</span>
                  <span>{language === 'en' ? `Rated ${media.ageRating}` : `Bimbingan ${media.ageRating}`}</span>
                </span>
              </div>

              {/* Main Title - Official Logo or Cinematic Typography */}
              {mediaLogo ? (
                <div className="py-1">
                  <img
                    src={mediaLogo}
                    alt={displayTitle}
                    className="max-h-20 sm:max-h-28 md:max-h-32 max-w-[85%] sm:max-w-[440px] w-auto object-contain drop-shadow-xl filter brightness-110 mb-2 select-none pointer-events-none"
                    onError={() => setMediaLogo(undefined)}
                  />
                  <h1 className="sr-only">{displayTitle}</h1>
                </div>
              ) : (
                <h1 className="text-2xl sm:text-4xl md:text-5xl font-display font-medium text-white tracking-wide leading-tight">
                  {displayTitle}
                </h1>
              )}

              {media.originalTitle && media.originalTitle !== displayTitle && (
                <p className="text-sm text-slate-400 italic font-serif">
                  {t('originalReleaseTitle')}: {media.originalTitle}
                </p>
              )}

              {/* Genre Pills */}
              <div className="flex flex-wrap gap-2 pt-1">
                {media.genres.map((g) => (
                  <button
                    key={g}
                    onClick={() => handleOpenCuration({ type: 'genre', name: g })}
                    onMouseEnter={playHover}
                    className="group inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.03] hover:bg-brand-gold/15 text-slate-300 hover:text-brand-champagne text-xs border border-white/[0.06] hover:border-brand-gold/40 font-light hover:font-medium transition-all duration-200 cursor-pointer shadow-sm hover:shadow-glow-gold/10 hover:-translate-y-0.5"
                    title={language === 'en' ? `Explore all ${formatGenre(g, 'en')} titles` : `Jelajahi semua film & series ${formatGenre(g, 'id')}`}
                  >
                    <span>{formatGenre(g, language)}</span>
                    <Sparkles className="w-2.5 h-2.5 text-brand-gold/60 group-hover:text-brand-gold transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div id="watch-section-tabs" className="flex items-center gap-2 border-b border-white/[0.08] pb-3 overflow-x-auto no-scrollbar">
            {media.seasons && media.seasons.length > 0 && (
              <button
                onClick={() => {
                  playClick();
                  setActiveTab('episodes');
                }}
                onMouseEnter={playHover}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
                  activeTab === 'episodes'
                    ? 'bg-[#E50914] text-white shadow-glow-red'
                    : 'text-slate-400 hover:text-white bg-white/[0.04]'
                }`}
              >
                <Tv className="w-3.5 h-3.5" />
                <span>{t('tabEpisodes')} ({media.seasons.reduce((acc, s) => acc + s.episodes.length, 0)})</span>
              </button>
            )}

            <button
              onClick={() => {
                playClick();
                setActiveTab('info');
              }}
              onMouseEnter={playHover}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'info'
                  ? 'bg-[#E50914] text-white shadow-glow-red'
                  : 'text-slate-400 hover:text-white bg-white/[0.04]'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>{t('tabInfo')}</span>
            </button>

            <button
              onClick={() => {
                playClick();
                setActiveTab('trailer');
              }}
              onMouseEnter={playHover}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'trailer'
                  ? 'bg-[#E50914] text-white shadow-glow-red'
                  : 'text-slate-400 hover:text-white bg-white/[0.04]'
              }`}
            >
              <span className="text-sm">🎬</span>
              <span>{t('tabTrailerOfficial')}</span>
            </button>

            <button
              onClick={() => {
                playClick();
                setActiveTab('reviews');
              }}
              onMouseEnter={playHover}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'reviews'
                  ? 'bg-[#E50914] text-white shadow-glow-red'
                  : 'text-slate-400 hover:text-white bg-white/[0.04]'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{t('tabReviewsOfficial')} ({portalReviews.length + reviewsList.length})</span>
            </button>
          </div>

          {/* Tab 1: Episode Hub */}
          {activeTab === 'episodes' && media.seasons && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <EpisodeList
                seasons={media.seasons}
                activeEpisodeId={currentEpisode?.id}
                mediaId={media.id}
                status={media.status}
                isOngoing={media.isOngoing}
                totalEpisodes={media.totalEpisodes}
                onSelectEpisode={(ep) => {
                  const currentServers = currentEpisode?.servers || media.servers;
                  const activeIndex = currentServers.findIndex((s) => s.id === activeServer.id);
                  const targetServer =
                    activeIndex >= 0 && ep.servers[activeIndex]
                      ? ep.servers[activeIndex]
                      : ep.servers[0] || media.servers[0];
                  setCurrentEpisode(ep);
                  setActiveServer(targetServer);
                  window.scrollTo({ top: 120, behavior: 'smooth' });
                }}
              />
            </div>
          )}

          {/* Tab 2: Info & Synopsis */}
          {activeTab === 'info' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* IMDb Official Verified Banner & Storyline Box */}
              <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#F5C518]/10 via-black/40 to-white/[0.02] border border-[#F5C518]/20 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="bg-[#F5C518] text-black font-black text-xs px-2 py-0.5 rounded font-sans tracking-wide shadow-sm">
                      IMDb
                    </span>
                    <div>
                      <h4 className="text-xs font-semibold text-white tracking-wide flex items-center gap-1.5">
                        {t('imdbOfficialData')}
                        {loadingImdb && (
                          <span className="text-[10px] text-brand-gold animate-pulse font-normal">
                            • {t('syncing')}
                          </span>
                        )}
                      </h4>
                      {activeImdbId && (
                        <span className="text-[11px] text-slate-400 font-mono">
                          ID: {activeImdbId}
                        </span>
                      )}
                    </div>
                  </div>

                  <a
                    href={activeImdbUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#F5C518] hover:bg-[#e0b415] text-black font-semibold text-xs transition-all shadow-md hover:scale-105"
                  >
                    <span>{t('openOfficialImdb')}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Synopsis Language / Source Toggle */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xs font-sans tracking-[0.2em] uppercase text-brand-champagne font-semibold flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5" />
                      {t('fullSynopsis')}
                      {isTranslatingSynopsis && (
                        <span className="text-[10px] text-brand-champagne font-normal animate-pulse">
                          • {language === 'en' ? 'Translating...' : 'Menerjemahkan sinopsis...'}
                        </span>
                      )}
                    </h3>

                    <div className="flex items-center bg-black/50 border border-white/10 rounded-full p-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          playClick();
                          setSynopsisActiveLang('id');
                        }}
                        className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                          synopsisActiveLang === 'id'
                            ? 'bg-[#E50914] text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        🇮🇩 {t('showIndo')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          playClick();
                          setSynopsisActiveLang('en');
                        }}
                        className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all flex items-center gap-1 ${
                          synopsisActiveLang === 'en'
                            ? 'bg-[#F5C518] text-black font-semibold shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="bg-[#F5C518] text-black text-[9px] px-1 py-0.2 rounded font-black">
                          EN
                        </span>
                        <span>{t('imdbStoryline')}</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-sm sm:text-base text-slate-200 font-light leading-relaxed max-w-5xl transition-all duration-300">
                    {synopsisActiveLang === 'en' && activeImdbPlot
                      ? activeImdbPlot
                      : (autoSynopsis || media.synopsis)}
                  </p>
                </div>

                {/* Additional IMDb Highlights */}
                {(activeWriter || activeAwards || activeImdbVotes) && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-white/[0.06] text-xs">
                    {activeWriter && (
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        <span className="text-slate-500 block mb-1">{t('writer')}</span>
                        <span className="text-white font-medium">{activeWriter}</span>
                      </div>
                    )}
                    {activeAwards && (
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        <span className="text-slate-500 block mb-1">{t('awards')}</span>
                        <span className="text-[#F5C518] font-medium flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 shrink-0" />
                          {activeAwards}
                        </span>
                      </div>
                    )}
                    {activeImdbVotes && (
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        <span className="text-slate-500 block mb-1">{t('imdbAudienceVotes')}</span>
                        <span className="text-white font-medium flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5 fill-[#F5C518] text-[#F5C518]" />
                          {activeImdbRating.toFixed(1)} / 10 ({activeImdbVotes})
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Technical Specifications */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-xs">
                <div>
                  <span className="text-slate-500 block mb-1">{t('director')}</span>
                  {activeDirector ? (
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm font-medium text-white">
                      {splitMultipleNames(activeDirector).map((dir, idx, arr) => (
                        <React.Fragment key={dir}>
                          <button
                            onClick={() => handleOpenCuration({ type: 'director', name: dir })}
                            onMouseEnter={playHover}
                            className="group inline-flex items-center gap-1 hover:text-brand-champagne transition-all cursor-pointer"
                            title={language === 'en' ? `View all titles directed by ${dir}` : `Lihat semua film karya ${dir}`}
                          >
                            <span className="underline decoration-white/20 group-hover:decoration-brand-gold underline-offset-4 transition-colors">
                              {dir}
                            </span>
                            <Clapperboard className="w-3 h-3 text-brand-gold/70 group-hover:text-brand-gold transition-colors shrink-0" />
                          </button>
                          {idx < arr.length - 1 && <span className="text-slate-500 font-normal">,</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  ) : (
                    <span className="font-medium text-white text-sm">-</span>
                  )}
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">{t('country')}</span>
                  {media.country ? (
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm font-medium text-white">
                      {splitMultipleNames(media.country).map((cntry, idx, arr) => (
                        <React.Fragment key={cntry}>
                          <button
                            onClick={() => handleOpenCuration({ type: 'country', name: cntry })}
                            onMouseEnter={playHover}
                            className="group inline-flex items-center gap-1 hover:text-brand-champagne transition-all cursor-pointer"
                            title={language === 'en' ? `Explore all titles from ${cntry}` : `Jelajahi semua film dari ${cntry}`}
                          >
                            <span className="underline decoration-white/20 group-hover:decoration-brand-gold underline-offset-4 transition-colors">
                              {cntry}
                            </span>
                            <Globe className="w-3 h-3 text-brand-gold/70 group-hover:text-brand-gold transition-colors shrink-0" />
                          </button>
                          {idx < arr.length - 1 && <span className="text-slate-500 font-normal">,</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  ) : (
                    <span className="font-medium text-white text-sm">-</span>
                  )}
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">{t('audioFormat')}</span>
                  <span className="font-medium text-brand-champagne text-sm flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5" />
                    {media.audioTracks ? media.audioTracks.join(', ') : 'Dolby Atmos'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">{t('subtitles')}</span>
                  <span className="font-medium text-brand-champagne text-sm">{media.subtitles.join(', ')}</span>
                </div>
              </div>

              {/* Cast Members */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-sans tracking-[0.2em] uppercase text-slate-400 font-semibold">
                    {t('mainCast')}
                  </h3>
                  <span className="text-[10px] font-mono text-slate-500">
                    {language === 'en' ? 'Click cast to view filmography' : 'Klik pemeran untuk lihat filmografi'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
                  {media.cast.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => handleOpenCuration({ type: 'cast', name: c.name, avatar: c.avatar, role: c.role })}
                      onMouseEnter={playHover}
                      className="group flex flex-col items-center text-center p-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-brand-gold/50 hover:bg-white/[0.04] hover:shadow-glow-gold/15 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
                      title={language === 'en' ? `Explore filmography of ${c.name}` : `Lihat filmografi ${c.name}`}
                    >
                      <div className="relative mb-2.5">
                        <img
                          src={c.avatar}
                          alt={c.name}
                          className="w-14 h-14 rounded-full object-cover border border-white/10 group-hover:border-brand-gold/70 shadow-md group-hover:scale-105 transition-all duration-300"
                        />
                        <div className="absolute inset-0 rounded-full bg-brand-gold/15 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Film className="w-4 h-4 text-brand-gold drop-shadow" />
                        </div>
                      </div>
                      <div className="font-medium text-xs text-white group-hover:text-brand-champagne truncate w-full transition-colors">
                        {c.name}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate w-full font-light mt-0.5">
                        {c.role}
                      </div>
                      <span className="text-[9px] font-mono text-brand-gold/80 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                        {language === 'en' ? 'Filmography ↗' : 'Filmografi ↗'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Official YouTube Trailer */}
          {activeTab === 'trailer' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="p-5 sm:p-7 rounded-3xl bg-gradient-to-br from-red-600/10 via-black/50 to-white/[0.02] border border-red-500/25 space-y-5 shadow-2xl">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
                  <div>
                    <h3 className="text-base sm:text-xl font-display font-medium text-white flex items-center gap-2.5">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-600 text-white text-xs font-black shadow-md">
                        ▶
                      </span>
                      {t('officialTrailerTitle')}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
                      {t('officialTrailerDesc')}
                    </p>
                  </div>

                  <a
                    href={trailerInfo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={playClick}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-all shadow-md hover:scale-105"
                  >
                    <span>{t('watchOnYoutube')}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {trailerInfo.key ? (
                  <div className="relative aspect-video w-full max-w-5xl mx-auto rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${trailerInfo.key}?rel=0&modestbranding=1&autoplay=1`}
                      title={`${displayTitle} Official Trailer`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full border-0"
                    />
                  </div>
                ) : (
                  <div className="aspect-video w-full max-w-5xl mx-auto rounded-2xl border border-white/10 bg-black/60 flex flex-col items-center justify-center text-center p-8 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center text-2xl shadow-inner">
                      🎬
                    </div>
                    <div>
                      <h4 className="text-white font-medium text-base mb-1">{displayTitle}</h4>
                      <p className="text-xs text-slate-400 max-w-md">{t('noTrailerAvailable')}</p>
                    </div>
                    <a
                      href={trailerInfo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={playClick}
                      className="px-5 py-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-lg"
                    >
                      <span>{t('watchOnYoutube')}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 4: Official Review Portals & Reviews */}
          {activeTab === 'reviews' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Official Aggregation Hub: 5 Official Portals */}
              <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-white/[0.04] via-black/40 to-white/[0.02] border border-white/[0.08] space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-display font-medium text-white flex items-center gap-2">
                      <Globe className="w-4 h-4 text-brand-gold" />
                      {t('officialPortalsHub')}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                      {t('officialPortalsDesc')}
                    </p>
                  </div>

                  {loadingPortalReviews && (
                    <div className="flex items-center gap-2 text-xs text-brand-champagne/80 font-light">
                      <span className="w-2 h-2 rounded-full bg-brand-gold animate-pulse" />
                      <span>{t('updatingRecs')}</span>
                    </div>
                  )}
                </div>

                {/* 5 Official Portals Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                  {portalBadges.map((badge) => (
                    <a
                      key={badge.id}
                      href={badge.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={playClick}
                      onMouseEnter={playHover}
                      className={`p-4 rounded-xl border transition-all duration-300 flex flex-col justify-between group hover:scale-[1.02] ${badge.badgeBg} ${badge.badgeBorder}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {renderPortalIcon(badge.id)}
                          <span className="text-xs font-semibold text-white tracking-wide">{badge.name}</span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
                      </div>

                      <div className="my-2">
                        <div className={`text-xl font-bold font-mono tracking-tight ${badge.textColor}`}>
                          {badge.scoreText}
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium mt-0.5">{badge.scoreLabel}</div>
                      </div>

                      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px]">
                        <span className="text-slate-400 truncate max-w-[120px]">{badge.tagline}</span>
                        <span className="text-brand-champagne group-hover:underline flex items-center gap-0.5 shrink-0 ml-1">
                          {t('visitPortal')} ↗
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              {/* Filter Pills Bar */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-b border-white/[0.06] pb-4">
                <button
                  type="button"
                  onClick={() => { playClick(); setSelectedPortalFilter('all'); }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    selectedPortalFilter === 'all'
                      ? 'bg-white text-black font-bold shadow-md'
                      : 'bg-white/[0.04] text-neutral-300 hover:text-white border border-white/10'
                  }`}
                >
                  {t('allPortals')} ({portalReviews.length + reviewsList.length})
                </button>

                <button
                  type="button"
                  onClick={() => { playClick(); setSelectedPortalFilter('rottentomatoes'); }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                    selectedPortalFilter === 'rottentomatoes'
                      ? 'bg-red-500 text-white font-semibold'
                      : 'bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.06]'
                  }`}
                >
                  <span>🍅</span>
                  <span>Rotten Tomatoes</span>
                  <span className="text-[10px] opacity-75">
                    ({portalReviews.filter((r) => r.portalId === 'rottentomatoes').length})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => { playClick(); setSelectedPortalFilter('imdb'); }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                    selectedPortalFilter === 'imdb'
                      ? 'bg-[#F5C518] text-black font-semibold'
                      : 'bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.06]'
                  }`}
                >
                  <span className="bg-[#F5C518] text-black px-1 rounded text-[9px] font-black">IMDb</span>
                  <span>IMDb</span>
                  <span className="text-[10px] opacity-75">
                    ({portalReviews.filter((r) => r.portalId === 'imdb').length})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => { playClick(); setSelectedPortalFilter('metacritic'); }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                    selectedPortalFilter === 'metacritic'
                      ? 'bg-emerald-500 text-cinema-950 font-semibold'
                      : 'bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.06]'
                  }`}
                >
                  <span className="bg-[#33cc33] text-black w-3.5 h-3.5 rounded-full text-[9px] font-black inline-flex items-center justify-center">M</span>
                  <span>Metacritic</span>
                  <span className="text-[10px] opacity-75">
                    ({portalReviews.filter((r) => r.portalId === 'metacritic').length})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => { playClick(); setSelectedPortalFilter('letterboxd'); }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                    selectedPortalFilter === 'letterboxd'
                      ? 'bg-orange-500 text-cinema-950 font-semibold'
                      : 'bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.06]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
                  <span>Letterboxd</span>
                  <span className="text-[10px] opacity-75">
                    ({portalReviews.filter((r) => r.portalId === 'letterboxd').length})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => { playClick(); setSelectedPortalFilter('montasefilm'); }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                    selectedPortalFilter === 'montasefilm'
                      ? 'bg-cyan-500 text-cinema-950 font-semibold'
                      : 'bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.06]'
                  }`}
                >
                  <span className="text-[10px]">🎬</span>
                  <span>Montase Film</span>
                  <span className="text-[10px] opacity-75">
                    ({portalReviews.filter((r) => r.portalId === 'montasefilm').length})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => { playClick(); setSelectedPortalFilter('user'); }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                    selectedPortalFilter === 'user'
                      ? 'bg-brand-champagne text-cinema-950 font-semibold'
                      : 'bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.06]'
                  }`}
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>{t('userReviewsTab')}</span>
                  <span className="text-[10px] opacity-75">({reviewsList.length})</span>
                </button>
              </div>

              {/* Auto-Translate Status Indicator Banner */}
              {portalReviews.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-gold/10 via-brand-gold/5 to-transparent border border-brand-gold/20 text-xs">
                  <div className="flex items-center gap-2 text-brand-champagne">
                    <Globe className="w-4 h-4 text-brand-gold shrink-0" />
                    <span>
                      {language === 'id'
                        ? isAutoTranslatingReviews
                          ? 'Sedang menerjemahkan ulasan kritikus ke Bahasa Indonesia secara otomatis...'
                          : 'Ulasan resmi internasional otomatis diterjemahkan ke Bahasa Indonesia'
                        : 'Authentic reviews displayed in original language (English)'}
                    </span>
                    {isAutoTranslatingReviews && <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-gold shrink-0" />}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {language === 'id'
                      ? 'Klik “Teks Asli (EN)” untuk membaca ulasan asli pengulas.'
                      : 'Click “Translate to ID” on any card to view Indonesian translation.'}
                  </span>
                </div>
              )}

              {/* Reviews List */}
              <div className="space-y-4">
                {/* Official Portal Reviews */}
                {portalReviews
                  .filter((rev) => selectedPortalFilter === 'all' || selectedPortalFilter === rev.portalId)
                  .map((rev) => {
                    const isManualOverride = !!manualViewOriginal[rev.id];
                    // If language is 'id', show translated by default unless user toggled manual override
                    // If language is 'en', show original by default unless user toggled manual override
                    const showTranslated = language === 'id' ? !isManualOverride : isManualOverride;
                    const hasTranslation = !!translatedReviews[rev.id];
                    const isCurrentlyTranslated = showTranslated && hasTranslation;
                    const isTranslatingThis =
                      translatingReviewId === rev.id ||
                      (showTranslated && isAutoTranslatingReviews && !hasTranslation);
                    const displayText = isCurrentlyTranslated ? translatedReviews[rev.id] : rev.content;

                    return (
                      <div
                        key={rev.id}
                        className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3.5 hover:border-white/[0.12] transition-all"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={rev.avatar}
                              alt={rev.author}
                              className="w-10 h-10 rounded-full object-cover border border-white/10 shadow-sm"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm text-slate-200">{rev.author}</span>
                                {rev.isCriticConsensus && (
                                  <span className="px-2 py-0.5 rounded-full bg-brand-gold/15 text-brand-gold text-[10px] font-semibold border border-brand-gold/30">
                                    ★ {t('verifiedCriticReview')}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                <div className="flex items-center gap-1">
                                  {renderPortalIcon(rev.portalId)}
                                  <span className="font-light">{rev.publication}</span>
                                </div>
                                <span>•</span>
                                <span>{rev.date}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${rev.badgeBg} ${rev.badgeBorder} ${rev.textColor}`}>
                              {rev.originalScoreText}
                            </span>
                            <div className="flex items-center gap-0.5 text-brand-gold">
                              {Array.from({ length: rev.ratingValue }).map((_, i) => (
                                <Star key={i} className="w-3.5 h-3.5 fill-brand-gold" />
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Review Body */}
                        <div className="space-y-2">
                          <p className="text-xs sm:text-sm text-slate-300 font-light leading-relaxed whitespace-pre-line">
                            &ldquo;{displayText}&rdquo;
                          </p>

                          {/* Translation Badge indicator if translated */}
                          {isCurrentlyTranslated && (
                            <div className="flex items-center gap-1.5 text-[11px] text-brand-champagne/90 bg-brand-gold/10 px-2.5 py-0.5 rounded-md border border-brand-gold/20 w-fit">
                              <Globe className="w-3 h-3 text-brand-gold" />
                              <span>{language === 'en' ? 'Translated to Indonesian' : 'Diterjemahkan otomatis ke Bahasa Indonesia'}</span>
                            </div>
                          )}
                          {isTranslatingThis && (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-white/[0.04] px-2.5 py-0.5 rounded-md border border-white/10 w-fit">
                              <Loader2 className="w-3 h-3 animate-spin text-brand-gold" />
                              <span>{language === 'en' ? 'Translating to Indonesian...' : 'Menerjemahkan ulasan ke Bahasa Indonesia...'}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.04] text-xs">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={playClick}
                              className="flex items-center gap-1.5 text-slate-400 hover:text-brand-champagne transition-colors"
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                              <span>{rev.likes} {t('appreciations')}</span>
                            </button>

                            {/* One-click inline translation button */}
                            <button
                              type="button"
                              onClick={() => {
                                playClick();
                                handleToggleTranslateReview(rev.id, rev.content);
                              }}
                              disabled={isTranslatingThis}
                              className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-brand-champagne transition-all"
                            >
                              {isTranslatingThis ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin text-brand-gold" />
                                  <span>{language === 'en' ? 'Translating...' : 'Menerjemahkan...'}</span>
                                </>
                              ) : (
                                <>
                                  <Globe className="w-3 h-3 text-brand-gold" />
                                  <span>
                                    {isCurrentlyTranslated
                                      ? (language === 'en' ? 'Show Original (EN)' : 'Teks Asli (EN)')
                                      : (language === 'en' ? 'Translate to ID' : 'Terjemahkan ke ID')}
                                  </span>
                                </>
                              )}
                            </button>
                          </div>

                          <a
                            href={rev.reviewUrl || rev.portalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={playClick}
                            className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors group text-[11px]"
                          >
                            <span>{t('openOnPortal')} {rev.portalName}</span>
                            <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                          </a>
                        </div>
                      </div>
                    );
                  })}

                {/* Empty State when no reviews match or none available */}
                {portalReviews.filter((rev) => selectedPortalFilter === 'all' || selectedPortalFilter === rev.portalId).length === 0 && !loadingPortalReviews && (
                  <div className="py-12 px-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center max-w-xl mx-auto space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-gold/10 border border-brand-gold/25 flex items-center justify-center mx-auto text-brand-gold">
                      <Globe className="w-6 h-6" />
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="text-base font-medium text-white">
                        {language === 'en' ? 'No Reviews Found in This Category' : 'Belum Ada Ulasan di Kategori Ini'}
                      </h4>
                      <p className="text-xs text-slate-400 font-light leading-relaxed">
                        {language === 'en'
                          ? 'Explore complete community reviews and critical discussions directly on the integrated portals:'
                          : 'Jelajahi ulasan lengkap para penikmat film dan kritikus langsung di portal resmi terkait:'}
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2 pt-1">
                      {portalBadges.map((b) => (
                        <a
                          key={b.id}
                          href={b.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={playClick}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs text-slate-300 hover:text-white transition-all"
                        >
                          <span>{b.name}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Audience Notes */}
                {(selectedPortalFilter === 'all' || selectedPortalFilter === 'user') && (
                  <div className="space-y-4 pt-2">
                    {reviewsList.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-2">
                          <MessageSquare className="w-3.5 h-3.5 text-brand-gold" />
                          {t('userReviewsTab')}
                        </h4>
                        {reviewsList.map((rev) => (
                          <div
                            key={rev.id}
                            className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] space-y-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <img
                                  src={rev.avatar}
                                  alt={rev.author}
                                  className="w-8 h-8 rounded-full object-cover border border-white/10"
                                />
                                <div>
                                  <div className="font-medium text-xs sm:text-sm text-slate-200">{rev.author}</div>
                                  <div className="text-[10px] text-slate-500">{rev.date}</div>
                                </div>
                              </div>

                              <div className="flex items-center gap-0.5 text-brand-gold">
                                {Array.from({ length: rev.rating }).map((_, i) => (
                                  <Star key={i} className="w-3.5 h-3.5 fill-brand-gold" />
                                ))}
                              </div>
                            </div>

                            <p className="text-xs sm:text-sm text-slate-300 font-light leading-relaxed">{rev.content}</p>

                            <div className="flex items-center gap-1 text-[11px] text-slate-500 pt-1">
                              <button
                                type="button"
                                onClick={playClick}
                                className="flex items-center gap-1.5 hover:text-brand-champagne transition-colors"
                              >
                                <ThumbsUp className="w-3 h-3" />
                                <span>{rev.likes} {t('appreciations')}</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Section 3: Recommended & Similar Titles in the same section */}
        {(isLoadingRecs || recommendations.length > 0) && (
          <section className="space-y-5 pt-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div>
                <h3 className="text-base sm:text-xl font-display font-medium text-white uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-champagne" />
                  {t('relatedCurated')}
                </h3>
                <p className="text-xs text-slate-400 font-light">
                  {t('recommendationsFor')} &ldquo;{displayTitle}&rdquo;
                </p>
              </div>

              {isLoadingRecs && (
                <div className="flex items-center gap-2 text-xs text-brand-champagne/80 font-light">
                  <span className="w-2 h-2 rounded-full bg-brand-gold animate-pulse" />
                  <span className="hidden sm:inline">{t('updatingRecs')}</span>
                </div>
              )}
            </div>

            {isLoadingRecs && recommendations.length === 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-[2/3] rounded-xl bg-white/[0.03] animate-pulse border border-white/5"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-5">
                {recommendations.map((rec) => (
                  <div key={rec.id} className="relative">
                    <MovieCard
                      media={rec}
                      onPlay={() => handleSelectRecommendation(rec)}
                      onOpenDetails={() => handleSelectRecommendation(rec)}
                    />
                    {loadingRecId === rec.id && (
                      <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px] rounded-xl flex flex-col items-center justify-center gap-2 z-20 pointer-events-none">
                        <div className="w-6 h-6 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
                        <span className="text-[10px] text-brand-champagne tracking-wider uppercase font-medium">
                          {t('loading')}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
        </div>
        )}

      </div>

      {/* Filmography & Country Curation Modal */}
      {!isMiniPlayer && (
        <FilmographyModal
          isOpen={isCurationOpen}
          onClose={() => setIsCurationOpen(false)}
          target={curationTarget}
          catalog={media ? (catalog.some((c) => c.id === media.id) ? catalog : [media, ...catalog]) : catalog}
          onSelectMedia={(selected) => {
            setIsCurationOpen(false);
            onPlayMedia(selected);
          }}
        />
      )}
    </div>
  );
};
