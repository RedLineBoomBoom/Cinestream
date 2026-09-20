import React, { useState, useMemo } from 'react';
import {
  Users,
  Lock,
  Globe,
  Search,
  Plus,
  RefreshCw,
  Sparkles,
  KeyRound,
  Film,
  Tv,
  X,
  Check,
  AlertCircle,
  ChevronRight,
  LogIn,
} from 'lucide-react';
import type { MediaItem, Episode } from '../../types/media';
import type { PublicPartyRoom, LobbyFilter } from '../../types/party';
import { useWatchParty } from '../../context/WatchPartyContext';
import { useUserProfile } from '../../context/UserProfileContext';
import { useWatchlist } from '../../context/WatchlistContext';
import { useSound } from '../../context/SoundContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { verifyPrivateRoomCode } from '../../services/partyLobbyService';

interface WatchPartyLobbyViewProps {
  catalog: MediaItem[];
  onPlayMedia: (media: MediaItem, resumeTime?: number, episodeId?: string) => void;
  onGoHome: () => void;
}

export const WatchPartyLobbyView: React.FC<WatchPartyLobbyViewProps> = ({
  catalog,
  onPlayMedia,
  onGoHome,
}) => {
  const { user, openAuthModal } = useAuth();
  const { publicRooms, refreshPublicRooms, joinParty, createParty } = useWatchParty();
  const { profile } = useUserProfile();
  const { historyItems, watchlist } = useWatchlist();
  const { playClick, playHover, playSuccess } = useSound();
  const { t, language } = useLanguage();

  // Filter & Search states
  const [activeFilter, setActiveFilter] = useState<LobbyFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Private Passcode Modal state
  const [unlockRoomTarget, setUnlockRoomTarget] = useState<PublicPartyRoom | null>(null);
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // Quick Join by Code Modal state
  const [isQuickJoinOpen, setIsQuickJoinOpen] = useState(false);
  const [quickJoinCode, setQuickJoinCode] = useState('');
  const [quickJoinError, setQuickJoinError] = useState('');

  // Host New Room Modal state
  const [isHostModalOpen, setIsHostModalOpen] = useState(false);
  const [hostName, setHostName] = useState(profile?.name || '');
  const [hostIsPublic, setHostIsPublic] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [mediaSearchQuery, setMediaSearchQuery] = useState('');
  const [hostError, setHostError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Refresh lobby with spinning animation
  const handleRefresh = async () => {
    playClick();
    setIsRefreshing(true);
    await refreshPublicRooms();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Calculate statistics
  const totalRooms = publicRooms.length;
  const publicCount = useMemo(() => publicRooms.filter((r) => r.isPublic !== false).length, [publicRooms]);
  const privateCount = useMemo(() => publicRooms.filter((r) => r.isPublic === false).length, [publicRooms]);
  const totalViewers = useMemo(() => publicRooms.reduce((acc, r) => acc + (r.memberCount || 1), 0), [publicRooms]);
  const movieCount = useMemo(() => publicRooms.filter((r) => r.mediaType === 'movie').length, [publicRooms]);
  const seriesCount = useMemo(() => publicRooms.filter((r) => r.mediaType !== 'movie').length, [publicRooms]);

  // Filter and search rooms
  const filteredRooms = useMemo(() => {
    return publicRooms.filter((room) => {
      // Filter tab
      if (activeFilter === 'public' && room.isPublic === false) return false;
      if (activeFilter === 'private' && room.isPublic !== false) return false;
      if (activeFilter === 'movie' && room.mediaType !== 'movie') return false;
      if (activeFilter === 'series' && room.mediaType === 'movie') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = room.mediaTitle?.toLowerCase().includes(q);
        const matchHost = room.hostName?.toLowerCase().includes(q);
        const matchEpisode = room.episodeTitle?.toLowerCase().includes(q);
        const matchCode = room.roomCode?.toLowerCase().includes(q);
        if (!matchTitle && !matchHost && !matchEpisode && !matchCode) return false;
      }

      return true;
    });
  }, [publicRooms, activeFilter, searchQuery]);

  // Handle 1-click Join for Public Room
  const handleJoinPublic = async (room: PublicPartyRoom) => {
    playClick();
    if (!user) {
      openAuthModal('signin');
      return;
    }
    setIsJoining(true);
    try {
      const myNameToUse = hostName.trim() || profile?.name || (language === 'en' ? 'Viewer' : 'Penonton');
      await joinParty(room.roomCode, myNameToUse, profile?.id);
      playSuccess();

      // Find media in catalog to navigate directly
      const mediaItem = catalog.find((m) => String(m.id) === String(room.mediaId)) || ({
        id: room.mediaId,
        title: room.mediaTitle,
        type: room.mediaType as any,
        poster: room.mediaPoster,
        backdrop: room.mediaPoster,
        overview: '',
        rating: 0,
        releaseDate: '',
      } as unknown as MediaItem);

      onPlayMedia(mediaItem, undefined, room.episodeTitle ? undefined : undefined);
    } catch (err: any) {
      console.error('Gagal gabung room publik:', err);
    } finally {
      setIsJoining(false);
    }
  };

  // Open Passcode Modal for Private Room
  const handleOpenPrivatePrompt = (room: PublicPartyRoom) => {
    playClick();
    if (!user) {
      openAuthModal('signin');
      return;
    }
    setUnlockRoomTarget(room);
    setPasscode('');
    setPasscodeError('');
  };

  // Verify and Join Private Room
  const handleVerifyAndJoinPrivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('signin');
      return;
    }
    if (!unlockRoomTarget) return;

    playClick();
    const cleanCode = passcode.trim().toUpperCase();

    if (!cleanCode) {
      setPasscodeError(t('partyInvalidCode'));
      return;
    }

    if (!verifyPrivateRoomCode(cleanCode, unlockRoomTarget.roomCode)) {
      setPasscodeError(t('partyInvalidCode'));
      return;
    }

    setIsJoining(true);
    try {
      const myNameToUse = hostName.trim() || profile?.name || (language === 'en' ? 'Viewer' : 'Penonton');
      await joinParty(cleanCode, myNameToUse, profile?.id);
      playSuccess();
      setUnlockRoomTarget(null);

      // Navigate to media
      const mediaItem = catalog.find((m) => String(m.id) === String(unlockRoomTarget.mediaId)) || ({
        id: unlockRoomTarget.mediaId,
        title: unlockRoomTarget.mediaTitle,
        type: unlockRoomTarget.mediaType as any,
        poster: unlockRoomTarget.mediaPoster,
        backdrop: unlockRoomTarget.mediaPoster,
        overview: '',
        rating: 0,
        releaseDate: '',
      } as unknown as MediaItem);

      onPlayMedia(mediaItem);
    } catch (err: any) {
      setPasscodeError(String(err.message || t('partyInvalidCode')));
    } finally {
      setIsJoining(false);
    }
  };

  // Quick Join Direct Code Form
  const handleQuickJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('signin');
      return;
    }
    const clean = quickJoinCode.trim().toUpperCase();
    if (!clean || clean.length < 4) {
      setQuickJoinError(t('partyInvalidCode'));
      return;
    }
    playClick();
    setIsJoining(true);
    setQuickJoinError('');
    try {
      const myNameToUse = hostName.trim() || profile?.name || (language === 'en' ? 'Viewer' : 'Penonton');
      await joinParty(clean, myNameToUse, profile?.id);
      playSuccess();
      setIsQuickJoinOpen(false);
      setQuickJoinCode('');
    } catch (err: any) {
      setQuickJoinError(t('partyInvalidCode'));
    } finally {
      setIsJoining(false);
    }
  };

  // Media candidates for Host Modal
  const recentMediaCandidates = useMemo(() => {
    const list: MediaItem[] = [];
    // 1. From history
    for (const h of historyItems.slice(0, 6)) {
      const found = catalog.find((c) => c.id === h.mediaId);
      if (found && !list.some((item) => item.id === found.id)) list.push(found);
    }
    // 2. From watchlist
    for (const wId of watchlist.slice(0, 6)) {
      const found = catalog.find((c) => c.id === wId);
      if (found && !list.some((item) => item.id === found.id)) list.push(found);
    }
    // 3. From catalog
    for (const c of catalog.slice(0, 8)) {
      if (!list.some((item) => item.id === c.id)) list.push(c);
    }
    return list.slice(0, 12);
  }, [historyItems, watchlist, catalog]);

  // Catalog search results for Host Modal
  const catalogSearchResults = useMemo(() => {
    if (!mediaSearchQuery.trim()) return recentMediaCandidates;
    const q = mediaSearchQuery.toLowerCase().trim();
    return catalog.filter((c) => c.title.toLowerCase().includes(q)).slice(0, 12);
  }, [mediaSearchQuery, catalog, recentMediaCandidates]);

  // Create Room Handler
  const handleCreateRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('signin');
      return;
    }
    if (!selectedMedia) {
      setHostError(t('partyNoMediaSelected'));
      return;
    }

    const hostNameToUse = hostName.trim() || profile?.name || (language === 'en' ? 'Host' : 'Tuan Rumah');
    playClick();
    setIsCreating(true);
    setHostError('');

    try {
      await createParty(
        hostNameToUse,
        {
          mediaId: selectedMedia.id,
          mediaTitle: selectedMedia.title,
          mediaPoster: selectedMedia.poster || selectedMedia.backdrop || '',
          mediaType: selectedMedia.type,
          episodeId: selectedEpisode?.id,
          seasonNumber: selectedEpisode?.seasonNumber,
          episodeNumber: selectedEpisode?.episodeNumber,
          episodeTitle: selectedEpisode?.title,
        },
        profile?.id,
        hostIsPublic
      );
      playSuccess();
      setIsHostModalOpen(false);

      // Navigate to player
      onPlayMedia(selectedMedia, undefined, selectedEpisode?.id);
    } catch (err: any) {
      setHostError(String(err.message || 'Gagal membuat room.'));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="pt-28 pb-20 px-4 sm:px-8 lg:px-12 3xl:px-16 max-w-[1720px] 2xl:max-w-[1880px] 3xl:max-w-[2200px] 4xl:max-w-[2600px] mx-auto space-y-8 min-h-[80vh] animate-in fade-in duration-500">
      {/* Top Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 font-light">
        <span className="hover:text-white cursor-pointer transition-colors" onClick={onGoHome}>
          {t('navHome')}
        </span>
        <ChevronRight className="w-3 h-3 text-slate-600" />
        <span className="text-violet-400 font-semibold">{t('partyLobbyTitle')}</span>
      </nav>

      {/* Hero Masthead Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-950/60 via-cinema-900/90 to-purple-950/40 border border-violet-500/25 p-6 sm:p-8 lg:p-10 shadow-2xl backdrop-blur-xl">
        {/* Background Ambient Glows */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-400/30 text-violet-300 text-xs font-bold shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>{language === 'en' ? 'LIVE SOCIAL CINEMA HUB' : 'PUSAT NONTON BARENG LIVE'}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black text-white tracking-tight uppercase">
              {t('partyLobbyTitle')}
            </h1>

            <p className="text-sm sm:text-base text-slate-300 font-light leading-relaxed">
              {t('partyLobbySubtitle')}
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => {
                playClick();
                if (!user) {
                  openAuthModal('signin');
                  return;
                }
                setHostName(profile?.name || '');
                setSelectedMedia(recentMediaCandidates[0] || null);
                setIsHostModalOpen(true);
              }}
              onMouseEnter={playHover}
              className="flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-bold shadow-xl shadow-violet-600/30 border border-violet-400/40 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{t('partyHostNewRoom')}</span>
            </button>

            <button
              onClick={() => {
                playClick();
                if (!user) {
                  openAuthModal('signin');
                  return;
                }
                setQuickJoinCode('');
                setQuickJoinError('');
                setIsQuickJoinOpen(true);
              }}
              onMouseEnter={playHover}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 hover:text-white text-sm font-medium border border-white/10 hover:border-white/20 transition-all cursor-pointer backdrop-blur-md"
            >
              <KeyRound className="w-4 h-4 text-violet-400" />
              <span>{t('partyQuickJoinCode')}</span>
            </button>

            <button
              onClick={handleRefresh}
              onMouseEnter={playHover}
              title="Refresh Lobi"
              className="p-3 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Guest Preview Notice Banner */}
        {!user && (
          <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/25 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-300">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/30 shadow-inner">
                <Lock className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white tracking-wide">
                    {t('partyGuestNoticeTitle')}
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 uppercase tracking-wider">
                    {language === 'en' ? 'Guest Preview' : 'Pratinjau Tamu'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-light leading-relaxed max-w-2xl">
                  {t('partyGuestNoticeDesc')}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                playClick();
                openAuthModal('signin');
              }}
              onMouseEnter={playHover}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-lg shadow-amber-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
            >
              <LogIn className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{t('partySignInButton')}</span>
            </button>
          </div>
        )}

        {/* Live Counters Banner */}
        <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-black/30 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
              </span>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-white leading-none">{totalRooms}</div>
              <div className="text-[11px] text-slate-400 mt-1 uppercase font-medium">{t('partyLiveRooms')}</div>
            </div>
          </div>

          <div className="bg-black/30 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-white leading-none">{publicCount}</div>
              <div className="text-[11px] text-slate-400 mt-1 uppercase font-medium">{t('partyPublicBadge')}</div>
            </div>
          </div>

          <div className="bg-black/30 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-white leading-none">{privateCount}</div>
              <div className="text-[11px] text-slate-400 mt-1 uppercase font-medium">{t('partyPrivateBadge')}</div>
            </div>
          </div>

          <div className="bg-black/30 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-white leading-none">{totalViewers}</div>
              <div className="text-[11px] text-slate-400 mt-1 uppercase font-medium">{t('partyTotalOnlineViewers')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-cinema-900/60 p-3 sm:p-4 rounded-2xl border border-white/[0.08] backdrop-blur-md">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => { playClick(); setActiveFilter('all'); }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-white text-black font-bold shadow-md'
                : 'bg-white/[0.05] hover:bg-white/[0.1] text-slate-300'
            }`}
          >
            {t('partyFilterAllRooms')} ({totalRooms})
          </button>

          <button
            onClick={() => { playClick(); setActiveFilter('public'); }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeFilter === 'public'
                ? 'bg-emerald-500 text-white font-bold shadow-md shadow-emerald-500/30'
                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{t('partyFilterPublic')} ({publicCount})</span>
          </button>

          <button
            onClick={() => { playClick(); setActiveFilter('private'); }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeFilter === 'private'
                ? 'bg-amber-500 text-black font-bold shadow-md shadow-amber-500/30'
                : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{t('partyFilterPrivate')} ({privateCount})</span>
          </button>

          <button
            onClick={() => { playClick(); setActiveFilter('movie'); }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeFilter === 'movie'
                ? 'bg-violet-500 text-white font-bold shadow-md'
                : 'bg-white/[0.05] hover:bg-white/[0.1] text-slate-300'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>{t('partyFilterMovies')} ({movieCount})</span>
          </button>

          <button
            onClick={() => { playClick(); setActiveFilter('series'); }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeFilter === 'series'
                ? 'bg-violet-500 text-white font-bold shadow-md'
                : 'bg-white/[0.05] hover:bg-white/[0.1] text-slate-300'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>{t('partyFilterSeries')} ({seriesCount})</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px] md:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('partySearchLobby')}
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Room Grid */}
      {filteredRooms.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {filteredRooms.map((room) => {
            const isPrivate = room.isPublic === false;
            return (
              <div
                key={room.roomCode}
                className="group relative overflow-hidden rounded-2xl bg-cinema-900/80 border border-white/[0.08] hover:border-violet-500/40 transition-all duration-300 shadow-xl hover:shadow-2xl flex flex-col"
              >
                {/* Poster & Badges Header */}
                <div className="relative aspect-[16/10] overflow-hidden bg-black/60">
                  {room.mediaPoster ? (
                    <img
                      src={room.mediaPoster}
                      alt={room.mediaTitle}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-cinema-950 text-slate-600">
                      <Film className="w-12 h-12 stroke-[1]" />
                    </div>
                  )}

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-cinema-950 via-cinema-950/40 to-transparent" />

                  {/* Top Badges */}
                  <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
                    {/* Live Dot */}
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 text-[10px] font-bold border border-emerald-400/40 backdrop-blur-md">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                      </span>
                      <span>{t('partyLive')}</span>
                    </span>

                    {/* Public vs Private Badge */}
                    {isPrivate ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 text-[10px] font-bold border border-amber-500/40 backdrop-blur-md">
                        <Lock className="w-3 h-3 text-amber-400" />
                        <span>{t('partyPrivateBadge')}</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 text-[10px] font-bold border border-cyan-400/40 backdrop-blur-md">
                        <Globe className="w-3 h-3 text-cyan-400" />
                        <span>{t('partyPublicBadge')}</span>
                      </span>
                    )}
                  </div>

                  {/* Bottom Stats on Poster */}
                  <div className="absolute bottom-2.5 inset-x-3 flex items-center justify-between text-[11px] text-slate-300 pointer-events-none">
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs">
                      <Users className="w-3 h-3 text-violet-400" />
                      <span>{room.memberCount} {t('partyViewersCount')}</span>
                    </span>

                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs font-mono text-[10px] text-slate-300">
                      {room.controlMode === 'host_only' ? '👑 Host Only' : '🎮 Free'}
                    </span>
                  </div>
                </div>

                {/* Card Info Body */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white line-clamp-1 group-hover:text-violet-300 transition-colors">
                      {room.mediaTitle}
                    </h3>
                    {room.episodeTitle && (
                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5 font-light">
                        {room.episodeTitle}
                      </p>
                    )}
                  </div>

                  {/* Host and Members Info */}
                  <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2 text-xs text-slate-400">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {room.hostName.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate">
                        Host: <span className="text-slate-200 font-medium">@{room.hostName}</span>
                      </span>
                    </div>

                    {/* Member Avatars Stack */}
                    {room.membersPreview && room.membersPreview.length > 0 && (
                      <div className="flex -space-x-1.5 overflow-hidden shrink-0">
                        {room.membersPreview.slice(0, 3).map((m, idx) => (
                          <div
                            key={idx}
                            className="w-5 h-5 rounded-full bg-slate-800 border border-cinema-900 text-[9px] font-bold text-slate-300 flex items-center justify-center uppercase"
                            title={m.name}
                          >
                            {m.name.charAt(0)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="pt-1">
                    {!user ? (
                      <button
                        onClick={() => {
                          playClick();
                          openAuthModal('signin');
                        }}
                        onMouseEnter={playHover}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 font-semibold text-xs border border-white/10 hover:border-amber-500/30 transition-all cursor-pointer group/btn"
                        title={t('partyLoginToJoin')}
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-400 group-hover/btn:scale-110 transition-transform" />
                        <span>{t('partyLoginToJoin')}</span>
                      </button>
                    ) : isPrivate ? (
                      <button
                        onClick={() => handleOpenPrivatePrompt(room)}
                        onMouseEnter={playHover}
                        disabled={isJoining}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-black font-bold text-xs border border-amber-500/30 hover:border-amber-400 transition-all cursor-pointer shadow-md"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>{t('partyUnlockAndJoin')}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleJoinPublic(room)}
                        onMouseEnter={playHover}
                        disabled={isJoining}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs border border-emerald-400/30 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>{t('partyJoinLive')}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-16 px-4 rounded-3xl bg-cinema-900/40 border border-white/[0.06] backdrop-blur-md max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-violet-500/15 text-violet-400 flex items-center justify-center mx-auto border border-violet-500/30 shadow-lg shadow-violet-500/20 animate-pulse">
            <Users className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            {searchQuery ? t('noResultsTitle') : t('partyNoRoomsTitle')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-light max-w-md mx-auto">
            {searchQuery ? t('noResultsDesc') : t('partyNoRoomsDesc')}
          </p>
          {!searchQuery && (
            <button
              onClick={() => {
                playClick();
                if (!user) {
                  openAuthModal('signin');
                  return;
                }
                setHostName(profile?.name || '');
                setSelectedMedia(recentMediaCandidates[0] || null);
                setIsHostModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-lg shadow-violet-600/30 transition-all cursor-pointer"
            >
              {!user ? <Lock className="w-4 h-4 text-amber-400" /> : <Plus className="w-4 h-4" />}
              <span>{!user ? t('partyLoginToHost') : t('partyCreatePublicRoom')}</span>
            </button>
          )}
        </div>
      )}

      {/* ── Modal 1: Buka Kunci Room Privat (Passcode Prompt) ── */}
      {unlockRoomTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md rounded-3xl bg-cinema-900 border border-amber-500/40 shadow-2xl p-6 space-y-5 overflow-hidden">
            {/* Ambient amber glow */}
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{t('partyPrivateCodeTitle')}</h3>
                  <p className="text-xs text-slate-400 font-light">Host: @{unlockRoomTarget.hostName}</p>
                </div>
              </div>
              <button
                onClick={() => setUnlockRoomTarget(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Media Card Preview */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/50 border border-white/10">
              {unlockRoomTarget.mediaPoster && (
                <img
                  src={unlockRoomTarget.mediaPoster}
                  alt={unlockRoomTarget.mediaTitle}
                  className="w-12 h-16 object-cover rounded-lg shrink-0"
                />
              )}
              <div className="min-w-0">
                <div className="text-sm font-bold text-white truncate">{unlockRoomTarget.mediaTitle}</div>
                {unlockRoomTarget.episodeTitle && (
                  <div className="text-xs text-slate-400 truncate mt-0.5">{unlockRoomTarget.episodeTitle}</div>
                )}
                <div className="text-[11px] text-amber-400 font-mono mt-1">🔒 Room Privat</div>
              </div>
            </div>

            <p className="text-xs text-slate-300 font-light leading-relaxed">
              {t('partyPrivateCodeDesc')}
            </p>

            <form onSubmit={handleVerifyAndJoinPrivate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t('partyEnterPrivateCode')}
                </label>
                <input
                  type="text"
                  maxLength={8}
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value.toUpperCase());
                    setPasscodeError('');
                  }}
                  placeholder={t('partyInputCodePlaceholder')}
                  autoFocus
                  className="w-full text-center tracking-[0.3em] font-mono text-xl font-bold py-3 px-4 rounded-xl bg-black/60 border border-amber-500/40 text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400/50 uppercase placeholder:text-slate-600 placeholder:tracking-normal placeholder:text-xs"
                />
              </div>

              {passcodeError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-medium animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{passcodeError}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUnlockRoomTarget(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs font-medium transition-colors"
                >
                  {t('back')}
                </button>
                <button
                  type="submit"
                  disabled={isJoining || !passcode.trim()}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-xs shadow-lg shadow-amber-500/30 transition-all cursor-pointer"
                >
                  {isJoining ? t('loading') : t('partyUnlockAndJoin')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 2: Gabung Cepat via Kode (Quick Join Modal) ── */}
      {isQuickJoinOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md rounded-3xl bg-cinema-900 border border-violet-500/40 shadow-2xl p-6 space-y-5 overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-violet-500/20 text-violet-400 border border-violet-500/30">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">{t('partyQuickJoinCode')}</h3>
              </div>
              <button
                onClick={() => setIsQuickJoinOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 font-light">
              {language === 'en'
                ? 'Enter the 6-character room code shared by your friend to join immediately.'
                : 'Masukkan kode room 6 karakter yang dibagikan teman untuk langsung bergabung.'}
            </p>

            <form onSubmit={handleQuickJoinSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  maxLength={8}
                  value={quickJoinCode}
                  onChange={(e) => {
                    setQuickJoinCode(e.target.value.toUpperCase());
                    setQuickJoinError('');
                  }}
                  placeholder="MISAL: ABC123"
                  autoFocus
                  className="w-full text-center tracking-[0.3em] font-mono text-xl font-bold py-3 px-4 rounded-xl bg-black/60 border border-violet-500/40 text-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400/50 uppercase placeholder:text-slate-600 placeholder:tracking-normal placeholder:text-xs"
                />
              </div>

              {quickJoinError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{quickJoinError}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsQuickJoinOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs font-medium"
                >
                  {t('back')}
                </button>
                <button
                  type="submit"
                  disabled={isJoining || quickJoinCode.trim().length < 4}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-violet-600/30 transition-all cursor-pointer"
                >
                  {isJoining ? t('loading') : t('partyJoinPartyPrompt')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 3: Buat Room Baru (Host Modal with Media Selector) ── */}
      {isHostModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-3xl bg-cinema-900 border border-violet-500/40 shadow-2xl p-6 sm:p-7 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">{t('partyHostNewRoom')}</h3>
                  <p className="text-xs text-slate-400 font-light">{t('partyLobbyDesc')}</p>
                </div>
              </div>
              <button
                onClick={() => setIsHostModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRoomSubmit} className="space-y-4">
              {/* Host Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {language === 'en' ? 'Your Host Display Name' : 'Nama Tampilan Host Anda'}
                </label>
                <input
                  type="text"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  placeholder="Masukkan nama Anda..."
                  className="w-full py-2.5 px-3.5 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500"
                />
              </div>

              {/* Public vs Private Switch Toggle */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      {hostIsPublic ? (
                        <>
                          <Globe className="w-4 h-4 text-emerald-400" />
                          <span>{t('partyPublishToggle')} (Publik)</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 text-amber-400" />
                          <span>Room Privat (Hanya Kode)</span>
                        </>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 font-light">
                      {hostIsPublic
                        ? 'Room akan muncul di Lobi Publik dan dapat dimasuki siapa saja.'
                        : 'Room tetap muncul di Lobi, tapi penonton wajib memasukkan kode room 6 digit untuk bergabung.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      setHostIsPublic((prev) => !prev);
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      hostIsPublic ? 'bg-emerald-500' : 'bg-amber-600'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        hostIsPublic ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Media Picker Section */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  {t('partySelectMediaToHost')}
                </label>

                {/* Search Bar inside Modal */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={mediaSearchQuery}
                    onChange={(e) => setMediaSearchQuery(e.target.value)}
                    placeholder={t('partySearchingCatalog')}
                    className="w-full pl-8 pr-4 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  />
                </div>

                {/* Candidate Media Cards Carousel */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 scrollbar-thin">
                  {catalogSearchResults.map((item) => {
                    const isSelected = selectedMedia?.id === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          playClick();
                          setSelectedMedia(item);
                          setSelectedEpisode(item.seasons?.[0]?.episodes?.[0] || null);
                        }}
                        className={`relative rounded-xl overflow-hidden aspect-[2/3] border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-violet-500 ring-2 ring-violet-500/50 scale-95'
                            : 'border-white/10 hover:border-white/30 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={item.poster || item.backdrop}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent flex items-end p-1.5">
                          <span className="text-[10px] text-white font-medium line-clamp-1">{item.title}</span>
                        </div>
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-md">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selected Title Indicator */}
              {selectedMedia && (
                <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center gap-3">
                  <img
                    src={selectedMedia.poster || selectedMedia.backdrop}
                    alt={selectedMedia.title}
                    className="w-8 h-12 object-cover rounded shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate">{selectedMedia.title}</div>
                    <div className="text-[10px] text-violet-300 font-medium capitalize">
                      {selectedMedia.type === 'movie' ? '🎬 Film' : '📺 Series'}
                    </div>
                  </div>
                </div>
              )}

              {hostError && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{hostError}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsHostModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs font-medium"
                >
                  {t('back')}
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !selectedMedia}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-violet-600/30 transition-all cursor-pointer"
                >
                  {isCreating ? t('loading') : t('partyHostNewRoom')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
