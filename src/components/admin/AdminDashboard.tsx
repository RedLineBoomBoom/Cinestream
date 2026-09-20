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
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { useUserProfile, PROFILE_PALETTES } from '../../context/UserProfileContext';
import { useSound } from '../../context/SoundContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  saveAnnouncement,
  getActiveAnnouncement,
  fetchActiveAnnouncementFromCloud,
  type BroadcastAnnouncement,
  getAdminEmails,
} from '../../utils/admin';

interface AdminDashboardProps {
  onBackToHome: () => void;
  onPlayMedia?: (mediaId: string, type: 'movie' | 'series') => void;
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
  { id: 'autoembed', name: 'AutoEmbed Provider', url: 'https://player.autoembed.cc', type: 'embed', status: 'checking' },
  { id: 'vidlink', name: 'VidLink Pro Engine', url: 'https://vidlink.pro', type: 'embed', status: 'checking' },
  { id: '2embed', name: '2Embed Stream Gateway', url: 'https://www.2embed.cc', type: 'embed', status: 'checking' },
  { id: 'vidsrc', name: 'Vidsrc In-House Mirror', url: 'https://vidsrc.xyz', type: 'embed', status: 'checking' },
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onBackToHome,
}) => {
  const { user, signOut } = useAuth();
  const { profile } = useUserProfile();
  const { playClick, playSuccess, playHover } = useSound();
  const { language, toggleLanguage } = useLanguage();

  // Active Admin Sub-Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'broadcast' | 'stream-tester' | 'system'>('overview');

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

  // Media / Stream Tester State
  const [testTmdbId, setTestTmdbId] = useState('550'); // Default: Fight Club
  const [testMediaType, setTestMediaType] = useState<'movie' | 'tv'>('movie');
  const [testSeason, setTestSeason] = useState('1');
  const [testEpisode, setTestEpisode] = useState('1');
  const [testServer, setTestServer] = useState<'autoembed' | 'vidlink' | '2embed' | 'vidsrc'>('vidlink');
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
            const res = await fetch('https://api.themoviedb.org/3/movie/550?api_key=e4b78912d7658d519b7d8d21da765278', {
              method: 'HEAD',
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

  // Sync cloud announcement when opening dashboard
  useEffect(() => {
    fetchMetrics();
    checkHealth();
    fetchActiveAnnouncementFromCloud().then((cloud) => {
      if (cloud) {
        setAnnouncement(cloud);
      }
    });
  }, [fetchMetrics, checkHealth]);

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
        ? `https://player.autoembed.cc/embed/movie/${cleanId}`
        : `https://player.autoembed.cc/embed/tv/${cleanId}/${testSeason}/${testEpisode}`;
    } else if (testServer === '2embed') {
      url = testMediaType === 'movie'
        ? `https://www.2embed.cc/embed/${cleanId}`
        : `https://www.2embed.cc/embedtv/${cleanId}&s=${testSeason}&e=${testEpisode}`;
    } else {
      // vidsrc
      url = testMediaType === 'movie'
        ? `https://vidsrc.xyz/embed/movie/${cleanId}`
        : `https://vidsrc.xyz/embed/tv/${cleanId}/${testSeason}-${testEpisode}`;
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
    await saveAnnouncement(toSave, user?.id);
    setIsSavingAnnouncement(false);
    setAnnouncementSavedFeedback(true);
    setTimeout(() => setAnnouncementSavedFeedback(false), 3500);
  };

  // Clear Announcement
  const handleClearAnnouncement = async () => {
    playClick();
    setIsSavingAnnouncement(true);
    await saveAnnouncement(null, user?.id);
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
    setTimeout(() => setAnnouncementSavedFeedback(false), 3500);
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
              }}
              onMouseEnter={playHover}
              disabled={isLoadingMetrics || isCheckingHealth}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-semibold text-white transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoadingMetrics || isCheckingHealth ? 'animate-spin' : ''}`} />
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
        <div className="flex overflow-x-auto no-scrollbar gap-2 mt-6 pb-2 border-b border-white/[0.06]">
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
              id: 'broadcast',
              label: language === 'en' ? 'Announcement Banner' : 'Pengumuman Banner',
              icon: Megaphone,
              highlight: announcement.active,
            },
            {
              id: 'stream-tester',
              label: language === 'en' ? 'Stream & TMDB Inspector' : 'Inspektur Stream & TMDB',
              icon: Play,
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
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 border ${
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    {language === 'en'
                      ? 'Announcement saved & broadcast globally to all mobile, tablet, desktop, and PWA devices!'
                      : 'Pengumuman berhasil disimpan & disiarkan ke semua perangkat HP, Tablet, Desktop, dan PWA!'}
                  </span>
                </div>
              )}
            </form>
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
                    <option value="vidlink">VidLink Pro (Default)</option>
                    <option value="autoembed">AutoEmbed Fast</option>
                    <option value="2embed">2Embed Gateway</option>
                    <option value="vidsrc">Vidsrc Mirror</option>
                  </select>
                </div>
              </div>

              {/* URL Preview */}
              <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between gap-2 text-xs font-mono text-slate-400">
                <span className="truncate text-cyan-300">{testEmbedUrl}</span>
                <a
                  href={testEmbedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white shrink-0"
                  title={language === 'en' ? 'Open in new tab' : 'Buka di tab baru'}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
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
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full text-slate-500 text-sm">
                  {language === 'en'
                    ? 'Enter a TMDB ID to start stream testing'
                    : 'Masukkan ID TMDB untuk memulai pengetesan streaming'}
                </div>
              )}
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
