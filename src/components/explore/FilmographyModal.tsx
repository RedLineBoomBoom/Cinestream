import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Film,
  Tv,
  Search,
  Star,
  Play,
  Loader2,
  Globe,
  Calendar,
  MapPin,
  User,
  Clapperboard,
  Sparkles,
  Tag,
  ChevronDown,
  ChevronUp,
  Plus,
  Check,
  ExternalLink,
} from 'lucide-react';
import type { MediaItem } from '../../types/media';
import { useLanguage } from '../../context/LanguageContext';
import { useSound } from '../../context/SoundContext';
import { useWatchlist } from '../../context/WatchlistContext';
import { formatMediaDuration } from '../../utils/formatters';
import {
  type CurationTarget,
  type CurationCreditItem,
  type PersonProfile,
  type CountryProfile,
  type GenreProfile,
  fetchPersonFilmography,
  fetchCountryCatalog,
  fetchGenreCatalog,
  resolveCurationPlayableMedia,
} from '../../services/curation';

export interface FilmographyModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: CurationTarget | null;
  catalog: MediaItem[];
  onSelectMedia: (media: MediaItem) => void;
}

export const FilmographyModal: React.FC<FilmographyModalProps> = ({
  isOpen,
  onClose,
  target,
  catalog,
  onSelectMedia,
}) => {
  const { language, t } = useLanguage();
  const { playClick, playHover, playSuccess } = useSound();
  const { isInWatchlist, toggleWatchlist } = useWatchlist();

  const [isLoading, setIsLoading] = useState(true);
  const [personProfile, setPersonProfile] = useState<PersonProfile | null>(null);
  const [countryProfile, setCountryProfile] = useState<CountryProfile | null>(null);
  const [genreProfile, setGenreProfile] = useState<GenreProfile | null>(null);
  const [items, setItems] = useState<CurationCreditItem[]>([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [curationPage, setCurationPage] = useState<number>(1);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(false);

  // Filters & Search inside modal
  const [filterType, setFilterType] = useState<'all' | 'movie' | 'series'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'popular' | 'latest' | 'rating'>('popular');

  const modalRef = useRef<HTMLDivElement>(null);

  // Load data when target or isOpen changes
  useEffect(() => {
    if (!isOpen || !target) {
      setItems([]);
      setPersonProfile(null);
      setCountryProfile(null);
      setGenreProfile(null);
      setSearchQuery('');
      setFilterType('all');
      setIsBioExpanded(false);
      setCurationPage(1);
      setHasMore(false);
      setIsLoadingMore(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const loadData = async () => {
      try {
        if (target.type === 'genre') {
          const res = await fetchGenreCatalog(target.name, catalog, language, 1, 6);
          if (isMounted) {
            setGenreProfile(res.profile);
            setItems(res.items);
            setCurationPage(res.nextPage);
            setHasMore(res.hasMore);
          }
        } else if (target.type === 'country') {
          const res = await fetchCountryCatalog(target.name, catalog, language, 1, 6);
          if (isMounted) {
            setCountryProfile(res.profile);
            setItems(res.items);
            setCurationPage(res.nextPage);
            setHasMore(res.hasMore);
          }
        } else {
          const res = await fetchPersonFilmography(target.name, target.type, catalog, language);
          if (isMounted) {
            setPersonProfile(res.profile);
            setItems(res.items);
            setHasMore(false);
          }
        }
      } catch (err) {
        console.error('Failed to load curation data:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, target, catalog, language]);

  // Load more titles for genre and country
  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore || !target) return;
    setIsLoadingMore(true);
    playClick();

    try {
      if (target.type === 'genre') {
        const res = await fetchGenreCatalog(target.name, catalog, language, curationPage, 5);
        setItems((prev) => {
          const existingIds = new Set(prev.map((i) => i.id));
          const newOnes = res.items.filter((i) => !existingIds.has(i.id));
          return [...prev, ...newOnes];
        });
        setCurationPage(res.nextPage);
        setHasMore(res.hasMore);
      } else if (target.type === 'country') {
        const res = await fetchCountryCatalog(target.name, catalog, language, curationPage, 5);
        setItems((prev) => {
          const existingIds = new Set(prev.map((i) => i.id));
          const newOnes = res.items.filter((i) => !existingIds.has(i.id));
          return [...prev, ...newOnes];
        });
        setCurationPage(res.nextPage);
        setHasMore(res.hasMore);
      }
    } catch (err) {
      console.warn('Failed to load more curation items:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        if (filterType !== 'all' && item.type !== filterType) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = item.title.toLowerCase().includes(q);
          const matchOrig = item.originalTitle?.toLowerCase().includes(q);
          const matchChar = item.character?.toLowerCase().includes(q);
          return matchTitle || matchOrig || matchChar;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'latest') return (b.year || 0) - (a.year || 0);
        if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
        // Default popular: local items first, then by popularity descending
        if (a.isLocal && !b.isLocal) return -1;
        if (!a.isLocal && b.isLocal) return 1;
        return (b.popularity || 0) - (a.popularity || 0);
      });
  }, [items, filterType, searchQuery, sortBy]);

  const movieCount = useMemo(() => items.filter((i) => i.type === 'movie').length, [items]);
  const seriesCount = useMemo(() => items.filter((i) => i.type === 'series').length, [items]);

  // Handle click on media card
  const handleItemClick = async (item: CurationCreditItem) => {
    playClick();
    setResolvingId(item.id);

    try {
      const fullMedia = await resolveCurationPlayableMedia(item, language);
      if (fullMedia) {
        playSuccess();
        onSelectMedia(fullMedia);
        onClose();
      }
    } catch (err) {
      console.error('Failed to resolve playable media:', err);
    } finally {
      setResolvingId(null);
    }
  };

  const handleWatchlistToggle = async (item: CurationCreditItem, e: React.MouseEvent) => {
    e.stopPropagation();
    playClick();
    if (isInWatchlist(item.id)) {
      toggleWatchlist(item.id);
      return;
    }
    try {
      const fullMedia = await resolveCurationPlayableMedia(item, language);
      if (fullMedia) {
        toggleWatchlist(fullMedia.id, fullMedia);
      } else {
        toggleWatchlist(item.id);
      }
    } catch (err) {
      console.error('Failed to resolve media for watchlist:', err);
      toggleWatchlist(item.id);
    }
  };

  if (!isOpen || !target) return null;

  const isPerson = target.type === 'cast' || target.type === 'director';
  const roleTitle =
    target.type === 'director'
      ? language === 'en'
        ? 'Cinematic Director'
        : 'Sutradara Sinematik'
      : target.type === 'cast'
      ? language === 'en'
        ? 'Main Cast / Actor'
        : 'Pemeran Utama'
      : target.type === 'country'
      ? language === 'en'
        ? 'Country of Origin'
        : 'Negara Asal Produksi'
      : language === 'en'
      ? 'Cinematic Genre'
      : 'Genre Sinematik';

  const avatarUrl = target.avatar || personProfile?.avatar;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-cinema-950/85 backdrop-blur-xl animate-in fade-in duration-300">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Box */}
      <div
        ref={modalRef}
        className="relative z-10 w-full max-w-5xl max-h-[92vh] bg-[#181818] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header Profile Section */}
        <div className="relative p-5 sm:p-7 border-b border-white/10 bg-[#141414] flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 sm:gap-6 min-w-0">
              {/* Avatar / Flag / Genre Icon */}
              {isPerson ? (
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-[#E50914] shadow-glow-red shrink-0 bg-neutral-900 flex items-center justify-center">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={target.name}
                      className="w-full h-full object-cover"
                    />
                  ) : target.type === 'director' ? (
                    <Clapperboard className="w-8 h-8 text-[#E50914]" />
                  ) : (
                    <User className="w-8 h-8 text-[#E50914]" />
                  )}
                </div>
              ) : target.type === 'country' ? (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0 shadow-lg text-4xl sm:text-5xl">
                  {countryProfile?.flag || '🌐'}
                </div>
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#E50914]/15 border border-[#E50914]/30 flex items-center justify-center shrink-0 shadow-glow-red/15 text-[#E50914]">
                  <Tag className="w-8 h-8 sm:w-10 sm:h-10 stroke-[1.75]" />
                </div>
              )}

              {/* Names & Metadata */}
              <div className="min-w-0 space-y-1 sm:space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-[#E50914]/20 text-white border border-[#E50914]/40 uppercase tracking-wider">
                    {target.type === 'director' ? (
                      <Clapperboard className="w-3 h-3 text-[#E50914]" />
                    ) : target.type === 'cast' ? (
                      <User className="w-3 h-3 text-[#E50914]" />
                    ) : target.type === 'country' ? (
                      <Globe className="w-3 h-3 text-[#E50914]" />
                    ) : (
                      <Tag className="w-3 h-3 text-[#E50914]" />
                    )}
                    {roleTitle}
                  </span>

                  {target.role && target.type === 'cast' && (
                    <span className="text-[11px] sm:text-xs text-slate-400 bg-white/[0.05] px-2.5 py-0.5 rounded-full border border-white/10">
                      {language === 'en' ? 'as' : 'sebagai'} {target.role}
                    </span>
                  )}
                </div>

                <h2 className="text-xl sm:text-3xl font-display font-semibold text-white tracking-wide truncate">
                  {target.name}
                </h2>

                <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                  {personProfile?.placeOfBirth && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      {personProfile.placeOfBirth}
                    </span>
                  )}
                  {personProfile?.birthday && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      {personProfile.birthday}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-brand-champagne font-medium">
                    <Sparkles className="w-3 h-3" />
                    {items.length} {language === 'en' ? 'Titles Curated' : 'Judul Tersedia'}
                  </span>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => {
                playClick();
                onClose();
              }}
              onMouseEnter={playHover}
              className="p-2 rounded-full bg-white/[0.05] hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-all cursor-pointer shrink-0"
              title={language === 'en' ? 'Close' : 'Tutup'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Person Bio snippet or Genre Description if available */}
          {personProfile?.biography ? (
            <div className="mt-3 border-t border-white/[0.04] pt-2.5">
              <div
                className={`text-xs text-slate-300 leading-relaxed font-light transition-all duration-300 ${
                  isBioExpanded
                    ? 'max-h-60 overflow-y-auto pr-2 custom-scrollbar space-y-1.5'
                    : 'line-clamp-2 text-slate-400/90'
                }`}
              >
                <p className="whitespace-pre-line">{personProfile.biography}</p>
              </div>

              {personProfile.biography.length > 120 && (
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setIsBioExpanded((prev) => !prev);
                  }}
                  onMouseEnter={playHover}
                  className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-brand-gold hover:text-brand-champagne transition-colors cursor-pointer group"
                >
                  <span>
                    {isBioExpanded
                      ? language === 'en'
                        ? 'Show Less'
                        : 'Tampilkan Lebih Sedikit'
                      : language === 'en'
                        ? 'View Full Biography'
                        : 'Lihat Full Biografi'}
                  </span>
                  {isBioExpanded ? (
                    <ChevronUp className="w-3 h-3 transition-transform group-hover:-translate-y-0.5" />
                  ) : (
                    <ChevronDown className="w-3 h-3 transition-transform group-hover:translate-y-0.5" />
                  )}
                </button>
              )}
            </div>
          ) : genreProfile?.description ? (
            <div className="mt-3 border-t border-white/[0.04] pt-2.5">
              <p className="text-xs text-slate-300/90 leading-relaxed font-light">
                {genreProfile.description}
              </p>
            </div>
          ) : null}
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3 sm:p-4 bg-black/40 border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 sm:gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/10 text-xs">
            <button
              onClick={() => {
                playClick();
                setFilterType('all');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-white text-black font-bold shadow-md'
                  : 'text-slate-400 hover:text-white font-medium'
              }`}
            >
              {language === 'en' ? 'All' : 'Semua'} ({items.length})
            </button>
            <button
              onClick={() => {
                playClick();
                setFilterType('movie');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterType === 'movie'
                  ? 'bg-white text-black font-bold shadow-md'
                  : 'text-slate-400 hover:text-white font-medium'
              }`}
            >
              <Film className="w-3 h-3" />
              {language === 'en' ? 'Movies' : 'Film'} ({movieCount})
            </button>
            <button
              onClick={() => {
                playClick();
                setFilterType('series');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterType === 'series'
                  ? 'bg-white text-black font-bold shadow-md'
                  : 'text-slate-400 hover:text-white font-medium'
              }`}
            >
              <Tv className="w-3 h-3" />
              {language === 'en' ? 'Series' : 'Serial TV'} ({seriesCount})
            </button>
          </div>

          {/* Search inside filmography & Sort */}
          <div className="flex items-center gap-2 flex-1 max-w-sm ml-auto">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  language === 'en' ? 'Search in titles...' : 'Cari dalam judul...'
                }
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-gold/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-cinema-900 border border-white/10 text-slate-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-brand-gold/50 cursor-pointer"
            >
              <option value="popular">{language === 'en' ? 'Popular' : 'Terpopuler'}</option>
              <option value="latest">{language === 'en' ? 'Latest' : 'Terbaru'}</option>
              <option value="rating">{language === 'en' ? 'Highest Rating' : 'Rating Tertinggi'}</option>
            </select>
          </div>
        </div>

        {/* Media Grid Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
              {Array.from({ length: 10 }).map((_, idx) => (
                <div
                  key={idx}
                  className="aspect-[2/3] rounded-2xl bg-white/[0.03] border border-white/[0.05] animate-pulse relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 space-y-1.5">
                    <div className="h-3 bg-white/10 rounded w-3/4" />
                    <div className="h-2 bg-white/10 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <Film className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-sm font-medium text-slate-300">
                {language === 'en'
                  ? `No titles found for "${target.name}"`
                  : `Tidak ada tayangan yang ditemukan untuk "${target.name}"`}
              </p>
              <p className="text-xs text-slate-500">
                {language === 'en'
                  ? 'Try searching for another keyword or filter option.'
                  : 'Coba gunakan kata kunci atau pilihan filter lain.'}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
              {filteredItems.map((item) => {
                const isResolvingThis = resolvingId === item.id;
                const durationLabel = formatMediaDuration(
                  item.localMedia ? item.localMedia : (item as any),
                  language
                );

                return (
                  <div
                    key={item.id}
                    onClick={() => !isResolvingThis && handleItemClick(item)}
                    onMouseEnter={playHover}
                    className="group relative aspect-[2/3] rounded-2xl overflow-hidden bg-cinema-900 border border-white/[0.08] hover:border-brand-gold/60 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-brand-gold/15 hover:-translate-y-1 flex flex-col justify-end"
                  >
                    {/* Poster Image */}
                    <img
                      src={item.poster}
                      alt={item.title}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=500&auto=format&fit=crop';
                      }}
                    />

                    {/* Gradient Shadow Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-cinema-950 via-cinema-950/40 to-black/20 group-hover:from-cinema-950 group-hover:via-cinema-950/70 transition-all" />

                    {/* Top Badges */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
                      {/* Rating */}
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono font-semibold text-amber-300">
                        <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
                        {item.rating > 0 ? item.rating.toFixed(1) : '7.5'}
                      </span>

                      {/* Type Badge */}
                      <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-mono tracking-wider font-semibold text-slate-300 uppercase">
                        {item.type === 'movie' ? 'FILM' : 'SERIES'}
                      </span>
                    </div>

                    {/* Bottom Info */}
                    <div className="relative z-10 p-3 space-y-1">
                      <h4 className="text-xs sm:text-sm font-semibold text-white leading-tight line-clamp-1 group-hover:text-brand-champagne transition-colors">
                        {item.title}
                      </h4>

                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <div className="flex items-center gap-1.5 font-mono">
                          <span>{item.year > 0 ? item.year : '2024'}</span>
                          {durationLabel && (
                            <span className="text-emerald-400 font-medium">• {durationLabel}</span>
                          )}
                        </div>
                        {item.isLocal && (
                          <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                            Lokal
                          </span>
                        )}
                      </div>

                      {/* Cast Character or Director Job */}
                      {item.character && (
                        <p className="text-[10px] text-brand-champagne/90 line-clamp-1 italic">
                          {language === 'en' ? 'as' : 'sebagai'} {item.character}
                        </p>
                      )}
                      {item.job && target.type === 'director' && (
                        <p className="text-[10px] text-brand-champagne/90 line-clamp-1">
                          {item.job}
                        </p>
                      )}
                    </div>

                    {/* Hover Play + Watchlist Overlay */}
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 p-3 opacity-0 group-hover:opacity-100 transition-opacity bg-cinema-950/50 backdrop-blur-[2px]">
                      {isResolvingThis ? (
                        <div className="flex flex-col items-center gap-2 text-brand-champagne">
                          <Loader2 className="w-8 h-8 animate-spin" />
                          <span className="text-[11px] font-medium font-mono">{language === 'en' ? 'Loading...' : 'Memuat...'}</span>
                        </div>
                      ) : (
                        <>
                          <div
                            onClick={(e) => { e.stopPropagation(); handleItemClick(item); }}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-white hover:bg-white/80 text-black font-black text-xs shadow-xl hover:scale-105 transition-all cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>{language === 'en' ? 'Play Now' : 'Putar'}</span>
                          </div>
                          <button
                            onClick={(e) => handleWatchlistToggle(item, e)}
                            className={`w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border font-semibold text-xs transition-all hover:scale-105 cursor-pointer ${
                              isInWatchlist(item.id)
                                ? 'bg-[#E50914] border-[#E50914] text-white shadow-glow-red'
                                : 'bg-white/10 hover:bg-white/20 border-white/15 text-white'
                            }`}
                          >
                            {isInWatchlist(item.id) ? (
                              <>
                                <Check className="w-3 h-3 stroke-[3]" />
                                <span>{language === 'en' ? 'In Watchlist' : 'Di Watchlist'}</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3 stroke-[3]" />
                                <span>{language === 'en' ? 'Add to Watchlist' : 'Tambah ke Daftar'}</span>
                              </>
                            )}
                          </button>
                          <a
                            href={`${window.location.origin}${window.location.pathname}#/watch/${item.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                              e.stopPropagation();
                              playClick();
                            }}
                            title={t('openInNewTabTooltip')}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-black/50 hover:bg-[#E50914]/20 hover:border-[#E50914]/40 border border-white/10 text-slate-300 hover:text-white font-medium text-xs transition-all hover:scale-105 no-underline cursor-pointer"
                          >
                            <ExternalLink className="w-3 h-3 text-[#E50914]" />
                            <span>{t('openInNewTab')}</span>
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Load More Button for Genre and Country */}
            {(target.type === 'genre' || target.type === 'country') && !searchQuery.trim() && filteredItems.length > 0 && (
              <div className="pt-8 pb-4 flex flex-col items-center justify-center">
                {hasMore ? (
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    onMouseEnter={playHover}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/[0.04] hover:bg-brand-gold/15 border border-white/10 hover:border-brand-gold/40 text-slate-200 hover:text-brand-champagne text-xs font-medium tracking-wide transition-all shadow-lg hover:shadow-glow-gold/10 hover:-translate-y-0.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-brand-gold" />
                        <span>{language === 'en' ? 'Loading more titles...' : 'Memuat tayangan lainnya...'}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-brand-gold" />
                        <span>{language === 'en' ? 'Load More Titles' : 'Muat Lebih Banyak Film & Series'}</span>
                      </>
                    )}
                  </button>
                ) : (
                  <span className="text-xs text-slate-500 font-light tracking-wide">
                    {language === 'en' ? 'All curated titles loaded' : 'Semua tayangan telah dimuat'}
                  </span>
                )}
              </div>
            )}
          </>
        )}
        </div>
      </div>
    </div>
  );
};

export default FilmographyModal;
