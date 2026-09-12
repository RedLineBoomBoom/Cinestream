import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Search,
  Filter,
  Sparkles,
  Star,
  Calendar,
  Film,
  Globe,
  RotateCcw,
  X,
  Check,
  ArrowDownAZ,
  Clock,
  Layers,
  SlidersHorizontal,
  Eye,
  Loader2,
  FileText,
} from 'lucide-react';
import type { MediaItem } from '../../types/media';
import { MovieCard } from '../home/MovieCard';
import { useSound } from '../../context/SoundContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  searchAdvanced,
  ADVANCED_GENRES,
  ADVANCED_COUNTRIES,
  ADVANCED_YEARS,
  ADVANCED_RATINGS,
  ADVANCED_QUALITIES,
  ADVANCED_SORTS,
  type AdvancedFilterCriteria,
  type SortOption,
  type MediaTypeFilter,
  type SeriesStatusFilter,
} from '../../services/advancedSearch';

interface AdvancedSearchViewProps {
  onPlayMedia: (media: MediaItem) => void;
  onOpenDetails: (media: MediaItem) => void;
  catalog: MediaItem[];
}

interface PresetItem {
  id: string;
  labelId: string;
  labelEn: string;
  icon: string;
  apply: () => Partial<AdvancedFilterCriteria>;
}

export const AdvancedSearchView: React.FC<AdvancedSearchViewProps> = ({
  onPlayMedia,
  onOpenDetails,
  catalog,
}) => {
  const { playClick, playHover, playSuccess, playWhoosh } = useSound();
  const { language } = useLanguage();

  // Filter criteria state
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('popularity');
  const [mediaType, setMediaType] = useState<MediaTypeFilter>('all');
  const [seriesStatus, setSeriesStatus] = useState<SeriesStatusFilter>('all');
  const [quality, setQuality] = useState('all');
  const [year, setYear] = useState('all');
  const [minRating, setMinRating] = useState<number>(0);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);

  // Collapse/expand state for filter panel on mobile or desktop
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);

  // Results state
  const [results, setResults] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [fullSynopsisMode, setFullSynopsisMode] = useState(false);

  // Quick Discovery Presets
  const presets: PresetItem[] = useMemo(
    () => [
      {
        id: 'preset-trending-2026',
        labelId: '🔥 Tren Bioskop 2026',
        labelEn: '🔥 2026 Trending Cinema',
        icon: 'Flame',
        apply: () => ({
          mediaType: 'movie',
          year: '2026',
          sortBy: 'popularity',
          genres: [],
          countries: [],
          quality: 'all',
          seriesStatus: 'all',
          minRating: 0,
        }),
      },
      {
        id: 'preset-masterpiece-8',
        labelId: '⭐ IMDb 8.0+ Masterpiece',
        labelEn: '⭐ IMDb 8.0+ Masterpieces',
        icon: 'Star',
        apply: () => ({
          minRating: 8.0,
          sortBy: 'rating',
          mediaType: 'all',
          year: 'all',
          genres: [],
          countries: [],
          quality: 'all',
          seriesStatus: 'all',
        }),
      },
      {
        id: 'preset-action-hd',
        labelId: '🍿 Aksi Full HD',
        labelEn: '🍿 Action Full HD',
        icon: 'Film',
        apply: () => ({
          genres: ['Action'],
          quality: 'all',
          mediaType: 'movie',
          sortBy: 'popularity',
          countries: [],
          year: 'all',
          seriesStatus: 'all',
          minRating: 0,
        }),
      },
      {
        id: 'preset-anime-popular',
        labelId: '🌸 Anime Populer Jepang',
        labelEn: '🌸 Popular Anime',
        icon: 'Sparkles',
        apply: () => ({
          mediaType: 'anime',
          countries: ['JP'],
          sortBy: 'popularity',
          genres: [],
          quality: 'all',
          seriesStatus: 'all',
          year: 'all',
          minRating: 0,
        }),
      },
      {
        id: 'preset-kdrama',
        labelId: '🇰🇷 K-Drama Pilihan',
        labelEn: '🇰🇷 Curated K-Drama',
        icon: 'Tv',
        apply: () => ({
          mediaType: 'drama',
          countries: ['KR'],
          sortBy: 'popularity',
          genres: [],
          quality: 'all',
          seriesStatus: 'all',
          year: 'all',
          minRating: 0,
        }),
      },
      {
        id: 'preset-horror',
        labelId: '😱 Horor Paling Mencekam',
        labelEn: '😱 Spine-Chilling Horror',
        icon: 'Sparkles',
        apply: () => ({
          genres: ['Horror'],
          sortBy: 'rating',
          mediaType: 'movie',
          countries: [],
          quality: 'all',
          seriesStatus: 'all',
          year: 'all',
          minRating: 0,
        }),
      },
      {
        id: 'preset-ongoing-series',
        labelId: '🟢 Serial On-Going Terkini',
        labelEn: '🟢 On-Going TV Series',
        icon: 'Clock',
        apply: () => ({
          mediaType: 'series',
          seriesStatus: 'ongoing',
          sortBy: 'latest',
          genres: [],
          countries: [],
          quality: 'all',
          year: 'all',
          minRating: 0,
        }),
      },
    ],
    []
  );

  // Toggle genre in selection
  const handleToggleGenre = (genreName: string) => {
    playClick();
    setSelectedGenres((prev) =>
      prev.includes(genreName)
        ? prev.filter((g) => g !== genreName)
        : [...prev, genreName]
    );
  };

  // Toggle country in selection
  const handleToggleCountry = (countryCode: string) => {
    playClick();
    setSelectedCountries((prev) =>
      prev.includes(countryCode)
        ? prev.filter((c) => c !== countryCode)
        : [...prev, countryCode]
    );
  };

  // Reset all filters
  const handleResetFilters = () => {
    playWhoosh();
    setQuery('');
    setSortBy('popularity');
    setMediaType('all');
    setSeriesStatus('all');
    setQuality('all');
    setYear('all');
    setMinRating(0);
    setSelectedGenres([]);
    setSelectedCountries([]);
  };

  // Check if any filter is customized from default
  const hasActiveFilters = useMemo(() => {
    return (
      query.trim().length > 0 ||
      sortBy !== 'popularity' ||
      mediaType !== 'all' ||
      seriesStatus !== 'all' ||
      quality !== 'all' ||
      year !== 'all' ||
      minRating > 0 ||
      selectedGenres.length > 0 ||
      selectedCountries.length > 0
    );
  }, [
    query,
    sortBy,
    mediaType,
    seriesStatus,
    quality,
    year,
    minRating,
    selectedGenres,
    selectedCountries,
  ]);

  // Execute search / filter
  const executeFilter = useCallback(
    async (pageToFetch = 1, append = false) => {
      setIsLoading(true);
      if (!append) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      const criteria: AdvancedFilterCriteria = {
        query: query.trim() || undefined,
        sortBy,
        mediaType,
        seriesStatus,
        quality,
        year,
        minRating,
        genres: selectedGenres,
        countries: selectedCountries,
        page: pageToFetch,
        language,
      };

      try {
        const res = await searchAdvanced(criteria, catalog);
        if (append) {
          setResults((prev) => {
            const existingIds = new Set(prev.map((m) => (m.tmdbId ? `tmdb-${m.tmdbId}` : m.id)));
            const existingTitles = new Set(prev.map((m) => m.title.trim().toLowerCase()));

            const uniqueNew = res.items.filter((item) => {
              const idKey = item.tmdbId ? `tmdb-${item.tmdbId}` : item.id;
              const titleKey = item.title.trim().toLowerCase();
              if (existingIds.has(idKey) || existingTitles.has(titleKey)) return false;
              existingIds.add(idKey);
              existingTitles.add(titleKey);
              return true;
            });

            if (uniqueNew.length === 0) {
              setHasMore(false);
            } else {
              setHasMore(res.hasMore);
            }

            return [...prev, ...uniqueNew];
          });
        } else {
          setResults(res.items);
          setHasMore(res.hasMore);
        }
        setTotalCount((prev) => (append ? prev + res.items.length : res.totalCount));
        setCurrentPage(pageToFetch);
      } catch (err) {
        console.error('Failed to run advanced search:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [
      query,
      sortBy,
      mediaType,
      seriesStatus,
      quality,
      year,
      minRating,
      selectedGenres,
      selectedCountries,
      catalog,
      language,
    ]
  );

  // Initial fetch on mount
  useEffect(() => {
    executeFilter(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when user switches language in website
  const isFirstMountRef = useRef(true);
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }
    executeFilter(1, false);
  }, [language, executeFilter]);

  // Handle preset click
  const handleApplyPreset = (preset: PresetItem) => {
    playSuccess();
    const patch = preset.apply();
    if (patch.mediaType !== undefined) setMediaType(patch.mediaType);
    if (patch.year !== undefined) setYear(patch.year);
    if (patch.sortBy !== undefined) setSortBy(patch.sortBy);
    if (patch.minRating !== undefined) setMinRating(patch.minRating);
    if (patch.quality !== undefined) setQuality(patch.quality);
    if (patch.seriesStatus !== undefined) setSeriesStatus(patch.seriesStatus);
    if (patch.genres !== undefined) setSelectedGenres(patch.genres);
    if (patch.countries !== undefined) setSelectedCountries(patch.countries);
    setQuery('');

    // Trigger filter with preset values
    setTimeout(() => {
      executeFilter(1, false);
    }, 50);
  };

  return (
    <div className="pt-28 pb-20 px-4 sm:px-8 lg:px-12 3xl:px-16 max-w-[1760px] 2xl:max-w-[1920px] 3xl:max-w-[2200px] 4xl:max-w-[2600px] mx-auto space-y-8 min-h-screen">
      {/* Studio Banner Header */}
      <div className="relative overflow-hidden rounded-2xl bg-[#141414] border border-white/10 p-6 sm:p-8 shadow-2xl">
        {/* Glow ambient background accents */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#E50914]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-[#E50914]/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E50914]/15 border border-[#E50914]/30 text-white text-[11px] font-sans font-bold uppercase tracking-wider">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#E50914]" />
              <span>Cinema Discovery Hub</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-display font-black text-white tracking-wide uppercase">
              {language === 'en' ? 'Advanced Search & Multi-Filter' : 'Pencarian Lanjutan & Multi-Filter'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-normal max-w-2xl leading-relaxed">
              {language === 'en'
                ? 'Precision multi-criteria cinema engine. Filter across genres, origin countries, video qualities, release years, and verified IMDb ratings.'
                : 'Filter koleksi sinema dunia berdasarkan kombinasi multi-genre, negara produksi, kualitas video, tahun rilis, dan rating IMDb secara presisi.'}
            </p>
          </div>

          {/* Quick Counter Badge & Toggle Panel */}
          <div className="flex items-center gap-3 self-start lg:self-center">
            <div className="px-4 py-2 rounded-xl bg-[#181818] border border-white/10 backdrop-blur-md flex items-center gap-2.5 shadow-lg">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div className="text-left">
                <span className="text-[10px] font-sans text-slate-400 uppercase tracking-wider block">
                  {language === 'en' ? 'Found' : 'Ditemukan'}
                </span>
                <span className="text-sm font-mono font-bold text-white">
                  {totalCount} {language === 'en' ? 'Titles' : 'Karya'}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                playClick();
                setIsFilterPanelOpen((prev) => !prev);
              }}
              onMouseEnter={playHover}
              className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-2"
            >
              <Filter className="w-4 h-4 text-[#E50914]" />
              <span>
                {isFilterPanelOpen
                  ? language === 'en'
                    ? 'Hide Console'
                    : 'Tutup Filter'
                  : language === 'en'
                  ? 'Show Console'
                  : 'Buka Filter'}
              </span>
            </button>
          </div>
        </div>

        {/* 1-Click Discovery Presets Bar */}
        <div className="relative z-10 mt-6 pt-5 border-t border-white/[0.08]">
          <div className="flex items-center gap-2 mb-2.5 text-[11px] font-sans font-bold tracking-wider uppercase text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-[#E50914]" />
            <span>{language === 'en' ? 'Quick Curated Presets:' : 'Preset Rekomendasi Cepat (1-Klik):'}</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {presets.map((p) => (
              <button
                key={p.id}
                onClick={() => handleApplyPreset(p)}
                onMouseEnter={playHover}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-white/[0.04] hover:bg-[#E50914] hover:text-white border border-white/10 hover:border-[#E50914] text-slate-300 transition-all whitespace-nowrap flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <span>{language === 'en' ? p.labelEn : p.labelId}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Filter Console */}
      {isFilterPanelOpen && (
        <div className="rounded-2xl bg-[#181818]/90 border border-white/10 backdrop-blur-xl p-5 sm:p-7 shadow-2xl space-y-6">
          {/* Row 1: Keyword Input, Sort By, and Apply Button */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            {/* Search Keyword Input */}
            <div className="lg:col-span-4 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    playClick();
                    executeFilter(1, false);
                  }
                }}
                placeholder={
                  language === 'en'
                    ? 'Search by title, director, or actor...'
                    : 'Cari judul, sutradara, atau aktor...'
                }
                className="w-full bg-black/50 border border-white/10 focus:border-[#E50914] rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-[#E50914]/50 transition-all font-normal"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort By Pills */}
            <div className="lg:col-span-5 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              <span className="text-[10px] font-sans font-bold tracking-wider uppercase text-slate-400 mr-1 whitespace-nowrap">
                {language === 'en' ? 'Sort:' : 'Urutan:'}
              </span>
              {ADVANCED_SORTS.map((s) => {
                const isSelected = sortBy === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      playClick();
                      setSortBy(s.id as SortOption);
                    }}
                    onMouseEnter={playHover}
                    className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-white text-black font-bold shadow-md shadow-white/10'
                        : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white border border-white/10 font-medium'
                    }`}
                  >
                    {s.id === 'release_date' && <Calendar className="w-3 h-3" />}
                    {s.id === 'popularity' && <Eye className="w-3 h-3" />}
                    {s.id === 'rating' && <Star className="w-3 h-3" />}
                    {s.id === 'title' && <ArrowDownAZ className="w-3 h-3" />}
                    {s.id === 'latest' && <Clock className="w-3 h-3" />}
                    <span>{language === 'en' ? s.labelEn : s.labelId}</span>
                  </button>
                );
              })}
            </div>

            {/* Action Buttons: Filter Movies & Reset */}
            <div className="lg:col-span-3 flex items-center justify-end gap-2.5">
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  onMouseEnter={playHover}
                  title="Reset Semua Filter"
                  className="px-3.5 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-400 hover:text-white transition-all flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#E50914]" />
                  <span className="hidden sm:inline">{language === 'en' ? 'Reset' : 'Atur Ulang'}</span>
                </button>
              )}

              <button
                onClick={() => {
                  playClick();
                  executeFilter(1, false);
                }}
                onMouseEnter={playHover}
                className="flex-1 lg:flex-none px-6 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#F40612] text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#E50914]/30 hover:shadow-[#E50914]/50 transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Filter className="w-4 h-4 text-white" />
                )}
                <span>{language === 'en' ? 'FILTER MOVIES' : 'TERAPKAN FILTER'}</span>
              </button>
            </div>
          </div>

          {/* Row 2: Type, Series Status, Quality, Minimum Rating, Year */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-white/[0.08]">
            {/* 1. Type (Movie, Series, Anime, Drama) */}
            <div className="space-y-2">
              <label className="text-[11px] font-sans font-bold tracking-wider uppercase text-neutral-300 flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-[#E50914]" />
                <span>{language === 'en' ? 'Type' : 'Tipe Tayangan'}</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: language === 'en' ? 'All' : 'Semua' },
                  { id: 'movie', label: language === 'en' ? 'Movie' : 'Film' },
                  { id: 'series', label: language === 'en' ? 'Series' : 'Serial' },
                  { id: 'anime', label: 'Anime' },
                  { id: 'drama', label: 'Drama' },
                ].map((tItem) => {
                  const active = mediaType === tItem.id;
                  return (
                    <button
                      key={tItem.id}
                      onClick={() => {
                        playClick();
                        setMediaType(tItem.id as MediaTypeFilter);
                      }}
                      onMouseEnter={playHover}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        active
                          ? 'bg-[#E50914] text-white shadow-md shadow-[#E50914]/30'
                          : 'bg-white/[0.04] text-slate-400 hover:text-white border border-white/10'
                      }`}
                    >
                      {tItem.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Series Status (All, On-going, Completed) */}
            <div className="space-y-2">
              <label className="text-[11px] font-sans font-bold tracking-wider uppercase text-neutral-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#E50914]" />
                <span>{language === 'en' ? 'Series Status' : 'Status Serial'}</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: language === 'en' ? 'All' : 'Semua' },
                  { id: 'ongoing', label: language === 'en' ? '🟢 On-going' : '🟢 Sedang Berjalan' },
                  { id: 'completed', label: language === 'en' ? '✅ Completed' : '✅ Sudah Tamat' },
                ].map((sItem) => {
                  const active = seriesStatus === sItem.id;
                  return (
                    <button
                      key={sItem.id}
                      onClick={() => {
                        playClick();
                        setSeriesStatus(sItem.id as SeriesStatusFilter);
                      }}
                      onMouseEnter={playHover}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        active
                          ? 'bg-[#E50914] text-white shadow-md shadow-[#E50914]/30'
                          : 'bg-white/[0.04] text-slate-400 hover:text-white border border-white/10'
                      }`}
                    >
                      {sItem.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Quality (Bluray, HC Web-DL, HDTV, NF Web-DL, Web-DL, Full HD) */}
            <div className="space-y-2">
              <label className="text-[11px] font-sans font-bold tracking-wider uppercase text-neutral-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#E50914]" />
                <span>{language === 'en' ? 'Quality' : 'Kualitas'}</span>
              </label>
              <select
                value={quality}
                onChange={(e) => {
                  playClick();
                  setQuality(e.target.value);
                }}
                className="w-full bg-[#141414] border border-white/10 focus:border-[#E50914] rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
              >
                {ADVANCED_QUALITIES.map((q) => (
                  <option key={q.id} value={q.id} className="bg-[#181818] text-white">
                    {language === 'en' ? q.labelEn : q.labelId}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Release Year */}
            <div className="space-y-2">
              <label className="text-[11px] font-sans font-bold tracking-wider uppercase text-neutral-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#E50914]" />
                <span>{language === 'en' ? 'Release Year' : 'Tahun Rilis'}</span>
              </label>
              <select
                value={year}
                onChange={(e) => {
                  playClick();
                  setYear(e.target.value);
                }}
                className="w-full bg-[#141414] border border-white/10 focus:border-[#E50914] rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
              >
                {ADVANCED_YEARS.map((y) => (
                  <option key={y.id} value={y.id} className="bg-[#181818] text-white">
                    {language === 'en' ? y.labelEn : y.labelId}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Rating */}
            <div className="space-y-2">
              <label className="text-[11px] font-sans font-bold tracking-wider uppercase text-neutral-300 flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-[#E50914]" />
                <span>{language === 'en' ? 'Rating' : 'Rating'}</span>
              </label>
              <select
                value={minRating}
                onChange={(e) => {
                  playClick();
                  setMinRating(parseFloat(e.target.value) || 0);
                }}
                className="w-full bg-[#141414] border border-white/10 focus:border-[#E50914] rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
              >
                {ADVANCED_RATINGS.map((r) => (
                  <option key={r.value} value={r.value} className="bg-[#181818] text-white">
                    {language === 'en' ? r.labelEn : r.labelId}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Genres (Multi-Select Interactive Grid) */}
          <div className="pt-4 border-t border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-sans font-bold tracking-wider uppercase text-neutral-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#E50914]" />
                <span>
                  {language === 'en'
                    ? 'Genres (Multi-Select):'
                    : 'Pilih Genre (Bisa Pilih Banyak):'}
                </span>
                {selectedGenres.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-[#E50914]/20 text-white text-[10px] font-mono font-bold">
                    {selectedGenres.length} {language === 'en' ? 'selected' : 'dipilih'}
                  </span>
                )}
              </label>

              {selectedGenres.length > 0 && (
                <button
                  onClick={() => {
                    playClick();
                    setSelectedGenres([]);
                  }}
                  className="text-[11px] text-slate-400 hover:text-red-400 transition-colors"
                >
                  {language === 'en' ? 'Clear genres' : 'Hapus pilihan genre'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {ADVANCED_GENRES.map((g) => {
                const isSelected = selectedGenres.includes(g.nameEn);
                return (
                  <button
                    key={g.id}
                    onClick={() => handleToggleGenre(g.nameEn)}
                    onMouseEnter={playHover}
                    className={`px-3 py-1.5 rounded-xl text-xs text-left transition-all duration-200 flex items-center justify-between border ${
                      isSelected
                        ? 'bg-[#E50914]/20 border-[#E50914] text-white font-semibold shadow-sm shadow-[#E50914]/20'
                        : 'bg-white/[0.03] border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.07]'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <span>{g.icon}</span>
                      <span className="truncate">{language === 'en' ? g.nameEn : g.nameId}</span>
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#E50914] shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 4: Countries (Multi-Select Interactive Grid with Flags) */}
          <div className="pt-4 border-t border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-sans font-bold tracking-wider uppercase text-neutral-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#E50914]" />
                <span>
                  {language === 'en'
                    ? 'Country / Region (Multi-Select):'
                    : 'Negara / Wilayah Produksi (Bisa Pilih Banyak):'}
                </span>
                {selectedCountries.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-[#E50914]/20 text-white text-[10px] font-mono font-bold">
                    {selectedCountries.length} {language === 'en' ? 'selected' : 'dipilih'}
                  </span>
                )}
              </label>

              {selectedCountries.length > 0 && (
                <button
                  onClick={() => {
                    playClick();
                    setSelectedCountries([]);
                  }}
                  className="text-[11px] text-slate-400 hover:text-red-400 transition-colors"
                >
                  {language === 'en' ? 'Clear countries' : 'Hapus pilihan negara'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {ADVANCED_COUNTRIES.map((c) => {
                const isSelected = selectedCountries.includes(c.code);
                return (
                  <button
                    key={c.code}
                    onClick={() => handleToggleCountry(c.code)}
                    onMouseEnter={playHover}
                    className={`px-3 py-1.5 rounded-xl text-xs text-left transition-all duration-200 flex items-center justify-between border ${
                      isSelected
                        ? 'bg-[#E50914]/20 border-[#E50914] text-white font-semibold shadow-sm shadow-[#E50914]/20'
                        : 'bg-white/[0.03] border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.07]'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span className="text-base">{c.flag}</span>
                      <span className="truncate">{language === 'en' ? c.nameEn : c.nameId}</span>
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#E50914] shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 5: Active Filters Badges */}
          {hasActiveFilters && (
            <div className="pt-4 border-t border-white/[0.08] flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-sans font-bold tracking-wider uppercase text-slate-400 mr-1">
                {language === 'en' ? 'Active Filters:' : 'Filter Aktif:'}
              </span>

              {query && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#E50914]/15 border border-[#E50914]/30 text-xs text-red-200">
                  <span>"{query}"</span>
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-white"
                    onClick={() => setQuery('')}
                  />
                </span>
              )}

              {mediaType !== 'all' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#E50914]/15 border border-[#E50914]/30 text-xs text-red-200">
                  <span>
                    {language === 'en' ? 'Type' : 'Tipe'}:{' '}
                    {mediaType === 'movie'
                      ? language === 'en' ? 'Movie' : 'Film'
                      : mediaType === 'series'
                      ? language === 'en' ? 'Series' : 'Serial'
                      : mediaType.toUpperCase()}
                  </span>
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-white"
                    onClick={() => setMediaType('all')}
                  />
                </span>
              )}

              {seriesStatus !== 'all' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#E50914]/15 border border-[#E50914]/30 text-xs text-red-200">
                  <span>
                    {language === 'en' ? 'Status' : 'Status'}:{' '}
                    {seriesStatus === 'ongoing'
                      ? language === 'en' ? 'On-going' : 'Sedang Berjalan'
                      : language === 'en' ? 'Completed' : 'Sudah Tamat'}
                  </span>
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-white"
                    onClick={() => setSeriesStatus('all')}
                  />
                </span>
              )}

              {quality !== 'all' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#E50914]/15 border border-[#E50914]/30 text-xs text-red-200">
                  <span>
                    {language === 'en'
                      ? ADVANCED_QUALITIES.find((q) => q.id === quality)?.labelEn || quality.toUpperCase()
                      : ADVANCED_QUALITIES.find((q) => q.id === quality)?.labelId || quality.toUpperCase()}
                  </span>
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-white"
                    onClick={() => setQuality('all')}
                  />
                </span>
              )}

              {year !== 'all' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#E50914]/15 border border-[#E50914]/30 text-xs text-red-200">
                  <span>
                    {language === 'en'
                      ? ADVANCED_YEARS.find((y) => y.id === year)?.labelEn || year
                      : ADVANCED_YEARS.find((y) => y.id === year)?.labelId || year}
                  </span>
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-white"
                    onClick={() => setYear('all')}
                  />
                </span>
              )}

              {minRating > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#E50914]/15 border border-[#E50914]/30 text-xs text-red-200">
                  <span>
                    {language === 'en'
                      ? ADVANCED_RATINGS.find((r) => r.value === minRating)?.labelEn || `⭐ ${minRating}+`
                      : ADVANCED_RATINGS.find((r) => r.value === minRating)?.labelId || `⭐ ${minRating}+`}
                  </span>
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-white"
                    onClick={() => setMinRating(0)}
                  />
                </span>
              )}

              {selectedGenres.map((g) => {
                const gObj = ADVANCED_GENRES.find((gen) => gen.nameEn === g);
                return (
                  <span
                    key={g}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#E50914]/15 border border-[#E50914]/30 text-xs text-red-200"
                  >
                    <span>{language === 'en' ? g : gObj?.nameId || g}</span>
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-white"
                      onClick={() => handleToggleGenre(g)}
                    />
                  </span>
                );
              })}

              {selectedCountries.map((cCode) => {
                const countryObj = ADVANCED_COUNTRIES.find((ac) => ac.code === cCode);
                return (
                  <span
                    key={cCode}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#E50914]/15 border border-[#E50914]/30 text-xs text-red-200"
                  >
                    <span>
                      {countryObj?.flag} {(language === 'en' ? countryObj?.nameEn : countryObj?.nameId) || cCode}
                    </span>
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-white"
                      onClick={() => handleToggleCountry(cCode)}
                    />
                  </span>
                );
              })}

              <button
                onClick={handleResetFilters}
                className="text-xs text-slate-400 hover:text-red-400 underline ml-auto"
              >
                {language === 'en' ? 'Clear all' : 'Hapus semua filter'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Results Section */}
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-display font-black text-white tracking-wide uppercase">
              {language === 'en' ? 'Filter Results' : 'Hasil Filter Sinema'}
            </h2>
            <span className="text-xs font-mono text-white bg-[#E50914]/20 px-3 py-1 rounded-full border border-[#E50914]/40 font-bold">
              {results.length} {language === 'en' ? 'Loaded' : 'Ditampilkan'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Global Full Synopsis Toggle */}
            <button
              type="button"
              onClick={() => {
                playClick();
                setFullSynopsisMode((prev) => !prev);
              }}
              onMouseEnter={playHover}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                fullSynopsisMode
                  ? 'bg-[#E50914] text-white border-[#E50914] shadow-glow-red font-bold'
                  : 'bg-white/[0.04] text-slate-300 border-white/10 hover:bg-white/[0.08] hover:text-white hover:border-white/20'
              }`}
              title={
                fullSynopsisMode
                  ? (language === 'en' ? 'Click to show compact synopsis' : 'Klik untuk tampilan sinopsis ringkas')
                  : (language === 'en' ? 'Click to show full uncut synopsis for all cards' : 'Klik untuk tampilkan sinopsis lengkap tanpa terpotong untuk semua film')
              }
            >
              <FileText className="w-3.5 h-3.5" />
              <span>
                {fullSynopsisMode
                  ? (language === 'en' ? 'Full Synopsis: ON' : 'Sinopsis Penuh: AKTIF')
                  : (language === 'en' ? 'Expand All Synopses' : 'Tampilkan Sinopsis Penuh')}
              </span>
            </button>

            <div className="text-xs text-slate-400 font-light hidden sm:block">
              {language === 'en'
                ? 'Multi-Engine Failover Enabled'
                : '6 Jalur Pemutaran HD Aktif'}
            </div>
          </div>
        </div>

        {/* Loading Spinner */}
        {isLoading && results.length === 0 ? (
          <div className="py-24 text-center space-y-4">
            <Loader2 className="w-10 h-10 mx-auto text-[#E50914] animate-spin" />
            <p className="text-sm text-slate-400 font-normal">
              {language === 'en'
                ? 'Applying cinematic filters & querying databases...'
                : 'Menerapkan filter sinematik & menghubungkan basis data...'}
            </p>
          </div>
        ) : results.length === 0 ? (
          /* Empty State */
          <div className="py-20 text-center space-y-4 max-w-md mx-auto bg-[#181818]/80 rounded-2xl border border-white/10 p-8">
            <Filter className="w-12 h-12 mx-auto text-slate-600" />
            <h3 className="text-lg font-display font-black text-white tracking-wide uppercase">
              {language === 'en'
                ? 'No titles match these filter criteria'
                : 'Tidak ada karya yang sesuai dengan kriteria ini'}
            </h3>
            <p className="text-xs text-slate-400 font-normal leading-relaxed">
              {language === 'en'
                ? 'Try broadening your genre, year, or country selection, or use one of the quick presets above.'
                : 'Coba perluas pilihan genre, tahun, atau negara Anda, atau klik salah satu preset rekomendasi cepat di atas.'}
            </p>
            <button
              onClick={handleResetFilters}
              onMouseEnter={playHover}
              className="px-6 py-2.5 rounded-md bg-[#E50914] hover:bg-[#F40612] text-white text-xs font-bold shadow-lg shadow-[#E50914]/30 transition-all"
            >
              {language === 'en' ? 'Reset All Filters' : 'Atur Ulang Semua Filter'}
            </button>
          </div>
        ) : (
          /* Movie Cards Grid */
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8 4xl:grid-cols-9 gap-4 sm:gap-5">
              {results.map((item) => (
                <MovieCard
                  key={item.id}
                  media={item}
                  onPlay={onPlayMedia}
                  onOpenDetails={onOpenDetails}
                  showSynopsis={true}
                  forceFullSynopsis={fullSynopsisMode}
                />
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="pt-8 text-center">
                <button
                  onClick={() => executeFilter(currentPage + 1, true)}
                  disabled={isLoading}
                  onMouseEnter={playHover}
                  className="px-8 py-3 rounded-md bg-[#181818] hover:bg-[#242424] border border-white/15 text-xs font-bold text-white transition-all shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[#E50914]" />
                      <span>{language === 'en' ? 'Loading more titles...' : 'Memuat lebih banyak...'}</span>
                    </span>
                  ) : (
                    <span>{language === 'en' ? 'Load More Titles ↓' : 'Muat Lebih Banyak Karya ↓'}</span>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
