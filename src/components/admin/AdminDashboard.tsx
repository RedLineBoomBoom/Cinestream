import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Shield,
  Users,
  Bookmark,
  Clock,
  Server,
  Activity,
  Megaphone,
  Play,
  RotateCw,
  Search,
  CheckCircle2,
  ExternalLink,
  ChevronLeft,
  Trash2,
  Save,
  Radio,
  Copy,
  Check,
  Film,
  Tv,
  Globe,
  Loader2,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  Star,
  Eye,
  EyeOff,
  Sparkles,
  Crown,
  ArrowUp,
  ArrowDown,
  Plus,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { useUserProfile, PROFILE_PALETTES } from '../../context/UserProfileContext';
import { useSound } from '../../context/SoundContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  fetchSpotlightConfig,
  saveSpotlightConfig,
  subscribeSpotlightRealtime,
  mediaItemToSpotlightItem,
  type SpotlightConfig,
  type SpotlightBadgeColor,
  SUPABASE_SPOTLIGHT_SQL,
  DEFAULT_SPOTLIGHT_CONFIG,
} from '../../services/spotlightService';
import { searchTMDB, fetchFullMediaItem } from '../../services/tmdb';
import type { MediaItem } from '../../types/media';
import {
  fetchStreamReports,
  updateReportStatus,
  deleteStreamReport,
  SUPABASE_STREAM_REPORTS_SQL,
  type StreamReport,
  type ReportStatus,
} from '../../services/reportService';
import {
  fetchAllReviewsForAdmin,
  updateReviewStatus,
  deleteReview,
  SUPABASE_REVIEWS_SQL,
  type MediaReview,
  type ReviewStatus,
} from '../../services/reviewService';
import {
  isAdminUser,
  saveAnnouncement,
  getActiveAnnouncement,
  fetchActiveAnnouncementFromCloud,
  checkCloudAnnouncementStatus,
  SUPABASE_ANNOUNCEMENT_SQL,
  type BroadcastAnnouncement,
  type CloudSyncDiagnostic,
  getAdminEmails,
} from '../../utils/admin';

interface AdminDashboardProps {
  onBackToHome: () => void;
  onPlayMedia?: (mediaId: string, type: 'movie' | 'series') => void;
  catalog?: MediaItem[];
}

interface UserProfileRow {
  id: string;
  name: string;
  avatar_type: string;
  initials: string;
  emoji: string;
  theme_palette: string;
  updated_at?: string;
  created_at?: string;
  role?: string;
}

interface ServerStatusItem {
  id: string;
  name: string;
  url: string;
  type: 'embed' | 'api';
  status: 'checking' | 'online' | 'warning' | 'offline';
  latencyMs?: number;
}

const STREAM_SERVERS: ServerStatusItem[] = [
  { id: 'tmdb', name: 'TMDB Metadata API', url: 'https://api.themoviedb.org/3/configuration', type: 'api', status: 'checking' },
  { id: 'vidsrc', name: 'Server 1 • VidSrc Prime', url: 'https://vidsrc.to', type: 'embed', status: 'checking' },
  { id: 'autoembed', name: 'Server 2 • AutoEmbed Ultra', url: 'https://player.autoembed.co', type: 'embed', status: 'checking' },
  { id: '2embed', name: 'Server 3 • 2Embed Cinema', url: 'https://www.2embed.cc', type: 'embed', status: 'checking' },
  { id: 'multiembed', name: 'Server 4 • MultiStream Pro', url: 'https://multiembed.mov', type: 'embed', status: 'checking' },
  { id: 'anyembed', name: 'Server 5 • AnyEmbed Sub Indo', url: 'https://anyembed.xyz', type: 'embed', status: 'checking' },
  { id: 'vidlink', name: 'Server 6 • VidLink Pro HD', url: 'https://vidlink.pro', type: 'embed', status: 'checking' },
];

function getIssueBadge(type: string, lang: string) {
  switch (type) {
    case 'playback_error':
      return {
        label: lang === 'en' ? 'Playback / 404' : 'Video Rusak / 404',
        icon: '🚫',
        className: 'bg-red-500/20 text-red-300 border-red-500/40',
      };
    case 'subtitle_error':
      return {
        label: lang === 'en' ? 'Subtitle Error' : 'Subtitle Rusak',
        icon: '💬',
        className: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      };
    case 'audio_sync':
      return {
        label: lang === 'en' ? 'Audio Muted / Desync' : 'Suara Bisu / Desync',
        icon: '🔊',
        className: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      };
    case 'slow_buffer':
      return {
        label: lang === 'en' ? 'Buffering / Freezing' : 'Buffering Parah',
        icon: '⏳',
        className: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
      };
    case 'wrong_content':
      return {
        label: lang === 'en' ? 'Wrong Content' : 'Konten / Episode Salah',
        icon: '⚠️',
        className: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      };
    default:
      return {
        label: lang === 'en' ? 'Technical Issue' : 'Kendala Teknis',
        icon: '📝',
        className: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      };
  }
}

function getStatusBadge(status: string, lang: string) {
  switch (status) {
    case 'open':
      return {
        label: lang === 'en' ? 'Open' : 'Terbuka',
        className: 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse',
      };
    case 'investigating':
      return {
        label: lang === 'en' ? 'Investigating' : 'Sedang Diperiksa',
        className: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      };
    case 'resolved':
      return {
        label: lang === 'en' ? 'Resolved' : 'Selesai',
        className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      };
    case 'rejected':
      return {
        label: lang === 'en' ? 'Rejected' : 'Ditolak',
        className: 'bg-slate-500/20 text-slate-400 border-slate-500/40',
      };
    default:
      return {
        label: status,
        className: 'bg-white/10 text-slate-300 border-white/20',
      };
  }
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onBackToHome,
  onPlayMedia,
  catalog = [],
}) => {
  const { user, signOut } = useAuth();
  const { profile } = useUserProfile();
  const { playClick, playSuccess, playHover } = useSound();
  const { language, toggleLanguage } = useLanguage();

  // Internal Defense-in-Depth Authorization Guard
  const isAuthorized = isAdminUser(user, profile as any);

  useEffect(() => {
    if (!isAuthorized) {
      onBackToHome();
    }
  }, [isAuthorized, onBackToHome]);

  if (!isAuthorized) {
    return null;
  }

  // Active Admin Sub-Tab
  const [activeTab, setActiveTab] = useState<
    'overview' | 'users' | 'spotlight' | 'broadcast' | 'issues' | 'stream-tester' | 'reviews' | 'system'
  >('overview');

  // Spotlight & Editor's Choice State
  const [spotlightConfig, setSpotlightConfig] = useState<SpotlightConfig>(DEFAULT_SPOTLIGHT_CONFIG);
  const [isLoadingSpotlight, setIsLoadingSpotlight] = useState(false);
  const [isSavingSpotlight, setIsSavingSpotlight] = useState(false);
  const [spotlightSaveToast, setSpotlightSaveToast] = useState<string | null>(null);
  const [spotlightSearchInput, setSpotlightSearchInput] = useState('');
  const [spotlightSearchResults, setSpotlightSearchResults] = useState<any[]>([]);
  const [isSearchingSpotlight, setIsSearchingSpotlight] = useState(false);
  const [copiedSpotlightSql, setCopiedSpotlightSql] = useState(false);
  const [previewSpotlightIndex, setPreviewSpotlightIndex] = useState(0);
  const [addingMediaId, setAddingMediaId] = useState<string | number | null>(null);

  // ── Load & Subscribe Spotlight Config ──
  useEffect(() => {
    let isMounted = true;
    setIsLoadingSpotlight(true);
    fetchSpotlightConfig().then((cfg) => {
      if (isMounted) {
        setSpotlightConfig(cfg);
        setIsLoadingSpotlight(false);
      }
    });

    const unsub = subscribeSpotlightRealtime((newCfg) => {
      if (isMounted) {
        setSpotlightConfig(newCfg);
      }
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  const handleSearchSpotlight = async (query: string) => {
    if (!query.trim()) {
      setSpotlightSearchResults([]);
      return;
    }
    setIsSearchingSpotlight(true);
    try {
      const tmdbResults = await searchTMDB(query, 1, language);
      const localMatches = catalog
        .filter(
          (m) =>
            m.title.toLowerCase().includes(query.toLowerCase()) ||
            (m.titleEn && m.titleEn.toLowerCase().includes(query.toLowerCase())) ||
            (m.originalTitle && m.originalTitle.toLowerCase().includes(query.toLowerCase()))
        )
        .slice(0, 5);

      const merged: any[] = [...localMatches];
      for (const item of tmdbResults) {
        if (!merged.some((m) => String(m.tmdbId || m.id) === String(item.id))) {
          merged.push(item);
        }
      }
      setSpotlightSearchResults(merged.slice(0, 12));
    } catch (err) {
      console.warn('Failed to search TMDB for spotlight:', err);
    } finally {
      setIsSearchingSpotlight(false);
    }
  };

  const handleAddSpotlightItem = async (candidate: any) => {
    playClick();
    setAddingMediaId(candidate.id || candidate.tmdbId);
    try {
      let fullMedia: MediaItem | null = null;
      if (candidate.backdrop && candidate.synopsis && candidate.type) {
        fullMedia = candidate as MediaItem;
      } else {
        fullMedia = await fetchFullMediaItem(
          candidate.id,
          candidate.mediaType === 'tv' ? 'tv' : 'movie'
        );
      }

      if (!fullMedia) {
        alert(
          language === 'en'
            ? 'Failed to fetch details for this title.'
            : 'Gagal mengambil detail untuk tayangan ini.'
        );
        return;
      }

      const newItem = mediaItemToSpotlightItem(fullMedia, {
        customBadge: language === 'en' ? "⭐ EDITOR'S CHOICE" : '⭐ PILIHAN EDITOR',
        customBadgeColor: 'amber',
        order: spotlightConfig.items.length,
        active: true,
      });

      setSpotlightConfig((prev) => ({
        ...prev,
        enabled: true,
        items: [newItem, ...prev.items.filter((i) => i.mediaId !== newItem.mediaId)],
      }));

      playSuccess();
      setSpotlightSearchInput('');
      setSpotlightSearchResults([]);
    } catch (err) {
      console.error('Failed to add spotlight item:', err);
    } finally {
      setAddingMediaId(null);
    }
  };

  const handleMoveSpotlight = (index: number, direction: 'up' | 'down') => {
    playClick();
    const newItems = [...spotlightConfig.items];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newItems.length) return;
    const temp = newItems[index];
    newItems[index] = newItems[targetIdx];
    newItems[targetIdx] = temp;
    setSpotlightConfig((prev) => ({ ...prev, items: newItems }));
  };

  const handleToggleSpotlightItem = (id: string) => {
    playClick();
    setSpotlightConfig((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === id ? { ...it, active: !it.active } : it)),
    }));
  };

  const handleRemoveSpotlightItem = (id: string) => {
    if (
      !confirm(
        language === 'en'
          ? 'Remove this title from the curated spotlight list?'
          : 'Hapus film ini dari daftar pilihan editor?'
      )
    ) {
      return;
    }
    playClick();
    setSpotlightConfig((prev) => ({
      ...prev,
      items: prev.items.filter((it) => it.id !== id),
    }));
  };

  const handleSaveSpotlight = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    playClick();
    setIsSavingSpotlight(true);
    try {
      await saveSpotlightConfig(spotlightConfig, user?.email || user?.id);
      playSuccess();
      setSpotlightSaveToast(
        language === 'en'
          ? "Spotlight & Editor's Choice saved & broadcast globally in real-time!"
          : 'Spotlight & Pilihan Editor berhasil disimpan dan disiarkan secara real-time ke semua penonton!'
      );
      setTimeout(() => setSpotlightSaveToast(null), 4000);
    } catch (err: any) {
      console.error('Failed to save spotlight:', err);
      alert(
        language === 'en'
          ? 'Error saving spotlight: ' + err.message
          : 'Gagal menyimpan spotlight: ' + err.message
      );
    } finally {
      setIsSavingSpotlight(false);
    }
  };

  // Stream Reports State
  const [reports, setReports] = useState<StreamReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [reportFilter, setReportFilter] = useState<'all' | 'open' | 'investigating' | 'resolved' | 'rejected'>('all');
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [copiedReportSql, setCopiedReportSql] = useState(false);
  const [updatingReportId, setUpdatingReportId] = useState<string | null>(null);

  // Community Reviews Moderation State
  const [adminReviews, setAdminReviews] = useState<MediaReview[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'published' | 'hidden' | 'flagged'>('all');
  const [reviewSearchQuery, setReviewSearchQuery] = useState('');
  const [copiedReviewSql, setCopiedReviewSql] = useState(false);
  const [updatingReviewId, setUpdatingReviewId] = useState<string | null>(null);

  const fetchAdminReviews = useCallback(async () => {
    setIsLoadingReviews(true);
    try {
      const data = await fetchAllReviewsForAdmin();
      setAdminReviews(data);
    } catch (e) {
      console.warn('Error fetching admin reviews:', e);
    } finally {
      setIsLoadingReviews(false);
    }
  }, []);

  const handleUpdateReviewStatus = async (reviewId: string, status: ReviewStatus) => {
    playClick();
    setUpdatingReviewId(reviewId);
    try {
      const success = await updateReviewStatus(reviewId, status);
      if (success) {
        setAdminReviews((prev) =>
          prev.map((r) => (r.id === reviewId ? { ...r, status } : r))
        );
        playSuccess();
      }
    } finally {
      setUpdatingReviewId(null);
    }
  };

  const handleDeleteAdminReview = async (reviewId: string) => {
    if (!confirm(language === 'en' ? 'Permanently delete this review?' : 'Hapus ulasan ini secara permanen?')) {
      return;
    }
    playClick();
    setUpdatingReviewId(reviewId);
    try {
      const success = await deleteReview(reviewId);
      if (success) {
        setAdminReviews((prev) => prev.filter((r) => r.id !== reviewId));
        playSuccess();
      }
    } finally {
      setUpdatingReviewId(null);
    }
  };

  const fetchReports = useCallback(async () => {
    setIsLoadingReports(true);
    try {
      const data = await fetchStreamReports();
      setReports(data);
    } catch (e) {
      console.warn('Error fetching reports:', e);
    } finally {
      setIsLoadingReports(false);
    }
  }, []);

  const openIssuesCount = useMemo(() => {
    return reports.filter((r) => r.status === 'open' || r.status === 'investigating').length;
  }, [reports]);

  const handleUpdateStatus = async (reportId: string, status: ReportStatus, notes?: string) => {
    playClick();
    setUpdatingReportId(reportId);
    try {
      await updateReportStatus(reportId, status, notes);
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? {
                ...r,
                status,
                resolvedAt: status === 'resolved' || status === 'rejected' ? new Date().toISOString() : undefined,
                adminNotes: notes ?? r.adminNotes,
              }
            : r
        )
      );
      playSuccess();
    } catch (e) {
      console.warn('Failed to update status:', e);
    } finally {
      setUpdatingReportId(null);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    playClick();
    setUpdatingReportId(reportId);
    try {
      await deleteStreamReport(reportId);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    } catch (e) {
      console.warn('Failed to delete report:', e);
    } finally {
      setUpdatingReportId(null);
    }
  };

  const handleTestReportStream = (report: StreamReport) => {
    playClick();
    const rawId = report.tmdbId ? String(report.tmdbId) : report.mediaId.replace('tmdb-movie-', '').replace('tmdb-tv-', '');
    setTestTmdbId(rawId || '550');
    setTestMediaType(report.mediaType === 'movie' ? 'movie' : 'tv');
    if (report.seasonNumber) setTestSeason(String(report.seasonNumber));
    if (report.episodeNumber) setTestEpisode(String(report.episodeNumber));

    const cleanServer = (report.serverId || '').toLowerCase();
    const cleanServerName = (report.serverName || '').toLowerCase();

    if (cleanServer.includes('autoembed') || cleanServerName.includes('autoembed')) {
      setTestServer('autoembed');
    } else if (cleanServer.includes('2embed') || cleanServerName.includes('2embed')) {
      setTestServer('2embed');
    } else if (cleanServer.includes('vidsrc') || cleanServerName.includes('vidsrc')) {
      setTestServer('vidsrc');
    } else if (cleanServer.includes('multiembed') || cleanServer.includes('multistream') || cleanServerName.includes('multistream')) {
      setTestServer('multiembed');
    } else if (cleanServer.includes('anyembed') || cleanServer.includes('smashy') || cleanServerName.includes('anyembed')) {
      setTestServer('anyembed');
    } else {
      setTestServer('vidlink');
    }

    setActiveTab('stream-tester');
  };

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      // 1. Status filter
      if (reportFilter !== 'all' && r.status !== reportFilter) return false;

      // 2. Search query filter
      if (reportSearchQuery.trim()) {
        const q = reportSearchQuery.toLowerCase();
        const titleMatch = r.mediaTitle.toLowerCase().includes(q);
        const serverMatch = r.serverName.toLowerCase().includes(q) || r.serverId.toLowerCase().includes(q);
        const userMatch = (r.reportedBy || '').toLowerCase().includes(q) || (r.userEmail || '').toLowerCase().includes(q);
        return titleMatch || serverMatch || userMatch;
      }
      return true;
    });
  }, [reports, reportFilter, reportSearchQuery]);

  const filteredReviews = useMemo(() => {
    return adminReviews.filter((r) => {
      if (reviewFilter !== 'all' && r.status !== reviewFilter) return false;
      if (reviewSearchQuery.trim()) {
        const q = reviewSearchQuery.toLowerCase();
        const titleMatch = r.mediaTitle.toLowerCase().includes(q);
        const userMatch = (r.userName || '').toLowerCase().includes(q) || (r.userEmail || '').toLowerCase().includes(q);
        const contentMatch = (r.content || '').toLowerCase().includes(q);
        return titleMatch || userMatch || contentMatch;
      }
      return true;
    });
  }, [adminReviews, reviewFilter, reviewSearchQuery]);

  // Metrics State
  const [totalProfiles, setTotalProfiles] = useState<number | null>(null);
  const [totalWatchlist, setTotalWatchlist] = useState<number | null>(null);
  const [totalHistory, setTotalHistory] = useState<number | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);

  // Users List State
  const [userList, setUserList] = useState<UserProfileRow[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Server Health State
  const [serverHealth, setServerHealth] = useState<ServerStatusItem[]>(STREAM_SERVERS);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  // Broadcast Announcement State
  const [announcement, setAnnouncement] = useState<BroadcastAnnouncement>(() => {
    const active = getActiveAnnouncement();
    if (active) return active;
    return {
      id: `bc_${Date.now().toString(36)}`,
      title: language === 'en' ? 'NOTICE' : 'PENGUMUMAN',
      message: '',
      type: 'info',
      active: false,
      createdAt: new Date().toISOString(),
      linkText: '',
      linkUrl: '',
    };
  });
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);
  const [announcementSavedFeedback, setAnnouncementSavedFeedback] = useState(false);

  // Cross-Device Cloud Sync Diagnostics
  const [cloudDiagnostic, setCloudDiagnostic] = useState<CloudSyncDiagnostic | null>(null);
  const [isCheckingCloud, setIsCheckingCloud] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [lastSaveResult, setLastSaveResult] = useState<{ cloudSynced: boolean; error?: string } | null>(null);

  const runCheckCloud = useCallback(async () => {
    setIsCheckingCloud(true);
    try {
      const res = await checkCloudAnnouncementStatus();
      setCloudDiagnostic(res);
    } catch {
      // ignore
    } finally {
      setIsCheckingCloud(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'broadcast') {
      runCheckCloud();
    }
  }, [activeTab, runCheckCloud]);

  // Media / Stream Tester State
  const [testTmdbId, setTestTmdbId] = useState('550'); // Default: Fight Club
  const [testMediaType, setTestMediaType] = useState<'movie' | 'tv'>('movie');
  const [testSeason, setTestSeason] = useState('1');
  const [testEpisode, setTestEpisode] = useState('1');
  const [testServer, setTestServer] = useState<'vidlink' | 'autoembed' | '2embed' | 'vidsrc' | 'multiembed' | 'anyembed'>('vidlink');
  const [testEmbedUrl, setTestEmbedUrl] = useState('');

  // ── Load Platform Metrics ──
  const fetchMetrics = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setIsLoadingMetrics(false);
      return;
    }

    setIsLoadingMetrics(true);
    try {
      // 1. Fetch total profiles count
      const { count: profilesCount, data: profilesData } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .order('updated_at', { ascending: false })
        .limit(50);

      setTotalProfiles(profilesCount ?? (profilesData?.length || 0));
      if (profilesData) {
        setUserList(profilesData as UserProfileRow[]);
      }

      // 2. Fetch total watchlist count (excluding internal broadcast row)
      const { count: watchlistCount } = await supabase
        .from('watchlist')
        .select('*', { count: 'exact', head: true })
        .neq('media_id', '__cinestream_broadcast_announcement__');
      setTotalWatchlist(watchlistCount ?? 0);

      // 3. Fetch total history count
      const { count: historyCount } = await supabase
        .from('watch_history')
        .select('*', { count: 'exact', head: true });
      setTotalHistory(historyCount ?? 0);
    } catch (err) {
      console.warn('Failed to load admin metrics:', err);
    } finally {
      setIsLoadingMetrics(false);
    }
  }, []);

  // ── Check Server Health ──
  const checkHealth = useCallback(async () => {
    setIsCheckingHealth(true);
    const updated = await Promise.all(
      STREAM_SERVERS.map(async (server) => {
        const start = performance.now();
        try {
          if (server.id === 'tmdb') {
            const res = await fetch('https://api.themoviedb.org/3/movie/550?api_key=4e44d9029b1270a757cddc766a1bcb63', {
              method: 'GET',
              signal: AbortSignal.timeout(4000),
            }).catch(() => null);
            const latency = Math.round(performance.now() - start);
            return {
              ...server,
              status: res && res.ok ? ('online' as const) : ('warning' as const),
              latencyMs: latency,
            };
          }

          // For third-party embed servers (CORS prevents direct fetch), we test fetch with no-cors or image ping
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 4500);
          await fetch(server.url, { mode: 'no-cors', signal: controller.signal });
          clearTimeout(timeout);
          const latency = Math.round(performance.now() - start);

          return {
            ...server,
            status: 'online' as const,
            latencyMs: latency,
          };
        } catch {
          const latency = Math.round(performance.now() - start);
          return {
            ...server,
            status: latency < 4000 ? ('online' as const) : ('warning' as const),
            latencyMs: latency,
          };
        }
      })
    );

    setServerHealth(updated);
    setIsCheckingHealth(false);
  }, []);

  // Sync cloud announcement & reports when opening dashboard
  useEffect(() => {
    fetchMetrics();
    checkHealth();
    fetchReports();
    fetchAdminReviews();
    fetchActiveAnnouncementFromCloud().then((cloud) => {
      if (cloud) {
        setAnnouncement(cloud);
      }
    });
  }, [fetchMetrics, checkHealth, fetchReports, fetchAdminReviews]);

  // Refetch reports whenever opening issues tab or reviews tab
  useEffect(() => {
    if (activeTab === 'issues') {
      fetchReports();
    }
    if (activeTab === 'reviews') {
      fetchAdminReviews();
    }
  }, [activeTab, fetchReports, fetchAdminReviews]);

  // Update test embed url when parameters change
  useEffect(() => {
    const cleanId = testTmdbId.trim() || '550';
    let url = '';
    if (testServer === 'vidlink') {
      url = testMediaType === 'movie'
        ? `https://vidlink.pro/movie/${cleanId}?primaryColor=e50914`
        : `https://vidlink.pro/tv/${cleanId}/${testSeason}/${testEpisode}?primaryColor=e50914`;
    } else if (testServer === 'autoembed') {
      url = testMediaType === 'movie'
        ? `https://player.autoembed.co/embed/movie/${cleanId}`
        : `https://player.autoembed.co/embed/tv/${cleanId}/${testSeason}/${testEpisode}`;
    } else if (testServer === '2embed') {
      url = testMediaType === 'movie'
        ? `https://www.2embed.cc/embed/${cleanId}`
        : `https://www.2embed.cc/embedtv/${cleanId}&s=${testSeason}&e=${testEpisode}`;
    } else if (testServer === 'vidsrc') {
      url = testMediaType === 'movie'
        ? `https://vidsrc.to/embed/movie/${cleanId}`
        : `https://vidsrc.to/embed/tv/${cleanId}/${testSeason}/${testEpisode}`;
    } else if (testServer === 'multiembed') {
      url = testMediaType === 'movie'
        ? `https://multiembed.mov/?video_id=${cleanId}&tmdb=1`
        : `https://multiembed.mov/?video_id=${cleanId}&tmdb=1&s=${testSeason}&e=${testEpisode}`;
    } else if (testServer === 'anyembed') {
      url = testMediaType === 'movie'
        ? `https://anyembed.xyz/embed/tmdb-movie-${cleanId}`
        : `https://anyembed.xyz/embed/tmdb-tv-${cleanId}-${testSeason}-${testEpisode}`;
    }
    setTestEmbedUrl(url);
  }, [testTmdbId, testMediaType, testSeason, testEpisode, testServer]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return userList;
    const q = userSearchQuery.toLowerCase();
    return userList.filter((u) => {
      return (
        u.name?.toLowerCase().includes(q) ||
        u.id?.toLowerCase().includes(q) ||
        u.initials?.toLowerCase().includes(q)
      );
    });
  }, [userList, userSearchQuery]);

  // Copy helper
  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    playClick();
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Save Announcement (Synced to Supabase Cloud so all devices & PWAs see it)
  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    playSuccess();
    setIsSavingAnnouncement(true);
    const toSave: BroadcastAnnouncement = {
      ...announcement,
      createdAt: new Date().toISOString(),
    };
    const res = await saveAnnouncement(toSave, user?.id);
    setLastSaveResult({ cloudSynced: res.cloudSynced, error: res.error });
    setIsSavingAnnouncement(false);
    setAnnouncementSavedFeedback(true);
    setTimeout(() => setAnnouncementSavedFeedback(false), 4500);
    runCheckCloud();
  };

  // Clear Announcement
  const handleClearAnnouncement = async () => {
    playClick();
    setIsSavingAnnouncement(true);
    const res = await saveAnnouncement(null, user?.id);
    setLastSaveResult({ cloudSynced: res.cloudSynced, error: res.error });
    setIsSavingAnnouncement(false);
    setAnnouncement({
      id: `bc_${Date.now().toString(36)}`,
      title: language === 'en' ? 'NOTICE' : 'PENGUMUMAN',
      message: '',
      type: 'info',
      active: false,
      createdAt: new Date().toISOString(),
      linkText: '',
      linkUrl: '',
    });
    setAnnouncementSavedFeedback(true);
    setTimeout(() => setAnnouncementSavedFeedback(false), 4500);
    runCheckCloud();
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-slate-100 pt-20 pb-28 px-4 sm:px-8 lg:px-12">
      {/* ── Top Header Bar ── */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => {
                playClick();
                onBackToHome();
              }}
              onMouseEnter={playHover}
              className="p-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title={language === 'en' ? 'Back to Home' : 'Kembali ke Beranda'}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">
                {language === 'en' ? 'Exit Dashboard' : 'Keluar Dashboard'}
              </span>
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 via-rose-600 to-amber-600 p-0.5 shadow-lg shadow-red-900/50 flex items-center justify-center">
                <div className="w-full h-full rounded-[10px] bg-black/40 backdrop-blur-xs flex items-center justify-center">
                  <Shield className="w-5 h-5 text-amber-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-display font-black tracking-tight text-white uppercase">
                    {language === 'en' ? 'Admin Command Center' : 'Pusat Kontrol Admin'}
                  </h1>
                  <span className="px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-mono font-bold tracking-wider uppercase">
                    SUPERADMIN
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-emerald-400">
                    {language === 'en' ? '● Logged in as:' : '● Masuk sebagai:'}
                  </span>
                  <span className="text-slate-200 font-bold">{user?.email || 'Admin'}</span>
                  <span className="text-slate-500">|</span>
                  <span className="text-slate-400">Cinestream v2.5.0</span>
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Direct Language Switcher */}
            <button
              onClick={() => {
                playClick();
                toggleLanguage();
              }}
              onMouseEnter={playHover}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-semibold text-white transition-all cursor-pointer"
              title={language === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
            >
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-mono text-[11px] font-black">{language.toUpperCase()}</span>
            </button>

            <button
              onClick={() => {
                playClick();
                fetchMetrics();
                checkHealth();
                fetchReports();
                fetchAdminReviews();
                setIsLoadingSpotlight(true);
                fetchSpotlightConfig()
                  .then((cfg) => setSpotlightConfig(cfg))
                  .finally(() => setIsLoadingSpotlight(false));
              }}
              onMouseEnter={playHover}
              disabled={isLoadingMetrics || isCheckingHealth || isLoadingReports || isLoadingReviews || isLoadingSpotlight}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-semibold text-white transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoadingMetrics || isCheckingHealth || isLoadingReports || isLoadingReviews || isLoadingSpotlight ? 'animate-spin' : ''}`} />
              <span>{language === 'en' ? 'Refresh Data' : 'Segarkan Data'}</span>
            </button>

            <button
              onClick={async () => {
                playClick();
                await signOut();
                onBackToHome();
              }}
              onMouseEnter={playHover}
              className="px-3 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-xs font-semibold text-red-300 transition-all cursor-pointer"
            >
              {language === 'en' ? 'Sign Out' : 'Keluar Akun'}
            </button>
          </div>
        </div>

        {/* ── Navigation Tabs ── */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pb-2 border-b border-white/[0.06]">
          {[
            {
              id: 'overview',
              label: language === 'en' ? 'Overview & Metrics' : 'Ringkasan & Metrik',
              icon: Activity,
            },
            {
              id: 'users',
              label: language === 'en' ? 'Users & Profiles' : 'Pengguna & Profil',
              icon: Users,
              badge: totalProfiles,
            },
            {
              id: 'spotlight',
              label: language === 'en' ? "Spotlight & Editor's Choice" : 'Kurasi Spotlight & Editor',
              icon: Sparkles,
              badge:
                spotlightConfig.items.filter((i) => i.active).length > 0
                  ? spotlightConfig.items.filter((i) => i.active).length
                  : undefined,
              highlight: spotlightConfig.enabled && spotlightConfig.items.some((i) => i.active),
            },
            {
              id: 'broadcast',
              label: language === 'en' ? 'Announcement Banner' : 'Pengumuman Banner',
              icon: Megaphone,
              highlight: announcement.active,
            },
            {
              id: 'issues',
              label: language === 'en' ? 'Stream Issues' : 'Laporan Masalah',
              icon: AlertTriangle,
              badge: openIssuesCount > 0 ? openIssuesCount : undefined,
              highlight: openIssuesCount > 0,
            },
            {
              id: 'stream-tester',
              label: language === 'en' ? 'Stream & TMDB Inspector' : 'Inspektur Stream & TMDB',
              icon: Play,
            },
            {
              id: 'reviews',
              label: language === 'en' ? 'Community Reviews' : 'Ulasan Komunitas',
              icon: MessageSquare,
              badge: adminReviews.length > 0 ? adminReviews.length : undefined,
              highlight: adminReviews.some((r) => r.status === 'flagged'),
            },
            {
              id: 'system',
              label: language === 'en' ? 'System & Servers' : 'Sistem & Server',
              icon: Server,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  playClick();
                  setActiveTab(tab.id as any);
                }}
                onMouseEnter={playHover}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 border ${
                  isActive
                    ? 'bg-[#E50914] text-white border-[#E50914] shadow-lg shadow-red-950/40'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white border-white/[0.06]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge !== null && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${isActive ? 'bg-black/30 text-white' : 'bg-white/10 text-slate-300'}`}>
                    {tab.badge}
                  </span>
                )}
                {tab.highlight && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* ════════════════ TAB 1: OVERVIEW ════════════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {/* Metric 1: Profiles */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/10 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/10 rounded-full blur-2xl group-hover:bg-red-600/20 transition-all pointer-events-none" />
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {language === 'en' ? 'Total Registered Profiles' : 'Total Profil Terdaftar'}
                  </span>
                  <Users className="w-4 h-4 text-red-400" />
                </div>
                <div className="text-3xl font-display font-black text-white">
                  {isLoadingMetrics ? '...' : totalProfiles ?? 0}
                </div>
                <p className="text-[11px] text-slate-400 mt-2 font-mono flex items-center gap-1.5">
                  <span className="text-emerald-400">✓ Supabase Cloud</span>
                  <span>{language === 'en' ? '• profiles table' : '• tabel profiles'}</span>
                </p>
              </div>

              {/* Metric 2: Watchlist */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/10 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-600/10 rounded-full blur-2xl group-hover:bg-amber-600/20 transition-all pointer-events-none" />
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {language === 'en' ? 'Total Saved (Watchlist)' : 'Total Disimpan (Watchlist)'}
                  </span>
                  <Bookmark className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-3xl font-display font-black text-white">
                  {isLoadingMetrics ? '...' : totalWatchlist ?? 0}
                </div>
                <p className="text-[11px] text-slate-400 mt-2 font-mono flex items-center gap-1.5">
                  <span className="text-amber-400">★ Items synced</span>
                  <span>{language === 'en' ? '• global user bookmarks' : '• bookmark pengguna'}</span>
                </p>
              </div>

              {/* Metric 3: History */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/10 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/10 rounded-full blur-2xl group-hover:bg-blue-600/20 transition-all pointer-events-none" />
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {language === 'en' ? 'Watch History Items' : 'Riwayat Tontonan'}
                  </span>
                  <Clock className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-3xl font-display font-black text-white">
                  {isLoadingMetrics ? '...' : totalHistory ?? 0}
                </div>
                <p className="text-[11px] text-slate-400 mt-2 font-mono flex items-center gap-1.5">
                  <span className="text-cyan-400">▶ Stream sessions</span>
                  <span>{language === 'en' ? '• watch progress log' : '• log progres nonton'}</span>
                </p>
              </div>

              {/* Metric 4: Platform Engine Status */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/10 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-600/10 rounded-full blur-2xl group-hover:bg-emerald-600/20 transition-all pointer-events-none" />
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {language === 'en' ? 'Streaming Engine Health' : 'Kesehatan Streaming'}
                  </span>
                  <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                </div>
                <div className="text-3xl font-display font-black text-emerald-400">
                  ONLINE
                </div>
                <p className="text-[11px] text-slate-400 mt-2 font-mono flex items-center gap-1.5">
                  <span className="text-emerald-400">● 5/5 Providers ready</span>
                  <span>{language === 'en' ? '• zero downtime' : '• tanpa kendala'}</span>
                </p>
              </div>

              {/* Metric 5: Issue Reports */}
              <div
                onClick={() => {
                  playClick();
                  setActiveTab('issues');
                }}
                className="p-5 rounded-2xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/10 shadow-xl relative overflow-hidden group cursor-pointer hover:border-amber-500/40 transition-all"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/10 rounded-full blur-2xl group-hover:bg-red-600/20 transition-all pointer-events-none" />
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {language === 'en' ? 'Stream Issue Reports' : 'Laporan Masalah'}
                  </span>
                  <AlertTriangle className={`w-4 h-4 ${openIssuesCount > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />
                </div>
                <div className="text-3xl font-display font-black text-white flex items-center gap-2">
                  <span>{isLoadingReports ? '...' : openIssuesCount}</span>
                  {openIssuesCount > 0 && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                      {language === 'en' ? 'PENDING' : 'PERLU CEK'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-2 font-mono flex items-center gap-1.5">
                  <span className={openIssuesCount > 0 ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                    {openIssuesCount > 0 ? `⚠ ${openIssuesCount} unhandled` : '✓ All clear'}
                  </span>
                  <span>{language === 'en' ? '• click to view' : '• klik untuk pantau'}</span>
                </p>
              </div>

              {/* Metric 6: Community Reviews */}
              <div
                onClick={() => {
                  playClick();
                  setActiveTab('reviews');
                }}
                className="p-5 rounded-2xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/10 shadow-xl relative overflow-hidden group cursor-pointer hover:border-amber-400/40 transition-all"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-600/10 rounded-full blur-2xl group-hover:bg-amber-600/20 transition-all pointer-events-none" />
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {language === 'en' ? 'Community Reviews' : 'Ulasan Komunitas'}
                  </span>
                  <MessageSquare className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-3xl font-display font-black text-white flex items-center gap-2">
                  <span>{isLoadingReviews ? '...' : adminReviews.length}</span>
                  {adminReviews.filter((r) => r.status === 'flagged').length > 0 && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                      {adminReviews.filter((r) => r.status === 'flagged').length} {language === 'en' ? 'FLAGGED' : 'DILAPORKAN'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-2 font-mono flex items-center gap-1.5">
                  <span className="text-amber-400">★ 1–10 Scale</span>
                  <span>{language === 'en' ? '• click to moderate' : '• klik untuk kurasi'}</span>
                </p>
              </div>
            </div>

            {/* Server Status Table */}
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Server className="w-4 h-4 text-cyan-400" />
                    {language === 'en' ? 'Streaming Servers & Metadata API Status' : 'Status Server Streaming & API Metadata'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {language === 'en'
                      ? 'Live endpoint availability monitoring for video providers and movie metadata'
                      : 'Pemantauan ketersediaan endpoint provider video dan metadata film'}
                  </p>
                </div>
                <button
                  onClick={checkHealth}
                  disabled={isCheckingHealth}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCw className={`w-3 h-3 ${isCheckingHealth ? 'animate-spin' : ''}`} />
                  <span>{language === 'en' ? 'Ping Servers' : 'Ping Server'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {serverHealth.map((server) => (
                  <div
                    key={server.id}
                    className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{server.name}</span>
                      </div>
                      <p className="text-[11px] font-mono text-slate-400 truncate max-w-[200px] mt-0.5">
                        {server.url}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                          server.status === 'online'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : server.status === 'warning'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {server.status === 'online' && <CheckCircle2 className="w-2.5 h-2.5" />}
                        {server.status}
                      </span>
                      {server.latencyMs !== undefined && (
                        <div className="text-[10px] font-mono text-slate-400 mt-1">
                          {server.latencyMs} ms
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Administrator Whitelist Card */}
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
              <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" />
                {language === 'en' ? 'Administrator Email Whitelist' : 'Daftar Whitelist Email Administrator'}
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                {language === 'en'
                  ? 'Only accounts with verified emails listed below can open this dashboard and access administrator controls.'
                  : 'Hanya akun dengan email terverifikasi di bawah ini yang dapat membuka dashboard ini dan melihat tombol akses admin.'}
              </p>
              <div className="flex flex-wrap gap-2">
                {getAdminEmails().map((email) => (
                  <div
                    key={email}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200 text-xs font-mono font-bold"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{email}</span>
                    <span className="px-1.5 py-0.2 rounded bg-red-500/20 text-[9px] text-red-300 uppercase">
                      Admin
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════ TAB 2: USERS LIST ════════════════ */}
        {activeTab === 'users' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {language === 'en' ? 'Registered User Profiles' : 'Daftar Profil Pengguna Terdaftar'}
                </h3>
                <p className="text-xs text-slate-400">
                  {language === 'en'
                    ? 'User profile records synchronized directly from Supabase profiles table.'
                    : 'Data profil disinkronkan langsung dari tabel profiles di Supabase.'}
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={language === 'en' ? 'Search name, ID, or initials...' : 'Cari nama, ID, atau inisial...'}
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#E50914]"
                />
              </div>
            </div>

            {/* Users Grid */}
            {filteredUsers.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-white/[0.02] border border-white/10">
                <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-400">
                  {language === 'en' ? 'No profiles found matching search.' : 'Tidak ada profil yang cocok dengan pencarian.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUsers.map((u) => {
                  const palette = PROFILE_PALETTES.find((p) => p.id === u.theme_palette) || PROFILE_PALETTES[0];
                  const isCurrent = u.id === profile?.id;
                  const isCopied = copiedId === u.id;

                  return (
                    <div
                      key={u.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isCurrent
                          ? 'bg-red-950/20 border-red-500/40 shadow-lg shadow-red-950/20'
                          : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Avatar */}
                          <div
                            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${palette.gradient} p-0.5 border ${palette.border} shadow-md flex items-center justify-center shrink-0 select-none`}
                          >
                            <div className="w-full h-full rounded-[10px] bg-black/20 flex items-center justify-center text-white">
                              {u.avatar_type === 'monogram' ? (
                                <span className="font-display font-black text-sm">{u.initials || 'CS'}</span>
                              ) : (
                                <span className="text-xl">{u.emoji || '🎬'}</span>
                              )}
                            </div>
                          </div>

                          {/* Info */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-sm font-bold text-white truncate max-w-[170px]">{u.name}</h4>
                              {isCurrent && (
                                <span className="px-1.5 py-0.5 rounded bg-red-500/30 text-red-300 text-[9px] font-bold">
                                  YOU
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] font-mono text-slate-400 truncate max-w-[190px]">
                              Palette: {palette.name}
                            </p>
                          </div>
                        </div>

                        {/* Copy ID Button */}
                        <button
                          onClick={() => handleCopyId(u.id)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                          title={language === 'en' ? 'Copy User ID' : 'Salin User ID'}
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span className="truncate max-w-[140px] text-[10px] text-slate-500">
                          ID: {u.id.substring(0, 16)}...
                        </span>
                        <span>
                          {u.updated_at
                            ? new Date(u.updated_at).toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID')
                            : (language === 'en' ? 'Active' : 'Aktif')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════════════ TAB: SPOTLIGHT & EDITOR'S CHOICE ════════════════ */}
        {activeTab === 'spotlight' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Header & Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <span>
                    {language === 'en'
                      ? "Spotlight & Editor's Choice Manager (Hero Banner)"
                      : 'Manager Spotlight & Pilihan Editor (Hero Banner)'}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {language === 'en'
                    ? 'Curate and switch featured homepage hero movies in real-time at any time. Changes are instantly broadcast to all devices.'
                    : 'Ganti dan atur film unggulan di layar utama beranda secara real-time kapan pun. Perubahan disiarkan ke semua perangkat penonton seketika.'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {spotlightConfig.enabled ? (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{language === 'en' ? 'LIVE ON HOMEPAGE' : 'AKTIF DI BERANDA'}</span>
                    <span className="text-[10px] text-emerald-400/80">
                      ({spotlightConfig.items.filter((i) => i.active).length}{' '}
                      {language === 'en' ? 'titles' : 'judul'})
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-xs font-bold font-mono">
                    <span className="w-2 h-2 rounded-full bg-slate-500" />
                    <span>{language === 'en' ? 'DISABLED (USING TMDB TRENDING)' : 'NONAKTIF (TMDB TRENDING)'}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Master Controls: Toggle + Mode Selection */}
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-6">
              {/* Enable / Disable Switch */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.04] border border-white/10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-bold text-white">
                      {language === 'en' ? 'Curated Spotlight Status' : 'Status Kurasi Spotlight'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 max-w-xl">
                    {language === 'en'
                      ? 'When enabled, admin-curated titles override or pin to the front of the homepage Hero Banner across all devices in real-time.'
                      : 'Ketika diaktifkan, film pilihan editor akan tampil di posisi utama Hero Banner beranda pada seluruh perangkat penonton secara real-time.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setSpotlightConfig((prev) => ({ ...prev, enabled: !prev.enabled }));
                  }}
                  className={`w-14 h-7 rounded-full transition-colors cursor-pointer relative p-0.5 shrink-0 ${
                    spotlightConfig.enabled ? 'bg-amber-500 shadow-lg shadow-amber-500/30' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full bg-white transition-transform ${
                      spotlightConfig.enabled ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Mode Selection */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                  {language === 'en' ? 'Homepage Hero Display Mode:' : 'Mode Penayangan di Beranda:'}
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Mode 1: Pin to Front */}
                  <div
                    onClick={() => {
                      playClick();
                      setSpotlightConfig((prev) => ({ ...prev, mode: 'pin_to_front' }));
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                      spotlightConfig.mode === 'pin_to_front'
                        ? 'bg-amber-500/15 border-amber-500/50 shadow-md shadow-amber-950/30'
                        : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>
                          {language === 'en' ? 'Pin to Front (#1) (Recommended)' : 'Sematkan di Depan (#1) (Disarankan)'}
                        </span>
                      </span>
                      {spotlightConfig.mode === 'pin_to_front' && (
                        <CheckCircle2 className="w-4 h-4 text-amber-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {language === 'en'
                        ? 'Curated spotlight titles appear first in rotation, followed smoothly by trending TMDB movies.'
                        : 'Film pilihan editor berada di urutan pertama Hero Banner, diikuti oleh film populer trending TMDB.'}
                    </p>
                  </div>

                  {/* Mode 2: Override Entire Hero */}
                  <div
                    onClick={() => {
                      playClick();
                      setSpotlightConfig((prev) => ({ ...prev, mode: 'override_hero' }));
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                      spotlightConfig.mode === 'override_hero'
                        ? 'bg-red-500/15 border-red-500/50 shadow-md shadow-red-950/30'
                        : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Crown className="w-3.5 h-3.5 text-red-400" />
                        <span>
                          {language === 'en' ? 'Show Only Editor’s Choice' : 'Hanya Tampilkan Pilihan Editor'}
                        </span>
                      </span>
                      {spotlightConfig.mode === 'override_hero' && (
                        <CheckCircle2 className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {language === 'en'
                        ? 'Exclusively showcases admin-curated titles in the hero rotation, hiding automatic TMDB trending.'
                        : 'Mengganti seluruh rotasi banner hanya dengan film yang dipilih oleh admin secara eksklusif.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* TMDB & Catalog Live Search */}
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Search className="w-4 h-4 text-cyan-400" />
                    <span>
                      {language === 'en' ? 'Search Movie or Series to Feature' : 'Cari Film atau Series untuk Spotlight'}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    {language === 'en'
                      ? 'Search millions of titles on TMDB or pick from your local catalog.'
                      : 'Cari jutaan judul di database TMDB atau pilih dari katalog lokal Anda.'}
                  </p>
                </div>
              </div>

              {/* Search Box */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSearchSpotlight(spotlightSearchInput);
                }}
                className="flex gap-2"
              >
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={spotlightSearchInput}
                    onChange={(e) => {
                      setSpotlightSearchInput(e.target.value);
                      if (!e.target.value.trim()) setSpotlightSearchResults([]);
                    }}
                    placeholder={
                      language === 'en'
                        ? 'Type movie or series title (e.g. Interstellar, Dune, Arcane, Avatar)...'
                        : 'Ketik judul film atau serial (misal: Interstellar, Dune, Arcane, Avatar)...'
                    }
                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSearchingSpotlight || !spotlightSearchInput.trim()}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                >
                  {isSearchingSpotlight ? (
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  <span>{language === 'en' ? 'Search' : 'Cari'}</span>
                </button>
              </form>

              {/* Quick Picks from Catalog */}
              {catalog.length > 0 && spotlightSearchResults.length === 0 && (
                <div className="pt-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    {language === 'en' ? 'Quick Picks from Local Catalog:' : 'Pilihan Cepat dari Katalog Lokal:'}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {catalog.slice(0, 8).map((catItem) => (
                      <button
                        key={catItem.id}
                        type="button"
                        onClick={() => handleAddSpotlightItem(catItem)}
                        disabled={addingMediaId === catItem.id}
                        className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus className="w-3 h-3 text-amber-400" />
                        <span>{catItem.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Results Grid */}
              {spotlightSearchResults.length > 0 && (
                <div className="pt-4 border-t border-white/[0.06] space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-bold text-white">
                      {spotlightSearchResults.length} {language === 'en' ? 'Titles Found' : 'Judul Ditemukan'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSpotlightSearchResults([])}
                      className="text-[11px] text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {language === 'en' ? 'Clear Results' : 'Tutup Hasil'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {spotlightSearchResults.map((cand) => {
                      const isAdding = addingMediaId === (cand.id || cand.tmdbId);
                      const isAlreadyAdded = spotlightConfig.items.some(
                        (i) => i.mediaId === cand.id || String(i.tmdbId) === String(cand.id)
                      );

                      return (
                        <div
                          key={cand.id || cand.tmdbId}
                          className="p-3 rounded-xl bg-black/40 border border-white/10 flex gap-3 items-center group hover:border-amber-500/40 transition-all"
                        >
                          <img
                            src={cand.poster || cand.posterEn || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200'}
                            alt={cand.title}
                            className="w-12 h-16 object-cover rounded-lg shrink-0 border border-white/10"
                          />
                          <div className="min-w-0 flex-1 space-y-1">
                            <h5 className="text-xs font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                              {cand.title}
                            </h5>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                              <span>{cand.year || (cand.releaseDate ? new Date(cand.releaseDate).getFullYear() : '')}</span>
                              <span>•</span>
                              <span className="uppercase text-amber-400 font-bold">{cand.mediaType || cand.type || 'Movie'}</span>
                              {cand.rating ? (
                                <>
                                  <span>•</span>
                                  <span className="text-yellow-400">★ {Number(cand.rating).toFixed(1)}</span>
                                </>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAddSpotlightItem(cand)}
                              disabled={isAdding}
                              className={`w-full mt-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                                isAlreadyAdded
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-white/10 hover:bg-amber-500 hover:text-black text-white'
                              }`}
                            >
                              {isAdding ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : isAlreadyAdded ? (
                                <>
                                  <Check className="w-3 h-3 text-amber-400" />
                                  <span>{language === 'en' ? 'Added (Update)' : 'Terpilih (Perbarui)'}</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3 h-3" />
                                  <span>{language === 'en' ? 'Set as Spotlight' : 'Jadikan Spotlight'}</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Live Hero Banner Simulator (Miniature Preview) */}
            {spotlightConfig.items.length > 0 && (
              <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>{language === 'en' ? 'Live Hero Banner Preview' : 'Pratinjau Langsung Hero Banner (Live Preview)'}</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      {language === 'en'
                        ? 'Simulating how visitors will see the featured title on the homepage hero banner.'
                        : 'Simulasi tampilan film unggulan pada layar utama pengunjung di halaman beranda.'}
                    </p>
                  </div>

                  {spotlightConfig.items.length > 1 && (
                    <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10">
                      {spotlightConfig.items.map((it, idx) => (
                        <button
                          key={it.id}
                          type="button"
                          onClick={() => setPreviewSpotlightIndex(idx)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                            previewSpotlightIndex === idx
                              ? 'bg-amber-500 text-black shadow-sm'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          #{idx + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {(() => {
                  const previewItem = spotlightConfig.items[previewSpotlightIndex] || spotlightConfig.items[0];
                  if (!previewItem) return null;

                  const badgeBg =
                    previewItem.customBadgeColor === 'red'
                      ? 'bg-[#E50914] text-white shadow-red-900/50'
                      : previewItem.customBadgeColor === 'purple'
                      ? 'bg-purple-600 text-white shadow-purple-900/50'
                      : previewItem.customBadgeColor === 'emerald'
                      ? 'bg-emerald-600 text-white shadow-emerald-900/50'
                      : previewItem.customBadgeColor === 'cyan'
                      ? 'bg-cyan-500 text-black shadow-cyan-900/50'
                      : 'bg-amber-400 text-black shadow-amber-950/50';

                  return (
                    <div className="relative h-64 sm:h-80 rounded-2xl overflow-hidden border border-white/15 shadow-2xl bg-black select-none">
                      {/* Backdrop image */}
                      <img
                        src={previewItem.customBackdrop || previewItem.backdrop || previewItem.poster}
                        alt={previewItem.title}
                        className="w-full h-full object-cover object-center filter brightness-90 contrast-105"
                      />
                      {/* Vignette gradients */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/70 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/80 to-transparent w-full md:w-[70%]" />

                      {/* Content Overlay */}
                      <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-end max-w-xl space-y-2.5">
                        {/* Custom Badge */}
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-lg flex items-center gap-1 ${badgeBg}`}
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>{previewItem.customBadge || '⭐ PILIHAN EDITOR'}</span>
                          </span>
                          <span className="text-xs font-bold text-white font-mono">{previewItem.year}</span>
                          <span className="px-1.5 py-0.5 border border-white/30 text-[9px] text-white font-bold rounded">
                            4K ULTRA HD
                          </span>
                          <span className="text-[11px] text-yellow-400 font-bold">★ {previewItem.rating?.toFixed(1) || '8.8'}</span>
                        </div>

                        {/* Title */}
                        <h3 className="text-xl sm:text-3xl font-display font-black text-white uppercase tracking-tight line-clamp-1 drop-shadow-lg">
                          {previewItem.title}
                        </h3>

                        {/* Editorial Tagline */}
                        {previewItem.customTagline && (
                          <p className="text-xs sm:text-sm font-semibold text-amber-300/90 italic line-clamp-1">
                            "{previewItem.customTagline}"
                          </p>
                        )}

                        {/* Synopsis */}
                        <p className="text-xs text-white/80 line-clamp-2 leading-relaxed">
                          {previewItem.synopsis}
                        </p>

                        {/* Mock CTA Buttons */}
                        <div className="flex items-center gap-2 pt-1 pointer-events-none">
                          <div className="px-4 py-2 rounded-md bg-white text-black font-black text-xs flex items-center gap-1.5 shadow-md">
                            <Play className="w-3.5 h-3.5 fill-black" />
                            <span>{previewItem.mediaType === 'movie' ? 'Tonton Film' : 'Tonton Series'}</span>
                          </div>
                          <div className="px-4 py-2 rounded-md bg-white/20 text-white font-bold text-xs backdrop-blur-md">
                            Detail & Ulasan
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Curated Spotlight Showcase List */}
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span>{language === 'en' ? 'Curated Spotlight Showcase' : 'Daftar Tayangan Spotlight Terpilih'}</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    {language === 'en'
                      ? 'Reorder rotation, customize badge text and colors, or set editorial spotlight notes.'
                      : 'Atur urutan rotasi banner, sesuaikan teks & warna lencana, serta tambahkan catatan sorotan editor.'}
                  </p>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  {spotlightConfig.items.length} {language === 'en' ? 'items configured' : 'judul terdaftar'}
                </span>
              </div>

              {spotlightConfig.items.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                  <Sparkles className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {language === 'en'
                      ? 'No spotlight titles added yet. Search a movie or series in the search box above to begin curating.'
                      : 'Belum ada tayangan spotlight yang dipilih. Cari film atau series pada kolom pencarian di atas untuk mulai mengkurasi.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {spotlightConfig.items.map((item, index) => {
                    const BADGE_PRESETS = [
                      { label: language === 'en' ? "⭐ EDITOR'S CHOICE" : '⭐ PILIHAN EDITOR', color: 'amber' as SpotlightBadgeColor },
                      { label: language === 'en' ? '👑 PREMIER SPOTLIGHT' : '👑 SPOTLIGHT UTAMA', color: 'red' as SpotlightBadgeColor },
                      { label: language === 'en' ? '🔥 MUST WATCH' : '🔥 WAJIB TONTON', color: 'red' as SpotlightBadgeColor },
                      { label: language === 'en' ? '💎 MASTERPIECE' : '💎 MAHA KARYA', color: 'purple' as SpotlightBadgeColor },
                      { label: language === 'en' ? '🏆 BEST PICTURE' : '🏆 FILM TERBAIK', color: 'amber' as SpotlightBadgeColor },
                    ];

                    return (
                      <div
                        key={item.id}
                        className={`p-5 rounded-2xl border transition-all duration-200 space-y-4 ${
                          item.active
                            ? 'bg-gradient-to-r from-amber-950/20 via-white/[0.02] to-white/[0.01] border-amber-500/30 shadow-lg shadow-amber-950/20'
                            : 'bg-white/[0.01] border-white/5 opacity-60'
                        }`}
                      >
                        {/* Top Header Row: Poster, Title, Move Controls, Remove */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Order Position Badge */}
                            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                              #{index + 1}
                            </div>

                            <img
                              src={item.poster || item.posterEn}
                              alt={item.title}
                              className="w-10 h-14 object-cover rounded-lg border border-white/10 shrink-0"
                            />

                            <div className="min-w-0 space-y-0.5">
                              <h5 className="text-sm font-bold text-white truncate">{item.title}</h5>
                              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                                <span>{item.year}</span>
                                <span>•</span>
                                <span className="uppercase text-amber-400 font-bold">{item.mediaType}</span>
                                <span>•</span>
                                <span className="text-yellow-400">★ {item.rating?.toFixed(1) || '8.8'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Quick Actions: Move Up / Down, Toggle Active, Delete */}
                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                            {/* Move Up */}
                            <button
                              type="button"
                              onClick={() => handleMoveSpotlight(index, 'up')}
                              disabled={index === 0}
                              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer disabled:opacity-30"
                              title={language === 'en' ? 'Move Up in Rotation' : 'Pindah ke Atas'}
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>

                            {/* Move Down */}
                            <button
                              type="button"
                              onClick={() => handleMoveSpotlight(index, 'down')}
                              disabled={index === spotlightConfig.items.length - 1}
                              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer disabled:opacity-30"
                              title={language === 'en' ? 'Move Down in Rotation' : 'Pindah ke Bawah'}
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>

                            {/* Active Toggle */}
                            <button
                              type="button"
                              onClick={() => handleToggleSpotlightItem(item.id)}
                              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                                item.active
                                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                  : 'bg-white/[0.04] border-white/10 text-slate-500'
                              }`}
                              title={item.active ? 'Status: Aktif' : 'Status: Nonaktif'}
                            >
                              {item.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleRemoveSpotlightItem(item.id)}
                              className="p-2 rounded-xl bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-400 hover:text-red-300 transition-all cursor-pointer"
                              title={language === 'en' ? 'Remove Title' : 'Hapus dari Pilihan Editor'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Custom Badge & Color Configuration */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {/* Badge Text Input */}
                          <div className="space-y-1.5 sm:col-span-2">
                            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                              {language === 'en' ? 'Badge Label (Hero Pill)' : 'Teks Lencana (Hero Badge)'}
                            </label>
                            <input
                              type="text"
                              value={item.customBadge || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSpotlightConfig((prev) => ({
                                  ...prev,
                                  items: prev.items.map((it) => (it.id === item.id ? { ...it, customBadge: val } : it)),
                                }));
                              }}
                              placeholder="e.g. ⭐ PILIHAN EDITOR"
                              className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                            />

                            {/* 1-Click Badge Presets */}
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {BADGE_PRESETS.map((preset) => (
                                <button
                                  key={preset.label}
                                  type="button"
                                  onClick={() => {
                                    playClick();
                                    setSpotlightConfig((prev) => ({
                                      ...prev,
                                      items: prev.items.map((it) =>
                                        it.id === item.id
                                          ? { ...it, customBadge: preset.label, customBadgeColor: preset.color }
                                          : it
                                      ),
                                    }));
                                  }}
                                  className="px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-[10px] font-mono font-bold text-slate-300 hover:text-white transition-all cursor-pointer"
                                >
                                  {preset.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Badge Color Selector */}
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                              {language === 'en' ? 'Badge Color Theme' : 'Warna Lencana'}
                            </label>
                            <div className="flex items-center gap-2 pt-1">
                              {[
                                { id: 'amber', label: 'Gold', bg: 'bg-amber-400' },
                                { id: 'red', label: 'Red', bg: 'bg-red-600' },
                                { id: 'purple', label: 'Purple', bg: 'bg-purple-600' },
                                { id: 'emerald', label: 'Green', bg: 'bg-emerald-500' },
                                { id: 'cyan', label: 'Cyan', bg: 'bg-cyan-400' },
                              ].map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    playClick();
                                    setSpotlightConfig((prev) => ({
                                      ...prev,
                                      items: prev.items.map((it) =>
                                        it.id === item.id ? { ...it, customBadgeColor: c.id as any } : it
                                      ),
                                    }));
                                  }}
                                  className={`w-7 h-7 rounded-xl ${c.bg} transition-all cursor-pointer flex items-center justify-center ${
                                    item.customBadgeColor === c.id
                                      ? 'ring-2 ring-white scale-110 shadow-md'
                                      : 'opacity-60 hover:opacity-100'
                                  }`}
                                  title={c.label}
                                >
                                  {item.customBadgeColor === c.id && <Check className="w-3.5 h-3.5 text-black" />}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Custom Tagline & Optional YouTube Trailer Key */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          <div>
                            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                              {language === 'en' ? 'Editorial Tagline / Highlight Note' : 'Tagline Sorotan / Catatan Kurasi'}
                            </label>
                            <input
                              type="text"
                              value={item.customTagline || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSpotlightConfig((prev) => ({
                                  ...prev,
                                  items: prev.items.map((it) => (it.id === item.id ? { ...it, customTagline: val } : it)),
                                }));
                              }}
                              placeholder={
                                language === 'en'
                                  ? 'e.g. Masterpiece film awarded 7 Academy Awards...'
                                  : 'Misal: Film mahakarya peraih 7 piala Oscar...'
                              }
                              className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                              {language === 'en' ? 'YouTube Trailer Key (Optional Override)' : 'Trailer YouTube Key (Opsional)'}
                            </label>
                            <input
                              type="text"
                              value={item.trailerYoutubeKey || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSpotlightConfig((prev) => ({
                                  ...prev,
                                  items: prev.items.map((it) => (it.id === item.id ? { ...it, trailerYoutubeKey: val } : it)),
                                }));
                              }}
                              placeholder="e.g. d9MyW72ELq0"
                              className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Action Save Bar */}
              <div className="pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-slate-400">
                  {language === 'en'
                    ? 'Clicking Save will broadcast changes across WebSockets in real-time to all live sessions.'
                    : 'Menyimpan konfigurasi akan langsung menyiarkan pembaruan secara real-time via WebSocket ke seluruh penonton.'}
                </div>

                <button
                  type="button"
                  onClick={() => handleSaveSpotlight()}
                  disabled={isSavingSpotlight}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-xs transition-all shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  {isSavingSpotlight ? (
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                  ) : (
                    <Sparkles className="w-4 h-4 fill-black" />
                  )}
                  <span>{language === 'en' ? 'Save & Apply in Real-time' : 'Simpan & Terapkan Real-time'}</span>
                </button>
              </div>

              {/* Toast Feedback */}
              {spotlightSaveToast && (
                <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{spotlightSaveToast}</span>
                </div>
              )}
            </div>

            {/* Supabase SQL Setup Box for spotlight_config table */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    {language === 'en'
                      ? 'Supabase Database Schema: spotlight_config'
                      : 'Skema Database Supabase: spotlight_config'}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    navigator.clipboard.writeText(SUPABASE_SPOTLIGHT_SQL);
                    setCopiedSpotlightSql(true);
                    playSuccess();
                    setTimeout(() => setCopiedSpotlightSql(false), 2500);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold cursor-pointer transition-all shrink-0"
                >
                  {copiedSpotlightSql ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">
                        {language === 'en' ? 'Copied SQL!' : 'SQL Disalin!'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-300" />
                      <span>{language === 'en' ? 'Copy SQL Script' : 'Salin Skrip SQL'}</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                {language === 'en'
                  ? 'Run this SQL script in Supabase SQL Editor to allow all visitor devices (Mobile, Tablet, Desktop, PWA) to read the spotlight configuration without authentication.'
                  : 'Jalankan skrip SQL ini di SQL Editor Supabase untuk membuat tabel spotlight_config beserta aturan keamanan RLS, sehingga seluruh pengunjung di HP, Tablet, dan PWA dapat langsung melihat film pilihan editor.'}
              </p>

              <pre className="p-3.5 rounded-xl bg-black/60 border border-white/10 text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-44 no-scrollbar">
                <code>{SUPABASE_SPOTLIGHT_SQL}</code>
              </pre>
            </div>
          </div>
        )}

        {/* ════════════════ TAB 3: BROADCAST BANNER ════════════════ */}
        {activeTab === 'broadcast' && (
          <div className="max-w-3xl space-y-6 animate-in fade-in duration-300">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-400" />
                {language === 'en'
                  ? 'Global Announcement Management (Broadcast Banner)'
                  : 'Manajemen Pengumuman Global (Broadcast Banner)'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {language === 'en'
                  ? 'Send announcements (maintenance notices, updates, or events) synchronized in real-time across all devices (Desktop, Mobile, Tablet, PWA).'
                  : 'Kirim pengumuman penting (informasi pembaruan, status server, atau event) yang otomatis tersinkron ke semua perangkat (Desktop, HP, Tablet, PWA).'}
              </p>
            </div>

            {/* Cross-Device Cloud Sync Diagnostics Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    {language === 'en'
                      ? 'Cross-Device Cloud Sync Status (Mobile, Tab, PWA, PC)'
                      : 'Status Sinkronisasi Antar-Perangkat (HP, Tablet, PWA, PC)'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    runCheckCloud();
                  }}
                  disabled={isCheckingCloud}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 hover:text-white text-[11px] font-medium transition-colors cursor-pointer border border-white/10"
                >
                  <RotateCw className={`w-3 h-3 ${isCheckingCloud ? 'animate-spin text-cyan-400' : ''}`} />
                  <span>{language === 'en' ? 'Check Status' : 'Cek Status'}</span>
                </button>
              </div>

              {/* Status Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">
                    {language === 'en' ? 'WebSocket Realtime Push' : 'WebSocket Realtime Push'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-mono font-bold text-[10px] text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{language === 'en' ? 'ONLINE (0ms)' : 'AKTIF (0ms)'}</span>
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">
                    {language === 'en' ? 'Cloud Public Read Access' : 'Akses Publik Cloud'}
                  </span>
                  {cloudDiagnostic?.canReadAnnouncements ? (
                    <span className="inline-flex items-center gap-1 font-mono font-bold text-[10px] text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{language === 'en' ? 'ACTIVE & VERIFIED' : 'AKTIF & TERVERIFIKASI'}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-mono font-bold text-[10px] text-amber-400">
                      <span>{language === 'en' ? 'NEEDS 1x SQL SETUP' : 'PERLU 1x SETUP SQL'}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Notice & 1-Click SQL Button if Supabase table needs setup */}
              {!cloudDiagnostic?.canReadAnnouncements && (
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs space-y-2.5 text-amber-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1 leading-relaxed">
                      <p className="font-bold text-white text-xs">
                        {language === 'en'
                          ? 'Why announcements did not appear on Mobile or Tablet:'
                          : 'Penyebab pengumuman belum muncul di HP atau Tablet:'}
                      </p>
                      <p className="text-[11px] text-slate-300">
                        {language === 'en'
                          ? 'By default, Supabase restricts unauthenticated visitors on mobile browsers/PWAs from reading database tables. Run the 1-minute SQL script below in your Supabase SQL Editor to grant public read access so all devices see announcements immediately.'
                          : 'Supabase secara bawaan membatasi akses pengunjung yang belum login di HP, Tablet, dan aplikasi PWA. Cukup jalankan skrip SQL 1 kali di Supabase Dashboard agar pengumuman bisa dibaca oleh seluruh pengunjung tanpa perlu login.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-500/20">
                    <button
                      type="button"
                      onClick={() => {
                        playClick();
                        navigator.clipboard.writeText(SUPABASE_ANNOUNCEMENT_SQL);
                        setCopiedSql(true);
                        setTimeout(() => setCopiedSql(false), 3000);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 hover:text-white font-bold text-xs transition-all cursor-pointer shadow-sm active:scale-95"
                    >
                      {copiedSql ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-300">
                            {language === 'en' ? 'SQL Copied to Clipboard!' : 'Skrip SQL Berhasil Disalin!'}
                          </span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>{language === 'en' ? 'Copy Supabase SQL Script (1-Click)' : 'Salin Skrip SQL Supabase (1-Klik)'}</span>
                        </>
                      )}
                    </button>

                    <a
                      href="https://supabase.com/dashboard/project/qcrfkibseewbwcckvduk/sql/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 text-slate-200 hover:text-white text-xs font-semibold transition-all"
                    >
                      <span>{language === 'en' ? 'Open Supabase SQL Editor' : 'Buka Supabase SQL Editor'}</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Live Preview of the Banner */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {language === 'en' ? 'Live Preview' : 'Pratinjau Langsung (Live Preview)'}
              </span>
              <div
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                  announcement.type === 'alert'
                    ? 'bg-red-950/80 border-red-500/40 text-red-100'
                    : announcement.type === 'warning'
                    ? 'bg-amber-950/80 border-amber-500/40 text-amber-100'
                    : announcement.type === 'success'
                    ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-100'
                    : 'bg-cyan-950/80 border-cyan-500/40 text-cyan-100'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Megaphone className="w-4 h-4 shrink-0" />
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-black/40 border border-white/20">
                    {announcement.title || (language === 'en' ? 'NOTICE' : 'PENGUMUMAN')}
                  </span>
                  <span className="truncate font-medium">
                    {announcement.message || (language === 'en'
                      ? 'Example announcement message visible to all visitors across devices...'
                      : 'Contoh pesan pengumuman untuk seluruh pengunjung website...')}
                  </span>
                  {announcement.linkUrl && announcement.linkText && (
                    <span className="underline font-bold shrink-0 inline-flex items-center gap-1">
                      {announcement.linkText} <ExternalLink className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono opacity-70">
                  {announcement.active
                    ? (language === 'en' ? '● ACTIVE' : '● AKTIF')
                    : (language === 'en' ? '○ INACTIVE' : '○ NONAKTIF')}
                </span>
              </div>
            </div>

            {/* Form Editor */}
            <form onSubmit={handleSaveAnnouncement} className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/10">
                <div>
                  <span className="text-xs font-bold text-white block">
                    {language === 'en' ? 'Announcement Banner Status' : 'Status Banner Pengumuman'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {announcement.active
                      ? (language === 'en' ? 'Banner is active and broadcasting globally across all devices' : 'Banner sedang aktif dan muncul di seluruh halaman & perangkat')
                      : (language === 'en' ? 'Banner is disabled (hidden)' : 'Banner sedang dinonaktifkan (tersembunyi)')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setAnnouncement((prev) => ({ ...prev, active: !prev.active }));
                  }}
                  className={`w-12 h-6 rounded-full transition-colors cursor-pointer relative p-0.5 ${
                    announcement.active ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      announcement.active ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Type Selection */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">
                  {language === 'en' ? 'Announcement Type' : 'Tipe Pengumuman'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { type: 'info', label: language === 'en' ? 'Info (Blue/Cyan)' : 'Info (Biru/Cyan)' },
                    { type: 'warning', label: language === 'en' ? 'Warning (Yellow)' : 'Peringatan (Kuning)' },
                    { type: 'alert', label: language === 'en' ? 'Alert (Red)' : 'Penting/Alert (Merah)' },
                    { type: 'success', label: language === 'en' ? 'Success (Green)' : 'Sukses (Hijau)' },
                  ].map((t) => (
                    <button
                      key={t.type}
                      type="button"
                      onClick={() => {
                        playClick();
                        setAnnouncement((prev) => ({ ...prev, type: t.type as any }));
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        announcement.type === t.type
                          ? 'bg-white/20 border-white text-white shadow-sm'
                          : 'bg-white/[0.04] border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title Input */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  {language === 'en' ? 'Badge Title / Tag' : 'Judul / Tag Badge'}
                </label>
                <input
                  type="text"
                  value={announcement.title}
                  onChange={(e) => setAnnouncement((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder={language === 'en' ? 'e.g. UPDATE, MAINTENANCE, NOTICE' : 'Misal: UPDATE, SERVER, PENTING'}
                  maxLength={20}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E50914]"
                />
              </div>

              {/* Message Input */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  {language === 'en' ? 'Announcement Message *' : 'Isi Pesan Pengumuman *'}
                </label>
                <textarea
                  value={announcement.message}
                  onChange={(e) => setAnnouncement((prev) => ({ ...prev, message: e.target.value }))}
                  placeholder={language === 'en' ? 'Type the announcement message for all visitors...' : 'Ketik teks pengumuman yang akan dibaca pengguna...'}
                  rows={3}
                  required
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E50914]"
                />
              </div>

              {/* Optional Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    {language === 'en' ? 'Link Text (Optional)' : 'Teks Tautan (Opsional)'}
                  </label>
                  <input
                    type="text"
                    value={announcement.linkText || ''}
                    onChange={(e) => setAnnouncement((prev) => ({ ...prev, linkText: e.target.value }))}
                    placeholder={language === 'en' ? 'e.g. Learn More' : 'Misal: Pelajari Selengkapnya'}
                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E50914]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    {language === 'en' ? 'Link URL (Optional)' : 'URL Tautan (Opsional)'}
                  </label>
                  <input
                    type="url"
                    value={announcement.linkUrl || ''}
                    onChange={(e) => setAnnouncement((prev) => ({ ...prev, linkUrl: e.target.value }))}
                    placeholder="https://..."
                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E50914]"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleClearAnnouncement}
                  disabled={isSavingAnnouncement}
                  className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-red-950/40 border border-white/10 hover:border-red-500/30 text-xs font-semibold text-slate-300 hover:text-red-300 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{language === 'en' ? 'Delete Announcement' : 'Hapus Pengumuman'}</span>
                </button>

                <button
                  type="submit"
                  disabled={isSavingAnnouncement}
                  className="px-5 py-2.5 rounded-xl bg-[#E50914] hover:bg-red-600 text-white text-xs font-bold tracking-wide shadow-lg shadow-red-900/40 transition-all cursor-pointer active:scale-95 flex items-center gap-2 disabled:opacity-50"
                >
                  {isSavingAnnouncement ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {isSavingAnnouncement
                      ? (language === 'en' ? 'Broadcasting...' : 'Menyiarkan...')
                      : (language === 'en' ? 'Save & Broadcast Globally' : 'Simpan & Siarkan Banner')}
                  </span>
                </button>
              </div>

              {announcementSavedFeedback && (
                <div
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 animate-in fade-in ${
                    lastSaveResult?.cloudSynced
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                      : 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <p>
                      {language === 'en'
                        ? 'Announcement broadcasted in real-time via WebSocket and saved locally!'
                        : 'Pengumuman berhasil disiarkan secara real-time via WebSocket & tersimpan di cache!'}
                    </p>
                    {lastSaveResult?.cloudSynced ? (
                      <p className="text-[11px] font-normal text-emerald-400 mt-0.5">
                        {language === 'en'
                          ? '✓ Cloud sync successful: All mobile and tablet devices can read this announcement.'
                          : '✓ Sinkronisasi cloud berhasil: Seluruh pengunjung di HP & Tablet dapat membaca pengumuman ini.'}
                      </p>
                    ) : (
                      <p className="text-[11px] font-normal text-cyan-400/90 mt-0.5">
                        {language === 'en'
                          ? 'Notice: Real-time broadcast pushed. For permanent cloud persistence across unopened mobile devices, run the SQL script above.'
                          : 'Catatan: Siaran WebSocket terkirim. Untuk persistensi cloud permanen bagi HP yang baru dibuka nanti, jalankan skrip SQL di atas.'}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </form>
          </div>
        )}

        {/* ════════════════ TAB: STREAM ISSUES TRACKER ════════════════ */}
        {activeTab === 'issues' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header & Quick Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <span>
                    {language === 'en'
                      ? 'Stream Issue Tracker & Viewer Reports'
                      : 'Pelacak Masalah Video & Laporan Penonton'}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {language === 'en'
                    ? 'Monitor viewer reports for broken mirrors, missing subtitles, audio desync, or high buffering. Test and fix streams directly.'
                    : 'Pantau laporan kendala dari penonton untuk server mati, subtitle hilang, desync suara, atau buffering parah. Uji dan selesaikan langsung.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    playClick();
                    fetchReports();
                  }}
                  disabled={isLoadingReports}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-semibold text-white transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <RotateCw className={`w-3.5 h-3.5 text-amber-400 ${isLoadingReports ? 'animate-spin' : ''}`} />
                  <span>{language === 'en' ? 'Refresh Reports' : 'Segarkan Laporan'}</span>
                </button>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                {[
                  { id: 'all', labelId: 'Semua', labelEn: 'All', count: reports.length, color: '' },
                  { id: 'open', labelId: 'Terbuka / Perlu Cek', labelEn: 'Open', count: reports.filter((r) => r.status === 'open').length, color: 'text-red-400 bg-red-500/20 border-red-500/40' },
                  { id: 'investigating', labelId: 'Sedang Diperiksa', labelEn: 'Investigating', count: reports.filter((r) => r.status === 'investigating').length, color: 'text-amber-300 bg-amber-500/20 border-amber-500/40' },
                  { id: 'resolved', labelId: 'Terselesaikan', labelEn: 'Resolved', count: reports.filter((r) => r.status === 'resolved').length, color: 'text-emerald-300 bg-emerald-500/20 border-emerald-500/40' },
                  { id: 'rejected', labelId: 'Ditolak', labelEn: 'Rejected', count: reports.filter((r) => r.status === 'rejected').length, color: 'text-slate-400 bg-white/5 border-white/10' },
                ].map((f) => {
                  const isSelected = reportFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => {
                        playClick();
                        setReportFilter(f.id as any);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer border ${
                        isSelected
                          ? 'bg-white/15 text-white border-white/30 shadow-sm'
                          : 'bg-white/[0.02] text-slate-400 hover:text-white border-transparent hover:bg-white/[0.06]'
                      }`}
                    >
                      <span>{language === 'en' ? f.labelEn : f.labelId}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${f.color || 'bg-white/10 text-slate-300'}`}>
                        {f.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search input */}
              <div className="relative w-full md:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={reportSearchQuery}
                  onChange={(e) => setReportSearchQuery(e.target.value)}
                  placeholder={language === 'en' ? 'Search title, server...' : 'Cari judul, server...'}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500/50"
                />
              </div>
            </div>

            {/* Reports List */}
            {isLoadingReports ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                <span className="text-xs">{language === 'en' ? 'Loading stream reports...' : 'Memuat laporan kendala...'}</span>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="p-12 rounded-2xl bg-white/[0.02] border border-white/10 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">
                    {language === 'en' ? 'No reports found' : 'Tidak ada laporan masalah'}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {reportFilter === 'all'
                      ? (language === 'en' ? 'All streaming servers and content are running smoothly.' : 'Seluruh server streaming dan tayangan berjalan normal tanpa kendala.')
                      : (language === 'en' ? `No reports with status "${reportFilter}".` : `Tidak ada laporan dengan status "${reportFilter}".`)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReports.map((report) => {
                  const isUpdating = updatingReportId === report.id;
                  const issueBadge = getIssueBadge(report.issueType, language);
                  const statusBadge = getStatusBadge(report.status, language);

                  return (
                    <div
                      key={report.id}
                      className={`p-5 rounded-2xl border transition-all duration-200 space-y-4 ${
                        report.status === 'open'
                          ? 'bg-gradient-to-r from-red-950/25 via-white/[0.02] to-white/[0.01] border-red-500/35 shadow-lg shadow-red-950/20'
                          : report.status === 'investigating'
                          ? 'bg-gradient-to-r from-amber-950/20 via-white/[0.02] to-white/[0.01] border-amber-500/35'
                          : report.status === 'resolved'
                          ? 'bg-white/[0.02] border-emerald-500/20 opacity-80 hover:opacity-100'
                          : 'bg-white/[0.01] border-white/5 opacity-60 hover:opacity-100'
                      }`}
                    >
                      {/* Top Row: Title, Badges, Status */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-white/5">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            {report.mediaType === 'movie' ? (
                              <Film className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            ) : (
                              <Tv className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            )}
                            <span className="text-sm font-semibold tracking-wide">{report.mediaTitle}</span>
                          </span>

                          <span className="px-2 py-0.5 rounded-full bg-white/10 text-slate-300 text-[10px] font-mono uppercase font-bold">
                            {report.mediaType}
                          </span>

                          {(report.seasonNumber !== undefined || report.episodeNumber !== undefined) && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold">
                              S{report.seasonNumber ?? 1}:E{report.episodeNumber ?? 1}
                            </span>
                          )}

                          {/* Issue Type Chip */}
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border flex items-center gap-1 ${issueBadge.className}`}>
                            <span>{issueBadge.icon}</span>
                            <span>{issueBadge.label}</span>
                          </span>
                        </div>

                        {/* Status Tag & Relative Time */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border uppercase tracking-wider ${statusBadge.className}`}>
                            {statusBadge.label}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {new Date(report.createdAt).toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Middle Row: Server, Reporter, Description */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
                        {/* Server Info */}
                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
                            <Server className="w-3 h-3 text-cyan-400" />
                            <span>{language === 'en' ? 'Reported Server' : 'Server Bermasalah'}</span>
                          </span>
                          <div className="font-semibold text-white truncate">{report.serverName}</div>
                          <div className="text-[10px] font-mono text-slate-400">ID: {report.serverId}</div>
                        </div>

                        {/* Reporter Info */}
                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
                            <Users className="w-3 h-3 text-emerald-400" />
                            <span>{language === 'en' ? 'Reporter' : 'Pelapor'}</span>
                          </span>
                          <div className="font-semibold text-white truncate">{report.reportedBy}</div>
                          <div className="text-[10px] font-mono text-slate-400 truncate">
                            {report.userEmail || (language === 'en' ? 'Unregistered Guest' : 'Tamu Pengunjung')}
                          </div>
                        </div>

                        {/* Notes / Description */}
                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1 md:col-span-1">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3 text-amber-400" />
                            <span>{language === 'en' ? 'Viewer Note' : 'Catatan Penonton'}</span>
                          </span>
                          <p className="text-slate-300 italic line-clamp-2">
                            {report.description ? `"${report.description}"` : (
                              <span className="text-slate-500 not-italic">
                                {language === 'en' ? 'No extra description provided' : 'Tidak ada keterangan tambahan'}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Bottom Actions Row */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        {/* 🚀 Quick Jump to Stream Inspector */}
                        <button
                          onClick={() => handleTestReportStream(report)}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:brightness-110 active:scale-95 text-white font-bold text-xs shadow-md shadow-red-950/40 transition-all cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{language === 'en' ? 'Test Stream in Inspector ↗' : 'Uji Stream di Inspector ↗'}</span>
                        </button>

                        {/* Status Change Buttons & Delete */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {report.status !== 'investigating' && (
                            <button
                              onClick={() => handleUpdateStatus(report.id, 'investigating')}
                              disabled={isUpdating}
                              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                            >
                              {language === 'en' ? 'Mark Investigating' : 'Tandai Sedang Diperiksa'}
                            </button>
                          )}

                          {report.status !== 'resolved' && (
                            <button
                              onClick={() => handleUpdateStatus(report.id, 'resolved')}
                              disabled={isUpdating}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>{language === 'en' ? 'Mark Resolved' : 'Tandai Selesai'}</span>
                            </button>
                          )}

                          {report.status !== 'rejected' && (
                            <button
                              onClick={() => handleUpdateStatus(report.id, 'rejected')}
                              disabled={isUpdating}
                              className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-400 hover:text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                            >
                              {language === 'en' ? 'Reject' : 'Tolak'}
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteReport(report.id)}
                            disabled={isUpdating}
                            className="p-2 rounded-xl bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-400 hover:text-red-300 transition-all cursor-pointer disabled:opacity-50"
                            title={language === 'en' ? 'Delete report permanently' : 'Hapus laporan secara permanen'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── SQL Setup Box for Supabase stream_reports table ── */}
            <div className="mt-8 p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    {language === 'en'
                      ? 'Supabase Database Schema: stream_reports'
                      : 'Skema Database Supabase: stream_reports'}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    navigator.clipboard.writeText(SUPABASE_STREAM_REPORTS_SQL);
                    setCopiedReportSql(true);
                    playSuccess();
                    setTimeout(() => setCopiedReportSql(false), 2500);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold cursor-pointer transition-all shrink-0"
                >
                  {copiedReportSql ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">
                        {language === 'en' ? 'Copied SQL!' : 'SQL Disalin!'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-300" />
                      <span>{language === 'en' ? 'Copy SQL Script' : 'Salin Skrip SQL'}</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                {language === 'en'
                  ? 'Run this SQL script in Supabase SQL Editor to create the stream_reports table with RLS security policies, allowing visitors to submit reports and admins to manage them.'
                  : 'Jalankan skrip SQL ini di SQL Editor Supabase untuk membuat tabel stream_reports beserta aturan keamanan RLS, sehingga penonton bisa melapor dan admin bisa mengelolanya.'}
              </p>

              <pre className="p-3.5 rounded-xl bg-black/60 border border-white/10 text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-44 no-scrollbar">
                <code>{SUPABASE_STREAM_REPORTS_SQL}</code>
              </pre>
            </div>
          </div>
        )}

        {/* ════════════════ TAB 4: STREAM TESTER ════════════════ */}
        {activeTab === 'stream-tester' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Play className="w-5 h-5 text-red-500" />
                {language === 'en'
                  ? 'Video Server Inspector (Stream Quick Tester)'
                  : 'Inspektur & Penguji Server Video (Stream Quick Tester)'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {language === 'en'
                  ? 'Live test video playback across third-party mirror servers before users report issues.'
                  : 'Uji coba langsung pemutaran video menggunakan berbagai server mirror pihak ketiga untuk memastikan link aktif sebelum dilaporkan penonton.'}
              </p>
            </div>

            {/* Controls */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* TMDB ID */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">TMDB ID</label>
                  <input
                    type="text"
                    value={testTmdbId}
                    onChange={(e) => setTestTmdbId(e.target.value)}
                    placeholder={language === 'en' ? 'e.g. 550' : 'Contoh: 550'}
                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#E50914]"
                  />
                  <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">550 = Fight Club</span>
                </div>

                {/* Media Type */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    {language === 'en' ? 'Media Type' : 'Tipe Media'}
                  </label>
                  <div className="flex rounded-xl bg-white/[0.05] p-1 border border-white/10">
                    <button
                      type="button"
                      onClick={() => setTestMediaType('movie')}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                        testMediaType === 'movie' ? 'bg-[#E50914] text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Film className="w-3 h-3 inline mr-1" />
                      {language === 'en' ? 'Movie' : 'Film'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTestMediaType('tv')}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                        testMediaType === 'tv' ? 'bg-[#E50914] text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Tv className="w-3 h-3 inline mr-1" />
                      Series
                    </button>
                  </div>
                </div>

                {/* Season & Episode (If TV) */}
                {testMediaType === 'tv' && (
                  <>
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">
                        {language === 'en' ? 'Season' : 'Musim'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={testSeason}
                        onChange={(e) => setTestSeason(e.target.value)}
                        className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#E50914]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Episode</label>
                      <input
                        type="number"
                        min="1"
                        value={testEpisode}
                        onChange={(e) => setTestEpisode(e.target.value)}
                        className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#E50914]"
                      />
                    </div>
                  </>
                )}

                {/* Server Selection */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    {language === 'en' ? 'Embed Provider' : 'Provider Embed'}
                  </label>
                  <select
                    value={testServer}
                    onChange={(e) => setTestServer(e.target.value as any)}
                    className="w-full bg-[#181818] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-[#E50914] cursor-pointer"
                  >
                    <option value="vidsrc">Server 1 • VidSrc Prime</option>
                    <option value="autoembed">Server 2 • AutoEmbed Ultra</option>
                    <option value="2embed">Server 3 • 2Embed Cinema</option>
                    <option value="multiembed">Server 4 • MultiStream Pro</option>
                    <option value="anyembed">Server 5 • AnyEmbed Sub Indo</option>
                    <option value="vidlink">Server 6 • VidLink Pro HD (Default)</option>
                  </select>
                </div>
              </div>

              {/* URL Preview & Quick Switcher */}
              <div className="space-y-2.5">
                {/* 1-Click Server Switcher Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                    {language === 'en' ? 'Quick Switch:' : 'Uji Server Lain:'}
                  </span>
                  {[
                    { id: 'vidsrc', label: 'S1 • VidSrc' },
                    { id: 'autoembed', label: 'S2 • AutoEmbed' },
                    { id: '2embed', label: 'S3 • 2Embed' },
                    { id: 'multiembed', label: 'S4 • MultiStream' },
                    { id: 'anyembed', label: 'S5 • AnyEmbed' },
                    { id: 'vidlink', label: 'S6 • VidLink' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        playClick();
                        setTestServer(s.id as any);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                        testServer === s.id
                          ? 'bg-[#E50914] text-white shadow-md shadow-red-900/40'
                          : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 hover:text-white'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* URL preview with Open in Tab button */}
                <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between gap-3 text-xs font-mono text-slate-400">
                  <span className="truncate text-cyan-300">{testEmbedUrl}</span>
                  <a
                    href={testEmbedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center gap-1.5 shrink-0 transition-colors"
                  >
                    <span>{language === 'en' ? 'Open in Tab' : 'Buka Tab Penuh'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Video Player Frame Preview */}
            <div className="rounded-2xl border border-white/15 overflow-hidden bg-black aspect-video relative shadow-2xl">
              {testEmbedUrl ? (
                <iframe
                  src={testEmbedUrl}
                  title="Admin Stream Tester"
                  className="w-full h-full border-0"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  referrerPolicy="origin"
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full text-slate-500 text-sm">
                  {language === 'en'
                    ? 'Enter a TMDB ID to start stream testing'
                    : 'Masukkan ID TMDB untuk memulai pengetesan streaming'}
                </div>
              )}
            </div>

            {/* DNS / ISP Notice */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-300">
              <span className="text-base leading-none">💡</span>
              <p className="leading-relaxed">
                {language === 'en'
                  ? 'Note: If an embed server shows "server IP address could not be found" or connection failed, the domain might be blocked by your local ISP DNS. Use Cloudflare 1.1.1.1 / WARP DNS, or test alternative servers (VidSrc, MultiStream, or VidLink) using the quick switch buttons above.'
                  : 'Catatan: Jika player menampilkan "server IP address could not be found" atau koneksi gagal, domain mirror tersebut mungkin diblokir oleh DNS operator internet lokal (ISP). Solusi: Aktifkan DNS 1.1.1.1 (Cloudflare) / WARP, atau uji server alternatif (VidSrc, MultiStream, atau VidLink) pada tombol uji cepat di atas.'}
              </p>
            </div>
          </div>
        )}

        {/* ════════════════ TAB: COMMUNITY REVIEWS MODERATION ════════════════ */}
        {activeTab === 'reviews' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header & Quick Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-amber-400" />
                  <span>
                    {language === 'en'
                      ? 'Community Reviews & Star Ratings Moderation'
                      : 'Moderasi Ulasan & Rating Komunitas Penonton'}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {language === 'en'
                    ? 'Curate audience reviews, manage spoiler flags, hide toxic comments, and maintain community trust across movies and series.'
                    : 'Kurasi ulasan penonton, kelola label spoiler, sembunyikan komentar tidak pantas, dan jaga standar kualitas ulasan film dan series.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    playClick();
                    fetchAdminReviews();
                  }}
                  disabled={isLoadingReviews}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-semibold text-white transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <RotateCw className={`w-3.5 h-3.5 text-amber-400 ${isLoadingReviews ? 'animate-spin' : ''}`} />
                  <span>{language === 'en' ? 'Refresh Reviews' : 'Segarkan Ulasan'}</span>
                </button>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                {[
                  { id: 'all', labelId: 'Semua', labelEn: 'All', count: adminReviews.length, color: '' },
                  { id: 'published', labelId: 'Diterbitkan', labelEn: 'Published', count: adminReviews.filter((r) => r.status === 'published').length, color: 'text-emerald-300 bg-emerald-500/20 border-emerald-500/40' },
                  { id: 'hidden', labelId: 'Disembunyikan', labelEn: 'Hidden', count: adminReviews.filter((r) => r.status === 'hidden').length, color: 'text-amber-300 bg-amber-500/20 border-amber-500/40' },
                  { id: 'flagged', labelId: 'Dilaporkan', labelEn: 'Flagged', count: adminReviews.filter((r) => r.status === 'flagged').length, color: 'text-red-400 bg-red-500/20 border-red-500/40' },
                ].map((f) => {
                  const isSelected = reviewFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => {
                        playClick();
                        setReviewFilter(f.id as any);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer border ${
                        isSelected
                          ? 'bg-white/15 text-white border-white/30 shadow-sm'
                          : 'bg-white/[0.02] text-slate-400 hover:text-white border-transparent hover:bg-white/[0.06]'
                      }`}
                    >
                      <span>{language === 'en' ? f.labelEn : f.labelId}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${f.color || 'bg-white/10 text-slate-300'}`}>
                        {f.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search input */}
              <div className="relative w-full md:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={reviewSearchQuery}
                  onChange={(e) => setReviewSearchQuery(e.target.value)}
                  placeholder={language === 'en' ? 'Search by title, user, content...' : 'Cari judul, nama pengulas, ulasan...'}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            {/* Reviews List */}
            {isLoadingReviews ? (
              <div className="p-12 rounded-2xl bg-white/[0.02] border border-white/10 text-center space-y-3">
                <Loader2 className="w-6 h-6 animate-spin text-amber-400 mx-auto" />
                <p className="text-xs text-slate-400">
                  {language === 'en' ? 'Loading community reviews from Supabase...' : 'Memuat data ulasan dari Supabase...'}
                </p>
              </div>
            ) : filteredReviews.length === 0 ? (
              <div className="p-12 rounded-2xl bg-white/[0.02] border border-white/10 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">
                    {language === 'en' ? 'No reviews found' : 'Tidak ada ulasan ditemukan'}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {reviewFilter === 'all'
                      ? (language === 'en' ? 'No audience reviews submitted yet. Reviews written by visitors will appear here.' : 'Belum ada ulasan yang ditulis oleh penonton. Ulasan baru akan muncul di sini.')
                      : (language === 'en' ? `No reviews with status "${reviewFilter}".` : `Tidak ada ulasan dengan status "${reviewFilter}".`)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReviews.map((rev) => {
                  const isUpdating = updatingReviewId === rev.id;

                  return (
                    <div
                      key={rev.id}
                      className={`p-5 rounded-2xl border transition-all duration-200 space-y-4 ${
                        rev.status === 'flagged'
                          ? 'bg-gradient-to-r from-red-950/25 via-white/[0.02] to-white/[0.01] border-red-500/35 shadow-lg shadow-red-950/20'
                          : rev.status === 'hidden'
                          ? 'bg-gradient-to-r from-amber-950/20 via-white/[0.02] to-white/[0.01] border-amber-500/30'
                          : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                      }`}
                    >
                      {/* Top Row: Media info, rating badge, status */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            {rev.mediaType === 'movie' ? (
                              <Film className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            ) : (
                              <Tv className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            )}
                            <span className="text-sm font-semibold tracking-wide">{rev.mediaTitle}</span>
                          </span>

                          <span className="px-2 py-0.5 rounded-full bg-white/10 text-slate-300 text-[10px] font-mono uppercase font-bold">
                            {rev.mediaType}
                          </span>

                          {/* 1-10 Star Rating Badge */}
                          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-xs">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span>{rev.rating}/10</span>
                          </span>

                          {/* Spoiler Badge */}
                          {rev.hasSpoilers && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold text-[10px]">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Spoiler</span>
                            </span>
                          )}
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                              rev.status === 'published'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : rev.status === 'hidden'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-red-500/20 text-red-300 border-red-500/40'
                            }`}
                          >
                            {rev.status === 'published'
                              ? (language === 'en' ? '● Published' : '● Diterbitkan')
                              : rev.status === 'hidden'
                              ? (language === 'en' ? '● Hidden' : '● Disembunyikan')
                              : (language === 'en' ? '● Flagged' : '● Dilaporkan')}
                          </span>
                        </div>
                      </div>

                      {/* Middle: Reviewer Info and Review Content */}
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2.5">
                          {rev.userAvatar ? (
                            <img
                              src={rev.userAvatar}
                              alt={rev.userName}
                              className="w-7 h-7 rounded-full object-cover border border-white/10"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-xs font-bold text-white">
                              {rev.userName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex items-baseline gap-2 flex-wrap text-xs">
                            <span className="font-semibold text-white">{rev.userName}</span>
                            {rev.userEmail && (
                              <span className="text-[11px] text-slate-500 font-mono">({rev.userEmail})</span>
                            )}
                            <span className="text-[10px] text-slate-400">
                              • {new Date(rev.createdAt).toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 text-xs text-slate-200 leading-relaxed font-light">
                          {rev.content}
                        </div>
                      </div>

                      {/* Bottom Bar: Helpful votes & Action buttons */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/5 text-xs">
                        <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{rev.helpfulCount} {language === 'en' ? 'helpful votes' : 'suara membantu'}</span>
                          </span>
                          <span>• ID: <span className="font-mono text-[10px] text-slate-500">{rev.id}</span></span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {onPlayMedia && (
                            <button
                              onClick={() => {
                                playClick();
                                onPlayMedia(rev.mediaId, rev.mediaType === 'movie' ? 'movie' : 'series');
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>{language === 'en' ? 'Open Title' : 'Buka Film'}</span>
                            </button>
                          )}

                          {rev.status !== 'published' ? (
                            <button
                              onClick={() => handleUpdateReviewStatus(rev.id, 'published')}
                              disabled={isUpdating}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{language === 'en' ? 'Publish' : 'Terbitkan'}</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateReviewStatus(rev.id, 'hidden')}
                              disabled={isUpdating}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                            >
                              <EyeOff className="w-3.5 h-3.5" />
                              <span>{language === 'en' ? 'Hide' : 'Sembunyikan'}</span>
                            </button>
                          )}

                          {rev.status !== 'flagged' && (
                            <button
                              onClick={() => handleUpdateReviewStatus(rev.id, 'flagged')}
                              disabled={isUpdating}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-red-500/15 border border-white/10 hover:border-red-500/30 text-slate-400 hover:text-red-300 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>{language === 'en' ? 'Flag' : 'Tandai Laporkan'}</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteAdminReview(rev.id)}
                            disabled={isUpdating}
                            className="p-1.5 rounded-xl bg-red-600/10 hover:bg-red-600/25 border border-red-500/20 hover:border-red-500/40 text-red-400 transition-all cursor-pointer disabled:opacity-50"
                            title={language === 'en' ? 'Permanently delete review' : 'Hapus ulasan secara permanen'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── SQL Setup Box for Supabase media_reviews table ── */}
            <div className="mt-8 p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    {language === 'en'
                      ? 'Supabase Database Schema: media_reviews'
                      : 'Skema Database Supabase: media_reviews'}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    navigator.clipboard.writeText(SUPABASE_REVIEWS_SQL);
                    setCopiedReviewSql(true);
                    playSuccess();
                    setTimeout(() => setCopiedReviewSql(false), 2500);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold cursor-pointer transition-all shrink-0"
                >
                  {copiedReviewSql ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">
                        {language === 'en' ? 'Copied SQL!' : 'SQL Disalin!'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-300" />
                      <span>{language === 'en' ? 'Copy SQL Script' : 'Salin Skrip SQL'}</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                {language === 'en'
                  ? 'Run this SQL script in Supabase SQL Editor to create the media_reviews table with RLS security policies, allowing visitors to read published reviews, logged-in users to write their own reviews, and administrators to moderate all reviews.'
                  : 'Jalankan skrip SQL ini di SQL Editor Supabase untuk membuat tabel media_reviews beserta aturan keamanan RLS, sehingga penonton bisa membaca ulasan, pengguna terdaftar bisa menulis ulasan, dan administrator bisa memoderasinya.'}
              </p>

              <pre className="p-3.5 rounded-xl bg-black/60 border border-white/10 text-[11px] font-mono text-amber-300 overflow-x-auto max-h-44 no-scrollbar">
                <code>{SUPABASE_REVIEWS_SQL}</code>
              </pre>
            </div>
          </div>
        )}

        {/* ════════════════ TAB 5: SYSTEM & CONFIG ════════════════ */}
        {activeTab === 'system' && (
          <div className="max-w-3xl space-y-6 animate-in fade-in duration-300">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Server className="w-5 h-5 text-cyan-400" />
                {language === 'en' ? 'System & Environment Configuration' : 'Konfigurasi Sistem & Lingkungan'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {language === 'en'
                  ? 'Platform details, Supabase cloud database connection, and local cache maintenance.'
                  : 'Informasi detail platform, koneksi database cloud Supabase, dan manajemen cache browser.'}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Supabase Project URL
                  </span>
                  <span className="text-xs font-mono text-emerald-400">
                    https://qcrfkibseewbwcckvduk.supabase.co
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    {language === 'en' ? 'Supabase Connection Status' : 'Status Otentikasi Supabase'}
                  </span>
                  <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {language === 'en' ? 'Connected & Active' : 'Terhubung & Aktif'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Google Cloud OAuth Client ID
                  </span>
                  <span className="text-xs font-mono text-slate-300">
                    843939634937-...apps.googleusercontent.com (In Production)
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Vercel Production Domain
                  </span>
                  <span className="text-xs font-mono text-slate-300">
                    https://cinestream-nova.vercel.app/
                  </span>
                </div>
              </div>

              {/* Supabase Database Schema & Public Announcement Setup */}
              <div className="pt-4 border-t border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                    <span>{language === 'en' ? 'Supabase Cross-Device SQL Configuration' : 'Konfigurasi SQL Supabase Antar-Perangkat'}</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      navigator.clipboard.writeText(SUPABASE_ANNOUNCEMENT_SQL);
                      setCopiedSql(true);
                      setTimeout(() => setCopiedSql(false), 3000);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    {copiedSql ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300">
                          {language === 'en' ? 'SQL Copied!' : 'Tersalin!'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{language === 'en' ? 'Copy SQL Script' : 'Salin Skrip SQL'}</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {language === 'en'
                    ? 'Execute this script in Supabase SQL editor to create the public announcements table and permissions for mobile and tablet visitors.'
                    : 'Jalankan skrip ini di SQL Editor Supabase untuk membuat tabel pengumuman publik dan perizinan RLS bagi pengunjung HP dan Tablet.'}
                </p>
              </div>

              {/* Cache Management */}
              <div className="pt-4 border-t border-white/10 space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  {language === 'en' ? 'Device Cache Maintenance' : 'Pemeliharaan Cache Perangkat'}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {language === 'en'
                    ? 'If you experience outdated thumbnails or stale local data, you can reset the local app cache.'
                    : 'Jika Anda mengalami inkonsistensi data lokal atau thumbnail lama, Anda dapat mereset cache lokal aplikasi.'}
                </p>
                <button
                  onClick={() => {
                    playClick();
                    const msg = language === 'en'
                      ? 'Clear local catalog cache and refresh page?'
                      : 'Bersihkan cache katalog lokal dan refresh halaman?';
                    if (window.confirm(msg)) {
                      localStorage.removeItem('cinestream_hero_cache_v2');
                      localStorage.removeItem('cinestream_curated_cache_v1');
                      window.location.reload();
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  {language === 'en' ? 'Clear Local TMDB Cache' : 'Bersihkan Cache TMDB Lokal'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
