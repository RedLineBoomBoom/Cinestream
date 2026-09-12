import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Users, X, Copy, Check, Link2, QrCode, LogIn, Plus,
  Send, Crown, WifiOff, Play, Pause,
  AlertCircle, AlertTriangle, Radio, Loader2, Film, Tv, ChevronDown, ChevronUp, Minus,
  Move, GripHorizontal,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useWatchParty } from '../../context/WatchPartyContext';
import { useSound } from '../../context/SoundContext';
import { useLanguage } from '../../context/LanguageContext';
import type { PartyMediaInfo } from '../../types/party';

interface WatchPartyModalProps {
  onClose: () => void;
  mediaInfo?: PartyMediaInfo;
  autoJoinCode?: string;
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
    createParty, joinParty, leaveParty, sendChat, sendSignal, clearError,
    inviteLink, roomCode,
  } = useWatchParty();
  const { t, language } = useLanguage();
  const locale = language === 'en' ? 'en-US' : 'id-ID';

  const [tab, setTab] = useState<'create' | 'join'>(autoJoinCode ? 'join' : 'create');
  const [myName, setMyName] = useState(() => localStorage.getItem('party_display_name') ?? '');
  const [joinCode, setJoinCode] = useState(autoJoinCode ?? '');
  const [chatInput, setChatInput] = useState('');
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
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
  const activeMembers = members.filter((m) => m.isActive);

  useEffect(() => {
    if (!isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isMinimized]);

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
    await createParty(myName.trim(), mediaInfo);
  };

  const handleJoin = async () => {
    if (!myName.trim() || !joinCode.trim()) return;
    playClick();
    await joinParty(joinCode.trim().toUpperCase(), myName.trim());
  };

  const handleCopy = async (type: 'link' | 'code') => {
    playClick();
    await navigator.clipboard.writeText(type === 'link' ? inviteLink : roomCode);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    playClick();
    sendChat(chatInput.trim());
    setChatInput('');
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

  const handleSignal = (type: 'play' | 'pause') => {
    playClick();
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
    sendSignal({ type, currentTime: currTime, timestamp: Date.now() }, alertText);

    // Provide instant feedback badge for sender
    setSignalFeedback(type === 'pause' ? t('partyPauseSent') : t('partyPlaySent'));
    setTimeout(() => setSignalFeedback(null), 3000);
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
            {(['create', 'join'] as const).map((tabKey) => (
              <button
                key={tabKey}
                onClick={() => { playClick(); setTab(tabKey); clearError(); }}
                onMouseEnter={playHover}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  tab === tabKey
                    ? 'bg-violet-500 text-white shadow-md shadow-violet-500/25'
                    : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                {tabKey === 'create'
                  ? <><Plus className="inline w-3 h-3 mr-1 -mt-0.5" />{t('partyCreateTab')}</>
                  : <><LogIn className="inline w-3 h-3 mr-1 -mt-0.5" />{t('partyJoinTab')}</>
                }
              </button>
            ))}
          </div>

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
                      {mediaInfo.mediaType === 'movie' ? (language === 'en' ? 'Movie' : 'Film') : 'Series'}
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
                <span className="text-[8px] text-slate-500 font-bold uppercase shrink-0">{language === 'en' ? 'CODE' : 'KODE'}</span>
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

              {/* QR toggle */}
              <button
                onClick={() => { playClick(); setShowQr((p) => !p); }}
                className={`p-1.5 rounded-xl border transition-all cursor-pointer ${showQr ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' : 'bg-white/[0.04] border-white/[0.06] text-slate-400 hover:text-white'}`}
                title="QR Code"
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
              <div className="flex flex-wrap gap-1.5 mt-1.5 pb-1 max-h-24 overflow-y-auto">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.05]">
                    <AvatarInitial name={m.name} isHost={m.isHost} isActive={m.isActive} size="sm" />
                    <span className={`text-[10px] truncate max-w-[100px] ${m.id === myId ? 'text-violet-400 font-semibold' : 'text-slate-300'}`}>
                      {m.id === myId ? t('partyYou') : m.name}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 mt-1">
                {members.slice(0, 8).map((m) => (
                  <AvatarInitial key={m.id} name={m.name} isHost={m.isHost} isActive={m.isActive} size="sm" />
                ))}
                {members.length > 8 && (
                  <span className="text-[9px] text-slate-500">+{members.length - 8}</span>
                )}
              </div>
            )}
          </div>

          {/* ── Real-time Playback Sync Controls ────────────── */}
          {isConnected && (
            <div className="px-3 py-1.5 border-b border-white/[0.05] shrink-0 bg-violet-500/[0.05]">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-violet-400 font-semibold uppercase tracking-wider flex items-center gap-1 shrink-0" title={t('partyPlaySignal')}>
                  {isHost ? <Crown className="w-2.5 h-2.5 text-amber-400" /> : <Users className="w-2.5 h-2.5 text-violet-400" />} {t('partySignalLabel')}
                </span>
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
                  <span>Play</span>
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
                  <span>Pause</span>
                  {!isPlayingLocally && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                </button>
              </div>

              {signalFeedback && (
                <div className="flex items-center justify-center gap-1.5 mt-1 py-0.5 text-[9px] text-violet-300 font-medium">
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
                const isPauseAlert = msg.text.includes('⚠️') || msg.text.toLowerCase().includes('menjeda') || msg.text.toLowerCase().includes('pause');
                const isPlayAlert = msg.text.includes('▶️') || msg.text.toLowerCase().includes('memutar') || msg.text.toLowerCase().includes('play');

                if (isPauseAlert) {
                  return (
                    <div key={msg.id} className="flex justify-center my-1">
                      <span className="text-[9.5px] font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/35 px-2.5 py-1 rounded-full shadow-sm text-center max-w-[95%] leading-relaxed flex items-center gap-1.5">
                        <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>{msg.text}</span>
                      </span>
                    </div>
                  );
                }

                if (isPlayAlert) {
                  return (
                    <div key={msg.id} className="flex justify-center my-1">
                      <span className="text-[9.5px] font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/35 px-2.5 py-1 rounded-full shadow-sm text-center max-w-[95%] leading-relaxed flex items-center gap-1.5">
                        <Play className="w-3 h-3 fill-emerald-400 text-emerald-400 shrink-0" />
                        <span>{msg.text}</span>
                      </span>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className="flex justify-center my-0.5">
                    <span className="text-[9px] text-slate-400 bg-white/[0.04] px-2.5 py-0.5 rounded-full border border-white/[0.05]">{msg.text}</span>
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

          {/* ── Chat input ──────────────────────────────────── */}
          <div className="px-2.5 py-2 border-t border-white/[0.06] flex items-center gap-1.5 shrink-0 bg-white/[0.01]">
            <input
              ref={chatInputRef}
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') handleSendChat();
              }}
              placeholder={t('partyChatPlaceholder')}
              className="flex-1 px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-all cursor-text"
            />
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
          <WifiOff className="w-7 h-7 text-slate-600" />
          <div>
            <p className="text-xs font-semibold text-white mb-0.5">{t('partyDisconnected')}</p>
            <p className="text-[10px] text-slate-500">
              {errorMsg === 'host_left' ? t('partyHostLeft') : t('partyDisconnectedDesc')}
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
