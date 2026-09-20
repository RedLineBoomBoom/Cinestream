import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Users, X, Copy, Check, Link2, QrCode, LogIn, Plus,
  Send, Crown, WifiOff, Play, Pause,
  AlertCircle, AlertTriangle, Radio, Loader2, Film, Tv, ChevronDown, ChevronUp, Minus,
  Move, GripHorizontal, Share2, RefreshCw, UserMinus, Shield, Smile, MessageSquare, ExternalLink,
  Globe, Search,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useWatchParty } from '../../context/WatchPartyContext';
import { useUserProfile } from '../../context/UserProfileContext';
import { useSound } from '../../context/SoundContext';
import { useLanguage } from '../../context/LanguageContext';
import type { PartyMediaInfo, PartyMessage } from '../../types/party';

interface WatchPartyModalProps {
  onClose: () => void;
  mediaInfo?: PartyMediaInfo;
  autoJoinCode?: string;
}

// ── Localized System Message Helper ────────────────────────
export function getLocalizedSystemMessage(
  msg: PartyMessage,
  lang: 'id' | 'en'
): { text: string; type: 'pause' | 'play' | 'info' } {
  // 1. Primary: Structured systemKey check
  if (msg.systemKey === 'control_mode_host_only') {
    return {
      text: lang === 'en'
        ? '👑 Control Mode: Only Host can control video playback'
        : '👑 Mode Kontrol: Hanya Host yang dapat mengontrol pemutaran video',
      type: 'info',
    };
  }
  if (msg.systemKey === 'control_mode_all') {
    return {
      text: lang === 'en'
        ? '👥 Control Mode: All members are free to control video playback'
        : '👥 Mode Kontrol: Semua anggota bebas mengontrol pemutaran video',
      type: 'info',
    };
  }
  if (msg.systemKey === 'pause_alert') {
    const name = (msg.systemParams?.name as string) || msg.memberName || 'Someone';
    return {
      text: lang === 'en'
        ? `${name} requested to PAUSE the movie/series being watched together`
        : `${name} meminta MENJEDA film/series yang sedang ditonton bersama`,
      type: 'pause',
    };
  }
  if (msg.systemKey === 'play_alert') {
    const name = (msg.systemParams?.name as string) || msg.memberName || 'Someone';
    return {
      text: lang === 'en'
        ? `${name} requested to PLAY the movie/series being watched together`
        : `${name} meminta MEMUTAR film/series yang sedang ditonton bersama`,
      type: 'play',
    };
  }
  if (msg.systemKey === 'seek_alert') {
    const name = (msg.systemParams?.name as string) || msg.memberName || 'Someone';
    return {
      text: lang === 'en'
        ? `${name} changed playback position`
        : `${name} mengubah posisi tayangan`,
      type: 'info',
    };
  }
  if (msg.systemKey === 'user_joined') {
    const name = (msg.systemParams?.name as string) || msg.memberName || 'User';
    return {
      text: lang === 'en'
        ? `${name} joined the room 🎬`
        : `${name} bergabung ke room 🎬`,
      type: 'info',
    };
  }
  if (msg.systemKey === 'user_reconnected') {
    const name = (msg.systemParams?.name as string) || msg.memberName || 'User';
    return {
      text: lang === 'en'
        ? `${name} reconnected to the room 🔄`
        : `${name} terhubung kembali ke room 🔄`,
      type: 'info',
    };
  }
  if (msg.systemKey === 'user_left') {
    const name = (msg.systemParams?.name as string) || msg.memberName || 'User';
    return {
      text: lang === 'en'
        ? `${name} left the room`
        : `${name} meninggalkan room`,
      type: 'info',
    };
  }
  if (msg.systemKey === 'user_kicked') {
    const name = (msg.systemParams?.name as string) || msg.memberName || 'User';
    return {
      text: lang === 'en'
        ? `🚫 ${name} was removed from the room by the Host`
        : `🚫 ${name} telah dikeluarkan dari room oleh Host`,
      type: 'info',
    };
  }
  if (msg.systemKey === 'media_changed') {
    const title = (msg.systemParams?.title as string) || '';
    return {
      text: lang === 'en'
        ? `🎬 Host switched playback to: ${title}`
        : `🎬 Host mengalihkan tayangan ke: ${title}`,
      type: 'info',
    };
  }

  // 2. Secondary: Fallback pattern matching for historical/unstructured messages
  const raw = (msg.text || '').trim();

  // Control mode: Host Only
  if (
    raw.includes('Hanya Host yang dapat mengontrol') ||
    raw.includes('Only Host can control') ||
    raw.includes('Mode Kontrol: Hanya Host') ||
    raw.includes('Control Mode: Only Host')
  ) {
    return {
      text: lang === 'en'
        ? '👑 Control Mode: Only Host can control video playback'
        : '👑 Mode Kontrol: Hanya Host yang dapat mengontrol pemutaran video',
      type: 'info',
    };
  }

  // Control mode: All
  if (
    raw.includes('Semua anggota bebas mengontrol') ||
    raw.includes('All members are free to control') ||
    raw.includes('Mode Kontrol: Semua anggota') ||
    raw.includes('Control Mode: All members')
  ) {
    return {
      text: lang === 'en'
        ? '👥 Control Mode: All members are free to control video playback'
        : '👥 Mode Kontrol: Semua anggota bebas mengontrol pemutaran video',
      type: 'info',
    };
  }

  // Pause Alert
  if (
    raw.includes('meminta MENJEDA') ||
    raw.includes('requested to PAUSE') ||
    (raw.includes('⚠️') && (raw.toLowerCase().includes('jeda') || raw.toLowerCase().includes('pause')))
  ) {
    const match = raw.match(/(?:⚠️\s*)?([^\s]+(?:\s+[^\s]+)?)\s+(?:meminta MENJEDA|requested to PAUSE)/i);
    const name = match ? match[1].trim() : msg.memberName || 'Someone';
    return {
      text: lang === 'en'
        ? `${name} requested to PAUSE the movie/series being watched together`
        : `${name} meminta MENJEDA film/series yang sedang ditonton bersama`,
      type: 'pause',
    };
  }

  // Play Alert
  if (
    raw.includes('meminta MEMUTAR') ||
    raw.includes('requested to PLAY') ||
    (raw.includes('▶️') && (raw.toLowerCase().includes('putar') || raw.toLowerCase().includes('play')))
  ) {
    const match = raw.match(/(?:▶️\s*)?([^\s]+(?:\s+[^\s]+)?)\s+(?:meminta MEMUTAR|requested to PLAY)/i);
    const name = match ? match[1].trim() : msg.memberName || 'Someone';
    return {
      text: lang === 'en'
        ? `${name} requested to PLAY the movie/series being watched together`
        : `${name} meminta MEMUTAR film/series yang sedang ditonton bersama`,
      type: 'play',
    };
  }

  // Seek Alert
  if (raw.includes('mengubah posisi tayangan') || raw.includes('changed playback position')) {
    const match = raw.match(/(?:⏩\s*)?([^\s]+(?:\s+[^\s]+)?)\s+(?:mengubah posisi tayangan|changed playback position)/i);
    const name = match ? match[1].trim() : msg.memberName || 'Someone';
    return {
      text: lang === 'en'
        ? `${name} changed playback position`
        : `${name} mengubah posisi tayangan`,
      type: 'info',
    };
  }

  // Reconnected
  if (raw.includes('terhubung kembali ke room') || raw.includes('reconnected to the room')) {
    const match = raw.match(/([^\s]+(?:\s+[^\s]+)?)\s+(?:terhubung kembali ke room|reconnected to the room)/i);
    const name = match ? match[1].trim() : msg.memberName || 'User';
    return {
      text: lang === 'en' ? `${name} reconnected to the room 🔄` : `${name} terhubung kembali ke room 🔄`,
      type: 'info',
    };
  }

  // Joined
  if (raw.includes('bergabung ke room') || raw.includes('joined the room')) {
    const match = raw.match(/([^\s]+(?:\s+[^\s]+)?)\s+(?:bergabung ke room|joined the room)/i);
    const name = match ? match[1].trim() : msg.memberName || 'User';
    return {
      text: lang === 'en' ? `${name} joined the room 🎬` : `${name} bergabung ke room 🎬`,
      type: 'info',
    };
  }

  // Left
  if (raw.includes('meninggalkan room') || raw.includes('left the room')) {
    const match = raw.match(/([^\s]+(?:\s+[^\s]+)?)\s+(?:meninggalkan room|left the room)/i);
    const name = match ? match[1].trim() : msg.memberName || 'User';
    return {
      text: lang === 'en' ? `${name} left the room` : `${name} meninggalkan room`,
      type: 'info',
    };
  }

  // Kicked
  if (raw.includes('telah dikeluarkan dari room oleh Host') || raw.includes('was removed from the room by the Host')) {
    const match = raw.match(/(?:🚫\s*)?([^\s]+(?:\s+[^\s]+)?)\s+(?:telah dikeluarkan dari room oleh Host|was removed from the room by the Host)/i);
    const name = match ? match[1].trim() : msg.memberName || 'User';
    return {
      text: lang === 'en' ? `🚫 ${name} was removed from the room by the Host` : `🚫 ${name} telah dikeluarkan dari room oleh Host`,
      type: 'info',
    };
  }

  // Media Changed
  if (raw.includes('Host mengalihkan tayangan ke:') || raw.includes('Host switched playback to:')) {
    const title = raw.replace(/^(?:🎬\s*)?Host (?:mengalihkan tayangan ke|switched playback to):\s*/i, '');
    return {
      text: lang === 'en' ? `🎬 Host switched playback to: ${title}` : `🎬 Host mengalihkan tayangan ke: ${title}`,
      type: 'info',
    };
  }

  return {
    text: raw,
    type: 'info',
  };
}

// ── Avatar initial ─────────────────────────────────────────
function AvatarInitial({ name, isHost, isActive, size = 'md' }: {
  name: string; isHost: boolean; isActive: boolean; size?: 'sm' | 'md';
}) {
  const colors = [
    'bg-violet-500', 'bg-sky-500', 'bg-emerald-500', 'bg-rose-500',
    'bg-amber-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
  ];
  const colorIdx = name.charCodeAt(0) % colors.length;
  const dim = size === 'sm' ? 'w-6 h-6 text-[9px]' : 'w-7 h-7 text-xs';
  return (
    <div className={`relative rounded-full flex items-center justify-center font-bold text-white shrink-0 ${dim} ${colors[colorIdx]} ${!isActive ? 'opacity-40' : ''}`}>
      {name[0]?.toUpperCase() ?? '?'}
      {isHost && (
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-brand-gold rounded-full flex items-center justify-center shadow-sm">
          <Crown className="w-1.5 h-1.5 text-cinema-950" />
        </span>
      )}
      {isActive && <span className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-emerald-400 rounded-full border border-cinema-950" />}
    </div>
  );
}

function fmtTime(ts: number, locale: string = 'id-ID') {
  return new Date(ts).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

export type SnapCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const CORNER_POSITIONS: Record<SnapCorner, { popup: string; pill: string }> = {
  'top-left': {
    popup: 'top-3 left-3 sm:top-6 sm:left-6',
    pill: 'top-4 left-4 sm:top-6 sm:left-6',
  },
  'top-right': {
    popup: 'top-3 right-3 sm:top-6 sm:right-6',
    pill: 'top-4 right-4 sm:top-6 sm:right-6',
  },
  'bottom-left': {
    popup: 'bottom-3 left-3 sm:bottom-6 sm:left-6',
    pill: 'bottom-4 left-4 sm:bottom-6 sm:left-6',
  },
  'bottom-right': {
    popup: 'bottom-3 right-3 sm:bottom-6 sm:right-6',
    pill: 'bottom-4 right-4 sm:bottom-6 sm:right-6',
  },
};

function getCornerLabel(corner: SnapCorner, lang: 'id' | 'en'): string {
  const labels: Record<SnapCorner, { id: string; en: string }> = {
    'top-left':     { id: 'Kiri Atas',    en: 'Top Left' },
    'top-right':    { id: 'Kanan Atas',   en: 'Top Right' },
    'bottom-left':  { id: 'Kiri Bawah',   en: 'Bottom Left' },
    'bottom-right': { id: 'Kanan Bawah',  en: 'Bottom Right' },
  };
  return labels[corner][lang];
}

// ══════════════════════════════════════════════════════════
//  Watch Party Floating Popup (Visible in Normal & Fullscreen)
// ══════════════════════════════════════════════════════════
export const WatchPartyModal: React.FC<WatchPartyModalProps> = ({ onClose, mediaInfo, autoJoinCode }) => {
  const { playClick, playHover } = useSound();
  const {
    status, room, members, messages, myId, isHost, errorMsg,
    controlMode, hostTimeSync, unreadCount, isMinimized,
    publicRooms, refreshPublicRooms,
    createParty, joinParty, leaveParty, sendChat, sendSignal,
    setControlMode, sendReaction, kickMember,
    clearError, resetUnreadCount, setIsMinimized,
    inviteLink, roomCode,
  } = useWatchParty();
  const { profile } = useUserProfile();
  const { t, language } = useLanguage();
  const locale = language === 'en' ? 'en-US' : 'id-ID';

  const [tab, setTab] = useState<'lobby' | 'create' | 'join'>(() => {
    if (autoJoinCode) return 'join';
    if (mediaInfo) return 'create';
    return 'lobby';
  });
  const [isPublicRoom, setIsPublicRoom] = useState(true);
  const [lobbySearch, setLobbySearch] = useState('');
  const [lobbyCategory, setLobbyCategory] = useState<'all' | 'movie' | 'series'>('all');
  const [isRefreshingLobby, setIsRefreshingLobby] = useState(false);
  const [myName, setMyName] = useState(() => {
    try {
      const saved = localStorage.getItem('party_display_name');
      if (saved) return saved;
    } catch {
      // ignore
    }
    return profile?.name || '';
  });
  const [joinCode, setJoinCode] = useState(autoJoinCode ?? '');
  const [chatInput, setChatInput] = useState('');
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [isSyncingWithHost, setIsSyncingWithHost] = useState(false);
  const [membersExpanded, setMembersExpanded] = useState(false);

  // Drag and snap corner state
  const popupRef = useRef<HTMLDivElement>(null);
  const [snapCorner, setSnapCorner] = useState<SnapCorner>(() => {
    try {
      return (localStorage.getItem('party_popup_corner') as SnapCorner) || 'bottom-right';
    } catch {
      return 'bottom-right';
    }
  });
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredSnapCorner, setHoveredSnapCorner] = useState<SnapCorner | null>(null);
  const dragStartRef = useRef<{ startX: number; startY: number; initLeft: number; initTop: number } | null>(null);

  // Portal mount node tracking: mounts to fullscreenElement when fullscreen is active, else body
  const [mountNode, setMountNode] = useState<Element | null>(() => {
    if (typeof document !== 'undefined') {
      return document.fullscreenElement || document.body;
    }
    return null;
  });

  useEffect(() => {
    const handleFullscreenChange = () => {
      setMountNode(document.fullscreenElement || document.body);
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
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const isConnected = status === 'connected';
  const isLoading = status === 'creating' || status === 'joining';

  // Strictly deduplicated active members list (prevents phantom participants on reconnect)
  const activeMembers = useMemo(() => {
    const seen = new Set<string>();
    return members.filter((m) => {
      if (!m.isActive) return false;
      const key = (m.userId || m.name).trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [members]);

  useEffect(() => {
    if (!isMinimized) {
      resetUnreadCount();
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isMinimized, resetUnreadCount]);

  useEffect(() => {
    if (!inviteLink) { setQrDataUrl(''); return; }
    QRCode.toDataURL(inviteLink, {
      width: 200, margin: 2,
      color: { dark: '#0f0e17', light: '#fffbf0' },
    }).then(setQrDataUrl).catch(console.error);
  }, [inviteLink]);

  const handleNameChange = (v: string) => {
    setMyName(v);
    localStorage.setItem('party_display_name', v);
  };

  const handleCreate = async () => {
    if (!myName.trim() || !mediaInfo) return;
    playClick();
    await createParty(myName.trim(), mediaInfo, profile?.id, isPublicRoom);
  };

  const handleJoin = async () => {
    if (!myName.trim() || !joinCode.trim()) return;
    playClick();
    await joinParty(joinCode.trim().toUpperCase(), myName.trim(), profile?.id);
  };

  const handleJoinFromLobby = async (roomItem: (typeof publicRooms)[0]) => {
    playClick();
    const nameToUse = myName.trim() || profile?.name || (language === 'en' ? 'Viewer' : 'Penonton');
    if (!myName.trim()) {
      handleNameChange(nameToUse);
    }
    setJoinCode(roomItem.roomCode);
    await joinParty(roomItem.roomCode, nameToUse, profile?.id);
  };

  const handleRefreshLobby = async () => {
    playClick();
    setIsRefreshingLobby(true);
    await refreshPublicRooms();
    setTimeout(() => setIsRefreshingLobby(false), 500);
  };

  const handleCopy = async (type: 'link' | 'code') => {
    playClick();
    await navigator.clipboard.writeText(type === 'link' ? inviteLink : roomCode);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const lastSendTimeRef = useRef<number>(0);
  const [chatWarning, setChatWarning] = useState<string | null>(null);

  const handleSendChat = () => {
    const text = chatInput.trim();
    if (!text) return;

    // Rate limiting / Anti-spam check
    const now = Date.now();
    if (now - lastSendTimeRef.current < 500) {
      setChatWarning(t('partyFastChatWarning'));
      setTimeout(() => setChatWarning(null), 2000);
      return;
    }
    lastSendTimeRef.current = now;

    playClick();
    sendChat(text.slice(0, 500));
    setChatInput('');
    setChatWarning(null);
    chatInputRef.current?.focus();
  };

  const [isPlayingLocally, setIsPlayingLocally] = useState<boolean>(() => {
    const videoEl = document.querySelector('video') as HTMLVideoElement | null;
    return videoEl ? !videoEl.paused : false;
  });

  useEffect(() => {
    const handleSyncState = () => {
      const videoEl = document.querySelector('video') as HTMLVideoElement | null;
      if (videoEl) setIsPlayingLocally(!videoEl.paused);
    };

    const handleCustomControl = (e: Event) => {
      const custom = e as CustomEvent<{ action: 'play' | 'pause' | 'toggle' }>;
      if (custom.detail?.action === 'play') setIsPlayingLocally(true);
      if (custom.detail?.action === 'pause') setIsPlayingLocally(false);
      if (custom.detail?.action === 'toggle') setIsPlayingLocally((prev) => !prev);
    };

    window.addEventListener('stream:playback-control', handleCustomControl);
    window.addEventListener('play', handleSyncState, true);
    window.addEventListener('pause', handleSyncState, true);

    return () => {
      window.removeEventListener('stream:playback-control', handleCustomControl);
      window.removeEventListener('play', handleSyncState, true);
      window.removeEventListener('pause', handleSyncState, true);
    };
  }, []);

  const [signalFeedback, setSignalFeedback] = useState<string | null>(null);

  const REACTION_EMOJIS = ['😂', '❤️', '🔥', '😱', '👏', '🍿', '🎉', '🤯'];

  const handleSignal = (type: 'play' | 'pause') => {
    playClick();

    // Check control permission
    if (controlMode === 'host_only' && !isHost) {
      setSignalFeedback(t('partyHostOnlyNotice'));
      setTimeout(() => setSignalFeedback(null), 3000);
      return;
    }

    let currTime: number | undefined = undefined;
    const videoEl = document.querySelector('video') as HTMLVideoElement | null;
    if (videoEl) {
      if (typeof videoEl.currentTime === 'number' && videoEl.currentTime > 0) {
        currTime = videoEl.currentTime;
      }
      if (type === 'play') {
        videoEl.play().catch(() => {});
        setIsPlayingLocally(true);
      } else {
        videoEl.pause();
        setIsPlayingLocally(false);
      }
    } else {
      setIsPlayingLocally(type === 'play');
    }

    // Broadcast custom event so CinematicPlayer synchronously reacts locally
    window.dispatchEvent(new CustomEvent('stream:playback-control', { detail: { action: type } }));

    // Localized alert text for the room announcement
    const displayName = myName.trim() || t('partyYou');
    const alertText =
      language === 'en'
        ? (type === 'pause'
            ? `⚠️ ${displayName} requested to PAUSE the movie/series being watched together`
            : `▶️ ${displayName} requested to PLAY the movie/series being watched together`)
        : (type === 'pause'
            ? `⚠️ ${displayName} meminta MENJEDA film/series yang sedang ditonton bersama`
            : `▶️ ${displayName} meminta MEMUTAR film/series yang sedang ditonton bersama`);

    // Send remote signal via watchPartyService
    const sent = sendSignal({ type, currentTime: currTime, timestamp: Date.now() }, alertText);
    if (!sent) {
      setSignalFeedback(t('partyHostOnlyNotice'));
      setTimeout(() => setSignalFeedback(null), 3000);
      return;
    }

    // Provide instant feedback badge for sender
    setSignalFeedback(type === 'pause' ? t('partyPauseSent') : t('partyPlaySent'));
    setTimeout(() => setSignalFeedback(null), 3000);
  };

  const handleSyncWithHost = () => {
    playClick();
    setIsSyncingWithHost(true);

    if (hostTimeSync && typeof hostTimeSync.currentTime === 'number') {
      const targetTime = hostTimeSync.currentTime;
      const targetPlaying = hostTimeSync.isPlaying;

      const videoEl = document.querySelector('video') as HTMLVideoElement | null;
      if (videoEl) {
        videoEl.currentTime = targetTime;
        if (targetPlaying) {
          videoEl.play().catch(() => {});
          setIsPlayingLocally(true);
        } else {
          videoEl.pause();
          setIsPlayingLocally(false);
        }
      }

      // Also send postMessage seek to iframe embed player
      const iframe = document.querySelector('iframe') as HTMLIFrameElement | null;
      if (iframe?.contentWindow) {
        try {
          iframe.contentWindow.postMessage({ type: 'seek', time: targetTime }, '*');
          iframe.contentWindow.postMessage(JSON.stringify({ type: 'seek', time: targetTime }), '*');
          if (targetPlaying) {
            iframe.contentWindow.postMessage({ type: 'play' }, '*');
            iframe.contentWindow.postMessage(JSON.stringify({ type: 'play' }), '*');
          } else {
            iframe.contentWindow.postMessage({ type: 'pause' }, '*');
            iframe.contentWindow.postMessage(JSON.stringify({ type: 'pause' }), '*');
          }
        } catch {}
      }

      setSignalFeedback(t('partySyncSuccess'));
      setTimeout(() => setSignalFeedback(null), 3000);
    } else {
      setSignalFeedback(t('partyAlreadySynced'));
      setTimeout(() => setSignalFeedback(null), 2500);
    }

    setTimeout(() => setIsSyncingWithHost(false), 700);
  };

  const handleSendReaction = (emoji: string) => {
    playClick();
    sendReaction(emoji);
  };

  const handleKickMember = (memberId: string, memberName: string) => {
    playClick();
    if (window.confirm(`${t('partyKickConfirm')}\n\n${memberName}`)) {
      kickMember(memberId);
    }
  };

  const handleShare = async (platform: 'whatsapp' | 'telegram' | 'native') => {
    playClick();
    const mediaTitle = room?.mediaInfo?.mediaTitle || 'Film/Series';
    const epSuffix = room?.mediaInfo?.episodeTitle
      ? ` (${room.mediaInfo.seasonNumber ? `S${room.mediaInfo.seasonNumber}E${room.mediaInfo.episodeNumber || 1}` : ''})`
      : '';
    const shareText = `${t('partyShareText')} "${mediaTitle}${epSuffix}"`;

    if (platform === 'whatsapp') {
      const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\n${inviteLink}`)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else if (platform === 'telegram') {
      const url = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(shareText)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else if (platform === 'native') {
      if (navigator.share) {
        try {
          await navigator.share({
            title: `Watch Party: ${mediaTitle}`,
            text: shareText,
            url: inviteLink,
          });
        } catch {}
      } else {
        handleCopy('link');
      }
    }
    setShowShareMenu(false);
  };

  const handleLeave = () => { playClick(); leaveParty(); };

  const cycleCorner = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    playClick();
    const order: SnapCorner[] = ['bottom-right', 'bottom-left', 'top-left', 'top-right'];
    const nextIdx = (order.indexOf(snapCorner) + 1) % order.length;
    const nextCorner = order[nextIdx];
    setSnapCorner(nextCorner);
    try {
      localStorage.setItem('party_popup_corner', nextCorner);
    } catch {}
  };

  const handleHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('a')) return;

    const popupElem = popupRef.current;
    if (!popupElem) return;

    const rect = popupElem.getBoundingClientRect();
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initLeft: rect.left,
      initTop: rect.top,
    };

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    setIsDragging(true);
    setDragPos({ x: rect.left, y: rect.top });
    setHoveredSnapCorner(snapCorner);
  };

  const handleHeaderPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current || !popupRef.current) return;

    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;

    const popupWidth = popupRef.current.offsetWidth || 350;
    const popupHeight = popupRef.current.offsetHeight || 500;

    const winW = !mountNode || mountNode === document.body ? window.innerWidth : mountNode.clientWidth;
    const winH = !mountNode || mountNode === document.body ? window.innerHeight : mountNode.clientHeight;

    const rawX = dragStartRef.current.initLeft + deltaX;
    const rawY = dragStartRef.current.initTop + deltaY;

    // Clamping to screen boundaries
    const clampedX = Math.max(8, Math.min(rawX, winW - popupWidth - 8));
    const clampedY = Math.max(8, Math.min(rawY, winH - popupHeight - 8));

    setDragPos({ x: clampedX, y: clampedY });

    // Calculate nearest corner based on popup center
    const centerX = clampedX + popupWidth / 2;
    const centerY = clampedY + popupHeight / 2;

    const isLeft = centerX < winW / 2;
    const isTop = centerY < winH / 2;

    const candidate: SnapCorner =
      isTop && isLeft ? 'top-left' :
      isTop && !isLeft ? 'top-right' :
      !isTop && isLeft ? 'bottom-left' :
      'bottom-right';

    setHoveredSnapCorner(candidate);
  };

  const handleHeaderPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    setIsDragging(false);
    dragStartRef.current = null;

    const finalCorner = hoveredSnapCorner || snapCorner;
    playClick();
    setSnapCorner(finalCorner);
    try {
      localStorage.setItem('party_popup_corner', finalCorner);
    } catch {}

    setDragPos(null);
    setHoveredSnapCorner(null);
  };

  if (!mountNode) return null;

  // ══════════════════════════════════════════════════════════
  //  MINIMIZED FLOATING BADGE (Corner Pill)
  // ══════════════════════════════════════════════════════════
  if (isMinimized) {
    return createPortal(
      <button
        data-watch-party-modal="true"
        onClick={(e) => {
          e.stopPropagation();
          playClick();
          setIsMinimized(false);
        }}
        onMouseEnter={() => {
          playHover();
          window.dispatchEvent(new CustomEvent('party:interaction', { detail: { active: true } }));
        }}
        onMouseLeave={() => {
          window.dispatchEvent(new CustomEvent('party:interaction', { detail: { active: false } }));
        }}
        className={`fixed ${CORNER_POSITIONS[snapCorner].pill} z-[250] flex items-center gap-2 px-4 py-2.5 rounded-full bg-violet-600/90 hover:bg-violet-600 text-white font-semibold text-xs shadow-2xl border border-violet-400/40 backdrop-blur-xl transition-all hover:scale-105 active:scale-95 cursor-pointer animate-in fade-in zoom-in-95 duration-200`}
        title={`${t('partyOpenChat')} (${getCornerLabel(snapCorner, language as 'id' | 'en')})`}
      >
        <Users className="w-4 h-4 text-violet-200" />
        <span>{t('partyTitle')}</span>
        {isConnected && (
          <span className="flex items-center gap-1 text-[11px] text-violet-200 font-mono">
            • {activeMembers.length}
          </span>
        )}
        {unreadCount > 0 && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold animate-pulse shadow-md">
            <MessageSquare className="w-2.5 h-2.5" />
            {unreadCount}
          </span>
        )}
        <ChevronUp className="w-3.5 h-3.5 opacity-80 ml-0.5" />
      </button>,
      mountNode
    );
  }

  // ══════════════════════════════════════════════════════════
  //  EXPANDED FLOATING POPUP WINDOW
  // ══════════════════════════════════════════════════════════
  const popupContent = (
    <>
      {/* Visual Snap Guides (Visible only while dragging to screen edges) */}
      {isDragging && (
        <div className="fixed inset-0 pointer-events-none z-[240] p-3 sm:p-6 transition-all animate-in fade-in duration-150">
          {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as SnapCorner[]).map((c) => {
            const isTarget = hoveredSnapCorner === c;
            const posClass =
              c === 'top-left' ? 'top-3 left-3 sm:top-6 sm:left-6' :
              c === 'top-right' ? 'top-3 right-3 sm:top-6 sm:right-6' :
              c === 'bottom-left' ? 'bottom-3 left-3 sm:bottom-6 sm:left-6' :
              'bottom-3 right-3 sm:bottom-6 sm:right-6';

            return (
              <div
                key={c}
                className={`
                  absolute ${posClass}
                  w-40 sm:w-56 h-28 sm:h-36 rounded-3xl border-2 border-dashed
                  flex flex-col items-center justify-center gap-2 transition-all duration-200
                  ${isTarget
                    ? 'bg-violet-600/35 border-violet-400 text-white shadow-[0_0_35px_rgba(139,92,246,0.5)] scale-105 backdrop-blur-md ring-2 ring-violet-400/50'
                    : 'bg-black/40 border-white/20 text-slate-400 backdrop-blur-sm opacity-65'
                  }
                `}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isTarget ? 'bg-violet-500 text-white shadow-md' : 'bg-white/10 text-slate-300'}`}>
                  <Move className="w-4 h-4" />
                </div>
                <div className="text-center px-2">
                  <span className={`text-[11px] font-bold block ${isTarget ? 'text-violet-200' : 'text-slate-300'}`}>
                    {isTarget ? `${t('partySnapRelease')} ${getCornerLabel(c, language as 'id' | 'en')}` : getCornerLabel(c, language as 'id' | 'en')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div
        ref={popupRef}
        data-watch-party-modal="true"
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        onMouseEnter={() => {
          window.dispatchEvent(new CustomEvent('party:interaction', { detail: { active: true } }));
        }}
        onMouseLeave={() => {
          window.dispatchEvent(new CustomEvent('party:interaction', { detail: { active: false } }));
        }}
        onFocusCapture={() => {
          window.dispatchEvent(new CustomEvent('party:interaction', { detail: { active: true } }));
        }}
        onBlurCapture={() => {
          window.dispatchEvent(new CustomEvent('party:interaction', { detail: { active: false } }));
        }}
        onMouseMove={() => {
          window.dispatchEvent(new CustomEvent('party:interaction', { detail: { active: true } }));
        }}
        style={
          isDragging && dragPos
            ? {
                position: 'fixed',
                left: `${dragPos.x}px`,
                top: `${dragPos.y}px`,
                bottom: 'auto',
                right: 'auto',
                transition: 'none',
                cursor: 'default',
              }
            : {
                transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                cursor: 'default',
              }
        }
        className={`
          fixed ${!isDragging ? CORNER_POSITIONS[snapCorner].popup : ''} z-[250]
          w-[340px] sm:w-[370px] max-w-[calc(100vw-1.5rem)]
          h-[490px] sm:h-[530px] max-h-[calc(100vh-4.5rem)]
          bg-cinema-950/95 backdrop-blur-2xl
          border ${isDragging ? 'border-violet-400/80 shadow-[0_25px_70px_rgba(139,92,246,0.4)]' : 'border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.85)]'} ring-1 ring-white/10
          rounded-3xl flex flex-col overflow-hidden
          ${!isDragging ? 'animate-in fade-in zoom-in-95 duration-200' : ''} select-none cursor-default
        `}
      >
        {/* ── Popup Header (Interactive Drag Handle & Snap Controls) ────────────── */}
        <div
          data-drag-handle="true"
          onPointerDown={handleHeaderPointerDown}
          onPointerMove={handleHeaderPointerMove}
          onPointerUp={handleHeaderPointerUp}
          onPointerCancel={handleHeaderPointerUp}
          className="flex items-center justify-between px-3.5 py-3 border-b border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] shrink-0 cursor-grab active:cursor-grabbing transition-colors group select-none touch-none"
          title={t('partyDragHint')}
        >
          <div className="flex items-center gap-2 pointer-events-none">
            <GripHorizontal className="w-4 h-4 text-slate-400/70 group-hover:text-violet-300 transition-colors shrink-0" />
            <div className="w-7 h-7 rounded-xl bg-violet-500/20 border border-violet-400/30 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-violet-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display font-semibold text-white text-xs tracking-wide">{t('partyTitle')}</span>
                {isConnected && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                    {activeMembers.length} {t('partyOnline')}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Quick Cycle Corner button */}
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={cycleCorner}
              className="p-1.5 rounded-lg hover:bg-violet-500/20 text-slate-400 hover:text-violet-300 transition-all cursor-pointer"
              title={`${t('partyMoveCorner')} (${getCornerLabel(snapCorner, language as 'id' | 'en')})`}
            >
              <Move className="w-3.5 h-3.5" />
            </button>
            {/* Minimize button */}
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => { playClick(); setIsMinimized(true); }}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
              title={t('partyMinimize')}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            {/* Close button */}
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => { playClick(); onClose(); }}
              className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-all cursor-pointer"
              title={t('partyClose')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      {/* ════════════════════════════════════════════════════
          NOT CONNECTED — Create / Join View
      ═════════════════════════════════════════════════════ */}
      {!isConnected && status !== 'disconnected' && (
        <div className="flex flex-col flex-1 overflow-y-auto min-h-0">
          {/* Tab switcher */}
          <div className="flex gap-1.5 p-3 shrink-0">
            {(['lobby', 'create', 'join'] as const).map((tabKey) => (
              <button
                key={tabKey}
                onClick={() => { playClick(); setTab(tabKey); clearError(); }}
                onMouseEnter={playHover}
                className={`flex-1 py-1.5 px-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  tab === tabKey
                    ? 'bg-violet-500 text-white shadow-md shadow-violet-500/25'
                    : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                {tabKey === 'lobby' && (
                  <>
                    <Globe className="w-3 h-3" />
                    <span>{t('partyLobbyTab')}</span>
                    {publicRooms.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[9px] font-bold">
                        {publicRooms.length}
                      </span>
                    )}
                  </>
                )}
                {tabKey === 'create' && (
                  <>
                    <Plus className="w-3 h-3" />
                    <span>{t('partyCreateTab')}</span>
                  </>
                )}
                {tabKey === 'join' && (
                  <>
                    <LogIn className="w-3 h-3" />
                    <span>{t('partyJoinTab')}</span>
                  </>
                )}
              </button>
            ))}
          </div>

          {/* ── TAB 1: PUBLIC LOBBY ── */}
          {tab === 'lobby' && (
            <div className="px-3.5 pb-4 space-y-2.5 flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Search & Refresh bar */}
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={lobbySearch}
                    onChange={(e) => setLobbySearch(e.target.value)}
                    placeholder={t('partySearchLobby')}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-violet-500/60 transition-all"
                  />
                  {lobbySearch && (
                    <button
                      type="button"
                      onClick={() => setLobbySearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleRefreshLobby}
                  disabled={isRefreshingLobby}
                  className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors shrink-0 cursor-pointer"
                  title="Refresh Lobby"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingLobby ? 'animate-spin text-violet-400' : ''}`} />
                </button>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 text-[10px]">
                {(['all', 'movie', 'series'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => { playClick(); setLobbyCategory(cat); }}
                    className={`px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                      lobbyCategory === cat
                        ? 'bg-violet-600/30 text-violet-300 border-violet-500/50 font-bold'
                        : 'bg-white/[0.03] text-slate-400 border-white/5 hover:text-white'
                    }`}
                  >
                    {cat === 'all' && `${t('partyFilterAll')} (${publicRooms.length})`}
                    {cat === 'movie' && `${t('partyFilterMovies')} (${publicRooms.filter((r) => r.mediaType === 'movie').length})`}
                    {cat === 'series' && `${t('partyFilterSeries')} (${publicRooms.filter((r) => r.mediaType !== 'movie').length})`}
                  </button>
                ))}
              </div>

              {/* Scrollable Room List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 min-h-0 scrollbar-thin scrollbar-thumb-white/10">
                {(() => {
                  const filtered = publicRooms.filter((r) => {
                    const matchSearch =
                      !lobbySearch.trim() ||
                      r.mediaTitle.toLowerCase().includes(lobbySearch.toLowerCase()) ||
                      r.hostName.toLowerCase().includes(lobbySearch.toLowerCase()) ||
                      Boolean(r.episodeTitle && r.episodeTitle.toLowerCase().includes(lobbySearch.toLowerCase()));
                    const matchCat =
                      lobbyCategory === 'all' ||
                      (lobbyCategory === 'movie' && r.mediaType === 'movie') ||
                      (lobbyCategory === 'series' && r.mediaType !== 'movie');
                    return matchSearch && matchCat;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center h-52 text-center p-4 space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center text-violet-400 shadow-inner">
                          <Radio className="w-6 h-6 animate-pulse" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-white">{t('partyNoRoomsTitle')}</p>
                          <p className="text-[11px] text-slate-400 leading-relaxed max-w-[240px]">
                            {t('partyNoRoomsDesc')}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => { playClick(); setTab('create'); }}
                          className="px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all shadow-md shadow-violet-900/30 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{t('partyCreatePublicRoom')}</span>
                        </button>
                      </div>
                    );
                  }

                  return filtered.map((r) => (
                    <div
                      key={r.roomCode}
                      className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 hover:border-violet-500/40 transition-all flex items-center gap-3 group"
                    >
                      {/* Media Poster Thumbnail */}
                      <img
                        src={r.mediaPoster}
                        alt={r.mediaTitle}
                        className="w-10 h-14 object-cover rounded-lg shadow-md shrink-0 bg-cinema-900"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />

                      {/* Info */}
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] px-1 py-0.2 rounded bg-violet-500/20 text-violet-300 font-mono font-bold uppercase">
                            {r.mediaType}
                          </span>
                          <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {r.memberCount} {t('partyViewersCount')}
                          </span>
                        </div>

                        <p className="text-xs font-bold text-white truncate group-hover:text-violet-300 transition-colors">
                          {r.mediaTitle}
                        </p>

                        <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                          <Crown className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                          <span>Host: {r.hostName}</span>
                          {r.episodeTitle && (
                            <>
                              <span>•</span>
                              <span>{r.episodeTitle}</span>
                            </>
                          )}
                        </p>
                      </div>

                      {/* Join Button */}
                      <button
                        type="button"
                        onClick={() => handleJoinFromLobby(r)}
                        className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md shadow-violet-900/40 hover:scale-105 active:scale-95 transition-all shrink-0 flex items-center gap-1 cursor-pointer"
                        title={t('partyJoinLive')}
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span className="hidden xs:inline">{t('partyJoinLive')}</span>
                      </button>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* ── TAB 2 & 3: CREATE / JOIN VIEWS ── */}
          {tab !== 'lobby' && (
            <div className="px-4 pb-4 space-y-3 flex-1 overflow-y-auto">
              {/* Film info strip */}
              {mediaInfo && tab === 'create' && (
                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <img
                    src={mediaInfo.mediaPoster}
                    alt={mediaInfo.mediaTitle}
                    className="w-8 h-11 rounded-lg object-cover shrink-0 shadow-md"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 mb-0.5">
                      {mediaInfo.mediaType === 'movie'
                        ? <Film className="w-2.5 h-2.5 text-slate-500" />
                        : <Tv className="w-2.5 h-2.5 text-slate-500" />}
                      <span className="text-[9px] text-slate-500 uppercase tracking-wider">
                        {mediaInfo.mediaType === 'movie' ? t('partyMovie') : t('partySeries')}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-white truncate leading-tight">{mediaInfo.mediaTitle}</p>
                    {mediaInfo.episodeTitle && (
                      <p className="text-[10px] text-slate-400 truncate">{mediaInfo.episodeTitle}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Display name */}
              <div>
                <label className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block mb-1">{t('partyDisplayName')}</label>
                <input
                  type="text"
                  value={myName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder={t('partyDisplayNamePlaceholder')}
                  maxLength={24}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-violet-500/60 focus:bg-violet-500/5 transition-all"
                />
              </div>

              {/* Join code */}
              {tab === 'join' && (
                <div>
                  <label className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block mb-1">{t('partyRoomCode')}</label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder={t('partyRoomCodePlaceholder')}
                    maxLength={6}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white font-mono text-xs placeholder-slate-500 focus:outline-none focus:border-violet-500/60 transition-all tracking-[0.25em] uppercase"
                  />
                </div>
              )}

              {/* Public Lobby Switch Toggle (Create Tab) */}
              {tab === 'create' && (
                <div
                  onClick={() => setIsPublicRoom(!isPublicRoom)}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-violet-500/40 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    id="party-public-toggle"
                    checked={isPublicRoom}
                    onChange={(e) => setIsPublicRoom(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-violet-500 accent-violet-500 cursor-pointer"
                  />
                  <label htmlFor="party-public-toggle" className="flex-1 text-xs cursor-pointer select-none">
                    <span className="font-semibold text-white flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-violet-400" />
                      {t('partyPublishToggle')}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5 leading-tight">
                      {t('partyPublishHint')}
                    </span>
                  </label>
                </div>
              )}

              {/* Error */}
              {errorMsg && (
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-[11px] text-red-300">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-red-400" />
                  <span>{errorMsg === 'host_left' ? t('partyHostLeft') : errorMsg}</span>
                </div>
              )}

              {/* Action */}
              <button
                onClick={tab === 'create' ? handleCreate : handleJoin}
                disabled={isLoading || !myName.trim() || (tab === 'join' && !joinCode.trim())}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-violet-500 hover:bg-violet-400 text-white transition-all shadow-lg shadow-violet-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t('partyConnecting')}</>
                  : tab === 'create'
                    ? <><Plus className="w-3.5 h-3.5" /> {t('partyCreateTab')}</>
                    : <><LogIn className="w-3.5 h-3.5" /> {t('partyJoinTab')}</>
                }
              </button>

              <p className="text-center text-[10px] text-slate-500">
                {tab === 'create' ? t('partyCreateHint') : t('partyJoinHint')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          CONNECTED — Live Party Room Inside Popup
      ═════════════════════════════════════════════════════ */}
      {isConnected && room && (
        <div className="flex flex-col flex-1 min-h-0">

          {/* ── Invite Row ─────────────────────────────────── */}
          <div className="px-3 py-2 border-b border-white/[0.06] shrink-0 bg-white/[0.01]">
            <div className="flex items-center gap-1.5">
              {/* Room code chip */}
              <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] min-w-0">
                <span className="text-[8px] text-slate-500 font-bold uppercase shrink-0">{t('partyCodeLabel')}</span>
                <span className="font-mono font-bold text-brand-gold tracking-[0.2em] text-xs flex-1 truncate">{roomCode}</span>
                <button
                  onClick={() => handleCopy('code')}
                  className="p-1 text-slate-400 hover:text-white transition-all shrink-0 cursor-pointer"
                  title={t('partyCopyCode')}
                >
                  {copied === 'code' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>

              {/* Link copy */}
              <button
                onClick={() => handleCopy('link')}
                className="p-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:border-violet-500/40 hover:bg-violet-500/10 text-slate-400 hover:text-violet-300 transition-all cursor-pointer"
                title={t('partyCopyLink')}
              >
                {copied === 'link' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Link2 className="w-3.5 h-3.5" />}
              </button>

              {/* Share dropdown */}
              <div className="relative">
                <button
                  onClick={() => { playClick(); setShowShareMenu((p) => !p); }}
                  className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                    showShareMenu ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' : 'bg-white/[0.04] border-white/[0.06] text-slate-400 hover:text-white'
                  }`}
                  title={t('partyShareRoom')}
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>

                {showShareMenu && (
                  <div className="absolute right-0 top-full mt-1.5 w-40 py-1.5 bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl z-50 flex flex-col animate-in fade-in zoom-in-95 duration-150">
                    <button
                      onClick={() => { setShowShareMenu(false); handleShare('whatsapp'); }}
                      className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium text-slate-200 hover:bg-white/[0.08] text-left transition-colors cursor-pointer"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>{t('partyShareWhatsApp')}</span>
                    </button>
                    <button
                      onClick={() => { setShowShareMenu(false); handleShare('telegram'); }}
                      className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium text-slate-200 hover:bg-white/[0.08] text-left transition-colors cursor-pointer"
                    >
                      <span className="w-2 h-2 rounded-full bg-sky-400" />
                      <span>{t('partyShareTelegram')}</span>
                    </button>
                    {typeof navigator !== 'undefined' && 'share' in navigator && (
                      <button
                        onClick={() => { setShowShareMenu(false); handleShare('native'); }}
                        className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium text-slate-200 hover:bg-white/[0.08] text-left transition-colors cursor-pointer border-t border-white/[0.06] mt-0.5 pt-1.5"
                      >
                        <ExternalLink className="w-3 h-3 text-violet-400" />
                        <span>{t('partyMoreOptions')}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* QR toggle */}
              <button
                onClick={() => { playClick(); setShowQr((p) => !p); }}
                className={`p-1.5 rounded-xl border transition-all cursor-pointer ${showQr ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' : 'bg-white/[0.04] border-white/[0.06] text-slate-400 hover:text-white'}`}
                title={t('partyQrCode')}
              >
                <QrCode className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* QR Code view */}
            {showQr && qrDataUrl && (
              <div className="flex flex-col items-center gap-1 pt-2 pb-1 animate-in fade-in duration-200">
                <img src={qrDataUrl} alt="QR" className="w-[120px] h-[120px] rounded-xl border border-white/10 shadow-lg" />
                <p className="text-[9px] text-slate-500">{t('partyScanJoin')}</p>
              </div>
            )}
          </div>

          {/* ── Members bar ────────────────────────────────── */}
          <div className="px-3 py-1.5 border-b border-white/[0.05] shrink-0">
            <button
              onClick={() => { playClick(); setMembersExpanded((p) => !p); }}
              className="w-full flex items-center justify-between text-[10px] text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
            >
              <span className="uppercase tracking-wider font-semibold flex items-center gap-1.5">
                <Users className="w-3 h-3 text-violet-400" /> {activeMembers.length} {t('partyParticipants')}
              </span>
              {membersExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {membersExpanded ? (
              <div className="flex flex-col gap-1.5 mt-2 pb-1 max-h-32 overflow-y-auto pr-1">
                {activeMembers.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.05]">
                    <div className="flex items-center gap-2 min-w-0">
                      <AvatarInitial name={m.name} isHost={m.isHost} isActive={m.isActive} size="sm" />
                      <span className={`text-[11px] truncate max-w-[120px] ${m.id === myId ? 'text-violet-300 font-semibold' : 'text-slate-300'}`}>
                        {m.id === myId ? t('partyYou') : m.name}
                      </span>
                      {m.isHost && (
                        <span className="text-[9px] text-amber-300 bg-amber-400/15 px-1.5 py-0.5 rounded font-bold border border-amber-400/30 flex items-center gap-0.5">
                          <Crown className="w-2 h-2 text-amber-400" /> Host
                        </span>
                      )}
                    </div>

                    {isHost && m.id !== myId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleKickMember(m.id, m.name);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 transition-all cursor-pointer"
                        title={`${t('partyKickMember')}: ${m.name}`}
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 mt-1">
                {activeMembers.slice(0, 8).map((m) => (
                  <AvatarInitial key={m.id} name={m.name} isHost={m.isHost} isActive={m.isActive} size="sm" />
                ))}
                {activeMembers.length > 8 && (
                  <span className="text-[9px] text-slate-500">+{activeMembers.length - 8}</span>
                )}
              </div>
            )}
          </div>

          {/* ── Real-time Playback Sync Controls ────────────── */}
          {isConnected && (
            <div className="px-3 py-2 border-b border-white/[0.05] shrink-0 bg-violet-500/[0.05] space-y-1.5">
              {/* Permission & Mode bar */}
              <div className="flex items-center justify-between gap-1 text-[9.5px]">
                <div className="flex items-center gap-1 text-slate-400">
                  {isHost ? <Crown className="w-3 h-3 text-amber-400" /> : <Users className="w-3 h-3 text-violet-400" />}
                  <span className="font-semibold uppercase tracking-wider">{t('partySignalLabel')}</span>
                </div>

                {isHost ? (
                  <button
                    onClick={() => {
                      playClick();
                      const next = controlMode === 'all' ? 'host_only' : 'all';
                      setControlMode(next);
                    }}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-bold border transition-all cursor-pointer ${
                      controlMode === 'host_only'
                        ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                        : 'bg-white/[0.05] border-white/[0.1] text-slate-300 hover:text-white'
                    }`}
                    title={t('partyControlMode')}
                  >
                    {controlMode === 'host_only' ? (
                      <>
                        <Shield className="w-2.5 h-2.5 text-amber-400" />
                        <span>{t('partyHostOnlyMode')}</span>
                      </>
                    ) : (
                      <>
                        <Users className="w-2.5 h-2.5 text-violet-400" />
                        <span>{t('partyAllMode')}</span>
                      </>
                    )}
                  </button>
                ) : (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                    controlMode === 'host_only' ? 'text-amber-400 bg-amber-400/10' : 'text-slate-400'
                  }`}>
                    {controlMode === 'host_only' ? `👑 ${t('partyHostOnlyMode')}` : `👥 ${t('partyAllMode')}`}
                  </span>
                )}
              </div>

              {/* Action buttons: Play, Pause, Sync with Host */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleSignal('play')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer shadow-sm active:scale-95 ${
                    isPlayingLocally
                      ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/50 shadow-emerald-500/20'
                      : 'bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/25 text-emerald-300'
                  }`}
                  title={t('partyPlaySignal')}
                >
                  <Play className="w-2.5 h-2.5 fill-current" />
                  <span>{t('partyPlay')}</span>
                  {isPlayingLocally && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                </button>

                <button
                  onClick={() => handleSignal('pause')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer shadow-sm active:scale-95 ${
                    !isPlayingLocally
                      ? 'bg-amber-500/30 text-amber-200 border border-amber-400/50 shadow-amber-500/20'
                      : 'bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/25 text-amber-300'
                  }`}
                  title={t('partyPauseSignal')}
                >
                  <Pause className="w-2.5 h-2.5 fill-current" />
                  <span>{t('partyPause')}</span>
                  {!isPlayingLocally && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                </button>

                {!isHost && (
                  <button
                    onClick={handleSyncWithHost}
                    disabled={isSyncingWithHost}
                    className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/40 text-violet-200 transition-all active:scale-95 shadow-sm cursor-pointer disabled:opacity-50"
                    title={t('partySyncWithHost')}
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncingWithHost ? 'animate-spin text-amber-300' : ''}`} />
                    <span className="hidden xs:inline">{t('partySyncWithHost')}</span>
                    <span className="xs:hidden">Sync</span>
                  </button>
                )}
              </div>

              {signalFeedback && (
                <div className="flex items-center justify-center gap-1.5 py-0.5 text-[9px] text-violet-300 font-medium animate-in fade-in duration-150">
                  <Radio className="w-2.5 h-2.5 text-violet-400 animate-pulse shrink-0" />
                  <span>{signalFeedback}</span>
                </div>
              )}
            </div>
          )}

          {/* ── Chat messages ───────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 min-h-0 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 cursor-default">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-28 text-center">
                <p className="text-[10px] text-slate-500">{t('partyEmptyChat')}</p>
              </div>
            )}
            {messages.map((msg) => {
              const isMe = msg.memberId === myId;
              const isSystem = msg.type === 'system';

              if (isSystem) {
                const sys = getLocalizedSystemMessage(msg, language as 'id' | 'en');

                if (sys.type === 'pause') {
                  return (
                    <div key={msg.id} className="flex justify-center my-1">
                      <span className="text-[9.5px] font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/35 px-2.5 py-1 rounded-full shadow-sm text-center max-w-[95%] leading-relaxed flex items-center gap-1.5">
                        <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>{sys.text}</span>
                      </span>
                    </div>
                  );
                }

                if (sys.type === 'play') {
                  return (
                    <div key={msg.id} className="flex justify-center my-1">
                      <span className="text-[9.5px] font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/35 px-2.5 py-1 rounded-full shadow-sm text-center max-w-[95%] leading-relaxed flex items-center gap-1.5">
                        <Play className="w-3 h-3 fill-emerald-400 text-emerald-400 shrink-0" />
                        <span>{sys.text}</span>
                      </span>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className="flex justify-center my-0.5">
                    <span className="text-[9px] text-slate-400 bg-white/[0.04] px-2.5 py-0.5 rounded-full border border-white/[0.05]">{sys.text}</span>
                  </div>
                );
              }

              return (
                <div key={msg.id} className={`flex gap-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  {!isMe && (
                    <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[8px] font-bold text-white shrink-0 mt-0.5">
                      {msg.memberName[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className={`max-w-[80%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                    {!isMe && <span className="text-[8px] text-slate-400 px-1">{msg.memberName}</span>}
                    <div className={`px-2.5 py-1.5 rounded-2xl text-[11px] leading-relaxed break-words ${
                      isMe
                        ? 'bg-violet-500 text-white rounded-tr-sm shadow-sm'
                        : 'bg-white/[0.08] text-slate-200 rounded-tl-sm border border-white/[0.04]'
                    }`}>
                      {msg.text}
                    </div>
                    <span className="text-[7.5px] text-slate-500 px-1">{fmtTime(msg.timestamp, locale)}</span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* ── Quick Emoji Reactions Bar ───────────────────── */}
          <div className="px-3 py-1.5 bg-white/[0.02] border-t border-white/[0.04] flex items-center justify-between gap-1 shrink-0 overflow-x-auto no-scrollbar">
            <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Smile className="w-3 h-3 text-slate-400" />
            </span>
            <div className="flex items-center gap-1 flex-1 justify-around">
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleSendReaction(emoji)}
                  className="p-1 text-sm hover:scale-125 active:scale-95 transition-transform cursor-pointer rounded-lg hover:bg-white/[0.08]"
                  title={`${t('partyReactions')} ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* ── Anti-Spam Warning ────────────────────────────── */}
          {chatWarning && (
            <div className="px-3 py-1 bg-amber-500/15 border-t border-amber-500/30 text-amber-300 text-[10px] flex items-center justify-between animate-in fade-in duration-150 shrink-0">
              <span>{chatWarning}</span>
            </div>
          )}

          {/* ── Chat input ──────────────────────────────────── */}
          <div className="px-2.5 py-2 border-t border-white/[0.06] flex items-center gap-1.5 shrink-0 bg-white/[0.01]">
            <div className="relative flex-1 flex items-center">
              <input
                ref={chatInputRef}
                type="text"
                maxLength={500}
                value={chatInput}
                onChange={(e) => {
                  setChatInput(e.target.value);
                  if (chatWarning) setChatWarning(null);
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') handleSendChat();
                }}
                placeholder={t('partyChatPlaceholder')}
                className="w-full px-3 py-1.5 pr-14 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-all cursor-text"
              />
              {chatInput.length >= 400 && (
                <span className="absolute right-2 text-[9px] text-amber-400/80 font-mono select-none">
                  {chatInput.length}/500
                </span>
              )}
            </div>
            <button
              onClick={handleSendChat}
              disabled={!chatInput.trim()}
              className="p-2 rounded-xl bg-violet-500 hover:bg-violet-400 text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-violet-500/20 shrink-0 cursor-pointer"
              title={t('partyChatSend')}
            >
              <Send className="w-3 h-3" />
            </button>
          </div>

          {/* ── Leave Footer ────────────────────────────────── */}
          <div className="px-2.5 pb-2.5 shrink-0">
            <button
              onClick={handleLeave}
              className="w-full py-1.5 rounded-xl text-[10px] font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/[0.06] hover:bg-rose-500/12 border border-rose-500/15 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <WifiOff className="w-3 h-3" />
              {isHost ? t('partyCloseRoom') : t('partyLeaveRoom')}
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          DISCONNECTED
      ═════════════════════════════════════════════════════ */}
      {status === 'disconnected' && (
        <div className="flex flex-col items-center justify-center flex-1 py-8 px-4 text-center gap-3">
          {errorMsg === 'kicked_by_host' ? (
            <UserMinus className="w-8 h-8 text-rose-500" />
          ) : (
            <WifiOff className="w-7 h-7 text-slate-600" />
          )}
          <div>
            <p className="text-xs font-semibold text-white mb-0.5">
              {errorMsg === 'kicked_by_host' ? t('partyKickedByHost') : t('partyDisconnected')}
            </p>
            <p className="text-[10px] text-slate-500">
              {errorMsg === 'kicked_by_host'
                ? t('partyKickedByHostDesc')
                : errorMsg === 'host_left'
                  ? t('partyHostLeft')
                  : t('partyDisconnectedDesc')}
            </p>
          </div>
          <button
            onClick={() => { leaveParty(); clearError(); }}
            className="px-3 py-1.5 rounded-xl bg-violet-500 text-white text-xs font-semibold hover:bg-violet-400 transition-all cursor-pointer"
          >
            {t('partyBack')}
          </button>
        </div>
      )}
    </div>
  </>
  );

  return createPortal(popupContent, mountNode);
};
