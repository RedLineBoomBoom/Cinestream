import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCcw,
  RotateCw,
  Server as ServerIcon,
  Tv,
  Check,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Loader2,
  PictureInPicture2,
  Move,
  X,
  Scaling,
  MoveDiagonal,
  MoveDiagonal2,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import type { MediaItem, Server, Episode } from '../../types/media';
import { formatTime, parseDurationToSeconds, formatServerName, getDefaultServer } from '../../utils/formatters';
import { useWatchlist } from '../../context/WatchlistContext';
import { useSound } from '../../context/SoundContext';
import { useLanguage } from '../../context/LanguageContext';
import { useWatchParty } from '../../context/WatchPartyContext';
import { WatchPartyButton } from '../party/WatchPartyButton';
import { resolveBestServer } from '../../services/serverResolver';

export type SnapCorner = 'bottom-right' | 'bottom-left' | 'top-left' | 'top-right';

interface CinematicPlayerProps {
  media: MediaItem;
  currentEpisode?: Episode;
  activeServer: Server;
  servers?: Server[];
  onSelectServer?: (server: Server) => void;
  onOpenServerModal?: () => void;
  onOpenEpisodeDrawer?: () => void;
  autoPlay?: boolean;
  resumeTime?: number;
  isTheaterMode?: boolean;
  onToggleTheaterMode?: () => void;
  onOpenWatchParty?: () => void;
  isMiniPlayer?: boolean;
  onToggleMiniPlayer?: () => void;
  onCloseMiniPlayer?: () => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  onOpenVpnNotice?: () => void;
}

export function appendSubtitleParams(rawUrl: string, lang: 'id' | 'en'): string {
  if (!rawUrl || !rawUrl.startsWith('http')) return rawUrl;
  try {
    const parsed = new URL(rawUrl);
    const isId = lang === 'id';
    const subCode = isId ? 'id' : 'en';
    const subIso3 = isId ? 'ind' : 'eng';
    const subTitle = isId ? 'Indonesian' : 'English';
    const subLower = isId ? 'indonesian' : 'english';

    // AutoEmbed / NextGenCloudFabric / MultiEmbed / VidLink parameter matrix
    parsed.searchParams.set('subtitleLang', subTitle);
    parsed.searchParams.set('subtitle_lang', subTitle);
    parsed.searchParams.set('sub_lang', subCode);
    parsed.searchParams.set('subLang', subCode);
    parsed.searchParams.set('sub', subTitle);
    parsed.searchParams.set('lang', subCode);
    parsed.searchParams.set('sub.lang', subCode);
    parsed.searchParams.set('default_lang', subCode);
    parsed.searchParams.set('default_sub', subTitle);
    parsed.searchParams.set('sub_name', subLower);
    parsed.searchParams.set('subtitle', subTitle);
    parsed.searchParams.set('subtitles', subTitle);
    parsed.searchParams.set('subLabel', subTitle);
    parsed.searchParams.set('sublabel', subTitle);
    parsed.searchParams.set('srclang', subCode);
    parsed.searchParams.set('cclang', subCode);
    parsed.searchParams.set('cc', '1');
    parsed.searchParams.set('captions', '1');
    parsed.searchParams.set('cc_load_policy', '1');
    parsed.searchParams.set('sub_iso', subIso3);
    parsed.searchParams.set('caption_lang', subCode);

    // Explicit language preference key to ensure complete iframe unmount & fresh embed context
    parsed.searchParams.set('pref_lang', subCode);

    // Volume params — force max volume in embed players that respect URL params
    parsed.searchParams.set('volume', '100');
    parsed.searchParams.set('vol', '100');
    parsed.searchParams.set('muted', '0');
    parsed.searchParams.set('autoMute', '0');
    parsed.searchParams.set('primaryColor', 'E50914');

    return parsed.toString();
  } catch {
    const sep = rawUrl.includes('?') ? '&' : '?';
    const isId = lang === 'id';
    const subCode = isId ? 'id' : 'en';
    const subTitle = isId ? 'Indonesian' : 'English';
    return `${rawUrl}${sep}subtitleLang=${subTitle}&sub_lang=${subCode}&subLabel=${subTitle}&default_sub=${subTitle}&sub=${subTitle}&lang=${subCode}&cc=1&pref_lang=${subCode}`;
  }
}

const broadcastIframePlay = (targetWin: Window) => {
  const cmds = [
    { type: 'play' },
    { type: 'PLAYER_PLAY' },
    { action: 'play' },
    { method: 'play' },
    { event: 'command', func: 'playVideo', args: '' },
    { context: 'player.js', version: '0.0.11', event: 'command', command: 'play' },
    { api: 'play' },
    'play',
    'api:play',
  ];
  cmds.forEach((cmd) => {
    try {
      targetWin.postMessage(cmd, '*');
      if (typeof cmd === 'object') targetWin.postMessage(JSON.stringify(cmd), '*');
    } catch {}
  });
};

const broadcastIframePause = (targetWin: Window) => {
  const cmds = [
    { type: 'pause' },
    { type: 'PLAYER_PAUSE' },
    { action: 'pause' },
    { method: 'pause' },
    { event: 'command', func: 'pauseVideo', args: '' },
    { context: 'player.js', version: '0.0.11', event: 'command', command: 'pause' },
    { api: 'pause' },
    'pause',
    'api:pause',
  ];
  cmds.forEach((cmd) => {
    try {
      targetWin.postMessage(cmd, '*');
      if (typeof cmd === 'object') targetWin.postMessage(JSON.stringify(cmd), '*');
    } catch {}
  });
};

// Broadcast max volume (1.0 = 100%) to all known embed player protocols
const broadcastIframeVolume = (targetWin: Window, volumeLevel = 1.0) => {
  const v = Math.min(1, Math.max(0, volumeLevel));
  const v100 = Math.round(v * 100);
  const cmds = [
    // Generic volume commands
    { type: 'setVolume', value: v },
    { type: 'volume', value: v },
    { type: 'setVolume', volume: v },
    { action: 'setVolume', value: v },
    { method: 'setVolume', value: v },
    // Playerjs protocol
    { context: 'player.js', version: '0.0.11', event: 'command', command: 'setVolume', value: v },
    // JWPlayer
    { event: 'command', func: 'setVolume', args: v100 },
    // Video.js
    { type: 'volume', data: v },
    // Plyr
    { method: 'volume', value: v },
    // Integer 0-100 scale
    { type: 'setVolume', value: v100 },
    { action: 'setVolume', volume: v100 },
    // Unmute commands
    { type: 'unmute' },
    { type: 'unMute' },
    { action: 'unmute' },
    { method: 'unmute' },
    { event: 'command', func: 'unMute', args: '' },
    { context: 'player.js', version: '0.0.11', event: 'command', command: 'unmute' },
    'unmute',
  ];
  cmds.forEach((cmd) => {
    try {
      targetWin.postMessage(cmd, '*');
      if (typeof cmd === 'object') targetWin.postMessage(JSON.stringify(cmd), '*');
    } catch {}
  });
};

export const CinematicPlayer: React.FC<CinematicPlayerProps> = ({
  media,
  currentEpisode,
  activeServer,
  servers,
  onSelectServer,
  onOpenServerModal,
  onOpenEpisodeDrawer,
  autoPlay = false,
  resumeTime,
  isTheaterMode: propIsTheaterMode,
  onToggleTheaterMode,
  onOpenWatchParty,
  isMiniPlayer = false,
  onToggleMiniPlayer,
  onCloseMiniPlayer,
  onFullscreenChange,
  onOpenVpnNotice,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { updateProgress, continueWatching, historyItems, recordWatch } = useWatchlist();
  const { playClick, playHover } = useSound();
  const { t, language } = useLanguage();
  const { status: partyStatus, sendSignal: sendPartySignal, latestSignal, isPartyOpen } = useWatchParty();
  const isRemoteSyncRef = useRef(false);

  // Available servers for failover and quick switching
  const availableServers = servers || currentEpisode?.servers || media.servers || [activeServer];

  // Always prioritize the selected active server's URL with automatic subtitle language selection
  const rawSource = activeServer?.url || (currentEpisode ? currentEpisode.videoUrl : getDefaultServer(media.servers)?.url);
  const videoSource = activeServer?.isEmbed ? appendSubtitleParams(rawSource, language) : rawSource;
  const isEmbedStream =
    Boolean(activeServer.isEmbed) ||
    (typeof videoSource === 'string' &&
      (videoSource.includes('/embed/') ||
        videoSource.includes('autoembed.cc') ||
        videoSource.includes('multiembed.mov') ||
        videoSource.includes('vidsrc') ||
        videoSource.includes('vidlink') ||
        videoSource.includes('2embed') ||
        videoSource.includes('smashystream') ||
        videoSource.includes('player.')));

  const initialDuration = currentEpisode?.duration
    ? parseDurationToSeconds(currentEpisode.duration)
    : parseDurationToSeconds(media.duration);

  const initialTime = (() => {
    if (resumeTime !== undefined && resumeTime > 0) return resumeTime;
    if (media.type !== 'movie' && currentEpisode?.id) {
      const savedCwEp = continueWatching.find((p) => p.mediaId === media.id && p.episodeId === currentEpisode.id)?.currentTime;
      if (savedCwEp && savedCwEp > 0) return savedCwEp;
      const savedHistoryEp = historyItems.find((h) => h.mediaId === media.id && h.episodeId === currentEpisode.id)?.currentTime;
      if (savedHistoryEp && savedHistoryEp > 0) return savedHistoryEp;
      return 0;
    }
    const savedCw = continueWatching.find((p) => p.mediaId === media.id)?.currentTime;
    if (savedCw && savedCw > 0) return savedCw;
    const savedHistory = historyItems.find((h) => h.mediaId === media.id)?.currentTime;
    if (savedHistory && savedHistory > 0) return savedHistory;
    return 0;
  })();

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isActivelyWatching, setIsActivelyWatching] = useState(autoPlay);
  const isActivelyWatchingRef = useRef(autoPlay);
  isActivelyWatchingRef.current = isActivelyWatching;
  const isMouseOverPlayer = useRef(false);

  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(initialDuration);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1.0);   // Always max by default
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPortraitFullscreen, setIsPortraitFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasVerifiedTime, setHasVerifiedTime] = useState(false);

  useEffect(() => {
    setHasVerifiedTime(false);
  }, [media.id, currentEpisode?.id, activeServer.id]);

  // Theater Mode State & HUD Toast
  const [internalTheaterMode, setInternalTheaterMode] = useState(false);
  const isTheaterMode = propIsTheaterMode !== undefined ? propIsTheaterMode : internalTheaterMode;
  const [theaterToast, setTheaterToast] = useState<string | null>(null);
  const theaterToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mini Player Floating Corner State & Cycle
  const [snapCorner, setSnapCorner] = useState<SnapCorner>(() => {
    try {
      const saved = localStorage.getItem('cinestream_miniplayer_corner');
      if (saved && ['bottom-right', 'bottom-left', 'top-left', 'top-right'].includes(saved)) {
        return saved as SnapCorner;
      }
    } catch {}
    return 'bottom-right';
  });

  const cycleCorner = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    playClick();
    setFreePosition(null);
    try {
      localStorage.removeItem('cinestream_miniplayer_freepos');
    } catch {}
    const order: SnapCorner[] = ['bottom-right', 'bottom-left', 'top-left', 'top-right'];
    const nextIdx = (order.indexOf(snapCorner) + 1) % order.length;
    const nextCorner = order[nextIdx];
    setSnapCorner(nextCorner);
    try {
      localStorage.setItem('cinestream_miniplayer_corner', nextCorner);
    } catch {}
  }, [snapCorner, playClick]);

  const cornerStyles: Record<SnapCorner, string> = {
    'bottom-right': 'bottom-20 sm:bottom-6 right-4 sm:right-6',
    'bottom-left': 'bottom-20 sm:bottom-6 left-4 sm:left-6',
    'top-left': 'top-20 left-4 sm:left-6',
    'top-right': 'top-20 right-4 sm:right-6',
  };

  // Mini Player Sizing & 16:9 Aspect Ratio Lock State
  const [miniPlayerWidth, setMiniPlayerWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('cinestream_miniplayer_width');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 260 && val <= 1000) {
          return val;
        }
      }
    } catch {}
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 640) return 320;
      if (window.innerWidth < 1024) return 380;
      return 440;
    }
    return 420;
  });

  // Free Floating Drag & Corner Magnetic Snap State
  const [freePosition, setFreePosition] = useState<{ x: number; y: number } | null>(() => {
    try {
      const saved = localStorage.getItem('cinestream_miniplayer_freepos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          return parsed;
        }
      }
    } catch {}
    return null;
  });

  const [isDraggingPlayer, setIsDraggingPlayer] = useState(false);
  const [currentDragPos, setCurrentDragPos] = useState<{ x: number; y: number } | null>(null);
  const [activeSnapCorner, setActiveSnapCorner] = useState<SnapCorner | null>(null);

  const playerDragRef = useRef<{
    startX: number;
    startY: number;
    initLeft: number;
    initTop: number;
  } | null>(null);

  const getCornerCoordinates = useCallback((corner: SnapCorner, playerW: number, playerH: number) => {
    if (typeof window === 'undefined') return { x: 24, y: 80 };
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const isSm = winW >= 640;
    const marginX = isSm ? 24 : 16;
    const marginBottom = isSm ? 24 : 80;
    const marginTop = 80;

    switch (corner) {
      case 'top-left':
        return { x: marginX, y: marginTop };
      case 'top-right':
        return { x: winW - playerW - marginX, y: marginTop };
      case 'bottom-left':
        return { x: marginX, y: winH - playerH - marginBottom };
      case 'bottom-right':
      default:
        return { x: winW - playerW - marginX, y: winH - playerH - marginBottom };
    }
  }, []);

  const detectNearCorner = useCallback((curX: number, curY: number, playerW: number, playerH: number): SnapCorner | null => {
    if (typeof window === 'undefined') return null;
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const isSm = winW >= 640;
    const marginX = isSm ? 24 : 16;
    const marginBottom = isSm ? 24 : 80;
    const marginTop = 80;
    const SNAP_THRESHOLD = 90;

    // 1. Top-Left
    if (curX <= marginX + SNAP_THRESHOLD && curY <= marginTop + SNAP_THRESHOLD) {
      return 'top-left';
    }

    // 2. Top-Right
    if (curX >= winW - playerW - marginX - SNAP_THRESHOLD && curY <= marginTop + SNAP_THRESHOLD) {
      return 'top-right';
    }

    // 3. Bottom-Left
    if (curX <= marginX + SNAP_THRESHOLD && curY >= winH - playerH - marginBottom - SNAP_THRESHOLD) {
      return 'bottom-left';
    }

    // 4. Bottom-Right
    if (curX >= winW - playerW - marginX - SNAP_THRESHOLD && curY >= winH - playerH - marginBottom - SNAP_THRESHOLD) {
      return 'bottom-right';
    }

    return null;
  }, []);

  const handleDragPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    playerDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initLeft: rect.left,
      initTop: rect.top,
    };

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}

    setIsDraggingPlayer(true);
    setCurrentDragPos({ x: rect.left, y: rect.top });
  };

  const handleDragPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingPlayer || !playerDragRef.current) return;

    const deltaX = e.clientX - playerDragRef.current.startX;
    const deltaY = e.clientY - playerDragRef.current.startY;

    const playerW = miniPlayerWidth;
    const playerH = Math.round((playerW * 9) / 16);

    const winW = window.innerWidth;
    const winH = window.innerHeight;

    const rawX = playerDragRef.current.initLeft + deltaX;
    const rawY = playerDragRef.current.initTop + deltaY;

    // Boundary clamping
    const clampedX = Math.max(8, Math.min(rawX, winW - playerW - 8));
    const clampedY = Math.max(8, Math.min(rawY, winH - playerH - 8));

    // Corner detection: if approaching any corner, immediately activate snap
    const corner = detectNearCorner(clampedX, clampedY, playerW, playerH);

    if (corner) {
      const snapCoords = getCornerCoordinates(corner, playerW, playerH);
      setCurrentDragPos(snapCoords);
      setActiveSnapCorner(corner);
    } else {
      setCurrentDragPos({ x: clampedX, y: clampedY });
      setActiveSnapCorner(null);
    }
  };

  const handleDragPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingPlayer) return;

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    setIsDraggingPlayer(false);
    playerDragRef.current = null;

    if (activeSnapCorner) {
      playClick();
      setSnapCorner(activeSnapCorner);
      setFreePosition(null);
      try {
        localStorage.setItem('cinestream_miniplayer_corner', activeSnapCorner);
        localStorage.removeItem('cinestream_miniplayer_freepos');
      } catch {}

      const cornerLabels: Record<SnapCorner, { id: string; en: string }> = {
        'top-left': { id: 'Kiri Atas', en: 'Top Left' },
        'top-right': { id: 'Kanan Atas', en: 'Top Right' },
        'bottom-left': { id: 'Kiri Bawah', en: 'Bottom Left' },
        'bottom-right': { id: 'Kanan Bawah', en: 'Bottom Right' },
      };
      if (theaterToastTimeoutRef.current) clearTimeout(theaterToastTimeoutRef.current);
      setTheaterToast(`✓ Snap: ${language === 'en' ? cornerLabels[activeSnapCorner].en : cornerLabels[activeSnapCorner].id}`);
      theaterToastTimeoutRef.current = setTimeout(() => setTheaterToast(null), 1800);
      setActiveSnapCorner(null);
      setCurrentDragPos(null);
    } else if (currentDragPos) {
      setFreePosition(currentDragPos);
      try {
        localStorage.setItem('cinestream_miniplayer_freepos', JSON.stringify(currentDragPos));
      } catch {}
      setCurrentDragPos(null);
    }
  };

  // Clamping free position on browser window resize
  useEffect(() => {
    if (!isMiniPlayer || !freePosition) return;
    const handleWindowResize = () => {
      const winW = window.innerWidth;
      const winH = window.innerHeight;
      const playerW = miniPlayerWidth;
      const playerH = Math.round((playerW * 9) / 16);
      const clampedX = Math.max(8, Math.min(freePosition.x, winW - playerW - 8));
      const clampedY = Math.max(8, Math.min(freePosition.y, winH - playerH - 8));
      if (clampedX !== freePosition.x || clampedY !== freePosition.y) {
        setFreePosition({ x: clampedX, y: clampedY });
      }
    };
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [isMiniPlayer, freePosition, miniPlayerWidth]);

  const [isResizing, setIsResizing] = useState(false);
  const resizeStateRef = useRef<{
    startX: number;
    startY: number;
    startWidth: number;
    corner: SnapCorner;
  } | null>(null);

  const getSizeLabel = (w: number): string => {
    if (w <= 360) return 'S';
    if (w <= 480) return 'M';
    if (w <= 640) return 'L';
    return 'XL';
  };

  const cycleMiniPlayerSize = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    playClick();
    const maxW = typeof window !== 'undefined' ? Math.min(window.innerWidth - 32, 960) : 800;
    const presets = [320, 420, 560, 720].filter((w) => w <= maxW);
    if (presets.length === 0) presets.push(320);

    let closestIdx = 0;
    let minDiff = Infinity;
    presets.forEach((p, idx) => {
      const diff = Math.abs(miniPlayerWidth - p);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });

    const nextIdx = (closestIdx + 1) % presets.length;
    const nextWidth = presets[nextIdx];
    setMiniPlayerWidth(nextWidth);
    try {
      localStorage.setItem('cinestream_miniplayer_width', String(nextWidth));
    } catch {}

    const height = Math.round((nextWidth * 9) / 16);
    if (theaterToastTimeoutRef.current) clearTimeout(theaterToastTimeoutRef.current);
    setTheaterToast(`${language === 'en' ? 'Mini Player Size' : 'Ukuran Mini Player'}: ${nextWidth} × ${height} (16:9)`);
    theaterToastTimeoutRef.current = setTimeout(() => setTheaterToast(null), 1800);
  }, [miniPlayerWidth, playClick, language]);

  const handleResizePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    resizeStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: miniPlayerWidth,
      corner: snapCorner,
    };
    setIsResizing(true);
  };

  const handleResizePointerMove = (e: React.PointerEvent) => {
    if (!resizeStateRef.current || !isResizing) return;
    const { startX, startY, startWidth, corner } = resizeStateRef.current;

    const minWidth = 260;
    const maxWidth = typeof window !== 'undefined'
      ? Math.min(window.innerWidth - 32, Math.floor((window.innerHeight - 60) * (16 / 9)), 960)
      : 800;

    const isFree = !isDraggingPlayer && !!freePosition;
    let dx = 0;
    let dy = 0;

    if (isFree) {
      dx = e.clientX - startX;
      dy = (e.clientY - startY) * (16 / 9);
    } else {
      dx = corner.endsWith('right') ? startX - e.clientX : e.clientX - startX;
      dy = (corner.startsWith('bottom') ? startY - e.clientY : e.clientY - startY) * (16 / 9);
    }

    const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
    const newWidth = Math.min(maxWidth, Math.max(minWidth, Math.round(startWidth + delta)));
    setMiniPlayerWidth(newWidth);
  };

  const handleResizePointerUp = (e: React.PointerEvent) => {
    if (isResizing) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      setIsResizing(false);
      resizeStateRef.current = null;
      try {
        localStorage.setItem('cinestream_miniplayer_width', String(miniPlayerWidth));
      } catch {}
    }
  };

  const [isResolvingServer, setIsResolvingServer] = useState(false);
  const failedServerIdsRef = useRef<Set<string>>(new Set());

  // Reset failed server history when media or episode changes
  useEffect(() => {
    failedServerIdsRef.current.clear();
  }, [media.id, currentEpisode?.id]);

  // Intelligent Automatic Server Selector (Auto-Failover / User Recovery)
  const handleSmartFailover = useCallback(async () => {
    if (!availableServers || availableServers.length <= 1 || isResolvingServer) return;
    playClick();
    setIsResolvingServer(true);

    // Record the current server as failing for this media/episode session
    failedServerIdsRef.current.add(activeServer.id);

    try {
      const result = await resolveBestServer({
        servers: availableServers,
        currentServerId: activeServer.id,
        media,
        failedServerIds: failedServerIdsRef.current,
        lang: language,
      });

      if (onSelectServer) {
        onSelectServer(result.bestServer);
      }

      if (theaterToastTimeoutRef.current) clearTimeout(theaterToastTimeoutRef.current);
      setTheaterToast(
        language === 'en'
          ? `⚡ Auto-Connected: ${result.cleanName} (${result.reason})`
          : `⚡ Otomatis Terhubung: ${result.cleanName} (${result.reason})`
      );
      theaterToastTimeoutRef.current = setTimeout(() => {
        setTheaterToast(null);
      }, 3000);
    } catch (err) {
      console.warn('Smart server resolution fallback:', err);
      // Graceful fallback to next available index if probe encountered error
      const currentIndex = availableServers.findIndex((s) => s.id === activeServer.id);
      const nextIndex = (currentIndex + 1) % availableServers.length;
      const nextSrv = availableServers[nextIndex];
      if (onSelectServer) {
        onSelectServer(nextSrv);
      }
    } finally {
      setIsResolvingServer(false);
    }
  }, [availableServers, activeServer.id, isResolvingServer, media, language, onSelectServer, playClick]);

  const toggleTheaterMode = useCallback(() => {
    playClick();
    const nextState = !isTheaterMode;
    if (onToggleTheaterMode) {
      onToggleTheaterMode();
    } else {
      setInternalTheaterMode(nextState);
    }

    if (theaterToastTimeoutRef.current) clearTimeout(theaterToastTimeoutRef.current);
    setTheaterToast(nextState ? `${t('theaterMode')} (Aktif)` : t('exitTheaterMode'));
    theaterToastTimeoutRef.current = setTimeout(() => {
      setTheaterToast(null);
    }, 1800);
  }, [isTheaterMode, onToggleTheaterMode, playClick, t]);

  const currentTimeRef = useRef(currentTime);
  const durationRef = useRef(duration);
  const hasPlayedThisSession = useRef(false);
  const updateProgressRef = useRef(updateProgress);
  updateProgressRef.current = updateProgress;
  const mediaRef = useRef(media);
  mediaRef.current = media;

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);
  
  // Menus
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  // Automatically start active watch tracking once player is mounted on screen
  useEffect(() => {
    const t = setTimeout(() => {
      if (document.visibilityState === 'visible') {
        setIsActivelyWatching(true);
        setIsPlaying(true);
        hasPlayedThisSession.current = true;
      }
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  // Load last watched progress or explicit resumeTime when media or episode changes
  useEffect(() => {
    const epSavedTime = (() => {
      if (resumeTime !== undefined && resumeTime > 0) return resumeTime;
      if (media.type !== 'movie' && currentEpisode?.id) {
        const epCw = continueWatching.find((p) => p.mediaId === media.id && p.episodeId === currentEpisode.id)?.currentTime;
        if (epCw && epCw > 0) return epCw;
        const epHist = historyItems.find((h) => h.mediaId === media.id && h.episodeId === currentEpisode.id)?.currentTime;
        if (epHist && epHist > 0) return epHist;
        return 0;
      }
      const savedCw = continueWatching.find((p) => p.mediaId === media.id)?.currentTime;
      if (savedCw && savedCw > 0) return savedCw;
      const savedHist = historyItems.find((h) => h.mediaId === media.id)?.currentTime;
      if (savedHist && savedHist > 0) return savedHist;
      return 0;
    })();

    currentTimeRef.current = epSavedTime;
    setCurrentTime(epSavedTime);
    setHasVerifiedTime(false);

    if (videoRef.current && !isEmbedStream && epSavedTime > 5) {
      videoRef.current.currentTime = epSavedTime;
    }
  }, [media.id, currentEpisode?.id, resumeTime]);

  const hasInteractedWithPlayer = useRef(false);

  // Detect genuine user interaction with the video player / embed iframe
  useEffect(() => {
    const handleWindowBlur = () => {
      // When a user clicks inside an iframe, top window loses focus (window blur)
      if (isMouseOverPlayer.current || document.activeElement === iframeRef.current) {
        hasInteractedWithPlayer.current = true;
        hasPlayedThisSession.current = true;
        setIsActivelyWatching(true);
        setIsPlaying(true);
      }
    };

    window.addEventListener('blur', handleWindowBlur);
    return () => window.removeEventListener('blur', handleWindowBlur);
  }, []);

  // Periodic active focus check for iframe embed player (catches clicks even if blur was missed)
  useEffect(() => {
    const checkFocus = setInterval(() => {
      if (document.activeElement === iframeRef.current) {
        hasInteractedWithPlayer.current = true;
        hasPlayedThisSession.current = true;
        if (!isActivelyWatchingRef.current) {
          setIsActivelyWatching(true);
          setIsPlaying(true);
        }
      }
    }, 1000);
    return () => clearInterval(checkFocus);
  }, []);

  // Register watch session in Watch History
  useEffect(() => {
    const safeEpisode = media.type === 'movie' ? undefined : currentEpisode;

    recordWatch(media, {
      currentTime: currentTimeRef.current || initialTime,
      duration: durationRef.current || initialDuration,
      episode: safeEpisode,
      seasonNumber: safeEpisode?.seasonNumber,
    });
  }, [media.id, currentEpisode?.id]);

  // Active watch tracker & heartbeat: sync elapsed watch time
  useEffect(() => {
    if (!isActivelyWatching && !isPlaying) return;

    // Tick every 1 second: track elapsed playback time
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;

      const curDur = durationRef.current || initialDuration;
      if (curDur <= 0) return;

      // If we don't have a verified postMessage time, advance natural playback time
      if (!hasVerifiedTime) {
        hasPlayedThisSession.current = true;
        currentTimeRef.current = Math.min(curDur * 0.98, currentTimeRef.current + 1);
        setCurrentTime(currentTimeRef.current);
      }
    }, 1000);

    // Sync to WatchlistContext every 4 seconds
    const syncInterval = setInterval(() => {
      if (document.visibilityState !== 'visible') return;

      const curDur = durationRef.current || initialDuration;
      if (curDur <= 0) return;

      if (currentTimeRef.current > 0) {
        const safeEpId = media.type === 'movie' ? undefined : currentEpisode?.id;
        updateProgressRef.current(
          {
            mediaId: media.id,
            episodeId: safeEpId,
            currentTime: currentTimeRef.current,
            duration: curDur,
            lastWatched: Date.now(),
          },
          mediaRef.current
        );
      }
    }, 4000);

    return () => {
      clearInterval(timer);
      clearInterval(syncInterval);
    };
  }, [isActivelyWatching, isPlaying, hasVerifiedTime, media.id, currentEpisode?.id, initialDuration]);

  // Flush exact watched position on unmount / navigation
  useEffect(() => {
    return () => {
      const curDur = durationRef.current || initialDuration;
      const latestTime = currentTimeRef.current;
      if (latestTime > 0 && curDur > 0 && hasPlayedThisSession.current) {
        const safeEpId = mediaRef.current.type === 'movie' ? undefined : currentEpisode?.id;
        updateProgressRef.current(
          {
            mediaId: mediaRef.current.id,
            episodeId: safeEpId,
            currentTime: latestTime,
            duration: curDur,
            lastWatched: Date.now(),
          },
          mediaRef.current
        );
      }
    };
  }, [media.id, currentEpisode?.id, initialDuration]);

  // ── Iframe volume broadcast ──────────────────────────────────────────────────
  // Sends max-volume postMessages to embed iframe at multiple delays after mount
  useEffect(() => {
    if (!isEmbedStream) return;
    const delays = [300, 800, 2000, 4000, 8000];
    const timers = delays.map((d) =>
      setTimeout(() => {
        if (iframeRef.current?.contentWindow) {
          broadcastIframeVolume(iframeRef.current.contentWindow, 1.0);
        }
      }, d)
    );
    return () => timers.forEach(clearTimeout);
  }, [isEmbedStream, videoSource]);

  // ── Native <video> volume: always start at max ───────────────────────────────
  useEffect(() => {
    if (videoRef.current && !isEmbedStream) {
      videoRef.current.volume = 1.0;
      videoRef.current.muted = false;
    }
  }, [isEmbedStream, media.id, currentEpisode?.id]);



  // Listen for native playback events & time updates from embed players that support postMessage API
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!data || typeof data !== 'object') return;

        // Detect embed player play/pause state
        const eventName = (data.event || data.type || data.action || '').toLowerCase();
        if (eventName === 'play' || eventName === 'playing' || eventName === 'start') {
          hasPlayedThisSession.current = true;
          setIsPlaying(true);
        } else if (eventName === 'pause') {
          setIsPlaying(false);
        } else if (eventName === 'ended' || eventName === 'complete') {
          setIsPlaying(false);
        }

        const time =
          typeof data.currentTime === 'number'
            ? data.currentTime
            : typeof data.time === 'number'
            ? data.time
            : typeof data.position === 'number'
            ? data.position
            : typeof data.seconds === 'number'
            ? data.seconds
            : typeof data.data?.currentTime === 'number'
            ? data.data.currentTime
            : typeof data.data?.time === 'number'
            ? data.data.time
            : typeof data.data?.position === 'number'
            ? data.data.position
            : typeof data.data?.seconds === 'number'
            ? data.data.seconds
            : typeof data.progress?.currentTime === 'number'
            ? data.progress.currentTime
            : typeof data.progress?.position === 'number'
            ? data.progress.position
            : typeof data.detail?.plyr?.currentTime === 'number'
            ? data.detail.plyr.currentTime
            : undefined;

        const dur =
          typeof data.duration === 'number'
            ? data.duration
            : typeof data.data?.duration === 'number'
            ? data.data.duration
            : typeof data.progress?.duration === 'number'
            ? data.progress.duration
            : typeof data.detail?.plyr?.duration === 'number'
            ? data.detail.plyr.duration
            : undefined;

        if (typeof time === 'number' && time > 0) {
          hasPlayedThisSession.current = true;
          setHasVerifiedTime(true);
          setCurrentTime(time);
          const resolvedDur = typeof dur === 'number' && dur > 0 ? dur : (durationRef.current || initialDuration);
          if (typeof dur === 'number' && dur > 0) {
            setDuration(dur);
          }
          // Throttle progress updates to context/storage every 4 seconds
          if (Math.floor(time) % 4 === 0 && resolvedDur > 0) {
            updateProgress(
              {
                mediaId: media.id,
                episodeId: currentEpisode?.id,
                currentTime: time,
                duration: resolvedDur,
                lastWatched: Date.now(),
              },
              media
            );
          }
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [media.id, currentEpisode?.id]);

  // Staged multi-protocol postMessage subtitle synchronization for embedded players
  useEffect(() => {
    const targetTitle = language === 'id' ? 'Indonesian' : 'English';
    const targetCode = language === 'id' ? 'id' : 'en';

    const dispatchSubSync = () => {
      if (!iframeRef.current?.contentWindow) return;
      const targetWin = iframeRef.current.contentWindow;

      const syncEvents = [
        { type: 'STORAGE_SET', key: 'subtitleLang', value: targetTitle },
        { type: 'STORAGE_INIT', data: { subtitleLang: targetTitle } },
        { type: 'SET_SUBTITLE', lang: targetTitle, code: targetCode },
        { type: 'SET_SUBTITLE_LANG', lang: targetTitle, code: targetCode },
        { type: 'CHANGE_SUBTITLE', language: targetTitle, code: targetCode },
        { type: 'setCaptions', track: targetTitle, language: targetCode },
        { action: 'setSubtitle', value: targetTitle },
        { method: 'setSubtitle', value: targetTitle },
        { command: 'setCaptions', label: targetTitle },
      ];

      syncEvents.forEach((evt) => {
        try {
          targetWin.postMessage(evt, '*');
        } catch {}
      });
    };

    dispatchSubSync();
    const t1 = setTimeout(dispatchSubSync, 600);
    const t2 = setTimeout(dispatchSubSync, 1500);
    const t3 = setTimeout(dispatchSubSync, 3000);
    const t4 = setTimeout(dispatchSubSync, 5000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [language, videoSource]);

  // Handle incoming storage handshake requests from iframe players
  useEffect(() => {
    const handleIncomingMessage = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== 'object') return;
      const targetTitle = language === 'id' ? 'Indonesian' : 'English';

      if (e.data.type === 'STORAGE_GET_ALL' || e.data.type === 'PLAYER_READY' || e.data.event === 'ready') {
        try {
          iframeRef.current?.contentWindow?.postMessage(
            {
              type: 'STORAGE_INIT',
              data: { subtitleLang: targetTitle },
            },
            '*'
          );
          iframeRef.current?.contentWindow?.postMessage(
            {
              type: 'STORAGE_SET',
              key: 'subtitleLang',
              value: targetTitle,
            },
            '*'
          );
        } catch {}
      }
    };

    window.addEventListener('message', handleIncomingMessage);
    return () => window.removeEventListener('message', handleIncomingMessage);
  }, [language]);

  const isHoveringControlsRef = useRef(false);
  const [isPartyInteracting, setIsPartyInteracting] = useState(false);
  const isPartyInteractingRef = useRef(false);
  isPartyInteractingRef.current = isPartyInteracting;

  // Listen to Watch Party modal hover, focus, and drag interaction events
  useEffect(() => {
    const handlePartyInteraction = (e: Event) => {
      const customEvent = e as CustomEvent<{ active: boolean }>;
      const isActive = customEvent.detail?.active ?? true;
      isPartyInteractingRef.current = isActive;
      setIsPartyInteracting(isActive);
      if (isActive) {
        setShowControls(true);
        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
        }
      } else {
        resetHideTimer();
      }
    };

    window.addEventListener('party:interaction', handlePartyInteraction);
    return () => {
      window.removeEventListener('party:interaction', handlePartyInteraction);
    };
  }, []);

  // Reset party interaction flag when Watch Party modal is closed
  useEffect(() => {
    if (!isPartyOpen) {
      setIsPartyInteracting(false);
      isPartyInteractingRef.current = false;
    }
  }, [isPartyOpen]);

  const resetHideTimer = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    // Only skip timer if actively interacting with watch party modal,
    // or desktop hovering controls while NOT in fullscreen / theater mode.
    // On mobile touch devices or in fullscreen, controls should always auto-hide after inactivity.
    const isDesktopMouseHover =
      typeof window !== 'undefined' &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
      isHoveringControlsRef.current &&
      !isFullscreen &&
      !isPortraitFullscreen;

    if (isPartyInteractingRef.current || isDesktopMouseHover) return;

    if (isFullscreen || isPortraitFullscreen || isTheaterMode || isPlaying || isActivelyWatching) {
      controlsTimeoutRef.current = setTimeout(() => {
        const stillDesktopHover =
          typeof window !== 'undefined' &&
          window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
          isHoveringControlsRef.current &&
          !isFullscreen &&
          !isPortraitFullscreen;

        if (!stillDesktopHover && !isPartyInteractingRef.current) {
          setShowControls(false);
          setShowSpeedMenu(false);
        }
      }, 3000);
    }
  }, [isFullscreen, isPortraitFullscreen, isTheaterMode, isPlaying, isActivelyWatching]);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    resetHideTimer();
  }, [resetHideTimer]);

  const handleControlsMouseEnter = useCallback(() => {
    // Only lock hover state if user has a real desktop mouse with hover support AND not in fullscreen.
    // On touchscreens (mobile/tablet), mouseenter is simulated on tap and mouseleave never fires,
    // which would otherwise permanently lock controls visible!
    const isDesktopMouse =
      typeof window !== 'undefined' &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    if (isDesktopMouse && !isFullscreen && !isPortraitFullscreen) {
      isHoveringControlsRef.current = true;
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    } else {
      isHoveringControlsRef.current = false;
    }
    setShowControls(true);
    resetHideTimer();
  }, [isFullscreen, isPortraitFullscreen, resetHideTimer]);

  const handleControlsMouseLeave = useCallback(() => {
    isHoveringControlsRef.current = false;
    resetHideTimer();
  }, [resetHideTimer]);

  // Auto-hide controls after entering fullscreen / theater mode or restore when exiting
  useEffect(() => {
    if (isFullscreen || isPortraitFullscreen || isTheaterMode) {
      isHoveringControlsRef.current = false;
      setShowControls(true);
      resetHideTimer();
    } else {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    }
  }, [isFullscreen, isPortraitFullscreen, isTheaterMode, resetHideTimer]);

  // Window-level mouse move, pointer/touch, and keydown listeners in fullscreen / theater mode for reliable cursor and tap detection
  useEffect(() => {
    if (!isFullscreen && !isPortraitFullscreen && !isTheaterMode) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      // If mouse is within or over Watch Party modal, preserve cursor and pause hide timer
      const target = e.target as HTMLElement | null;
      if (target && target.closest('[data-watch-party-modal]')) {
        if (!isPartyInteractingRef.current) {
          isPartyInteractingRef.current = true;
          setIsPartyInteracting(true);
        }
        setShowControls(true);
        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
        }
        return;
      }

      if (isPartyInteractingRef.current) {
        isPartyInteractingRef.current = false;
        setIsPartyInteracting(false);
      }
      handleMouseMove();
    };

    const handleWindowPointerDown = (e: Event) => {
      // Avoid interrupting Watch Party modal interaction
      const target = (e as PointerEvent).target as HTMLElement | null;
      if (target && target.closest('[data-watch-party-modal]')) {
        return;
      }
      isHoveringControlsRef.current = false;
      handleMouseMove();
    };

    const handleWindowKeyDown = (e: KeyboardEvent) => {
      // Prevent cursor from hiding while user is typing in Watch Party chat
      const target = e.target as HTMLElement | null;
      if (target && target.closest('[data-watch-party-modal]')) {
        if (!isPartyInteractingRef.current) {
          isPartyInteractingRef.current = true;
          setIsPartyInteracting(true);
        }
        setShowControls(true);
        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
        }
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('pointerdown', handleWindowPointerDown, { passive: true });
    window.addEventListener('keydown', handleWindowKeyDown, true);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('pointerdown', handleWindowPointerDown);
      window.removeEventListener('keydown', handleWindowKeyDown, true);
    };
  }, [isFullscreen, isPortraitFullscreen, isTheaterMode, handleMouseMove]);


  const togglePlay = useCallback(() => {
    playClick();
    setIsPlaying((prev) => {
      const nextPlay = !prev;
      setIsActivelyWatching(nextPlay);
      if (nextPlay) {
        hasPlayedThisSession.current = true;
        hasInteractedWithPlayer.current = true;
      }

      if (videoRef.current) {
        if (prev) {
          videoRef.current.pause();
        } else {
          videoRef.current.play().catch(() => {});
        }
      } else if (iframeRef.current?.contentWindow) {
        if (nextPlay) {
          broadcastIframePlay(iframeRef.current.contentWindow);
        } else {
          broadcastIframePause(iframeRef.current.contentWindow);
        }
      }

      // Real-time broadcast to all connected Watch Party devices
      if (partyStatus === 'connected' && !isRemoteSyncRef.current) {
        sendPartySignal({
          type: nextPlay ? 'play' : 'pause',
          currentTime: videoRef.current ? videoRef.current.currentTime : currentTimeRef.current,
          timestamp: Date.now(),
        });
      }

      return nextPlay;
    });
  }, [playClick, partyStatus, sendPartySignal]);

  // ── Synchronously respond to local playback control commands ────────
  useEffect(() => {
    const handleControlEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ action: 'play' | 'pause' | 'toggle' }>;
      const action = customEvent.detail?.action;
      if (action === 'play') {
        setIsPlaying(true);
        setIsActivelyWatching(true);
        hasPlayedThisSession.current = true;
        hasInteractedWithPlayer.current = true;
        if (videoRef.current) {
          videoRef.current.play().catch(() => {});
        } else if (iframeRef.current?.contentWindow) {
          broadcastIframePlay(iframeRef.current.contentWindow);
        }
      } else if (action === 'pause') {
        setIsPlaying(false);
        setIsActivelyWatching(false);
        if (videoRef.current) {
          videoRef.current.pause();
        } else if (iframeRef.current?.contentWindow) {
          broadcastIframePause(iframeRef.current.contentWindow);
        }
      } else if (action === 'toggle') {
        togglePlay();
      }
    };
    window.addEventListener('stream:playback-control', handleControlEvent);
    return () => window.removeEventListener('stream:playback-control', handleControlEvent);
  }, [togglePlay]);

  // ── Real-time Watch Party Playback Synchronization ────────
  useEffect(() => {
    if (!latestSignal || partyStatus !== 'connected') return;
    const { signal } = latestSignal;

    // Prevent echoing this incoming action back to peers
    isRemoteSyncRef.current = true;

    if (signal.type === 'play') {
      setIsPlaying(true);
      setIsActivelyWatching(true);
      hasPlayedThisSession.current = true;
      hasInteractedWithPlayer.current = true;

      // 1. Native HTML5 Video Element
      if (videoRef.current) {
        if (typeof signal.currentTime === 'number' && signal.currentTime > 0 && Math.abs(videoRef.current.currentTime - signal.currentTime) > 1.5) {
          videoRef.current.currentTime = signal.currentTime;
        }
        videoRef.current.play().catch(async () => {
          // If browser autoplay policy blocks unmuted audio without prior user gesture, try muted fallback
          if (videoRef.current) {
            videoRef.current.muted = true;
            setIsMuted(true);
            await videoRef.current.play().catch(() => {});
          }
        });
      }

      // 2. Embedded Iframe Players (Multi-protocol postMessage broadcast)
      if (iframeRef.current?.contentWindow) {
        broadcastIframePlay(iframeRef.current.contentWindow);
      }
    } else if (signal.type === 'pause') {
      setIsPlaying(false);
      setIsActivelyWatching(false);

      // 1. Native HTML5 Video Element
      if (videoRef.current) {
        videoRef.current.pause();
        if (typeof signal.currentTime === 'number' && signal.currentTime > 0) {
          videoRef.current.currentTime = signal.currentTime;
        }
      }

      // 2. Embedded Iframe Players (Multi-protocol postMessage broadcast)
      if (iframeRef.current?.contentWindow) {
        broadcastIframePause(iframeRef.current.contentWindow);
      }
    } else if (signal.type === 'seek' && typeof signal.currentTime === 'number') {
      setCurrentTime(signal.currentTime);
      if (videoRef.current) {
        videoRef.current.currentTime = signal.currentTime;
      }
      if (iframeRef.current?.contentWindow) {
        try {
          iframeRef.current.contentWindow.postMessage({ type: 'seek', time: signal.currentTime }, '*');
          iframeRef.current.contentWindow.postMessage(JSON.stringify({ type: 'seek', time: signal.currentTime }), '*');
        } catch {}
      }
    }

    const resetTimer = setTimeout(() => {
      isRemoteSyncRef.current = false;
    }, 600);

    return () => clearTimeout(resetTimer);
  }, [latestSignal, partyStatus]);

  const handleSkip = (seconds: number) => {
    playClick();
    let newTime = currentTime;
    if (videoRef.current) {
      newTime = Math.min(Math.max(0, videoRef.current.currentTime + seconds), duration);
      videoRef.current.currentTime = newTime;
    } else {
      newTime = Math.min(Math.max(0, currentTime + seconds), duration);
      setCurrentTime(newTime);
      if (iframeRef.current?.contentWindow) {
        try {
          iframeRef.current.contentWindow.postMessage({ type: 'seek', time: newTime }, '*');
          iframeRef.current.contentWindow.postMessage(JSON.stringify({ type: 'seek', time: newTime }), '*');
        } catch {}
      }
    }

    if (partyStatus === 'connected' && !isRemoteSyncRef.current) {
      sendPartySignal({
        type: 'seek',
        currentTime: newTime,
        timestamp: Date.now(),
      });
    }
  };

  const handleOpenFullTab = useCallback(() => {
    playClick();
    if (videoSource) {
      window.open(videoSource, '_blank', 'noopener,noreferrer');
    }
  }, [playClick, videoSource]);

  const wasAutoRotatedFullscreen = useRef(false);
  const userExitedFullscreenInLandscape = useRef(false);

  // Helper: detect if currently in portrait mode on a mobile device
  const isMobilePortrait = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const isMobile = w <= 1024;
    const isPortrait = h > w ||
      window.matchMedia('(orientation: portrait)').matches ||
      (typeof window.orientation !== 'undefined' && (Number(window.orientation) === 0 || Number(window.orientation) === 180));
    return isMobile && isPortrait;
  };

  const toggleFullscreen = () => {
    playClick();
    const elem = containerRef.current;
    if (!elem) return;

    if (isMiniPlayer) {
      onToggleMiniPlayer?.();
    }

    const isCurrentlyFs = Boolean(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement ||
      isFullscreen
    );

    if (!isCurrentlyFs) {
      isHoveringControlsRef.current = false;
      wasAutoRotatedFullscreen.current = false;
      userExitedFullscreenInLandscape.current = false;

      const inPortrait = isMobilePortrait();

      if (inPortrait) {
        // === MOBILE PORTRAIT PATH ===
        // Step 1: Immediately activate CSS landscape rotation (works on ALL browsers incl. iOS Safari)
        setIsPortraitFullscreen(true);
        setIsFullscreen(true);
        onFullscreenChange?.(true);

        // Step 2: Also try orientation lock as enhancement — if it works,
        //         device physically rotates and we clear the CSS rotation.
        if ((screen.orientation as any)?.lock) {
          (screen.orientation as any).lock('landscape').then(() => {
            // Device rotated — remove CSS rotation, let native fullscreen handle it
            setIsPortraitFullscreen(false);
            if (elem.requestFullscreen) {
              elem.requestFullscreen().catch(() => {
                // Native fs rejected — keep CSS rotation active
                setIsPortraitFullscreen(true);
              });
            }
          }).catch(() => {
            // Lock rejected — CSS rotation already active, no further action needed
          });
        }
        // Also try native fullscreen in background (will trigger fullscreenchange event)
        if (elem.requestFullscreen) {
          elem.requestFullscreen().then(() => {
            // Native fullscreen granted — if device also rotated to landscape, clear CSS rotation
            const nowLandscape = window.innerWidth > window.innerHeight;
            if (nowLandscape) setIsPortraitFullscreen(false);
          }).catch(() => {
            // Native fs blocked (iOS) — CSS rotation handles it, already active
          });
        } else if ((elem as any).webkitRequestFullscreen) {
          try { (elem as any).webkitRequestFullscreen(); } catch {}
        }

      } else {
        // === DESKTOP / ALREADY LANDSCAPE PATH ===
        setIsPortraitFullscreen(false);
        if (elem.requestFullscreen) {
          elem.requestFullscreen().catch(() => {
            setIsFullscreen(true);
            onFullscreenChange?.(true);
          });
        } else if ((elem as any).webkitRequestFullscreen) {
          (elem as any).webkitRequestFullscreen();
        } else if ((elem as any).mozRequestFullScreen) {
          (elem as any).mozRequestFullScreen();
        } else if ((elem as any).msRequestFullscreen) {
          (elem as any).msRequestFullscreen();
        } else {
          setIsFullscreen(true);
          onFullscreenChange?.(true);
        }
      }

    } else {
      // === EXIT FULLSCREEN ===
      isHoveringControlsRef.current = false;
      userExitedFullscreenInLandscape.current = true;
      wasAutoRotatedFullscreen.current = false;
      setIsPortraitFullscreen(false);

      // Unlock orientation if locked
      try {
        if ((screen.orientation as any)?.unlock) {
          (screen.orientation as any).unlock();
        }
      } catch {}

      if (
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      ) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          (document as any).msExitFullscreen();
        }
      }
      setIsFullscreen(false);
      onFullscreenChange?.(false);
    }
  };



  // Sync fullscreen state with native document fullscreen events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = Boolean(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isFs);
      onFullscreenChange?.(isFs);
      if (!isFs) {
        setIsPortraitFullscreen(false);
        try {
          if ((screen.orientation as any)?.unlock) {
            (screen.orientation as any).unlock();
          }
        } catch {}
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [onFullscreenChange]);

  // Mobile Device Auto-Rotate Listener (Landscape <-> Portrait)
  useEffect(() => {
    if (isMiniPlayer) return;

    const checkOrientation = () => {
      const isMobile = window.innerWidth <= 1024 || window.innerHeight <= 600;
      if (!isMobile) return;

      const isLandscape =
        window.matchMedia('(orientation: landscape)').matches ||
        (typeof window.orientation !== 'undefined' && Math.abs(Number(window.orientation)) === 90) ||
        (screen.orientation && screen.orientation.type?.startsWith('landscape'));

      if (isLandscape) {
        // Device physically rotated to landscape — clear CSS portrait rotation if any
        setIsPortraitFullscreen(false);
        // Auto-enter fullscreen on landscape rotation if not already
        if (!isFullscreen && !userExitedFullscreenInLandscape.current) {
          wasAutoRotatedFullscreen.current = true;
          setIsFullscreen(true);
          onFullscreenChange?.(true);
        }
      } else {
        // User rotated back to portrait
        userExitedFullscreenInLandscape.current = false;
        if (wasAutoRotatedFullscreen.current) {
          wasAutoRotatedFullscreen.current = false;
          setIsFullscreen(false);
          setIsPortraitFullscreen(false);
          onFullscreenChange?.(false);
        }
      }
    };

    const mql = window.matchMedia('(orientation: landscape)');
    const handleMqlChange = () => checkOrientation();

    if (mql.addEventListener) {
      mql.addEventListener('change', handleMqlChange);
    } else {
      mql.addListener(handleMqlChange);
    }

    window.addEventListener('orientationchange', checkOrientation);
    window.addEventListener('resize', checkOrientation);

    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener('change', handleMqlChange);
      } else {
        mql.removeListener(handleMqlChange);
      }
      window.removeEventListener('orientationchange', checkOrientation);
      window.removeEventListener('resize', checkOrientation);
    };
  }, [isMiniPlayer, isFullscreen, onFullscreenChange]);

  // Lock body scroll when fullscreen is active (crucial for iOS Safari CSS fullscreen)
  useEffect(() => {
    if (isFullscreen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isFullscreen]);

  const toggleMute = () => {
    playClick();
    if (!videoRef.current) return;
    const newMute = !isMuted;
    setIsMuted(newMute);
    videoRef.current.muted = newMute;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
    }
  };

  const handleSpeedChange = (speed: number) => {
    playClick();
    setPlaybackRate(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSpeedMenu(false);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      const playerKeys = [' ', 'Space', 'f', 'F', 't', 'T', 'Escape', 'm', 'M', 'ArrowLeft', 'ArrowRight', 'p', 'P', 's', 'S'];
      if (playerKeys.includes(e.key) || playerKeys.includes(e.code)) {
        setShowControls(true);
        resetHideTimer();
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        toggleTheaterMode();
      } else if (e.key === 'Escape') {
        if (isFullscreen) {
          e.preventDefault();
          toggleFullscreen();
        } else if (isTheaterMode) {
          e.preventDefault();
          toggleTheaterMode();
        }
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSkip(-10);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSkip(10);
      } else if (e.key === 'p' || e.key === 'P') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey && onToggleMiniPlayer) {
          e.preventDefault();
          onToggleMiniPlayer();
        }
      } else if (e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        onOpenWatchParty?.();
      } else if (e.key === 's' || e.key === 'S') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          handleSmartFailover();
        }
      } else if (isMiniPlayer && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        setMiniPlayerWidth((prev) => {
          const maxW = typeof window !== 'undefined' ? Math.min(window.innerWidth - 32, 960) : 800;
          const next = Math.min(maxW, prev + 40);
          try { localStorage.setItem('cinestream_miniplayer_width', String(next)); } catch {}
          return next;
        });
      } else if (isMiniPlayer && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        setMiniPlayerWidth((prev) => {
          const next = Math.max(260, prev - 40);
          try { localStorage.setItem('cinestream_miniplayer_width', String(next)); } catch {}
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, duration, isFullscreen, isTheaterMode, isMiniPlayer, toggleTheaterMode, onToggleMiniPlayer, onOpenWatchParty, handleSmartFailover, resetHideTimer]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    setCurrentTime(curr);
    setHasVerifiedTime(true);

    if (videoRef.current.buffered.length > 0) {
      const end = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
      setBuffered(end);
    }

    if (curr > 0) {
      hasPlayedThisSession.current = true;
    }

    if (Math.floor(curr) % 4 === 0 && duration > 0 && curr > 0) {
      updateProgress({
        mediaId: media.id,
        episodeId: currentEpisode?.id,
        currentTime: curr,
        duration: duration,
        lastWatched: Date.now(),
      }, media);
    }
  };

  const handleNativePause = () => {
    setIsPlaying(false);
    if (videoRef.current && videoRef.current.currentTime > 5) {
      hasPlayedThisSession.current = true;
      updateProgress({
        mediaId: media.id,
        episodeId: currentEpisode?.id,
        currentTime: videoRef.current.currentTime,
        duration: durationRef.current || duration,
        lastWatched: Date.now(),
      }, media);
    }
  };

  const handleNativeEnded = () => {
    setIsPlaying(false);
    const curDur = durationRef.current || duration;
    updateProgress({
      mediaId: media.id,
      episodeId: currentEpisode?.id,
      currentTime: curDur,
      duration: curDur,
      lastWatched: Date.now(),
    }, media);
  };


  return (
    <div className={isMiniPlayer ? 'contents' : 'space-y-3 w-full'}>
      {/* Black backdrop for CSS-rotated portrait fullscreen */}
      {isPortraitFullscreen && isFullscreen && (
        <div
          className="fixed inset-0 z-[9998] bg-black"
          onClick={() => {
            setIsPortraitFullscreen(false);
            setIsFullscreen(false);
            onFullscreenChange?.(false);
          }}
        />
      )}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => { isMouseOverPlayer.current = true; }}
        onMouseLeave={() => { isMouseOverPlayer.current = false; }}
        onPointerDown={() => {
          isMouseOverPlayer.current = true;
          hasInteractedWithPlayer.current = true;
          hasPlayedThisSession.current = true;
          setIsActivelyWatching(true);
          setIsPlaying(true);
          handleMouseMove();
        }}
        onDoubleClick={isMiniPlayer ? onToggleMiniPlayer : toggleFullscreen}
        className={`overflow-hidden bg-black select-none group ${
          isResizing || isDraggingPlayer ? 'transition-none select-none' : 'transition-all duration-300'
        } ${
          isFullscreen
            ? `fixed inset-0 z-[9999] rounded-none border-none ${isPortraitFullscreen ? '' : 'w-screen h-screen w-[100dvw] h-[100dvh] aspect-auto'} ${!showControls && !isPartyInteracting ? 'cursor-none' : 'cursor-default'}`
            : isMiniPlayer
            ? `fixed z-[280] aspect-video rounded-2xl shadow-2xl border-2 ${
                activeSnapCorner ? 'border-brand-gold shadow-glow-gold' : 'border-brand-gold/60 shadow-black/95'
              } backdrop-blur-xl ${!freePosition && !isDraggingPlayer ? cornerStyles[snapCorner] : ''}`
            : isTheaterMode
            ? 'relative w-full max-w-[calc(80vh*16/9)] max-h-[80vh] aspect-video mx-auto rounded-none sm:rounded-2xl border-none shadow-2xl'
            : 'relative w-full rounded-2xl sm:rounded-3xl shadow-2xl border border-white/[0.08] aspect-video'
        }`}
        style={
          isFullscreen && isPortraitFullscreen
            ? {
                // CSS rotation fallback: rotate player 90° to simulate landscape on portrait mobile
                position: 'fixed',
                top: '50%',
                left: '50%',
                width: '100vh',
                height: '100vw',
                maxWidth: '100vh',
                maxHeight: '100vw',
                transform: 'translate(-50%, -50%) rotate(90deg)',
                transformOrigin: 'center center',
                zIndex: 9999,
              }
            : isFullscreen
            ? { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', zIndex: 9999 }
            : isMiniPlayer
            ? {
                position: 'fixed',
                width: `${miniPlayerWidth}px`,
                maxWidth: 'calc(100vw - 2rem)',
                maxHeight: 'calc(100vh - 5rem)',
                aspectRatio: '16 / 9',
                ...(isDraggingPlayer && currentDragPos
                  ? {
                      left: `${currentDragPos.x}px`,
                      top: `${currentDragPos.y}px`,
                      bottom: 'auto',
                      right: 'auto',
                    }
                  : freePosition
                  ? {
                      left: `${freePosition.x}px`,
                      top: `${freePosition.y}px`,
                      bottom: 'auto',
                      right: 'auto',
                    }
                  : {}),
              }
            : undefined
        }
      >
      {/* Floating Mini Player Header Overlay (Draggable Bar) */}
      {isMiniPlayer && !isFullscreen && (
        <div
          onPointerDown={handleDragPointerDown}
          onPointerMove={handleDragPointerMove}
          onPointerUp={handleDragPointerUp}
          onPointerCancel={handleDragPointerUp}
          className={`absolute top-0 inset-x-0 z-50 flex items-center justify-between gap-2 px-3 py-2 bg-gradient-to-b from-black/95 via-black/75 to-transparent pointer-events-auto select-none touch-none ${
            isDraggingPlayer ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          title={language === 'en' ? 'Drag header to move freely (snaps to corners)' : 'Tahan & geser header untuk memindahkan (snap di sudut)'}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse flex-shrink-0" />
            <span className="text-[11px] font-medium text-white truncate drop-shadow">
              {media.title}
              {currentEpisode && (
                <span className="text-brand-champagne/90 ml-1 font-mono text-[10px]">
                  S{currentEpisode.seasonNumber}E{currentEpisode.episodeNumber}
                </span>
              )}
            </span>
          </div>

          {/* Active Snap Badge preview while dragging */}
          {isDraggingPlayer && activeSnapCorner && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-gold text-cinema-950 font-bold text-[9px] shadow-glow-gold animate-pulse pointer-events-none">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
              <span>
                Snap: {activeSnapCorner === 'top-left' ? (language === 'en' ? 'Top Left' : 'Kiri Atas') :
                       activeSnapCorner === 'top-right' ? (language === 'en' ? 'Top Right' : 'Kanan Atas') :
                       activeSnapCorner === 'bottom-left' ? (language === 'en' ? 'Bottom Left' : 'Kiri Bawah') :
                       (language === 'en' ? 'Bottom Right' : 'Kanan Bawah')}
              </span>
            </div>
          )}

          <div
            className="flex items-center gap-1 flex-shrink-0"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* Quick Size Preset Cycle Button */}
            <button
              type="button"
              onClick={cycleMiniPlayerSize}
              className="px-2 py-1 rounded-md bg-black/60 hover:bg-brand-gold hover:text-cinema-950 text-slate-300 transition-all cursor-pointer flex items-center gap-1 text-[10px] font-mono border border-white/10 hover:border-brand-gold/50 group/size"
              title={language === 'en' ? 'Change Size (S / M / L / XL)' : 'Ubah Ukuran (S / M / L / XL)'}
            >
              <Scaling className="w-3 h-3 text-brand-champagne group-hover/size:text-cinema-950 transition-colors" />
              <span className="font-semibold text-white group-hover/size:text-cinema-950 transition-colors">{getSizeLabel(miniPlayerWidth)}</span>
            </button>

            <button
              type="button"
              onClick={cycleCorner}
              className="p-1 rounded-md bg-black/60 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer border border-white/10"
              title={language === 'en' ? 'Move to another corner' : 'Pindah posisi sudut'}
            >
              <Move className="w-3.5 h-3.5 text-brand-champagne" />
            </button>
            <button
              type="button"
              onClick={onToggleMiniPlayer}
              className="p-1 rounded-md bg-black/60 hover:bg-brand-gold hover:text-cinema-950 text-slate-300 transition-all cursor-pointer border border-white/10"
              title={t('restorePlayer')}
            >
              <Maximize2 className="w-3.5 h-3.5 text-brand-champagne hover:text-cinema-950" />
            </button>
            <button
              type="button"
              onClick={onCloseMiniPlayer}
              className="p-1 rounded-md bg-black/60 hover:bg-rose-600 text-slate-300 hover:text-white transition-all cursor-pointer border border-white/10"
              title={t('closeMiniPlayer')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Interactive Drag-to-Resize Corner Handle (Locked to 16:9 Aspect Ratio) */}
      {isMiniPlayer && !isFullscreen && (
        <div
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          onPointerCancel={handleResizePointerUp}
          className={`absolute z-50 p-1.5 rounded-lg bg-black/80 hover:bg-brand-gold hover:text-cinema-950 text-brand-champagne/90 border border-white/20 hover:border-brand-gold/70 backdrop-blur-md transition-all shadow-xl group pointer-events-auto touch-none select-none ${
            (freePosition && !isDraggingPlayer) || !snapCorner.endsWith('right')
              ? 'bottom-2 right-2 cursor-nwse-resize'
              : 'bottom-2 left-2 cursor-nesw-resize'
          }`}
          title={t('miniPlayerDragResize')}
        >
          {(freePosition && !isDraggingPlayer) || !snapCorner.endsWith('right') ? (
            <MoveDiagonal2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
          ) : (
            <MoveDiagonal className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
          )}
        </div>
      )}

      {/* Real-time Resolution Overlay HUD during Drag */}
      {isMiniPlayer && !isFullscreen && isResizing && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center pointer-events-none animate-fade-in gap-1.5">
          <div className="px-3.5 py-1.5 rounded-xl bg-black/90 border border-brand-gold/70 text-brand-champagne shadow-2xl flex items-center gap-2">
            <Scaling className="w-4 h-4 text-brand-gold animate-pulse" />
            <span className="font-mono text-sm font-bold tracking-wider text-white">
              {miniPlayerWidth} × {Math.round((miniPlayerWidth * 9) / 16)}
            </span>
            <span className="text-[10px] text-brand-champagne/90 font-sans font-medium px-1.5 py-0.5 rounded bg-brand-gold/15 border border-brand-gold/30">
              16:9 HD
            </span>
          </div>
          <span className="text-[10px] text-slate-300 font-light drop-shadow">
            {language === 'en' ? 'Aspect ratio locked (16:9)' : 'Resolusi terkunci 16:9'}
          </span>
        </div>
      )}

      {/* Theater Mode HUD Feedback Toast */}
      {theaterToast && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none animate-fade-in">
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-black/90 text-brand-champagne border border-brand-gold/40 shadow-2xl backdrop-blur-xl">
            <Tv className="w-5 h-5 text-brand-gold animate-pulse" />
            <span className="font-display text-sm sm:text-base font-medium tracking-wide">
              {theaterToast}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
              Esc / T
            </span>
          </div>
        </div>
      )}

      {/* Soft Ambient Background Reflection */}
      <div
        className={`absolute -inset-10 bg-cover bg-center pointer-events-none transition-all duration-1000 -z-10 ${
          isTheaterMode ? 'opacity-45 blur-3xl scale-110' : 'opacity-25 blur-3xl'
        }`}
        style={{ backgroundImage: `url(${media.backdrop})` }}
      />

      {/* Video Content: Native HTML5 Video OR Sandboxed Iframe Embed */}
      {isEmbedStream ? (
        <div className={`relative w-full h-full overflow-hidden ${isTheaterMode ? 'bg-black/90' : 'bg-black'}`}>
          {isTheaterMode && (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-25 blur-3xl scale-110 pointer-events-none -z-10"
              style={{ backgroundImage: `url(${media.backdrop})` }}
            />
          )}
          {/* Top Server Indicator & Multi-Engine Selector for Embed Streams */}
          {!isMiniPlayer && (
            <div
              onMouseEnter={handleControlsMouseEnter}
              onMouseLeave={handleControlsMouseLeave}
              className={`absolute top-0 inset-x-0 z-40 flex items-center justify-between gap-2 pointer-events-none transition-all duration-300 pt-[max(env(safe-area-inset-top),0.625rem)] pl-[max(env(safe-area-inset-left),0.625rem)] pr-[max(env(safe-area-inset-right),0.625rem)] pb-3 bg-gradient-to-b from-black/90 via-black/50 to-transparent ${
                (isFullscreen || isPortraitFullscreen || isTheaterMode) && !showControls
                  ? 'opacity-0 -translate-y-3 pointer-events-none'
                  : 'opacity-100 translate-y-0'
              }`}
            >
              <div
                onMouseEnter={handleControlsMouseEnter}
                onMouseLeave={handleControlsMouseLeave}
                className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto min-w-0 flex-1 overflow-x-auto no-scrollbar py-0.5"
              >
                {/* Quick Server Switcher Pills */}
                <div className="flex items-center gap-1 bg-cinema-950/90 backdrop-blur-md p-1 rounded-full border border-white/10 shadow-lg flex-shrink-0">
                  {availableServers.map((srv, idx) => {
                    const isActive = srv.id === activeServer.id;
                    const label = `S${idx + 1}`;
                    const localizedName = formatServerName(srv.name, language);
                    const cleanName = localizedName.split('•')[1]?.trim() || localizedName;
                    return (
                      <button
                        key={srv.id}
                        onClick={() => {
                          playClick();
                          onSelectServer?.(srv);
                          if (theaterToastTimeoutRef.current) clearTimeout(theaterToastTimeoutRef.current);
                          setTheaterToast(`${t('switchedToServer') || 'Beralih ke'} ${cleanName}`);
                          theaterToastTimeoutRef.current = setTimeout(() => setTheaterToast(null), 2200);
                        }}
                        className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap ${
                          isActive
                            ? 'bg-brand-gold text-cinema-950 font-semibold shadow-glow-gold'
                            : 'hover:bg-white/15 text-slate-300'
                        }`}
                        title={`${formatServerName(srv.name, language)} (${srv.quality})`}
                      >
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-cinema-950 animate-pulse" />}
                        <span>{label}</span>
                        {isActive && (
                          <span className="hidden sm:inline text-[9px] opacity-90 max-w-[130px] truncate font-medium">
                            • {cleanName.split('(')[0]?.trim()}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Emergency / Smart Failover Button */}
                <button
                  onClick={handleSmartFailover}
                  disabled={isResolvingServer}
                  className="flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-400 text-amber-200 hover:text-cinema-950 backdrop-blur-md px-2.5 sm:px-3 py-1 rounded-full border border-amber-500/40 text-[10px] sm:text-[11px] font-medium transition-all shadow-lg hover:shadow-amber-500/20 cursor-pointer flex-shrink-0 disabled:opacity-75"
                  title={language === 'en' ? 'Auto-select verified working server' : 'Otomatis memilih server yang lancar & aktif'}
                >
                  {isResolvingServer ? (
                    <>
                      <Loader2 className="w-3 h-3 text-amber-300 animate-spin" />
                      <span>{t('findingBestServer')}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      <span className="hidden 2xl:inline">{t('switchServerIfError')}</span>
                      <span className="2xl:hidden">{language === 'en' ? 'Fix 404' : 'Atasi 404'}</span>
                      <kbd className="hidden md:inline text-[9px] font-mono px-1 rounded bg-black/40 text-amber-200 border border-white/10">S</kbd>
                    </>
                  )}
                </button>
              </div>

              {/* Right Action Group for Embed Streams */}
              <div
                onMouseEnter={handleControlsMouseEnter}
                onMouseLeave={handleControlsMouseLeave}
                className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto flex-shrink-0 ml-2"
              >
                {/* Watch Party Button */}
                {onOpenWatchParty && (
                  <WatchPartyButton onClick={onOpenWatchParty} variant="compact" />
                )}

                {/* Floating Mini Player Button (Only in normal player view) */}
                {onToggleMiniPlayer && !isFullscreen && (
                  <button
                    onClick={onToggleMiniPlayer}
                    className="flex items-center gap-1.5 bg-cinema-950/85 hover:bg-white/20 text-slate-300 backdrop-blur-md px-2.5 sm:px-3 py-1 rounded-full border border-white/10 text-[10px] sm:text-[11px] font-medium transition-all shadow-lg cursor-pointer"
                    title={t('miniPlayerTooltip')}
                  >
                    <PictureInPicture2 className="w-3.5 h-3.5 text-brand-champagne" />
                    <span className="hidden md:inline">{t('miniPlayer')}</span>
                    <kbd className="hidden lg:inline text-[9px] font-mono px-1 rounded bg-black/40 text-slate-400 border border-white/10">P</kbd>
                  </button>
                )}

                {/* Theater Mode Toggle (Only in normal player view) */}
                {!isFullscreen && (
                  <button
                    onClick={toggleTheaterMode}
                    className={`flex items-center gap-1.5 backdrop-blur-md px-2.5 sm:px-3 py-1 rounded-full border text-[10px] sm:text-[11px] font-medium transition-all shadow-lg cursor-pointer ${
                      isTheaterMode
                        ? 'bg-brand-gold text-cinema-950 border-brand-gold shadow-glow-gold font-semibold'
                        : 'bg-cinema-950/85 hover:bg-white/20 text-slate-300 border-white/10'
                    }`}
                    title={isTheaterMode ? t('exitTheaterMode') : t('theaterMode')}
                  >
                    <Tv className={`w-3 h-3 ${isTheaterMode ? 'text-cinema-950 stroke-[2.5]' : 'text-brand-champagne'}`} />
                    <span className="hidden md:inline">{isTheaterMode ? t('exitTheaterMode') : t('theaterMode')}</span>
                    {isTheaterMode && <span className="w-1.5 h-1.5 rounded-full bg-cinema-950" />}
                  </button>
                )}

                {/* 🚀 Fitur Utama: Open in Full Tab Button */}
                <button
                  onClick={handleOpenFullTab}
                  className="flex items-center gap-1.5 backdrop-blur-md px-2.5 sm:px-3 py-1 rounded-full border text-[10px] sm:text-[11px] font-bold transition-all shadow-lg cursor-pointer bg-gradient-to-r from-[#E50914] via-orange-600 to-amber-500 hover:from-red-600 hover:to-amber-400 text-white border-amber-400/40 shadow-glow-red hover:scale-105 active:scale-95"
                  title={t('openInFullTabTooltip')}
                >
                  <ExternalLink className="w-3 h-3 stroke-[2.5]" />
                  <span>{language === 'en' ? 'Full Tab ↗' : 'Tab Penuh ↗'}</span>
                </button>

                {/* Native Fullscreen Toggle Button */}
                <button
                  onClick={toggleFullscreen}
                  className={`flex items-center gap-1.5 backdrop-blur-md px-3 py-1 sm:py-1.5 rounded-full border text-[11px] font-semibold transition-all shadow-lg cursor-pointer ${
                    isFullscreen
                      ? 'bg-[#E50914] hover:bg-[#F40612] text-white border-[#E50914] shadow-glow-red'
                      : 'bg-cinema-950/85 hover:bg-white/20 text-slate-300 border-white/10'
                  }`}
                  title={isFullscreen ? t('exitFullscreen') : t('fullscreen')}
                >
                  {isFullscreen ? (
                    <>
                      <Minimize2 className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                      <span className="font-sans text-xs">{t('exitFullscreen')}</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3.5 h-3.5 text-brand-champagne" />
                      <span className="hidden md:inline">{t('fullscreen')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Fullscreen & Theater Inactivity Wake-up Detection Overlay for Embed Streams */}
          <div
            className={`absolute inset-0 z-30 bg-transparent transition-colors ${
              (isFullscreen || isPortraitFullscreen || isTheaterMode) && !showControls && !isPartyInteracting
                ? 'pointer-events-auto cursor-none'
                : 'pointer-events-none'
            }`}
            onMouseMove={handleMouseMove}
            onPointerDown={handleMouseMove}
            onTouchStart={handleMouseMove}
            onDoubleClick={toggleFullscreen}
          />

          <iframe
            ref={iframeRef}
            key={videoSource}
            src={videoSource}
            title={media.title}
            className={`w-full h-full border-0 relative z-0 ${isResizing || isDraggingPlayer ? 'pointer-events-none' : ''}`}
            allow="accelerometer *; autoplay *; clipboard-write *; encrypted-media *; gyroscope *; picture-in-picture *; web-share *; fullscreen *"
            allowFullScreen
            // @ts-expect-error - vendor fullscreen attributes
            webkitallowfullscreen="true"
            mozallowfullscreen="true"
            referrerPolicy="origin"
          />
        </div>
      ) : (
        <video
          ref={videoRef}
          src={videoSource}
          autoPlay={autoPlay}
          playsInline
          onClick={togglePlay}
          onPlay={() => {
            setIsPlaying(true);
            setIsActivelyWatching(true);
            hasPlayedThisSession.current = true;
            hasInteractedWithPlayer.current = true;
            if (partyStatus === 'connected' && !isRemoteSyncRef.current) {
              sendPartySignal({
                type: 'play',
                currentTime: videoRef.current?.currentTime,
                timestamp: Date.now(),
              });
            }
          }}
          onPause={() => {
            handleNativePause();
            setIsActivelyWatching(false);
            if (partyStatus === 'connected' && !isRemoteSyncRef.current) {
              sendPartySignal({
                type: 'pause',
                currentTime: videoRef.current?.currentTime,
                timestamp: Date.now(),
              });
            }
          }}
          onEnded={() => {
            setIsActivelyWatching(false);
            handleNativeEnded();
          }}
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => {
            setIsBuffering(false);
            setIsActivelyWatching(true);
            hasPlayedThisSession.current = true;
            hasInteractedWithPlayer.current = true;
          }}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              setDuration(videoRef.current.duration);
              if (autoPlay) videoRef.current.play().catch(() => {});
            }
          }}
          className="w-full h-full object-contain cursor-pointer"
        />
      )}

      {/* Top Bar Header Overlay (Only for native video player to avoid overlapping iframe embed) */}
      {!isEmbedStream && !isMiniPlayer && (
        <div
          onMouseEnter={handleControlsMouseEnter}
          onMouseLeave={handleControlsMouseLeave}
          className={`absolute top-0 inset-x-0 p-4 sm:p-6 bg-gradient-to-b from-black/85 via-black/40 to-transparent flex items-center justify-between transition-all duration-300 pointer-events-none ${
            showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'
          }`}
        >
          <div className="flex items-center gap-3 pointer-events-auto">
            <div className="flex flex-col">
              <span className="text-[10px] font-sans font-medium tracking-[0.2em] text-brand-champagne uppercase">
                {currentEpisode ? `Episode ${currentEpisode.episodeNumber}` : media.quality}
              </span>
              <h3 className="text-white font-display font-medium text-sm sm:text-base tracking-wide drop-shadow truncate max-w-xs sm:max-w-md">
                {currentEpisode ? `${media.title} — ${currentEpisode.title}` : media.title}
              </h3>
            </div>
          </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {onOpenServerModal && (
            <button
              onClick={() => {
                playClick();
                onOpenServerModal();
              }}
              onMouseEnter={playHover}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 hover:bg-white/15 border border-white/[0.12] text-xs text-slate-300 transition-all backdrop-blur-md"
            >
              <ServerIcon className="w-3 h-3 text-brand-champagne" />
              <span className="hidden sm:inline font-light">{activeServer.name.split('•')[0]}</span>
              <span className="text-brand-champagne font-mono text-[10px]">({activeServer.speed})</span>
            </button>
          )}

          {media.seasons && onOpenEpisodeDrawer && (
            <button
              onClick={() => {
                playClick();
                onOpenEpisodeDrawer();
              }}
              onMouseEnter={playHover}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 hover:bg-white/15 border border-white/[0.12] text-xs text-slate-300 transition-all backdrop-blur-md"
            >
              <Tv className="w-3 h-3 text-brand-champagne" />
              <span className="font-light">Episode</span>
            </button>
          )}
        </div>
      </div>
      )}

      {/* Center Grand Play Icon (For native HTML5 stream) */}
      {!isEmbedStream && !isPlaying && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/35 backdrop-blur-[1px] cursor-pointer group"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#E50914] text-white flex items-center justify-center shadow-glow-red hover:scale-110 hover:bg-[#F40612] transition-all duration-300">
            <Play className="w-7 h-7 sm:w-8 sm:h-8 ml-1 fill-white" />
          </div>
        </div>
      )}

      {/* Buffering Spinner */}
      {!isEmbedStream && isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 rounded-full border-2 border-[#E50914]/20 border-t-[#E50914] animate-spin shadow-glow-red" />
        </div>
      )}


      {/* Speed Selector Popup */}
      {showSpeedMenu && !isMiniPlayer && (
        <div className="absolute bottom-16 right-16 sm:right-28 z-30 w-36 rounded-xl bg-cinema-900/95 border border-white/[0.12] p-2 shadow-2xl backdrop-blur-2xl">
          <div className="text-[10px] font-sans tracking-wider uppercase text-slate-400 px-2 py-1 border-b border-white/[0.08] mb-1">
            {t('playbackSpeed')}
          </div>
          {[0.75, 1, 1.25, 1.5, 2].map((s) => (
            <button
              key={s}
              onClick={() => handleSpeedChange(s)}
              onMouseEnter={playHover}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                playbackRate === s
                  ? 'bg-brand-gold text-cinema-950 font-semibold'
                  : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              <span>{s === 1 ? t('standardSpeed') : `${s}x`}</span>
              {playbackRate === s && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </button>
          ))}
        </div>
      )}

      {/* Bottom Controls Bar (For native HTML5 stream) */}
      {!isEmbedStream && !isMiniPlayer && (
        <div
          onMouseEnter={handleControlsMouseEnter}
          onMouseLeave={handleControlsMouseLeave}
          className={`absolute bottom-0 inset-x-0 p-3 sm:p-5 pb-[max(env(safe-area-inset-bottom),0.875rem)] pl-[max(env(safe-area-inset-left),0.875rem)] pr-[max(env(safe-area-inset-right),0.875rem)] bg-gradient-to-t from-black/95 via-black/60 to-transparent transition-all duration-300 ${
            showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
          }`}
        >
        {/* Scrubber & Progress Bar */}
        <div className="relative w-full mb-3 group/progress cursor-pointer">
          {/* Buffer Bar */}
          <div
            className="absolute top-1/2 -translate-y-1/2 left-0 h-1 rounded-full bg-white/20 pointer-events-none transition-all"
            style={{ width: `${(buffered / (duration || 1)) * 100}%` }}
          />

          {/* Current Progress Gold Bar */}
          <div
            className="absolute top-1/2 -translate-y-1/2 left-0 h-1 rounded-full bg-brand-gold shadow-glow-gold pointer-events-none transition-all group-hover/progress:h-1.5"
            style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
          />

          {/* Native Range Input */}
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="video-scrubber relative w-full h-4 sm:h-5 z-10 cursor-pointer opacity-0 group-hover/progress:opacity-100 transition-opacity"
          />
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between gap-3">
          {/* Left Controls */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={togglePlay}
              onMouseEnter={playHover}
              className="p-1.5 rounded-lg text-slate-200 hover:text-brand-champagne transition-all"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
            </button>

            <button
              onClick={() => handleSkip(-10)}
              onMouseEnter={playHover}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition-all hidden sm:flex items-center"
              title={t('rewind10s')}
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleSkip(10)}
              onMouseEnter={playHover}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition-all hidden sm:flex items-center"
              title={t('forward10s')}
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Volume */}
            <div className="flex items-center gap-2 group/volume">
              <button
                onClick={toggleMute}
                onMouseEnter={playHover}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition-all"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-brand-gold" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-14 sm:w-20 h-1 bg-white/20 rounded-lg accent-brand-gold cursor-pointer hidden group-hover/volume:inline-block transition-all"
              />
            </div>

            {/* Time Counter */}
            <div className="text-[11px] font-mono text-slate-400 font-light">
              <span className="text-slate-200">{formatTime(currentTime)}</span>
              <span className="mx-1 text-slate-600">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                playClick();
                setShowSpeedMenu((prev) => !prev);
              }}
              onMouseEnter={playHover}
              className="px-2 py-1 rounded text-xs font-mono text-slate-300 hover:text-white transition-all cursor-pointer"
              title={t('playbackSpeed')}
            >
              {playbackRate === 1 ? '1x' : `${playbackRate}x`}
            </button>

            {/* Watch Party Button */}
            {onOpenWatchParty && (
              <WatchPartyButton onClick={onOpenWatchParty} variant="compact" />
            )}

            {/* Floating Mini Player Button (Only in normal player view) */}
            {onToggleMiniPlayer && !isFullscreen && (
              <button
                onClick={onToggleMiniPlayer}
                onMouseEnter={playHover}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                title={t('miniPlayerTooltip')}
              >
                <PictureInPicture2 className="w-4 h-4" />
              </button>
            )}

            {/* Theater Mode Button (Only in normal player view) */}
            {!isFullscreen && (
              <button
                onClick={toggleTheaterMode}
                onMouseEnter={playHover}
                className={`p-1.5 rounded-lg transition-all hidden md:flex items-center justify-center cursor-pointer ${
                  isTheaterMode
                    ? 'text-brand-gold bg-brand-gold/20 shadow-glow-gold'
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
                title={isTheaterMode ? t('exitTheaterMode') : t('theaterMode')}
              >
                <div
                  className={`relative w-4 h-3 rounded-[3px] border transition-all flex items-center justify-center ${
                    isTheaterMode ? 'border-brand-gold bg-brand-gold/30' : 'border-current'
                  }`}
                >
                  {isTheaterMode && <div className="w-1.5 h-1 rounded-[1px] bg-brand-gold" />}
                </div>
              </button>
            )}

            {/* 🚀 Open in Full Tab Button — native video */}
            <button
              onClick={handleOpenFullTab}
              onMouseEnter={playHover}
              className="p-1.5 rounded-lg transition-all cursor-pointer text-slate-400 hover:text-white hover:bg-white/10"
              title={t('openInFullTabTooltip')}
            >
              <ExternalLink className="w-4 h-4" />
            </button>

            <button
              onClick={toggleFullscreen}
              onMouseEnter={playHover}
              className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                isFullscreen
                  ? 'bg-[#E50914] hover:bg-[#F40612] text-white px-3 py-1 sm:py-1.5 rounded-full shadow-glow-red'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
              title={isFullscreen ? t('exitFullscreen') : t('fullscreen')}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                  <span className="font-sans text-xs font-semibold">{t('exitFullscreen')}</span>
                </>
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          </div>
          </div>
        </div>
      )}
    </div>

    {/* Player Troubleshooting & Server Failover Helper Bar (Only in normal view to prevent HUD collision in Theater Mode, Fullscreen, & Mini Player) */}
    {!isTheaterMode && !isFullscreen && !isMiniPlayer && (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-4 py-2.5 rounded-2xl bg-cinema-900/60 border border-white/[0.06] backdrop-blur-xl text-xs text-slate-300 shadow-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="p-1 rounded-lg bg-brand-gold/15 text-brand-champagne flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-brand-gold" />
          </span>
          <span className="font-light text-[11px] sm:text-xs">
            {t('serverTroubleshootingTip')}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto flex-wrap">
          {onOpenVpnNotice && (
            <button
              onClick={() => {
                playClick();
                onOpenVpnNotice();
              }}
              onMouseEnter={playHover}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 hover:bg-amber-500/30 text-amber-200 border border-amber-500/35 text-[11px] font-medium transition-all cursor-pointer shadow-sm hover:shadow-amber-500/10"
              title={language === 'en' ? 'Playback Troubleshooting: VPN & Cloudflare DNS' : 'Tips Pemutaran: VPN & DNS Cloudflare'}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>{language === 'en' ? 'VPN / DNS Tips' : 'Tips VPN / DNS'}</span>
            </button>
          )}

          <button
            onClick={handleSmartFailover}
            disabled={isResolvingServer}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-gold/15 hover:bg-brand-gold text-brand-champagne hover:text-cinema-950 border border-brand-gold/30 text-[11px] font-medium transition-all cursor-pointer shadow-sm hover:shadow-glow-gold disabled:opacity-60"
            title={language === 'en' ? 'Auto-select verified working server' : 'Otomatis memilih server lancar & aktif'}
          >
            {isResolvingServer ? (
              <>
                <Loader2 className="w-3 h-3 text-brand-champagne animate-spin" />
                <span>{t('findingBestServer')}</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3 h-3" />
                <span>{t('switchServerIfError')}</span>
                <kbd className="hidden md:inline text-[9px] font-mono px-1 rounded bg-black/40 text-brand-champagne border border-white/10">S</kbd>
                <ChevronRight className="w-3 h-3 opacity-75" />
              </>
            )}
          </button>
        </div>
      </div>
    )}

  </div>
  );
};
