import React, { useState, useEffect, useRef, useMemo } from 'react';
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
} from 'lucide-react';
import type { MediaItem } from '../../types/media';
import {
  fetchTmdbTrending,
  getGenreNames,
} from '../../services/tmdb';
import { getAbsoluteWatchUrl, getMediaWatchUrl } from '../../utils/navigation';
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
    <section className="relative w-full max-w-[1720px] 2xl:max-w-[1880px] 3xl:max-w-[2200px] 4xl:max-w-[2600px] mx-auto px-4 sm:px-8 lg:px-12 3xl:px-16 py-8 sm:py-12 z-20">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-[#E50914]/5 blur-[120px] pointer-events-none -z-10" />

      {/* Main Search Bar Card */}
      <div className="relative w-full bg-[#181818]/95 backdrop-blur-2xl border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl shadow-black">
        <div className="max-w-3xl mx-auto flex flex-col items-center">
          {/* Multi-Database Connected Indicator */}
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] sm:text-[11px] font-mono tracking-widest uppercase text-neutral-300">
              {t('multiDatabaseConnected')}
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl md:text-3xl font-display font-black text-white text-center mb-6 tracking-wider uppercase">
            {language === 'en'
              ? 'Discover Global Cinema, Series & Anime'
              : 'Eksplorasi Sinema Dunia, Serial & Anime'}
          </h3>

          {/* Input Box */}
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-4 sm:pl-5 flex items-center pointer-events-none text-neutral-400">
              {isSearching ? (
                <Loader2 className="w-5 h-5 text-[#E50914] animate-spin" />
              ) : (
                <Search className="w-5 h-5 text-neutral-400" />
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
              className="w-full pl-12 sm:pl-14 pr-12 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-[#141414] border border-white/15 text-white placeholder:text-neutral-500 text-sm sm:text-base focus:outline-none focus:border-[#E50914] focus:ring-2 focus:ring-[#E50914]/20 shadow-inner font-light transition-all"
            />

            {query && (
              <button
                onClick={handleClearQuery}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-neutral-400 hover:text-white transition-colors"
                title={language === 'en' ? 'Clear search' : 'Hapus pencarian'}
                aria-label={language === 'en' ? 'Clear search' : 'Hapus pencarian'}
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-4 flex-wrap">
            <button
              onClick={() => handleSelectFilter('all')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border cursor-pointer ${
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
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border cursor-pointer ${
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
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border cursor-pointer ${
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
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border cursor-pointer ${
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
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-4">
            <span className="text-[11px] text-neutral-400 font-light flex items-center gap-1 mr-1">
              <Sparkles className="w-3 h-3 text-[#E50914]" />
              {language === 'en' ? 'Trending:' : 'Populer:'}
            </span>
            {POPULAR_SUGGESTIONS.map((tag) => (
              <button
                key={tag}
                onClick={() => handleSuggestionClick(tag)}
                onMouseEnter={playHover}
                className="px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-[#E50914]/20 text-neutral-300 hover:text-white border border-white/[0.08] hover:border-[#E50914]/40 text-[11px] font-sans transition-all cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="flex-1 mt-6">
        {/* Results Header Bar */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-6">
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
                <div className="p-1.5 rounded-lg bg-fuchsia-500/15 text-fuchsia-400">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-display font-black text-white tracking-wider uppercase">
                    {language === 'en' ? 'Top Trending Anime (MAL / Kitsu)' : 'Serial Anime Terpopuler Saat Ini'}
                  </h2>
                  <p className="text-[11px] text-neutral-400 font-light">
                    {language === 'en' ? 'Curated from global anime database' : 'Dihimpun dari database anime terkemuka dunia'}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="p-1.5 rounded-lg bg-[#E50914]/15 text-[#E50914]">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-display font-black text-white tracking-wider uppercase">
                    {language === 'en' ? 'Trending on TMDB Today' : 'Karya Tren Populer TMDB Hari Ini'}
                  </h2>
                  <p className="text-[11px] text-neutral-400 font-light">
                    {language === 'en' ? 'Most watched movies & series globally today' : 'Koleksi film dan serial paling banyak ditonton dunia hari ini'}
                  </p>
                </div>
              </>
            )}
          </div>

          <span className="text-xs font-mono font-bold text-white bg-[#E50914]/20 border border-[#E50914]/30 px-3 py-1 rounded-full">
            {displayItems.length} {language === 'en' ? 'Titles' : 'Judul'}
          </span>
        </div>

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
    <a
      href={getMediaWatchUrl(item.id)}
      onClick={(e) => {
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) {
          return;
        }
        e.preventDefault();
        if (!isLoadingThis) {
          handleSelectMedia(item, 'details');
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
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              playClick();
              const url = getAbsoluteWatchUrl(item.id);
              window.open(url, '_blank', 'noopener,noreferrer');
            }}
            className="w-full py-2 px-3 rounded-md bg-white/10 hover:bg-[#E50914] text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-all duration-150 hover:scale-105 cursor-pointer"
            title={t('openInNewTabTooltip') || (language === 'en' ? 'Open in new tab' : 'Buka di tab baru')}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'Open in New Tab' : 'Buka di Tab Baru'}</span>
          </button>

          {/* Add to Watchlist Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              handleWatchlistToggle(item, e);
            }}
            className={`w-full py-2 px-3 rounded-md font-medium text-xs flex items-center justify-center gap-1.5 transition-all duration-150 hover:scale-105 cursor-pointer ${
              isInWatchlist(item.id)
                ? 'bg-[#E50914] text-white font-bold'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title={isInWatchlist(item.id) ? t('removeWatchlistTooltip') : t('addWatchlistTooltip')}
          >
            {isInWatchlist(item.id) ? (
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
          {itemTitle}
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
    </a>
  );
};
