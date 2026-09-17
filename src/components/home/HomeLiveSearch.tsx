import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  X,
  Loader2,
  Film,
  Tv,
  Star,
  Play,
  Info,
  Flame,
  Sparkles,
  Clapperboard,
  Layers,
  Plus,
  Check,
  ExternalLink,
  ChevronDown,
  ArrowUp,
} from 'lucide-react';
import type { MediaItem } from '../../types/media';
import {
  fetchTmdbTrending,
  getGenreNames,
} from '../../services/tmdb';
import { getAbsoluteWatchUrl } from '../../utils/navigation';
import {
  searchHybrid,
  resolveToPlayableMediaItem,
  type UnifiedSearchResult,
} from '../../services/hybridSearch';
import { getSeriesStatus, formatGenres, getMediaTitle, getMediaPoster, getMediaBackdrop, formatMediaDuration } from '../../utils/formatters';
import { fetchTrendingAnime } from '../../services/anime';
import { useAutoTranslateSynopsis } from '../../services/translator';
import { useSound } from '../../context/SoundContext';
import { useLanguage } from '../../context/LanguageContext';
import { useWatchlist } from '../../context/WatchlistContext';

interface HomeLiveSearchProps {
  onPlayMedia: (media: MediaItem) => void;
  onOpenDetails: (media: MediaItem) => void;
}

const POPULAR_SUGGESTIONS = [
  'Dune: Part Two',
  'Deadpool & Wolverine',
  'Sousou no Frieren',
  'Shōgun',
  'The Last of Us',
  'Squid Game',
  'Solo Leveling',
  'Kimetsu no Yaiba',
  'Queen of Tears',
  'Oppenheimer',
  'Interstellar',
  'Breaking Bad',
  'Avatar',
];

const VALID_FILTERS = ['all', 'movie', 'tv', 'anime'] as const;
type MediaFilter = (typeof VALID_FILTERS)[number];

const getInitialFilter = (): MediaFilter => {
  if (typeof window !== 'undefined') {
    const pathOrHash = (window.location.pathname + window.location.hash).toLowerCase();
    if (pathOrHash.includes('movie') || pathOrHash.includes('film')) return 'movie';
    if (pathOrHash.includes('series') || pathOrHash.includes('tv')) return 'tv';
    if (pathOrHash.includes('anime')) return 'anime';
    if (pathOrHash.includes('all')) return 'all';

    try {
      const saved = localStorage.getItem('cinestream_homelive_filter');
      if (saved && (VALID_FILTERS as readonly string[]).includes(saved)) {
        return saved as MediaFilter;
      }
    } catch {
      // ignore
    }
  }
  return 'all';
};

export const HomeLiveSearch: React.FC<HomeLiveSearchProps> = ({
  onPlayMedia,
  onOpenDetails,
}) => {
  const { playClick, playHover, playWhoosh } = useSound();
  const { t, language } = useLanguage();
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<MediaFilter>(getInitialFilter);
  const [results, setResults] = useState<UnifiedSearchResult[]>([]);
  const [trending, setTrending] = useState<UnifiedSearchResult[]>([]);
  const [trendingAnime, setTrendingAnime] = useState<UnifiedSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingTrending, setIsLoadingTrending] = useState(true);
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<'play' | 'details' | null>(null);

  // Floating Pop Up Search Bar State & Refs
  const sectionRef = useRef<HTMLElement>(null);
  const searchCardRef = useRef<HTMLDivElement>(null);
  const floatingInputRef = useRef<HTMLInputElement>(null);
  const floatingContainerRef = useRef<HTMLDivElement>(null);
  const [showFloatingBar, setShowFloatingBar] = useState(false);
  const [isFloatingDropdownOpen, setIsFloatingDropdownOpen] = useState(true);
  const [floatingQuery, setFloatingQuery] = useState('');
  const [floatingResults, setFloatingResults] = useState<UnifiedSearchResult[]>([]);
  const [isFloatingSearching, setIsFloatingSearching] = useState(false);

  // Trending on TMDB Collapsible Dropdown State
  const [isTrendingOpen, setIsTrendingOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('cinestream_trending_open');
        if (saved !== null) {
          return saved === 'true';
        }
      } catch {
        // ignore
      }
    }
    return true;
  });

  const toggleTrendingDropdown = () => {
    playClick();
    setIsTrendingOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('cinestream_trending_open', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Close floating dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        floatingContainerRef.current &&
        !floatingContainerRef.current.contains(e.target as Node)
      ) {
        setIsFloatingDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Floating Pop Up Search Bar: appears when scrolling down past search bar, returns when scrolling back up to it
  useEffect(() => {
    const handleScroll = () => {
      if (searchCardRef.current) {
        const rect = searchCardRef.current.getBoundingClientRect();
        // Trigger as soon as the main search card scrolls behind the sticky navbar (~70px)
        const isPast = rect.bottom <= 70;
        setShowFloatingBar(isPast);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Keep activeFilter persisted in localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem('cinestream_homelive_filter', activeFilter);
    } catch {
      // ignore
    }
  }, [activeFilter]);

  // Load trending on mount
  useEffect(() => {
    let isMounted = true;
    const loadTrending = async () => {
      setIsLoadingTrending(true);
      try {
        const [tmdbData, animeData] = await Promise.allSettled([
          fetchTmdbTrending('day', language),
          fetchTrendingAnime(),
        ]);

        if (isMounted) {
          if (tmdbData.status === 'fulfilled') {
            const mappedTmdb: UnifiedSearchResult[] = tmdbData.value.map((item) => ({
              id: `tmdb-${item.mediaType}-${item.id}`,
              source: 'tmdb',
              title: item.title,
              titleId: item.titleId,
              titleEn: item.titleEn,
              originalTitle: item.originalTitle,
              mediaType: item.mediaType === 'movie' ? 'movie' : 'series',
              poster: item.poster,
              posterId: item.posterId,
              posterEn: item.posterEn,
              backdrop: item.backdrop,
              backdropId: item.backdropId,
              backdropEn: item.backdropEn,
              originCountry: item.originCountry,
              originalLanguage: item.originalLanguage,
              rating: item.rating,
              year: item.year,
              duration: item.duration,
              episodeDuration: item.episodeDuration,
              synopsis: item.synopsis,
              synopsisEn: item.synopsisEn,
              synopsisId: item.synopsisId,
              genreIds: item.genreIds,
              extraBadge: 'TMDB',
              tmdbId: item.id,
              status: item.status,
              isOngoing: item.isOngoing,
              totalEpisodes: item.totalEpisodes,
              releasedEpisodes: item.releasedEpisodes,
              currentSeasonTotalEpisodes: item.currentSeasonTotalEpisodes,
              currentSeasonReleasedEpisodes: item.currentSeasonReleasedEpisodes,
              nextEpisodeToAir: item.nextEpisodeToAir,
              totalSeasons: item.totalSeasons,
              currentSeason: item.currentSeason,
              completedSeasons: item.completedSeasons,
              ongoingSeason: item.ongoingSeason,
              seasonBreakdown: item.seasonBreakdown,
              seasons: item.seasons,
            }));
            setTrending(mappedTmdb);
          }

          if (animeData.status === 'fulfilled') {
            const mappedAnime: UnifiedSearchResult[] = animeData.value.map((a) => ({
              id: a.id,
              source: 'anime',
              title: a.title,
              originalTitle: a.japaneseTitle,
              romajiTitle: a.romajiTitle,
              mediaType: 'anime',
              poster: a.poster,
              backdrop: a.backdrop,
              rating: a.rating,
              year: a.year,
              duration: a.episodeLength ? `${a.episodeLength}m` : undefined,
              episodeDuration: a.episodeLength ? `${a.episodeLength}m / ep` : undefined,
              synopsis: a.synopsis,
              extraBadge: a.episodeCount ? `${a.episodeCount} Eps` : 'Anime / MAL',
              animeId: a.id,
            }));
            setTrendingAnime(mappedAnime);
          }
        }
      } catch (err) {
        console.error('Failed to load trending items:', err);
      } finally {
        if (isMounted) {
          setIsLoadingTrending(false);
        }
      }
    };

    loadTrending();
    return () => {
      isMounted = false;
    };
  }, [language]);

  // Debounced search
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const sourceMap: Record<MediaFilter, 'all' | 'tmdb' | 'anime' | 'tvmaze'> = {
          all: 'all',
          movie: 'tmdb',
          tv: 'tvmaze',
          anime: 'anime',
        };
        const data = await searchHybrid(trimmed, sourceMap[activeFilter], language);
        setResults(data);
      } catch (err) {
        console.error('Hybrid Search error:', err);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timeout);
  }, [query, activeFilter, language]);

  // When user is at the top (not using floating bar), sync floatingQuery with main in-place query
  useEffect(() => {
    if (!showFloatingBar) {
      setFloatingQuery(query);
    }
  }, [query, showFloatingBar]);

  // Debounced search specifically for floating pop-up search bar (independent from in-place main query)
  useEffect(() => {
    const trimmed = floatingQuery.trim();
    if (!trimmed) {
      setFloatingResults([]);
      setIsFloatingSearching(false);
      return;
    }

    setIsFloatingSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const sourceMap: Record<MediaFilter, 'all' | 'tmdb' | 'anime' | 'tvmaze'> = {
          all: 'all',
          movie: 'tmdb',
          tv: 'tvmaze',
          anime: 'anime',
        };
        const data = await searchHybrid(trimmed, sourceMap[activeFilter], language);
        setFloatingResults(data);
      } catch (err) {
        console.error('Floating hybrid search error:', err);
        setFloatingResults([]);
      } finally {
        setIsFloatingSearching(false);
      }
    }, 280);

    return () => clearTimeout(timeout);
  }, [floatingQuery, activeFilter, language]);

  // Filtered items based on 'all' | 'movie' | 'tv' | 'anime'
  const displayItems = useMemo(() => {
    if (query.trim()) {
      return results;
    }

    if (activeFilter === 'anime') {
      return trendingAnime;
    }

    const sourceItems = trending.filter((item) => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'movie') return item.mediaType === 'movie';
      if (activeFilter === 'tv') return item.mediaType === 'series';
      return true;
    });

    return sourceItems;
  }, [query, results, trending, trendingAnime, activeFilter]);

  const handleSelectMedia = async (
    item: UnifiedSearchResult,
    action: 'play' | 'details'
  ) => {
    playWhoosh();
    setLoadingItemId(item.id);
    setLoadingAction(action);

    try {
      const fullMedia = await resolveToPlayableMediaItem(item);
      if (fullMedia) {
        if (action === 'play') {
          onPlayMedia(fullMedia);
        } else {
          onOpenDetails(fullMedia);
        }
      }
    } catch (err) {
      console.error('Error fetching media details:', err);
    } finally {
      setLoadingItemId(null);
      setLoadingAction(null);
    }
  };

  const handleWatchlistToggle = async (
    item: UnifiedSearchResult,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    playClick();
    // If already in watchlist, just remove it
    if (isInWatchlist(item.id)) {
      toggleWatchlist(item.id);
      return;
    }

    const fallbackMedia: MediaItem = {
      id: item.id,
      title: item.title,
      titleId: item.titleId || item.title,
      titleEn: item.titleEn || item.title,
      type: item.mediaType === 'anime' ? 'anime' : item.mediaType === 'series' ? 'series' : 'movie',
      year: item.year || new Date().getFullYear(),
      releaseDate: `${item.year || new Date().getFullYear()}-01-01`,
      poster: item.poster || '',
      backdrop: item.backdrop || item.poster || '',
      rating: item.rating || 0,
      duration: item.duration || (item.mediaType === 'movie' ? '1h 45m' : '45m / ep'),
      quality: '1080p FHD',
      ageRating: '13+',
      genres: item.genres || [],
      country: 'Internasional',
      director: '',
      synopsis: item.synopsis || item.title,
      cast: [],
      servers: [],
      audioTracks: ['Original'],
      subtitles: ['Indonesia', 'English'],
    };

    // Resolve full media to persist properly in custom catalog and watchlistMediaMap
    try {
      const fullMedia = await resolveToPlayableMediaItem(item);
      if (fullMedia) {
        toggleWatchlist(fullMedia.id, fullMedia);
      } else {
        toggleWatchlist(item.id, fallbackMedia);
      }
    } catch (err) {
      console.error('Error resolving media for watchlist:', err);
      toggleWatchlist(item.id, fallbackMedia);
    }
  };

  const handleClearQuery = () => {
    playClick();
    setQuery('');
    setResults([]);
    inputRef.current?.focus();
  };

  const handleSelectFilter = (filter: MediaFilter) => {
    playClick();
    setActiveFilter(filter);
    try {
      localStorage.setItem('cinestream_homelive_filter', filter);
    } catch {
      // ignore
    }
  };

  const handleSuggestionClick = (keyword: string) => {
    playClick();
    setQuery(keyword);
    inputRef.current?.focus();
  };

  return (
    <section
      ref={sectionRef}
      className="relative w-full max-w-[1720px] 2xl:max-w-[1880px] 3xl:max-w-[2200px] 4xl:max-w-[2600px] mx-auto px-3.5 sm:px-8 lg:px-12 3xl:px-16 py-5 sm:py-8 z-20 transition-all duration-300"
    >
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-[#E50914]/5 blur-[120px] pointer-events-none -z-10" />

      {/* Floating Pop Up Search Bar (Appears when scrolling down past search bar, returns when scrolling back up) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div
            className={`fixed top-[62px] sm:top-[70px] lg:top-[78px] inset-x-0 z-[45] flex justify-center px-3 sm:px-6 pointer-events-none transition-all duration-300 ease-out ${
              showFloatingBar
                ? 'translate-y-0 opacity-100 scale-100'
                : '-translate-y-8 opacity-0 scale-95 pointer-events-none'
            }`}
          >
            <div
              ref={floatingContainerRef}
              className={`relative max-w-xl md:max-w-2xl w-full transition-all ${
                showFloatingBar ? 'pointer-events-auto' : 'pointer-events-none'
              }`}
            >
              <div className="w-full bg-[#161616]/95 backdrop-blur-2xl border border-white/20 hover:border-white/35 rounded-full px-3 sm:px-4 py-2 sm:py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.9),0_0_25px_rgba(229,9,20,0.3)] flex items-center gap-2 sm:gap-3 transition-all">
                {/* Glowing Red Search Icon / Spinner */}
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#E50914] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#E50914]/40">
                  {isFloatingSearching ? (
                    <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  )}
                </div>

                {/* Quick Search Input */}
                <input
                  ref={floatingInputRef}
                  type="text"
                  value={floatingQuery}
                  onChange={(e) => {
                    setFloatingQuery(e.target.value);
                    setIsFloatingDropdownOpen(true);
                  }}
                  onFocus={() => setIsFloatingDropdownOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const trimmed = floatingQuery.trim();
                      if (trimmed) {
                        setQuery(trimmed);
                        setIsFloatingDropdownOpen(false);
                        searchCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    } else if (e.key === 'Escape') {
                      setIsFloatingDropdownOpen(false);
                    }
                  }}
                  placeholder={
                    activeFilter === 'anime'
                      ? language === 'en'
                        ? 'Search anime...'
                        : 'Cari anime...'
                      : language === 'en'
                      ? 'Search movies, series...'
                      : 'Cari film, serial...'
                  }
                  className="flex-1 bg-transparent text-white placeholder:text-neutral-400 text-xs sm:text-sm font-light focus:outline-none min-w-0"
                />

                {/* Clear Button */}
                {floatingQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      setFloatingQuery('');
                      setFloatingResults([]);
                      floatingInputRef.current?.focus();
                    }}
                    className="p-1 text-neutral-400 hover:text-white transition-colors cursor-pointer shrink-0"
                    title={language === 'en' ? 'Clear' : 'Hapus'}
                    aria-label={language === 'en' ? 'Clear' : 'Hapus'}
                  >
                    <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                )}

                {/* Quick Filter Pills (visible on tablet/desktop) */}
                <div className="hidden sm:flex items-center gap-1 border-l border-white/10 pl-2 shrink-0">
                  {(['all', 'movie', 'tv', 'anime'] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => handleSelectFilter(filter)}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                        activeFilter === filter
                          ? filter === 'anime'
                            ? 'bg-fuchsia-600 text-white font-bold shadow-sm'
                            : filter === 'all'
                            ? 'bg-white text-black font-bold shadow-sm'
                            : 'bg-[#E50914] text-white font-bold shadow-sm shadow-[#E50914]/40'
                          : 'text-neutral-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {filter === 'all'
                        ? language === 'en'
                          ? 'All'
                          : 'Semua'
                        : filter === 'movie'
                        ? language === 'en'
                          ? 'Movies'
                          : 'Film'
                        : filter === 'tv'
                        ? language === 'en'
                          ? 'Series'
                          : 'Serial'
                        : 'Anime'}
                    </button>
                  ))}
                </div>

                {/* Jump to Main Search Bar Button */}
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    if (floatingQuery.trim()) {
                      setQuery(floatingQuery);
                    }
                    searchCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setTimeout(() => inputRef.current?.focus(), 400);
                  }}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-[#E50914] text-neutral-300 hover:text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                  title={language === 'en' ? 'Back to Search Card' : 'Kembali ke Kolom Pencarian'}
                  aria-label="Back to Search Card"
                >
                  <ArrowUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>

              {/* Quick Floating Live Search Results Pop-up Dropdown */}
              {floatingQuery.trim() && isFloatingDropdownOpen && (
                <div className="absolute top-full mt-2 inset-x-0 bg-[#181818]/98 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden p-2 space-y-1 z-50 max-h-[min(380px,calc(100vh-160px))] overflow-y-auto animate-fadeIn">
                  {isFloatingSearching ? (
                    <div className="py-6 flex items-center justify-center gap-2 text-xs text-neutral-400">
                      <Loader2 className="w-4 h-4 text-[#E50914] animate-spin" />
                      <span>{language === 'en' ? 'Searching...' : 'Mencari...'}</span>
                    </div>
                  ) : floatingResults.length > 0 ? (
                    <>
                      <div className="px-3 py-1 flex items-center justify-between text-[11px] text-neutral-400 font-mono border-b border-white/[0.06]">
                        <span>{language === 'en' ? 'Quick Results' : 'Hasil Cepat'}</span>
                        <span className="text-[#E50914]">{floatingResults.length} {language === 'en' ? 'found' : 'ditemukan'}</span>
                      </div>
                      {floatingResults.slice(0, 5).map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            setIsFloatingDropdownOpen(false);
                            handleSelectMedia(item, 'play');
                          }}
                          onMouseEnter={playHover}
                          className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer group"
                        >
                          <img
                            src={getMediaPoster(item, language)}
                            alt={getMediaTitle(item, language)}
                            className="w-10 h-14 object-cover rounded-lg shrink-0 shadow-sm"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-white group-hover:text-[#E50914] truncate transition-colors">
                              {getMediaTitle(item, language)}
                            </h4>
                            <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-mono mt-0.5">
                              <span>{item.year || 'N/A'}</span>
                              <span>•</span>
                              <span className="uppercase">{item.mediaType}</span>
                              {item.rating > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="text-amber-400">★ {item.rating.toFixed(1)}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsFloatingDropdownOpen(false);
                              handleSelectMedia(item, 'details');
                            }}
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-[#E50914] text-neutral-300 hover:text-white transition-colors cursor-pointer"
                            title={language === 'en' ? 'Details' : 'Detail'}
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          playClick();
                          setQuery(floatingQuery);
                          setIsFloatingDropdownOpen(false);
                          searchCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        className="w-full py-2 text-center text-xs text-[#E50914] hover:text-white font-semibold hover:bg-[#E50914]/20 rounded-xl transition-colors cursor-pointer mt-1"
                      >
                        {language === 'en'
                          ? `View all ${floatingResults.length} results in catalog ↓`
                          : `Lihat semua ${floatingResults.length} hasil di katalog ↓`}
                      </button>
                    </>
                  ) : (
                    <div className="py-6 text-center text-xs text-neutral-400">
                      {language === 'en' ? 'No matches found' : 'Tidak ada tayangan yang cocok'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* Main Search Bar Card */}
      <div
        ref={searchCardRef}
        className="relative w-full bg-[#181818]/95 backdrop-blur-2xl border border-white/10 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-2xl shadow-black mb-6"
      >
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          {/* Multi-Database Connected Indicator */}
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] sm:text-[11px] font-mono tracking-widest uppercase text-neutral-300">
              {t('multiDatabaseConnected')}
            </span>
          </div>

          <h3 className="text-lg sm:text-2xl md:text-3xl font-display font-black text-white text-center mb-4 sm:mb-6 tracking-wider uppercase">
            {language === 'en'
              ? 'Discover Global Cinema, Series & Anime'
              : 'Eksplorasi Sinema Dunia, Serial & Anime'}
          </h3>

          {/* Input Box */}
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 sm:pl-5 flex items-center pointer-events-none text-neutral-400">
              {isSearching ? (
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#E50914] animate-spin" />
              ) : (
                <Search className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-400" />
              )}
            </div>

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                activeFilter === 'anime'
                  ? language === 'en'
                    ? 'Search anime by Romaji, English, or Japanese (Frieren, Demon Slayer)...'
                    : 'Cari anime berdasarkan judul Romaji atau Jepang (Frieren, Kimetsu)...'
                  : t('searchPlaceholderMulti')
              }
              className="w-full pl-10 sm:pl-14 pr-10 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-[#141414] border border-white/15 text-white placeholder:text-neutral-500 text-xs sm:text-base focus:outline-none focus:border-[#E50914] focus:ring-2 focus:ring-[#E50914]/20 shadow-inner font-light transition-all"
            />

            {query && (
              <button
                onClick={handleClearQuery}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-white transition-colors"
                title={language === 'en' ? 'Clear search' : 'Hapus pencarian'}
                aria-label={language === 'en' ? 'Clear search' : 'Hapus pencarian'}
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-3.5 sm:mt-4 flex-wrap">
            <button
              onClick={() => handleSelectFilter('all')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-white text-black border-white font-bold shadow-md'
                  : 'bg-white/[0.06] text-neutral-300 border-white/[0.08] hover:bg-white/15 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{t('filterAll')}</span>
            </button>

            <button
              onClick={() => handleSelectFilter('movie')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border cursor-pointer ${
                activeFilter === 'movie'
                  ? 'bg-[#E50914] text-white border-[#E50914] font-bold shadow-glow-red'
                  : 'bg-white/[0.06] text-neutral-300 border-white/[0.08] hover:bg-white/15 hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>{t('filterMovies')}</span>
            </button>

            <button
              onClick={() => handleSelectFilter('tv')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border cursor-pointer ${
                activeFilter === 'tv'
                  ? 'bg-[#E50914] text-white border-[#E50914] font-bold shadow-glow-red'
                  : 'bg-white/[0.06] text-neutral-300 border-white/[0.08] hover:bg-white/15 hover:text-white'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>{t('filterSeries')}</span>
            </button>

            <button
              onClick={() => handleSelectFilter('anime')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border cursor-pointer ${
                activeFilter === 'anime'
                  ? 'bg-fuchsia-600 text-white border-fuchsia-600 font-bold shadow-md'
                  : 'bg-white/[0.06] text-neutral-300 border-white/[0.08] hover:bg-white/15 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>{t('badgeAnime')}</span>
            </button>
          </div>

          {/* Trending suggestions tags */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-3.5 sm:mt-4 w-full">
            <span className="text-[10px] sm:text-[11px] text-neutral-400 font-light flex items-center gap-1 mr-1 shrink-0">
              <Sparkles className="w-3 h-3 text-[#E50914] shrink-0" />
              <span>{language === 'en' ? 'Trending:' : 'Populer:'}</span>
            </span>
            {POPULAR_SUGGESTIONS.map((tag) => (
              <button
                key={tag}
                onClick={() => handleSuggestionClick(tag)}
                onMouseEnter={playHover}
                className="px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-[#E50914]/20 text-neutral-300 hover:text-white border border-white/[0.08] hover:border-[#E50914]/40 text-[10.5px] sm:text-[11px] font-sans transition-all cursor-pointer shrink-0 whitespace-nowrap"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="flex-1 mt-6">
        {/* Results / Trending Header Bar */}
        <div
          className={`flex items-center justify-between pb-3 mb-5 ${
            !query.trim() ? 'cursor-pointer select-none group' : ''
          }`}
          onClick={!query.trim() ? toggleTrendingDropdown : undefined}
        >
          <div className="flex items-center gap-2.5">
            {query.trim() ? (
              <>
                <div className="p-1.5 rounded-lg bg-[#E50914]/15 text-[#E50914]">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-display font-black text-white tracking-wide uppercase">
                    {language === 'en' ? 'Search Results for' : 'Hasil Pencarian untuk'}{' '}
                    <span className="text-[#E50914] font-bold">&ldquo;{query}&rdquo;</span>
                  </h2>
                </div>
              </>
            ) : activeFilter === 'anime' ? (
              <>
                <div className="p-2 rounded-xl bg-fuchsia-500/15 text-fuchsia-400 group-hover:scale-105 transition-transform">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-display font-black text-white group-hover:text-fuchsia-400 tracking-wider uppercase transition-colors">
                    {language === 'en' ? 'Top Trending Anime (MAL / Kitsu)' : 'Serial Anime Terpopuler Saat Ini'}
                  </h2>
                  <p className="text-[11px] text-neutral-400 font-light">
                    {language === 'en' ? 'Curated from global anime database' : 'Dihimpun dari database anime terkemuka dunia'}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="p-2 rounded-xl bg-[#E50914]/15 text-[#E50914] group-hover:scale-105 transition-transform">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-display font-black text-white group-hover:text-[#E50914] tracking-wider uppercase transition-colors">
                    {language === 'en' ? 'Trending on TMDB Today' : 'Karya Tren Populer TMDB Hari Ini'}
                  </h2>
                  <p className="text-[11px] text-neutral-400 font-light">
                    {language === 'en' ? 'Most watched movies & series globally today' : 'Koleksi film dan serial paling banyak ditonton dunia hari ini'}
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs font-mono font-bold text-white bg-[#E50914]/20 border border-[#E50914]/30 px-2.5 sm:px-3 py-1 rounded-full">
              {displayItems.length} {language === 'en' ? 'Titles' : 'Judul'}
            </span>

            {!query.trim() && isTrendingOpen && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTrendingDropdown();
                }}
                onMouseEnter={playHover}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.08] hover:bg-[#E50914] border border-white/10 text-xs font-semibold text-slate-200 hover:text-white transition-all cursor-pointer select-none"
                title={language === 'en' ? 'Collapse trending section' : 'Sembunyikan bagian trending'}
              >
                <span className="hidden sm:inline">
                  {language === 'en' ? 'Collapse' : 'Sembunyikan'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 rotate-180 text-neutral-300" />
              </button>
            )}
          </div>
        </div>

        {/* If user is not searching and trending is collapsed: display sleek compact dropdown bar */}
        {!query.trim() && !isTrendingOpen ? (
          <div
            onClick={toggleTrendingDropdown}
            onMouseEnter={playHover}
            className="w-full py-4 px-5 sm:px-6 rounded-2xl bg-[#181818]/70 hover:bg-[#202020] border border-white/10 hover:border-[#E50914]/40 flex items-center justify-between cursor-pointer transition-all duration-300 shadow-lg group select-none animate-fadeIn"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-[#E50914]/20 text-[#E50914] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-white group-hover:text-[#E50914] transition-colors">
                  {language === 'en'
                    ? `Click to view ${displayItems.length} trending titles`
                    : `Klik untuk menampilkan ${displayItems.length} karya tren populer`}
                </p>
                <p className="text-[11px] text-neutral-400 font-light">
                  {language === 'en'
                    ? 'Movies, series, and anime updated daily on TMDB'
                    : 'Film, serial, dan anime paling banyak ditonton hari ini'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 group-hover:bg-[#E50914] text-xs font-semibold text-neutral-300 group-hover:text-white transition-colors">
              <span>{language === 'en' ? 'Expand' : 'Tampilkan'}</span>
              <ChevronDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
            </div>
          </div>
        ) : (
          <div className="transition-all duration-500 ease-in-out animate-fadeIn">
            {/* Loading Skeleton */}
            {(isSearching || (isLoadingTrending && !query.trim())) && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8 4xl:grid-cols-9 gap-4 sm:gap-5">
                {Array.from({ length: 12 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col rounded-2xl overflow-hidden bg-cinema-900/60 border border-white/[0.05] animate-pulse"
                  >
                    <div className="aspect-[2/3] w-full bg-cinema-850" />
                    <div className="p-3.5 space-y-2">
                      <div className="h-4 bg-white/10 rounded w-3/4" />
                      <div className="h-3 bg-white/5 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* No Results State */}
            {!isSearching && !isLoadingTrending && displayItems.length === 0 && (
              <div className="py-20 text-center space-y-4 max-w-md mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-center mx-auto text-slate-600">
                  <Clapperboard className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-medium text-white">{t('noResultsTitle')}</h3>
                  <p className="text-xs text-slate-400 font-light">
                    {t('noResultsDesc')}
                  </p>
                </div>
                <button
                  onClick={handleClearQuery}
                  className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  {t('backToTrending')}
                </button>
              </div>
            )}

            {/* Movie/Series Cards Grid */}
            {!isSearching && !isLoadingTrending && displayItems.length > 0 && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8 4xl:grid-cols-9 gap-4 sm:gap-5">
                  {displayItems.map((item) => (
                    <HomeLiveSearchCard
                      key={item.id}
                      item={item}
                      language={language}
                      isLoadingThis={loadingItemId === item.id}
                      loadingAction={loadingAction}
                      isInWatchlist={isInWatchlist}
                      handleSelectMedia={handleSelectMedia}
                      handleWatchlistToggle={handleWatchlistToggle}
                      playClick={playClick}
                      playHover={playHover}
                      t={t}
                    />
                  ))}
                </div>

                {!query.trim() && isTrendingOpen && (
                  <div className="flex justify-center mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        toggleTrendingDropdown();
                      }}
                      onMouseEnter={playHover}
                      className="flex items-center gap-2 px-5 py-2 rounded-full bg-[#181818]/90 hover:bg-[#E50914] border border-white/10 hover:border-[#E50914] text-xs font-semibold text-neutral-300 hover:text-white transition-all duration-200 cursor-pointer shadow-lg group select-none"
                    >
                      <ChevronDown className="w-3.5 h-3.5 rotate-180 group-hover:-translate-y-0.5 transition-transform" />
                      <span>{language === 'en' ? 'Collapse Trending' : 'Tutup Bagian Tren'}</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

interface HomeLiveSearchCardProps {
  item: UnifiedSearchResult;
  language: 'id' | 'en';
  isLoadingThis: boolean;
  loadingAction: 'play' | 'details' | null;
  isInWatchlist: (id: string) => boolean;
  handleSelectMedia: (item: UnifiedSearchResult, action: 'play' | 'details') => void;
  handleWatchlistToggle: (item: UnifiedSearchResult, e: React.MouseEvent) => void;
  playClick: () => void;
  playHover: () => void;
  t: (key: any) => string;
}

const HomeLiveSearchCard: React.FC<HomeLiveSearchCardProps> = ({
  item,
  language,
  isLoadingThis,
  loadingAction,
  isInWatchlist,
  handleSelectMedia,
  handleWatchlistToggle,
  playClick,
  playHover,
  t,
}) => {
  const rawGenres = item.genres || (item.genreIds ? getGenreNames(item.genreIds, language) : []);
  const genres = formatGenres(rawGenres, language);
  const seriesStatus = getSeriesStatus(item);
  const itemTitle = getMediaTitle(item as any, language) || item.title;
  const itemPoster = getMediaPoster(item as any, language) || item.poster;
  const durationLabel = formatMediaDuration(item as any, language);
  const { synopsis: autoCardSynopsis } = useAutoTranslateSynopsis(item as any, language);
  const displaySynopsis = autoCardSynopsis || (language === 'en' ? (item.synopsisEn || item.synopsis) : (item.synopsisId || item.synopsis));

  return (
    <div
      role="article"
      tabIndex={0}
      onClick={(e) => {
        if (e.ctrlKey || e.metaKey || e.shiftKey) {
          window.open(getAbsoluteWatchUrl(item.id), '_blank', 'noopener,noreferrer');
          return;
        }
        if (!isLoadingThis) {
          handleSelectMedia(item, 'details');
        }
      }}
      onAuxClick={(e) => {
        if (e.button === 1) {
          e.preventDefault();
          window.open(getAbsoluteWatchUrl(item.id), '_blank', 'noopener,noreferrer');
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (!isLoadingThis) {
            handleSelectMedia(item, 'details');
          }
        }
      }}
      onMouseEnter={playHover}
      className="group relative flex flex-col rounded-md sm:rounded-lg overflow-hidden cursor-pointer select-none transition-all duration-300 hover:-translate-y-1.5 hover:shadow-netflix-card border border-white/10 hover:border-white/30 bg-[#181818] block no-underline text-inherit"
    >
      {/* Poster Image Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#141414]">
        {itemPoster ? (
          <img
            src={itemPoster}
            alt={itemTitle}
            loading="lazy"
            onError={(e) => {
              const fallback = getMediaBackdrop(item as any, language) || item.backdrop;
              if (fallback) {
                (e.target as HTMLImageElement).src = fallback;
              }
            }}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 brightness-[0.92] group-hover:brightness-100 contrast-[1.05]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-neutral-900 text-neutral-500">
            <Film className="w-8 h-8" />
          </div>
        )}

        {/* Cinematic Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-black/20 to-black/30 opacity-60 group-hover:opacity-85 transition-opacity" />

        {/* Top Badges - Ultra-slim single row */}
        <div className="absolute top-2 inset-x-2 flex items-center justify-between pointer-events-none">
          {/* Media Type / Status Single Chip */}
          {seriesStatus?.isOngoing ? (
            <span className="text-[8.5px] uppercase font-sans tracking-wider px-2 py-0.5 rounded font-black backdrop-blur-md flex items-center gap-1 bg-amber-500 text-black shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
              <span>{seriesStatus.ongoingSeasonLabel || (seriesStatus.currentSeason ? `S${seriesStatus.currentSeason} ON GOING` : 'ON GOING')}</span>
            </span>
          ) : seriesStatus?.completedSeasonsLabel ? (
            <span className="text-[8.5px] uppercase font-sans tracking-wider px-2 py-0.5 rounded font-bold backdrop-blur-md flex items-center gap-1 bg-emerald-600 text-white shadow-sm">
              <span className="text-[9px] leading-none">✓</span>
              <span>{seriesStatus.completedSeasonsLabel}</span>
            </span>
          ) : (
            <span
              className={`text-[8.5px] uppercase font-sans tracking-widest px-2 py-0.5 rounded font-bold backdrop-blur-md shadow-sm ${
                item.source === 'anime' || item.mediaType === 'anime'
                  ? 'bg-fuchsia-600 text-white'
                  : item.mediaType === 'movie'
                  ? 'bg-[#E50914] text-white'
                  : 'bg-black/75 text-white border border-white/20'
              }`}
            >
              {item.source === 'anime' || item.mediaType === 'anime'
                ? t('badgeAnime')
                : item.mediaType === 'movie'
                ? t('badgeFilm')
                : t('badgeSeries')}
            </span>
          )}

          {/* Rating */}
          {item.rating > 0 && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-md border border-white/10 text-[9.5px] font-bold text-white shadow-sm">
              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
              <span>{item.rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Desktop-Only Hover Quick Action Buttons */}
        <div className="hidden md:flex absolute inset-0 flex-col items-center justify-center gap-2 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/75 backdrop-blur-[2px]">
          {/* Play Now Button (Solid White Netflix Button) */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isLoadingThis) {
                handleSelectMedia(item, 'play');
              }
            }}
            disabled={isLoadingThis}
            className="w-full py-2.5 px-3 rounded-md bg-white hover:bg-white/85 text-black font-black text-xs flex items-center justify-center gap-1.5 shadow-xl hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer"
            title={t('playNow')}
          >
            {isLoadingThis && loadingAction === 'play' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{language === 'en' ? 'Preparing...' : 'Menyiapkan...'}</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-black text-black" />
                <span>{t('playNow')}</span>
              </>
            )}
          </button>

          {/* Details Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isLoadingThis) {
                handleSelectMedia(item, 'details');
              }
            }}
            disabled={isLoadingThis}
            className="w-full py-2 px-3 rounded-md bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center justify-center gap-1.5 backdrop-blur-sm transition-all duration-150 hover:scale-105 cursor-pointer"
            title={t('viewDetails')}
          >
            {isLoadingThis && loadingAction === 'details' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{language === 'en' ? 'Loading...' : 'Memuat Data...'}</span>
              </>
            ) : (
              <>
                <Info className="w-3.5 h-3.5" />
                <span>{t('viewDetails')}</span>
              </>
            )}
          </button>

          {/* Open in New Tab Button */}
          <a
            href={getAbsoluteWatchUrl(item.id)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.stopPropagation();
              playClick();
            }}
            className="w-full py-2 px-3 rounded-md bg-white/10 hover:bg-[#E50914] text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-all duration-150 hover:scale-105 cursor-pointer no-underline"
            title={t('openInNewTabTooltip') || (language === 'en' ? 'Open in new tab' : 'Buka di tab baru')}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'Open in New Tab' : 'Buka di Tab Baru'}</span>
          </a>

          {/* Add to Watchlist Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              handleWatchlistToggle(item, e);
            }}
            className={`w-full py-2 px-3 rounded-md font-medium text-xs flex items-center justify-center gap-1.5 transition-all duration-150 hover:scale-105 cursor-pointer ${
              isInWatchlist(item.id)
                ? 'bg-[#E50914] text-white shadow-glow-red'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            {isInWatchlist(item.id) ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>{language === 'en' ? 'Saved to Watchlist' : 'Tersimpan'}</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 text-white" />
                <span>{t('addToWatchlist')}</span>
              </>
            )}
          </button>
        </div>

        {/* Mobile Quick Action Buttons (Compact, non-intrusive bottom-right controls on poster) */}
        <div className="md:hidden absolute bottom-2 right-2 z-10 flex items-center gap-1.5 pointer-events-auto">
          {/* Quick Bookmark Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleWatchlistToggle(item, e);
            }}
            className={`w-7 h-7 rounded-full flex items-center justify-center shadow-md backdrop-blur-md transition-all active:scale-90 ${
              isInWatchlist(item.id)
                ? 'bg-[#E50914] text-white shadow-glow-red'
                : 'bg-black/60 border border-white/25 text-white/90 active:bg-white/20'
            }`}
            title={isInWatchlist(item.id) ? t('removeWatchlistTooltip') : t('addWatchlistTooltip')}
          >
            {isInWatchlist(item.id) ? (
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            ) : (
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            )}
          </button>

          {/* Quick Play Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isLoadingThis) {
                handleSelectMedia(item, 'play');
              }
            }}
            disabled={isLoadingThis}
            className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-lg active:scale-90 transition-transform cursor-pointer"
            title={t('playNow')}
          >
            {isLoadingThis && loadingAction === 'play' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
            ) : (
              <Play className="w-3.5 h-3.5 ml-0.5 fill-black text-black" />
            )}
          </button>
        </div>
      </div>

      {/* Card Info Footer */}
      <div className="p-3 sm:p-3.5 flex flex-col justify-between gap-1">
        <h4 className="font-sans font-bold text-white text-xs sm:text-sm line-clamp-1 group-hover:text-red-400 transition-colors tracking-tight leading-snug">
          <a
            href={getAbsoluteWatchUrl(item.id)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                e.preventDefault();
                e.stopPropagation();
                if (!isLoadingThis) {
                  handleSelectMedia(item, 'details');
                }
              }
            }}
            className="hover:underline text-inherit no-underline"
          >
            {itemTitle}
          </a>
        </h4>

        <div className="flex items-center justify-between gap-2 min-w-0 text-[11px] font-medium mt-0.5">
          <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
            <span className="text-white/90 font-medium shrink-0">
              {item.year && item.year > 0 ? item.year : t('newRelease')}
            </span>
            <span className="text-neutral-500 shrink-0">•</span>
            <span className="text-neutral-400 truncate">{genres[0] || (item.source === 'anime' ? 'Anime' : (language === 'en' ? 'Movie' : 'Film'))}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {durationLabel ? (
              <span className="text-neutral-400 font-normal">
                {durationLabel}
              </span>
            ) : null}
            <span className="border border-white/40 text-[9px] font-bold text-white/90 px-1 py-0.2 rounded leading-none">HD</span>
          </div>
        </div>

        {displaySynopsis && (
          <p className="text-[10px] text-neutral-400 line-clamp-2 mt-1 font-light leading-relaxed">
            {displaySynopsis}
          </p>
        )}
      </div>
    </div>
  );
};
