import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Navbar } from './components/layout/Navbar';
import { MobileNav } from './components/layout/MobileNav';
import { Footer } from './components/layout/Footer';
import { HeroBanner } from './components/home/HeroBanner';
import { MovieCard } from './components/home/MovieCard';
import { FilterBar } from './components/home/FilterBar';
import { HomeLiveSearch } from './components/home/HomeLiveSearch';
import { CinematicAtmosphere } from './components/layout/CinematicAtmosphere';
import { WatchSection } from './components/details/WatchSection';
import { SearchModal } from './components/search/SearchModal';
import { CustomStreamModal } from './components/custom/CustomStreamModal';
import { ContinueWatchingRow } from './components/home/ContinueWatchingRow';
import { HistoryView } from './components/history/HistoryView';
import { WatchedView } from './components/history/WatchedView';
import { AdvancedSearchView } from './components/search/AdvancedSearchView';
import { WatchlistProvider, useWatchlist } from './context/WatchlistContext';
import { SoundProvider, useSound } from './context/SoundContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { WatchPartyProvider, useWatchParty } from './context/WatchPartyContext';
import { WatchPartyModal } from './components/party/WatchPartyModal';
import { PartySyncToast } from './components/party/PartySyncToast';
import { CinestreamIntro } from './components/layout/CinestreamIntro';
import { MOCK_CATALOG } from './data/mockCatalog';
import type { MediaItem, Episode } from './types/media';
import { fetchPopularHeroItems, fetchFullMediaItem } from './services/tmdb';
import { formatGenre, getMediaTitle } from './utils/formatters';
import { Bookmark, Users } from 'lucide-react';

const VALID_TABS = ['home', 'advanced-search', 'movie', 'series', 'anime', 'drama', 'watchlist', 'history', 'watched'] as const;

const getInitialTab = (): string => {
  if (typeof window === 'undefined') return 'home';
  const hash = window.location.hash.toLowerCase();

  // If hash is a watch URL, check saved tab or default to home
  if (hash.startsWith('#/watch/')) {
    try {
      const saved = localStorage.getItem('cinestream_active_tab');
      if (saved && (VALID_TABS as readonly string[]).includes(saved)) {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'home';
  }

  // Check explicit tab in hash
  if (hash.includes('advanced') || hash.includes('filter')) return 'advanced-search';
  if (hash.includes('movie') || hash.includes('film')) return 'movie';
  if (hash.includes('series') || hash.includes('tv')) return 'series';
  if (hash.includes('anime')) return 'anime';
  if (hash.includes('drama')) return 'drama';
  if (hash.includes('watchlist')) return 'watchlist';
  if (hash.includes('watched')) return 'watched';
  if (hash.includes('history') || hash.includes('riwayat')) return 'history';
  if (hash.includes('home')) return 'home';

  try {
    const saved = localStorage.getItem('cinestream_active_tab');
    if (saved && (VALID_TABS as readonly string[]).includes(saved)) {
      return saved;
    }
  } catch {
    // ignore
  }
  return 'home';
};

const MainContent: React.FC = () => {
  const { watchlist, watchlistMediaMap, recordWatch, historyItems } = useWatchlist();
  const { playClick, playHover, playWhoosh } = useSound();
  const { t, language } = useLanguage();
  const {
    room,
    status: partyStatus,
    isPartyOpen,
    setIsPartyOpen,
    autoJoinCode,
    setAutoJoinCode,
    togglePartyOpen,
  } = useWatchParty();

  // Navigation & Modals State (Persistent on refresh)
  const [activeTab, setActiveTab] = useState<string>(getInitialTab);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCustomStreamOpen, setIsCustomStreamOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [resumeTime, setResumeTime] = useState<number | undefined>(undefined);
  const [resumeEpisodeId, setResumeEpisodeId] = useState<string | undefined>(undefined);
  const [isMiniPlayer, setIsMiniPlayer] = useState(false);
  const [isMediaLoading, setIsMediaLoading] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.location.hash.toLowerCase().startsWith('#/watch/');
    }
    return false;
  });

  // Theater Mode global dimming state
  const [isTheaterMode, setIsTheaterMode] = useState(false);

  // CineStream Netflix-style Intro Animation
  const [showIntro, setShowIntro] = useState(true);

  // Handle #/party/CODE URL on load
  useEffect(() => {
    const hash = window.location.hash;
    const partyMatch = hash.match(/^#\/party\/([A-Z0-9]{4,8})$/i);
    if (partyMatch) {
      const code = partyMatch[1].toUpperCase();
      setAutoJoinCode(code);
      setIsPartyOpen(true);
      // Clean up URL hash so it doesn't re-trigger on re-render
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [setAutoJoinCode, setIsPartyOpen]);

  // Custom User Stream Catalog (persisted)
  const [customCatalog, setCustomCatalog] = useState<MediaItem[]>(() => {
    try {
      const saved = localStorage.getItem('cinestream_custom_catalog');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const handleUpdate = () => {
      try {
        const saved = localStorage.getItem('cinestream_custom_catalog');
        if (saved) {
          setCustomCatalog(JSON.parse(saved));
        }
      } catch {}
    };
    window.addEventListener('custom-catalog-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('custom-catalog-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const fullCatalog = useMemo(() => {
    return [...customCatalog, ...MOCK_CATALOG];
  }, [customCatalog]);

  const handlePlayCustomMedia = (media: MediaItem) => {
    setCustomCatalog((prev) => {
      const updated = [media, ...prev.filter((m) => m.id !== media.id)];
      localStorage.setItem('cinestream_custom_catalog', JSON.stringify(updated));
      return updated;
    });
    handleOpenMedia(media);
  };

  // Filters State
  const [filterType, setFilterType] = useState('all');
  const [selectedGenre, setSelectedGenre] = useState('Semua Genre');
  const [selectedCountry, setSelectedCountry] = useState('Semua Negara');
  const [selectedYear, setSelectedYear] = useState('Semua Tahun');
  const [sortBy, setSortBy] = useState('popular');

  // Featured Fallback Items for Hero
  const featuredItems = useMemo(
    () => fullCatalog.filter((item) => item.featured),
    [fullCatalog]
  );

  // Popular Trending Spotlight Items for Header (Real-time TMDB API)
  const [heroPopularItems, setHeroPopularItems] = useState<MediaItem[]>(() => {
    try {
      const cached = localStorage.getItem('cinestream_cached_hero_popular');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  useEffect(() => {
    let isMounted = true;
    const loadPopularHero = async () => {
      try {
        const items = await fetchPopularHeroItems();
        if (isMounted && items.length > 0) {
          setHeroPopularItems(items);
          try {
            localStorage.setItem('cinestream_cached_hero_popular', JSON.stringify(items));
          } catch {
            // ignore
          }
        }
      } catch (err) {
        console.error('Failed to load popular hero items:', err);
      }
    };
    loadPopularHero();
    return () => {
      isMounted = false;
    };
  }, []);

  const heroDisplayItems = heroPopularItems.length > 0 ? heroPopularItems : featuredItems;

  // Switch tab and persist state to URL and localStorage
  const handleSelectTab = (tab: string) => {
    playClick();
    if (selectedMedia) {
      // Transition to floating mini player so playback continues uninterrupted while browsing
      setIsMiniPlayer(true);
    }
    setIsTheaterMode(false);
    setActiveTab(tab);
    handleResetFilters();
    try {
      localStorage.setItem('cinestream_active_tab', tab);
      if (!selectedMedia) {
        localStorage.removeItem('cinestream_active_watch_id');
      }
      window.history.replaceState(null, '', `#/${tab}`);
    } catch {
      // ignore
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Open player / details section
  const handleOpenMedia = (media: MediaItem, customResumeTime?: number, customEpisodeId?: string) => {
    playWhoosh();
    setResumeTime(customResumeTime);
    setResumeEpisodeId(customEpisodeId);
    setIsTheaterMode(false);
    setIsMiniPlayer(false);
    setSelectedMedia(media);

    let targetEp: Episode | undefined;
    if (customEpisodeId && media.seasons) {
      for (const s of media.seasons) {
        const found = s.episodes?.find((ep) => ep.id === customEpisodeId);
        if (found) {
          targetEp = found;
          break;
        }
      }
    }

    recordWatch(media, {
      currentTime: customResumeTime,
      episode: media.type === 'movie' ? undefined : (targetEp || (customEpisodeId ? ({ id: customEpisodeId } as any) : undefined)),
    });

    try {
      localStorage.setItem('cinestream_active_watch_id', media.id);
      window.history.replaceState(null, '', `#/watch/${media.id}`);
    } catch {
      // ignore
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Back from watching: transition to floating mini player
  const handleBackFromWatch = () => {
    setIsMiniPlayer(true);
    setIsTheaterMode(false);
    try {
      window.history.replaceState(null, '', `#/${activeTab}`);
    } catch {
      // ignore
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Close player completely (used by Mini Player close 'X' button)
  const handleClosePlayer = () => {
    setSelectedMedia(null);
    setIsMiniPlayer(false);
    setResumeTime(undefined);
    setResumeEpisodeId(undefined);
    setIsTheaterMode(false);
    try {
      localStorage.removeItem('cinestream_active_watch_id');
      window.history.replaceState(null, '', `#/${activeTab}`);
    } catch {
      // ignore
    }
  };

  const heroDisplayItemsRef = useRef(heroDisplayItems);
  heroDisplayItemsRef.current = heroDisplayItems;
  const fullCatalogRef = useRef(fullCatalog);
  fullCatalogRef.current = fullCatalog;

  // Resolve and load media for playback from URL hash (supports direct load in a new browser tab)
  const resolveAndPlayMedia = async (hashStr: string) => {
    const raw = hashStr.trim();
    const hashIndex = raw.toLowerCase().indexOf('#/watch/');
    if (hashIndex === -1) {
      setSelectedMedia(null);
      setIsMediaLoading(false);
      return;
    }

    const afterWatch = raw.slice(hashIndex + 8); // after '#/watch/'
    const [idPart, queryPart] = afterWatch.split('?');
    const watchId = decodeURIComponent((idPart || '').trim());
    if (!watchId) {
      setIsMediaLoading(false);
      return;
    }

    // Check query params for episode ID (e.g. ?ep=tmdb-tv-123-s1-e2)
    if (queryPart) {
      const searchParams = new URLSearchParams(queryPart);
      const epId = searchParams.get('ep');
      if (epId) {
        setResumeEpisodeId(epId);
      }
    }

    setIsMediaLoading(true);

    const lowerId = watchId.toLowerCase();

    // 1. Check in fullCatalog or heroDisplayItems
    const found =
      fullCatalogRef.current.find((m) => m.id.toLowerCase() === lowerId) ||
      heroDisplayItemsRef.current.find((m) => m.id.toLowerCase() === lowerId);

    if (found) {
      setSelectedMedia(found);
      setIsMiniPlayer(false);
      setIsMediaLoading(false);
      return;
    }

    // 2. Check in localStorage custom catalog
    try {
      const customRaw = localStorage.getItem('cinestream_custom_catalog');
      if (customRaw) {
        const customList: MediaItem[] = JSON.parse(customRaw);
        const inCustom = customList.find((m) => m.id.toLowerCase() === lowerId);
        if (inCustom) {
          setSelectedMedia(inCustom);
          setIsMiniPlayer(false);
          setIsMediaLoading(false);
          return;
        }
      }
    } catch {}

    // 2.5 Check in watchlistMediaMap or historyItems
    if (watchlistMediaMap && watchlistMediaMap[lowerId]) {
      setSelectedMedia(watchlistMediaMap[lowerId]);
      setIsMiniPlayer(false);
      setIsMediaLoading(false);
      return;
    }
    const inHistoryMedia = historyItems.find((h) => h.mediaId.toLowerCase() === lowerId)?.media;
    if (inHistoryMedia) {
      setSelectedMedia(inHistoryMedia);
      setIsMiniPlayer(false);
      setIsMediaLoading(false);
      return;
    }

    // 3. Resolve from TMDB API
    let tmdbType: 'movie' | 'tv' | null = null;
    let tmdbNumericId: number | null = null;

    if (lowerId.startsWith('tmdb-movie-')) {
      tmdbType = 'movie';
      tmdbNumericId = parseInt(lowerId.replace('tmdb-movie-', ''), 10);
    } else if (lowerId.startsWith('tmdb-tv-')) {
      tmdbType = 'tv';
      tmdbNumericId = parseInt(lowerId.replace('tmdb-tv-', ''), 10);
    } else if (lowerId.startsWith('movie-')) {
      tmdbType = 'movie';
      tmdbNumericId = parseInt(lowerId.replace('movie-', ''), 10);
    } else if (lowerId.startsWith('tv-') || lowerId.startsWith('series-')) {
      tmdbType = 'tv';
      tmdbNumericId = parseInt(lowerId.replace(/^(tv|series)-/, ''), 10);
    } else if (/^\d+$/.test(lowerId)) {
      tmdbNumericId = parseInt(lowerId, 10);
    }

    if (tmdbNumericId && !isNaN(tmdbNumericId)) {
      try {
        let item: MediaItem | null = null;
        if (tmdbType) {
          item = await fetchFullMediaItem(tmdbNumericId, tmdbType);
        } else {
          item = await fetchFullMediaItem(tmdbNumericId, 'movie');
          if (!item) {
            item = await fetchFullMediaItem(tmdbNumericId, 'tv');
          }
        }

        if (item) {
          setSelectedMedia(item);
          setIsMiniPlayer(false);
          setIsMediaLoading(false);
          return;
        }
      } catch (err) {
        console.error('Failed to resolve TMDB media for new tab:', watchId, err);
      }
    }

    setIsMediaLoading(false);
  };

  // Restore or load watched media on initial load (crucial for opening film/series in a new browser tab)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.toLowerCase().startsWith('#/watch/')) {
      resolveAndPlayMedia(hash);
    } else {
      setSelectedMedia(null);
      setIsMediaLoading(false);
    }
  }, []);

  // Reactive browser document.title for tabs
  useEffect(() => {
    if (selectedMedia) {
      const mediaTitle = getMediaTitle(selectedMedia, language);
      document.title = `🎬 ${mediaTitle} (${selectedMedia.year}) • CineStream`;
    } else {
      document.title = 'CINESTREAM NOVA • Next-Gen Cinematic Streaming';
    }
  }, [selectedMedia, language]);

  // Auto-sync guest/participant to room's media if not currently watching it
  useEffect(() => {
    if (partyStatus === 'connected' && room?.mediaInfo?.mediaId) {
      const targetId = room.mediaInfo.mediaId;
      if (!selectedMedia || selectedMedia.id !== targetId) {
        const found = fullCatalog.find((m) => m.id === targetId) || heroDisplayItems.find((m) => m.id === targetId);
        if (found) {
          setSelectedMedia(found);
          window.location.hash = `#/watch/${found.id}`;
        } else if (targetId.startsWith('tmdb-movie-')) {
          const tmdbId = Number(targetId.replace('tmdb-movie-', ''));
          if (tmdbId) {
            fetchFullMediaItem(tmdbId, 'movie').then((m) => {
              if (m) {
                setSelectedMedia(m);
                window.location.hash = `#/watch/${m.id}`;
              }
            });
          }
        } else if (targetId.startsWith('tmdb-tv-')) {
          const tmdbId = Number(targetId.replace('tmdb-tv-', ''));
          if (tmdbId) {
            fetchFullMediaItem(tmdbId, 'tv').then((m) => {
              if (m) {
                setSelectedMedia(m);
                window.location.hash = `#/watch/${m.id}`;
              }
            });
          }
        }
      }
    }
  }, [partyStatus, room?.mediaInfo?.mediaId, selectedMedia, fullCatalog, heroDisplayItems]);

  // Listen to browser navigation (back/forward)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash.startsWith('#/watch/')) {
        resolveAndPlayMedia(window.location.hash);
      } else {
        setIsMiniPlayer(true);
        let targetTab: string | null = null;
        if (hash.includes('movie') || hash.includes('film')) targetTab = 'movie';
        else if (hash.includes('series') || hash.includes('tv')) targetTab = 'series';
        else if (hash.includes('anime')) targetTab = 'anime';
        else if (hash.includes('drama')) targetTab = 'drama';
        else if (hash.includes('watchlist')) targetTab = 'watchlist';
        else if (hash.includes('watched')) targetTab = 'watched';
        else if (hash.includes('history') || hash.includes('riwayat')) targetTab = 'history';
        else if (hash.includes('home') || hash === '' || hash === '#') targetTab = 'home';

        if (targetTab) {
          setActiveTab(targetTab);
          try {
            localStorage.setItem('cinestream_active_tab', targetTab);
          } catch {
            // ignore
          }
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Persist activeTab whenever it changes
  useEffect(() => {
    try {
      if (activeTab && (VALID_TABS as readonly string[]).includes(activeTab)) {
        localStorage.setItem('cinestream_active_tab', activeTab);
      }
    } catch {
      // ignore
    }
  }, [activeTab]);

  // Reset Filters
  const handleResetFilters = () => {
    setFilterType('all');
    setSelectedGenre('Semua Genre');
    setSelectedCountry('Semua Negara');
    setSelectedYear('Semua Tahun');
    setSortBy('popular');
  };

  // Filtered Media Query calculation for dedicated category tabs
  const filteredCatalog = useMemo(() => {
    return fullCatalog.filter((item) => {
      // Type Filter
      if (filterType !== 'all' && item.type !== filterType) return false;
      // Tab Filter (when in dedicated tab)
      if (activeTab === 'movie' && item.type !== 'movie') return false;
      if (activeTab === 'series' && item.type !== 'series') return false;
      if (activeTab === 'anime' && item.type !== 'anime') return false;
      if (activeTab === 'drama' && item.type !== 'drama') return false;

      // Genre Filter
      if (selectedGenre !== 'Semua Genre' && selectedGenre !== 'All Genres') {
        const normSelected = formatGenre(selectedGenre, 'en').toLowerCase().trim();
        const hasGenre = item.genres && item.genres.some((g) => {
          const normItem = formatGenre(g, 'en').toLowerCase().trim();
          return normItem === normSelected || normItem.includes(normSelected) || normSelected.includes(normItem);
        });
        if (!hasGenre) return false;
      }

      // Country Filter
      if (selectedCountry !== 'Semua Negara' && item.country !== selectedCountry) return false;

      // Year Filter
      if (selectedYear !== 'Semua Tahun' && item.year.toString() !== selectedYear) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'latest') return b.year - a.year;
      return 0;
    });
  }, [fullCatalog, filterType, activeTab, selectedGenre, selectedCountry, selectedYear, sortBy]);

  // Watchlist Items (instant sync from context map + fullCatalog + history fallback)
  const watchlistItems = useMemo(() => {
    const lowerWatchlist = new Set(watchlist.map((id) => id.toLowerCase()));
    const itemMap = new Map<string, MediaItem>();

    // 1. Highest priority: dedicated watchlistMediaMap from context (persisted synchronously in localStorage)
    if (watchlistMediaMap) {
      for (const [key, item] of Object.entries(watchlistMediaMap)) {
        if (lowerWatchlist.has(key.toLowerCase()) && item && item.id) {
          itemMap.set(key.toLowerCase(), item);
        }
      }
    }

    // 2. Second priority: fullCatalog
    for (const item of fullCatalog) {
      if (lowerWatchlist.has(item.id.toLowerCase()) && !itemMap.has(item.id.toLowerCase())) {
        itemMap.set(item.id.toLowerCase(), item);
      }
    }

    // 3. Third priority: historyItems media snapshots
    for (const h of historyItems) {
      if (h.media && lowerWatchlist.has(h.mediaId.toLowerCase()) && !itemMap.has(h.mediaId.toLowerCase())) {
        itemMap.set(h.mediaId.toLowerCase(), h.media);
      }
    }

    // Preserve exact user order of items
    const list: MediaItem[] = [];
    for (const id of watchlist) {
      const found = itemMap.get(id.toLowerCase());
      if (found) list.push(found);
    }
    return list;
  }, [watchlist, watchlistMediaMap, fullCatalog, historyItems]);

  // Auto-heal & hydrate any legacy watchlist items that lack local media metadata
  useEffect(() => {
    const knownKeys = new Set<string>([
      ...fullCatalog.map((item) => item.id.toLowerCase()),
      ...Object.keys(watchlistMediaMap || {}).map((k) => k.toLowerCase()),
    ]);
    const missingIds = watchlist.filter((id) => !knownKeys.has(id.toLowerCase()));
    if (missingIds.length === 0) return;

    let isMounted = true;
    const recoverMissingWatchlist = async () => {
      let updatedCustom = false;
      const customRaw = localStorage.getItem('cinestream_custom_catalog');
      const customList: MediaItem[] = customRaw ? JSON.parse(customRaw) : [];

      let updatedMap = false;
      const mapRaw = localStorage.getItem('cinestream_watchlist_media_map_v1');
      const mediaMap: Record<string, MediaItem> = mapRaw ? JSON.parse(mapRaw) : {};

      for (const missingId of missingIds) {
        const lower = missingId.toLowerCase();

        // 1. Check if full media item exists in watch history snapshots
        const inHistory = historyItems.find((h) => h.mediaId.toLowerCase() === lower)?.media;
        if (inHistory) {
          if (!customList.some((m) => m.id.toLowerCase() === inHistory.id.toLowerCase())) {
            customList.unshift(inHistory);
            updatedCustom = true;
          }
          if (!mediaMap[lower]) {
            mediaMap[lower] = inHistory;
            updatedMap = true;
          }
          continue;
        }

        // 2. Parse TMDB ID
        let tmdbType: 'movie' | 'tv' | null = null;
        let tmdbId: number | null = null;

        if (lower.startsWith('tmdb-movie-')) {
          tmdbType = 'movie';
          tmdbId = parseInt(lower.replace('tmdb-movie-', ''), 10);
        } else if (lower.startsWith('tmdb-tv-')) {
          tmdbType = 'tv';
          tmdbId = parseInt(lower.replace('tmdb-tv-', ''), 10);
        } else if (lower.startsWith('movie-')) {
          tmdbType = 'movie';
          tmdbId = parseInt(lower.replace('movie-', ''), 10);
        } else if (lower.startsWith('tv-') || lower.startsWith('series-')) {
          tmdbType = 'tv';
          tmdbId = parseInt(lower.replace(/^(tv|series)-/, ''), 10);
        } else if (/^\d+$/.test(lower)) {
          tmdbId = parseInt(lower, 10);
        }

        if (tmdbId && !isNaN(tmdbId)) {
          try {
            let fetched: MediaItem | null = null;
            if (tmdbType) {
              fetched = await fetchFullMediaItem(tmdbId, tmdbType);
            } else {
              fetched = await fetchFullMediaItem(tmdbId, 'movie');
              if (!fetched) {
                fetched = await fetchFullMediaItem(tmdbId, 'tv');
              }
            }

            if (fetched && isMounted) {
              fetched = { ...fetched, id: missingId };
              if (!customList.some((m) => m.id.toLowerCase() === missingId.toLowerCase())) {
                customList.unshift(fetched);
                updatedCustom = true;
              }
              if (!mediaMap[lower]) {
                mediaMap[lower] = fetched;
                updatedMap = true;
              }
            }
          } catch (err) {
            console.warn('Could not auto-recover watchlist item from TMDB:', missingId, err);
          }
        }
      }

      if (isMounted) {
        if (updatedCustom) {
          localStorage.setItem('cinestream_custom_catalog', JSON.stringify(customList));
          setCustomCatalog(customList);
          window.dispatchEvent(new Event('custom-catalog-updated'));
        }
        if (updatedMap) {
          localStorage.setItem('cinestream_watchlist_media_map_v1', JSON.stringify(mediaMap));
          window.dispatchEvent(new Event('cinestream-watchlist-updated'));
        }
      }
    };

    recoverMissingWatchlist();

    return () => {
      isMounted = false;
    };
  }, [watchlist, fullCatalog, historyItems, watchlistMediaMap]);

  const handleOpenSearch = () => {
    if (activeTab === 'home' && (!selectedMedia || isMiniPlayer)) {
      const input = document.getElementById('home-live-search-input') as HTMLInputElement | null;
      if (input) {
        input.focus();
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
    setIsSearchOpen(true);
  };

  return (
    <div className="relative min-h-screen text-slate-100 flex flex-col font-sans selection:bg-[#E50914] selection:text-white">
      {/* CineStream Netflix-style Intro Animation */}
      {showIntro && <CinestreamIntro onComplete={() => setShowIntro(false)} />}

      {/* Dynamic Cinematic Atmospheric Background */}
      <CinematicAtmosphere
        activeBackdrop={selectedMedia?.backdrop || heroDisplayItems[0]?.backdrop}
        showWallpaper={activeTab !== 'home'}
      />

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onOpenSearch={handleOpenSearch}
        isTheaterMode={isTheaterMode}
        watchlistCount={watchlistItems.length}
      />

      {/* Main Body */}
      <main className="flex-1 relative z-10">
        {/* Cinema Loading Spinner when direct /watch/... is loaded in a new tab */}
        {isMediaLoading && !selectedMedia && (
          <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4 px-4 pt-20">
            <div className="w-12 h-12 rounded-full border-2 border-[#E50914]/20 border-t-[#E50914] animate-spin shadow-glow-red" />
            <p className="text-sm font-display text-slate-300 tracking-wider uppercase animate-pulse">
              {language === 'en' ? 'Loading Cinema Stream...' : 'Memuat Tayangan Sinema...'}
            </p>
          </div>
        )}

        {/* Render underlying catalog/browsing tab when no media is selected OR mini player is active */}
        {(!selectedMedia || isMiniPlayer) && !isMediaLoading && (
          <>
            {/* VIEW 1: HOME PAGE (HERO BANNER + CONTINUE WATCHING + TMDB API LIVE SEARCH) */}
            {activeTab === 'home' && (
              <>
                <HeroBanner
                  featuredItems={heroDisplayItems}
                  onPlay={handleOpenMedia}
                  onOpenDetails={handleOpenMedia}
                />
                <ContinueWatchingRow
                  onPlayMedia={(m, time, epId) => handleOpenMedia(m, time, epId)}
                  onOpenDetails={(m) => handleOpenMedia(m)}
                />
                <HomeLiveSearch
                  onPlayMedia={handleOpenMedia}
                  onOpenDetails={handleOpenMedia}
                />
              </>
            )}

        {/* VIEW: ADVANCED SEARCH & MULTI-FILTER HUB */}
        {activeTab === 'advanced-search' && (
          <AdvancedSearchView
            catalog={fullCatalog}
            onPlayMedia={handleOpenMedia}
            onOpenDetails={handleOpenMedia}
          />
        )}

        {/* VIEW 3: DEDICATED TABS */}
        {(activeTab === 'movie' || activeTab === 'series' || activeTab === 'anime' || activeTab === 'drama') && (
          <div className="pt-28 pb-16 px-4 sm:px-8 lg:px-12 3xl:px-16 max-w-[1720px] 2xl:max-w-[1880px] 3xl:max-w-[2200px] 4xl:max-w-[2600px] mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-medium text-white tracking-wide uppercase">
                  {activeTab === 'movie' && t('catalogMovies')}
                  {activeTab === 'series' && t('catalogSeries')}
                  {activeTab === 'anime' && t('catalogAnime')}
                  {activeTab === 'drama' && t('catalogDrama')}
                </h1>
                <p className="text-xs text-slate-400 font-light mt-1">
                  {t('catalogDesc')}
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-white bg-[#E50914]/20 px-3 py-1.5 rounded-full border border-[#E50914]/35 self-start sm:self-auto">
                {filteredCatalog.length} {t('titlesRegistered')}
              </span>
            </div>

            <FilterBar
              activeType={activeTab}
              onSelectType={(t) => {
                if (t === 'all') handleSelectTab('home');
                else handleSelectTab(t);
              }}
              selectedGenre={selectedGenre}
              onSelectGenre={setSelectedGenre}
              selectedCountry={selectedCountry}
              onSelectCountry={setSelectedCountry}
              selectedYear={selectedYear}
              onSelectYear={setSelectedYear}
              sortBy={sortBy}
              onSelectSort={setSortBy}
              onReset={handleResetFilters}
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8 4xl:grid-cols-9 gap-4 sm:gap-5">
              {filteredCatalog.map((item) => (
                <MovieCard
                  key={item.id}
                  media={item}
                  onPlay={handleOpenMedia}
                  onOpenDetails={handleOpenMedia}
                />
              ))}
            </div>
          </div>
        )}

        {/* VIEW 4: WATCHLIST PAGE */}
        {activeTab === 'watchlist' && (
          <div className="pt-28 pb-16 px-4 sm:px-8 lg:px-12 3xl:px-16 max-w-[1720px] 2xl:max-w-[1880px] 3xl:max-w-[2200px] 4xl:max-w-[2600px] mx-auto space-y-6 min-h-[60vh]">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#E50914]/15 text-[#E50914]">
                  <Bookmark className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-display font-medium text-white tracking-wide uppercase">
                    {t('myWatchlistTitle')}
                  </h1>
                  <p className="text-xs text-slate-400 font-light mt-0.5">
                    {t('watchlistSubtitle')}
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-white bg-[#E50914]/20 px-3 py-1.5 rounded-full border border-[#E50914]/35">
                {watchlistItems.length} {language === 'en' ? 'Saved' : 'Tersimpan'}
              </span>
            </div>

            {watchlistItems.length === 0 ? (
              <div className="py-24 text-center text-slate-400 space-y-4 max-w-md mx-auto">
                <Bookmark className="w-10 h-10 mx-auto text-slate-600" />
                <h3 className="text-base font-display font-medium text-white tracking-wide">
                  {t('emptyWatchlistTitle')}
                </h3>
                <p className="text-xs text-slate-400 font-light leading-relaxed">
                  {t('emptyWatchlistDesc')}
                </p>
                <button
                  onClick={() => {
                    playClick();
                    handleSelectTab('home');
                  }}
                  onMouseEnter={playHover}
                  className="px-6 py-2.5 rounded-full bg-[#E50914] hover:bg-[#F40612] text-white text-xs font-bold shadow-glow-red transition-all cursor-pointer"
                >
                  {language === 'en' ? 'Explore Cinema' : 'Jelajahi Sinema'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8 4xl:grid-cols-9 gap-4 sm:gap-5">
                {watchlistItems.map((item) => (
                  <MovieCard
                    key={item.id}
                    media={item}
                    onPlay={handleOpenMedia}
                    onOpenDetails={handleOpenMedia}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 5: WATCH HISTORY PAGE */}
        {activeTab === 'history' && (
          <HistoryView
            onPlayMedia={(m, time, epId) => handleOpenMedia(m, time, epId)}
            onOpenDetails={(m) => handleOpenMedia(m)}
            onGoHome={() => handleSelectTab('home')}
          />
        )}

        {/* VIEW 6: WATCHED (COMPLETED) PAGE */}
        {activeTab === 'watched' && (
          <WatchedView
            onPlayMedia={(m, time, epId) => handleOpenMedia(m, time, epId)}
            onGoHistory={() => handleSelectTab('history')}
            onGoHome={() => handleSelectTab('home')}
          />
        )}
          </>
        )}

        {/* Dedicated Watch Section (Full Cinema View OR Floating Mini Player) */}
        {selectedMedia && (
          <WatchSection
            key={selectedMedia.id}
            media={selectedMedia}
            resumeTime={resumeTime}
            resumeEpisodeId={resumeEpisodeId}
            onBack={handleBackFromWatch}
            onPlayMedia={handleOpenMedia}
            catalog={fullCatalog}
            onOpenWatchParty={togglePartyOpen}
            onTheaterModeChange={setIsTheaterMode}
            isMiniPlayer={isMiniPlayer}
            onToggleMiniPlayer={() => {
              playClick();
              setIsTheaterMode(false);
              setIsMiniPlayer((prev) => {
                const nextState = !prev;
                if (!nextState) {
                  // Expanding to full player
                  try {
                    window.history.replaceState(null, '', `#/watch/${selectedMedia.id}`);
                  } catch {}
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                  // Minimizing to mini player
                  try {
                    window.history.replaceState(null, '', `#/${activeTab}`);
                  } catch {}
                }
                return nextState;
              });
            }}
            onCloseMiniPlayer={handleClosePlayer}
          />
        )}
      </main>

      {/* Footer */}
      <div className={`transition-all duration-500 ${isTheaterMode ? 'opacity-20 blur-sm pointer-events-none' : 'opacity-100 blur-none'}`}>
        <Footer />
      </div>

      {/* Mobile Bottom Nav */}
      <MobileNav
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        isTheaterMode={isTheaterMode}
        watchlistCount={watchlistItems.length}
      />

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        catalog={fullCatalog}
        onSelectMedia={(item) => {
          setIsSearchOpen(false);
          if (item.id.startsWith('tmdb-')) {
            setCustomCatalog((prev) => {
              if (prev.some((m) => m.id === item.id)) return prev;
              const updated = [item, ...prev];
              try {
                localStorage.setItem('cinestream_custom_catalog', JSON.stringify(updated));
              } catch {
                // local storage fallback
              }
              return updated;
            });
          }
          handleOpenMedia(item);
        }}
      />

      {/* Custom Stream Link Modal */}
      <CustomStreamModal
        isOpen={isCustomStreamOpen}
        onClose={() => setIsCustomStreamOpen(false)}
        onPlayCustomMedia={(item) => {
          setIsCustomStreamOpen(false);
          handlePlayCustomMedia(item);
        }}
      />

      {/* ── Watch Party Modal ───────────────────────────── */}
      {isPartyOpen && (
        <WatchPartyModal
          onClose={() => setIsPartyOpen(false)}
          mediaInfo={selectedMedia ? {
            mediaId: selectedMedia.id,
            mediaTitle: selectedMedia.title,
            mediaPoster: selectedMedia.poster,
            mediaType: selectedMedia.type,
          } : undefined}
          autoJoinCode={autoJoinCode || undefined}
        />
      )}

      {/* ── Party Sync Toast (global) ───────────────────── */}
      <PartySyncToast />

      {/* ── Watch Party FAB (floating button) ──────────── */}
      {!isPartyOpen && (
        <button
          onClick={() => { playClick(); setAutoJoinCode(''); setIsPartyOpen(true); }}
          onMouseEnter={playHover}
          className={`fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-2xl border text-sm font-semibold transition-all duration-300 ${
            partyStatus === 'connected'
              ? 'bg-violet-500 text-white border-violet-400/60 shadow-violet-500/40 animate-pulse-slow'
              : 'bg-cinema-900/95 hover:bg-violet-500/20 text-violet-300 hover:text-violet-200 border-violet-500/25 hover:border-violet-500/50 backdrop-blur-xl'
          } ${isTheaterMode ? 'opacity-20 blur-[1px] hover:opacity-100 hover:blur-none' : ''}`}
          title="Watch Party — Nonton bareng teman"
        >
          <Users className={`w-4 h-4 ${partyStatus === 'connected' ? 'fill-white/20' : ''}`} />
          <span className="hidden sm:inline">Watch Party</span>
        </button>
      )}
    </div>
  );
};

export function App() {
  return (
    <LanguageProvider>
      <WatchlistProvider>
        <SoundProvider>
          <WatchPartyProvider>
            <MainContent />
          </WatchPartyProvider>
        </SoundProvider>
      </WatchlistProvider>
    </LanguageProvider>
  );
}

export default App;
