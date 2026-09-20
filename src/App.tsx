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
import { SearchModal, type ModalSearchSource } from './components/search/SearchModal';
import { CustomStreamModal } from './components/custom/CustomStreamModal';
import { ContinueWatchingRow } from './components/home/ContinueWatchingRow';
import { BecauseYouWatchedRow } from './components/home/BecauseYouWatchedRow';
import { ThematicShowcase } from './components/home/ThematicShowcase';
import { HomeFaqSection } from './components/home/HomeFaqSection';
import { HistoryView } from './components/history/HistoryView';
import { WatchedView } from './components/history/WatchedView';
import { AdvancedSearchView } from './components/search/AdvancedSearchView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { WatchlistProvider, useWatchlist } from './context/WatchlistContext';
import { UserProfileProvider, useUserProfile } from './context/UserProfileContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthModal } from './components/auth/AuthModal';
import { SoundProvider, useSound } from './context/SoundContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { WatchPartyProvider, useWatchParty } from './context/WatchPartyContext';
import { WatchPartyModal } from './components/party/WatchPartyModal';
import { WatchPartyLobbyView } from './components/party/WatchPartyLobbyView';
import { PartySyncToast } from './components/party/PartySyncToast';
import { CinestreamIntro } from './components/layout/CinestreamIntro';
import { PwaInstallPrompt } from './components/layout/PwaInstallPrompt';
import { PwaUpdateToast } from './components/layout/PwaUpdateToast';
import { OfflineBanner } from './components/layout/OfflineBanner';
import { VpnDnsNoticeModal } from './components/player/VpnDnsNoticeModal';
import { MOCK_CATALOG } from './data/mockCatalog';
import type { MediaItem, Episode } from './types/media';
import { fetchPopularHeroItems, fetchFullMediaItem } from './services/tmdb';
import { formatGenre, getMediaTitle } from './utils/formatters';
import {
  parseCurrentRoute,
  getMediaWatchUrl,
  getTabUrl,
  VALID_TABS,
} from './utils/navigation';
import { Bookmark, Users, ShieldAlert } from 'lucide-react';
import { initCapacitorApp } from './utils/capacitorApp';
import { isAdminUser } from './utils/admin';
import { LegalModal } from './components/common/LegalModal';
import {
  fetchSpotlightConfig,
  subscribeSpotlightRealtime,
  spotlightItemToMediaItem,
  type SpotlightConfig,
  DEFAULT_SPOTLIGHT_CONFIG,
} from './services/spotlightService';

const getInitialTab = (): string => {
  if (typeof window === 'undefined') return 'home';
  const route = parseCurrentRoute();

  if (route.type === 'tab') {
    return route.tab;
  }

  // If route is watch or party, recover saved browsing tab or default to home
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
  const { watchlist, watchlistMediaMap, recordWatch, historyItems, continueWatching } = useWatchlist();
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

  // User Profile & Admin Verification
  const { user, isLoading: isAuthLoading } = useAuth();
  const { profile } = useUserProfile();
  const isAdmin = isAdminUser(user, profile as any);

  // Navigation & Modals State (Persistent on refresh)
  const [activeTab, setActiveTab] = useState<string>(getInitialTab);

  // Route Guard: If activeTab is 'admin' and user is not an admin, immediately redirect to 'home'
  useEffect(() => {
    if (activeTab === 'admin' && !isAuthLoading && !isAdmin) {
      setActiveTab('home');
      try {
        localStorage.setItem('cinestream_active_tab', 'home');
        window.history.replaceState({ type: 'tab', tab: 'home' }, '', '/');
      } catch {}
    }
  }, [activeTab, isAdmin, isAuthLoading]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchInitialSource, setSearchInitialSource] = useState<ModalSearchSource>('all');
  const [isCustomStreamOpen, setIsCustomStreamOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<'privacy' | 'terms' | null>(() => {
    if (typeof window !== 'undefined') {
      const route = parseCurrentRoute();
      if (route.type === 'legal') return route.tab;
    }
    return null;
  });
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [resumeTime, setResumeTime] = useState<number | undefined>(undefined);
  const [resumeEpisodeId, setResumeEpisodeId] = useState<string | undefined>(undefined);
  const [isMiniPlayer, setIsMiniPlayer] = useState(false);
  const [isMediaLoading, setIsMediaLoading] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return parseCurrentRoute().type === 'watch';
    }
    return false;
  });

  // Theater Mode global dimming state
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // CineStream Netflix-style Intro Animation (only once per browser session; does not re-appear on refresh)
  const [showIntro, setShowIntro] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const hasSeenIntro = sessionStorage.getItem('cinestream_session_intro_shown');
      return !hasSeenIntro;
    } catch {
      return false;
    }
  });

  // Ensure intro is marked as seen for current browser session
  useEffect(() => {
    if (showIntro) {
      try {
        sessionStorage.setItem('cinestream_session_intro_shown', 'true');
      } catch {
        // ignore
      }
    }
  }, [showIntro]);

  // VPN & Cloudflare DNS Notice Popup for Film & Series (auto-triggered once per session or until dismissed)
  const [isVpnNoticeOpen, setIsVpnNoticeOpen] = useState(false);
  const hasTriggeredVpnNotice = useRef(false);

  useEffect(() => {
    try {
      if (localStorage.getItem('cinestream_vpn_notice_dismissed') === 'true') return;
      if (sessionStorage.getItem('cinestream_vpn_notice_dismissed') === 'true') return;
    } catch {}

    const isFilmOrSeriesTab = activeTab === 'movie' || activeTab === 'series';
    const isWatchingFilmOrSeries = !!selectedMedia && (selectedMedia.type === 'movie' || selectedMedia.type === 'series');

    if ((isFilmOrSeriesTab || isWatchingFilmOrSeries) && !hasTriggeredVpnNotice.current) {
      hasTriggeredVpnNotice.current = true;
      const timer = setTimeout(() => {
        setIsVpnNoticeOpen(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [activeTab, selectedMedia]);

  // Handle party CODE on load
  useEffect(() => {
    const route = parseCurrentRoute();
    if (route.type === 'party') {
      setAutoJoinCode(route.code);
      setIsPartyOpen(true);
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
      localStorage.removeItem('cinestream_cached_hero_popular');
      const cached = localStorage.getItem('cinestream_cached_hero_popular_v2');
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
            localStorage.setItem('cinestream_cached_hero_popular_v2', JSON.stringify(items));
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

  // Spotlight & Editor's Choice Real-time Integration
  const [spotlightConfig, setSpotlightConfig] = useState<SpotlightConfig>(() => {
    try {
      const cached = localStorage.getItem('cinestream_spotlight_config_v1');
      if (cached) return JSON.parse(cached);
    } catch {}
    return DEFAULT_SPOTLIGHT_CONFIG;
  });

  useEffect(() => {
    let isMounted = true;
    fetchSpotlightConfig().then((cfg) => {
      if (isMounted) setSpotlightConfig(cfg);
    });

    const unsub = subscribeSpotlightRealtime((cfg) => {
      if (isMounted) setSpotlightConfig(cfg);
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  // Compute Active Hero Display Items (incorporating real-time curated Spotlight)
  const heroDisplayItems = useMemo(() => {
    const baseTrending = heroPopularItems.length > 0 ? heroPopularItems : featuredItems;
    if (!spotlightConfig.enabled || !spotlightConfig.items || spotlightConfig.items.length === 0) {
      return baseTrending;
    }

    const activeSpotlightItems = spotlightConfig.items
      .filter((it) => it.active)
      .map((it) => spotlightItemToMediaItem(it));

    if (activeSpotlightItems.length === 0) {
      return baseTrending;
    }

    if (spotlightConfig.mode === 'override_hero') {
      return activeSpotlightItems;
    }

    // Default: 'pin_to_front' - pin curated spotlight items in front, followed by trending items without duplicate IDs
    const spotlightIds = new Set(activeSpotlightItems.map((s) => s.id));
    const filteredTrending = baseTrending.filter((item) => !spotlightIds.has(item.id));
    return [...activeSpotlightItems, ...filteredTrending];
  }, [heroPopularItems, featuredItems, spotlightConfig]);

  // Switch tab and persist state to URL and localStorage
  const handleSelectTab = (tab: string, pushHistory = true) => {
    // Route Guard for admin tab
    if (tab === 'admin' && !isAdmin) {
      return;
    }
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
      const targetUrl = getTabUrl(tab);
      if (pushHistory) {
        window.history.pushState({ type: 'tab', tab }, '', targetUrl);
      } else {
        window.history.replaceState({ type: 'tab', tab }, '', targetUrl);
      }
    } catch {
      // ignore
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Open Legal Modal (Privacy Policy / Terms of Service)
  const handleOpenLegal = (tab: 'privacy' | 'terms') => {
    playClick();
    setLegalModalTab(tab);
    try {
      window.history.pushState({ type: 'legal', tab }, '', `/${tab}`);
    } catch {}
  };

  const handleCloseLegal = () => {
    setLegalModalTab(null);
    try {
      if (
        typeof window !== 'undefined' &&
        (/^\/(?:privacy|terms)/i.test(window.location.pathname) ||
          /^#\/?(?:privacy|terms)/i.test(window.location.hash))
      ) {
        window.history.replaceState({ type: 'tab', tab: activeTab }, '', getTabUrl(activeTab));
      }
    } catch {}
  };

  // Open player / details section
  const handleOpenMedia = (
    media: MediaItem,
    customResumeTime?: number,
    customEpisodeId?: string,
    pushHistory = true
  ) => {
    playWhoosh();
    let effectiveEpId = customEpisodeId;
    let effectiveResumeTime = customResumeTime;

    // If opening a series without explicit episode, resume the last watched episode
    if (media.type !== 'movie' && !effectiveEpId) {
      const lastHistoryEp = historyItems.find((h) => h.mediaId === media.id && Boolean(h.episodeId));
      if (lastHistoryEp?.episodeId) {
        effectiveEpId = lastHistoryEp.episodeId;
        if (effectiveResumeTime === undefined && lastHistoryEp.currentTime > 0) {
          effectiveResumeTime = lastHistoryEp.currentTime;
        }
      } else {
        const lastCwEp = continueWatching.find((c) => c.mediaId === media.id && Boolean(c.episodeId));
        if (lastCwEp?.episodeId) {
          effectiveEpId = lastCwEp.episodeId;
          if (effectiveResumeTime === undefined && lastCwEp.currentTime > 0) {
            effectiveResumeTime = lastCwEp.currentTime;
          }
        }
      }
    }

    setResumeTime(effectiveResumeTime);
    setResumeEpisodeId(effectiveEpId);
    setIsTheaterMode(false);
    setIsMiniPlayer(false);
    setIsFullscreen(false);
    setSelectedMedia(media);

    let targetEp: Episode | undefined;
    let targetSeasonNum: number | undefined;
    if (effectiveEpId && media.seasons) {
      for (const s of media.seasons) {
        const found = s.episodes?.find((ep) => ep.id === effectiveEpId || (Boolean(ep.id) && ep.id.toLowerCase() === effectiveEpId.toLowerCase()));
        if (found) {
          targetSeasonNum = Number(found.seasonNumber || s.seasonNumber || (s as any).season_number || 1);
          targetEp = {
            ...found,
            seasonNumber: targetSeasonNum,
          };
          break;
        }
      }
    }
    if (!targetSeasonNum && effectiveEpId) {
      const match = effectiveEpId.match(/s(\d+)/i) || effectiveEpId.match(/season[_-]?(\d+)/i);
      if (match) targetSeasonNum = parseInt(match[1], 10);
    }

    recordWatch(media, {
      currentTime: effectiveResumeTime,
      episode: media.type === 'movie' ? undefined : (targetEp || (effectiveEpId ? ({ id: effectiveEpId, seasonNumber: targetSeasonNum } as any) : undefined)),
      seasonNumber: targetSeasonNum,
    });

    try {
      localStorage.setItem('cinestream_active_watch_id', media.id);
      const targetUrl = getMediaWatchUrl(media.id, effectiveEpId);
      if (pushHistory) {
        window.history.pushState({ type: 'watch', mediaId: media.id, episodeId: effectiveEpId }, '', targetUrl);
      } else {
        window.history.replaceState({ type: 'watch', mediaId: media.id, episodeId: effectiveEpId }, '', targetUrl);
      }
    } catch {
      // ignore
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Back from watching: transition to floating mini player
  const handleBackFromWatch = () => {
    setIsMiniPlayer(true);
    setIsTheaterMode(false);
    setIsFullscreen(false);
    try {
      const targetUrl = getTabUrl(activeTab);
      window.history.pushState({ type: 'tab', tab: activeTab }, '', targetUrl);
    } catch {
      // ignore
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Close player completely (used by Mini Player close 'X' button)
  const handleClosePlayer = () => {
    setSelectedMedia(null);
    setIsMiniPlayer(false);
    setIsFullscreen(false);
    setResumeTime(undefined);
    setResumeEpisodeId(undefined);
    setIsTheaterMode(false);
    try {
      localStorage.removeItem('cinestream_active_watch_id');
      const targetUrl = getTabUrl(activeTab);
      window.history.replaceState({ type: 'tab', tab: activeTab }, '', targetUrl);
    } catch {
      // ignore
    }
  };

  // Capacitor Android Native: Status bar color & hardware back button handling
  useEffect(() => {
    const cleanup = initCapacitorApp(() => {
      // 0. If legal modal is open, close it
      if (legalModalTab) {
        handleCloseLegal();
        return true;
      }
      // 1. If video player is open, close player
      if (selectedMedia) {
        handleClosePlayer();
        return true;
      }
      // 2. If search modal is open, close search
      if (isSearchOpen) {
        setIsSearchOpen(false);
        return true;
      }
      // 3. If watch party modal is open, close party
      if (isPartyOpen) {
        setIsPartyOpen(false);
        return true;
      }
      // 4. If custom stream modal is open, close it
      if (isCustomStreamOpen) {
        setIsCustomStreamOpen(false);
        return true;
      }
      // 5. If VPN notice modal is open, close it
      if (isVpnNoticeOpen) {
        setIsVpnNoticeOpen(false);
        return true;
      }
      // 6. If browsing a non-home tab, go back to home tab
      if (activeTab !== 'home') {
        setActiveTab('home');
        return true;
      }
      // Return false to allow default Android exit behavior
      return false;
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [
    legalModalTab,
    selectedMedia,
    isSearchOpen,
    isPartyOpen,
    isCustomStreamOpen,
    isVpnNoticeOpen,
    activeTab,
  ]);

  const heroDisplayItemsRef = useRef(heroDisplayItems);
  heroDisplayItemsRef.current = heroDisplayItems;
  const fullCatalogRef = useRef(fullCatalog);
  fullCatalogRef.current = fullCatalog;

  // Resolve and load media for playback from clean URL or hash (supports direct load in a new browser tab)
  const resolveAndPlayMedia = async (watchId: string, customEpisodeId?: string, syncUrl = false) => {
    const raw = (watchId || '').trim();
    if (!raw) {
      setSelectedMedia(null);
      setIsMediaLoading(false);
      return;
    }

    if (customEpisodeId) {
      setResumeEpisodeId(customEpisodeId);
    }

    setIsMediaLoading(true);

    const lowerId = raw.toLowerCase();

    // 1. Check in fullCatalog or heroDisplayItems
    const found =
      fullCatalogRef.current.find((m) => m.id.toLowerCase() === lowerId) ||
      heroDisplayItemsRef.current.find((m) => m.id.toLowerCase() === lowerId);

    if (found) {
      setSelectedMedia(found);
      setIsMiniPlayer(false);
      setIsMediaLoading(false);
      if (syncUrl) {
        window.history.replaceState({ type: 'watch', mediaId: found.id, episodeId: customEpisodeId }, '', getMediaWatchUrl(found.id, customEpisodeId));
      }
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
    const route = parseCurrentRoute();

    if (route.type === 'watch') {
      // Normalize URL to clean path if opened via legacy hash #/watch/...
      if (typeof window !== 'undefined' && window.location.hash.toLowerCase().startsWith('#/watch/')) {
        window.history.replaceState(
          { type: 'watch', mediaId: route.mediaId, episodeId: route.episodeId },
          '',
          getMediaWatchUrl(route.mediaId, route.episodeId)
        );
      }
      resolveAndPlayMedia(route.mediaId, route.episodeId);
    } else if (route.type === 'tab') {
      // Normalize URL to clean path if opened via legacy hash
      if (typeof window !== 'undefined' && window.location.hash.startsWith('#/')) {
        window.history.replaceState({ type: 'tab', tab: route.tab }, '', getTabUrl(route.tab));
      }
      setSelectedMedia(null);
      setIsMediaLoading(false);
      setActiveTab(route.tab);
    } else if (route.type === 'party') {
      if (typeof window !== 'undefined' && window.location.hash.startsWith('#/party/')) {
        window.history.replaceState({ type: 'party', code: route.code }, '', `/party/${route.code}`);
      }
      setAutoJoinCode(route.code);
      setIsPartyOpen(true);
      setSelectedMedia(null);
      setIsMediaLoading(false);
    } else if (route.type === 'legal') {
      setLegalModalTab(route.tab);
      setSelectedMedia(null);
      setIsMediaLoading(false);
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

  // Auto-sync guest/participant to room's media and episode if not currently watching it
  useEffect(() => {
    if (partyStatus === 'connected' && room?.mediaInfo?.mediaId) {
      const targetId = room.mediaInfo.mediaId;
      const targetEpId = room.mediaInfo.episodeId;
      const isDifferentMedia = !selectedMedia || selectedMedia.id !== targetId;
      const isDifferentEp = Boolean(targetEpId && resumeEpisodeId !== targetEpId);

      if (isDifferentMedia || isDifferentEp) {
        const found = fullCatalog.find((m) => m.id === targetId) || heroDisplayItems.find((m) => m.id === targetId);
        if (found) {
          handleOpenMedia(found, undefined, targetEpId, false);
          window.history.replaceState({ type: 'watch', mediaId: found.id, episodeId: targetEpId }, '', getMediaWatchUrl(found.id, targetEpId));
        } else if (targetId.startsWith('tmdb-movie-')) {
          const tmdbId = Number(targetId.replace('tmdb-movie-', ''));
          if (tmdbId) {
            fetchFullMediaItem(tmdbId, 'movie').then((m) => {
              if (m) {
                handleOpenMedia(m, undefined, undefined, false);
                window.history.replaceState({ type: 'watch', mediaId: m.id }, '', getMediaWatchUrl(m.id));
              }
            });
          }
        } else if (targetId.startsWith('tmdb-tv-')) {
          const tmdbId = Number(targetId.replace('tmdb-tv-', ''));
          if (tmdbId) {
            fetchFullMediaItem(tmdbId, 'tv').then((m) => {
              if (m) {
                handleOpenMedia(m, undefined, targetEpId, false);
                window.history.replaceState({ type: 'watch', mediaId: m.id, episodeId: targetEpId }, '', getMediaWatchUrl(m.id, targetEpId));
              }
            });
          }
        }
      }
    }
  }, [partyStatus, room?.mediaInfo?.mediaId, room?.mediaInfo?.episodeId, selectedMedia, resumeEpisodeId, fullCatalog, heroDisplayItems]);

  // Listen to browser navigation (back/forward buttons)
  useEffect(() => {
    const handleNavigation = () => {
      const route = parseCurrentRoute();

      if (route.type === 'watch') {
        setLegalModalTab(null);
        if (selectedMedia?.id !== route.mediaId) {
          resolveAndPlayMedia(route.mediaId, route.episodeId);
        } else if (route.episodeId) {
          setResumeEpisodeId(route.episodeId);
        }
        setIsMiniPlayer(false);
      } else if (route.type === 'tab') {
        setLegalModalTab(null);
        if (selectedMedia) {
          setSelectedMedia(null);
          setIsMiniPlayer(false);
        }
        // Admin tab route guard for popstate / URL changes
        if (route.tab === 'admin' && !isAdmin) {
          setActiveTab('home');
          try {
            localStorage.setItem('cinestream_active_tab', 'home');
            window.history.replaceState({ type: 'tab', tab: 'home' }, '', '/');
          } catch {}
          return;
        }
        setActiveTab(route.tab);
        try {
          localStorage.setItem('cinestream_active_tab', route.tab);
        } catch {
          // ignore
        }
      } else if (route.type === 'party') {
        setLegalModalTab(null);
        setAutoJoinCode(route.code);
        setIsPartyOpen(true);
      } else if (route.type === 'legal') {
        setLegalModalTab(route.tab);
      }
    };

    window.addEventListener('popstate', handleNavigation);
    window.addEventListener('hashchange', handleNavigation);
    return () => {
      window.removeEventListener('popstate', handleNavigation);
      window.removeEventListener('hashchange', handleNavigation);
    };
  }, [selectedMedia?.id, setAutoJoinCode, setIsPartyOpen, isAdmin]);

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

  const handleOpenSearch = (source: ModalSearchSource = 'all') => {
    setSearchInitialSource(source);
    if (source === 'all' && activeTab === 'home' && (!selectedMedia || isMiniPlayer)) {
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
      {showIntro && (
        <CinestreamIntro
          onComplete={() => {
            try {
              sessionStorage.setItem('cinestream_session_intro_shown', 'true');
            } catch {
              // ignore
            }
            setShowIntro(false);
          }}
        />
      )}

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
        onOpenWatchParty={togglePartyOpen}
        isTheaterMode={isTheaterMode}
        watchlistCount={watchlistItems.length}
        isHidden={isFullscreen}
      />

      {/* Main Body */}
      <main className="flex-1 relative">
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
                <BecauseYouWatchedRow
                  onPlayMedia={handleOpenMedia}
                  onOpenDetails={handleOpenMedia}
                  fullCatalog={fullCatalog}
                />
                <ThematicShowcase
                  onPlayMedia={handleOpenMedia}
                  onOpenDetails={handleOpenMedia}
                />
                <HomeFaqSection />
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
              <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                {(activeTab === 'movie' || activeTab === 'series') && (
                  <button
                    onClick={() => {
                      playClick();
                      setIsVpnNoticeOpen(true);
                    }}
                    onMouseEnter={playHover}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 hover:text-amber-200 text-xs font-semibold transition-all cursor-pointer shadow-sm hover:shadow-amber-500/10"
                    title={language === 'en' ? 'Playback Troubleshooting (VPN & DNS)' : 'Tips Pemutaran (VPN & DNS Cloudflare)'}
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    <span>{language === 'en' ? 'Playback Tips (VPN / DNS)' : 'Tips Video (VPN / DNS)'}</span>
                  </button>
                )}
                <span className="text-xs font-mono font-bold text-white bg-[#E50914]/20 px-3 py-1.5 rounded-full border border-[#E50914]/35">
                  {filteredCatalog.length} {t('titlesRegistered')}
                </span>
              </div>
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

        {/* VIEW 7: EXCLUSIVE ADMIN DASHBOARD (ADMINS ONLY) */}
        {activeTab === 'admin' && isAdmin && (
          <AdminDashboard
            onBackToHome={() => handleSelectTab('home')}
            onPlayMedia={(mediaId) => resolveAndPlayMedia(mediaId)}
            catalog={fullCatalog}
          />
        )}

        {/* VIEW 8: WATCH PARTY LOBBY (PUBLIC & PRIVATE SOCIAL DISCOVERY) */}
        {activeTab === 'watch-party' && (
          <WatchPartyLobbyView
            catalog={fullCatalog}
            onPlayMedia={(m, time, epId) => handleOpenMedia(m, time, epId)}
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
            onFullscreenChange={setIsFullscreen}
            onOpenVpnNotice={() => setIsVpnNoticeOpen(true)}
            onToggleMiniPlayer={() => {
              playClick();
              setIsTheaterMode(false);
              setIsMiniPlayer((prev) => {
                const nextState = !prev;
                if (!nextState) {
                  // Expanding to full player
                  try {
                    window.history.replaceState(
                      { type: 'watch', mediaId: selectedMedia.id, episodeId: resumeEpisodeId },
                      '',
                      getMediaWatchUrl(selectedMedia.id, resumeEpisodeId)
                    );
                  } catch {}
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                  // Minimizing to mini player
                  try {
                    window.history.replaceState({ type: 'tab', tab: activeTab }, '', getTabUrl(activeTab));
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
        <Footer onOpenLegal={handleOpenLegal} />
      </div>

      {/* Mobile Bottom Nav */}
      {(!selectedMedia || isMiniPlayer) && !isFullscreen && activeTab !== 'admin' && (
        <MobileNav
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          isTheaterMode={isTheaterMode}
          watchlistCount={watchlistItems.length}
        />
      )}

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        initialSource={searchInitialSource}
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

      {/* ── VPN & Cloudflare DNS Notice Popup for Film & Series ─────── */}
      <VpnDnsNoticeModal
        isOpen={isVpnNoticeOpen}
        onClose={() => setIsVpnNoticeOpen(false)}
      />

      {/* ── Legal Modal (Privacy Policy & Terms of Service) ───────── */}
      <LegalModal
        isOpen={Boolean(legalModalTab)}
        initialTab={legalModalTab || 'privacy'}
        onClose={handleCloseLegal}
      />

      {/* ── Watch Party Modal ───────────────────────────── */}
      {isPartyOpen && (
        <WatchPartyModal
          onClose={() => setIsPartyOpen(false)}
          mediaInfo={selectedMedia ? (() => {
            let activeEp: Episode | undefined;
            if (selectedMedia.seasons && resumeEpisodeId) {
              for (const s of selectedMedia.seasons) {
                const found = s.episodes?.find((e) => e.id === resumeEpisodeId);
                if (found) {
                  activeEp = found;
                  break;
                }
              }
            }
            return {
              mediaId: selectedMedia.id,
              mediaTitle: selectedMedia.title,
              mediaPoster: selectedMedia.poster,
              mediaType: selectedMedia.type,
              episodeId: activeEp?.id || resumeEpisodeId,
              seasonNumber: activeEp?.seasonNumber,
              episodeNumber: activeEp?.episodeNumber,
              episodeTitle: activeEp?.title,
            };
          })() : undefined}
          autoJoinCode={autoJoinCode || undefined}
        />
      )}

      {/* ── Party Sync Toast (global) ───────────────────── */}
      <PartySyncToast />

      {/* ── Offline Network Banner ───────────────────────── */}
      <OfflineBanner />

      {/* ── PWA Install Prompt (Floating Banner) ────────── */}
      <PwaInstallPrompt />

      {/* ── PWA Update Available Toast (Floating Toast) ── */}
      <PwaUpdateToast />

      {/* ── Watch Party FAB (floating button) ──────────── */}
      {!isPartyOpen && (!selectedMedia || isMiniPlayer) && !isFullscreen && (
        <button
          onClick={() => { playClick(); setAutoJoinCode(''); setIsPartyOpen(true); }}
          onMouseEnter={playHover}
          className={`fixed bottom-20 sm:bottom-6 right-3.5 sm:right-6 z-50 flex items-center justify-center sm:justify-start gap-2 w-11 h-11 sm:w-auto sm:h-auto sm:px-4 sm:py-2.5 rounded-full sm:rounded-2xl shadow-2xl border text-sm font-semibold transition-all duration-300 ${
            partyStatus === 'connected'
              ? 'bg-violet-500 text-white border-violet-400/60 shadow-violet-500/40 animate-pulse-slow'
              : 'bg-cinema-900/95 hover:bg-violet-500/20 text-violet-300 hover:text-violet-200 border-violet-500/25 hover:border-violet-500/50 backdrop-blur-xl'
          } ${isTheaterMode ? 'opacity-20 blur-[1px] hover:opacity-100 hover:blur-none' : ''}`}
          title="Watch Party — Nonton bareng teman"
        >
          <div className="relative flex items-center justify-center">
            <Users className={`w-4 h-4 ${partyStatus === 'connected' ? 'fill-white/20' : ''}`} />
            {partyStatus === 'connected' && (
              <span className="sm:hidden absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </div>
          <span className="hidden sm:inline">Watch Party</span>
        </button>
      )}
    </div>
  );
};

export function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <UserProfileProvider>
          <WatchlistProvider>
            <SoundProvider>
              <WatchPartyProvider>
                <MainContent />
                <AuthModal />
              </WatchPartyProvider>
            </SoundProvider>
          </WatchlistProvider>
        </UserProfileProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
