import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { watchPartyService } from '../services/watchParty';
import { soundFX } from '../utils/soundEffects';
import {
  subscribeToPublicLobby,
  fetchActivePublicRooms,
  saveActivePartySession,
  getActivePartySession,
  clearActivePartySession,
  removePublicRoom,
} from '../services/partyLobbyService';
import type {
  PartyRoom,
  PublicPartyRoom,
  PartyMember,
  PartyMessage,
  PartyStatus,
  PartyMediaInfo,
  PlaybackSignal,
  ControlMode,
  FloatingReaction,
} from '../types/party';

// ── Context Value ──────────────────────────────────────────
interface WatchPartyContextValue {
  // State
  status: PartyStatus;
  room: PartyRoom | null;
  members: PartyMember[];
  messages: PartyMessage[];
  myId: string;
  isHost: boolean;
  errorMsg: string;
  latestSignal: { signal: PlaybackSignal; senderName: string; senderId?: string; alertText?: string; id: string } | null;
  controlMode: ControlMode;
  hostTimeSync: { currentTime: number; isPlaying: boolean; timestamp: number } | null;
  reactions: FloatingReaction[];
  unreadCount: number;
  isMinimized: boolean;
  publicRooms: PublicPartyRoom[];

  // Actions
  createParty: (name: string, mediaInfo: PartyMediaInfo, userId?: string, isPublic?: boolean) => Promise<void>;
  reclaimPartyHost: (roomCode: string, name: string, mediaInfo: PartyMediaInfo, userId?: string, isPublic?: boolean) => Promise<void>;
  joinParty: (roomCode: string, name: string, userId?: string) => Promise<void>;
  leaveParty: () => void;
  closePartyRoom: (roomCode: string) => Promise<void>;
  refreshPublicRooms: () => Promise<void>;
  sendChat: (text: string) => void;
  sendSignal: (signal: PlaybackSignal, customAlertText?: string) => boolean;
  sendTimeSync: (currentTime: number, isPlaying: boolean) => void;
  changeMedia: (mediaInfo: PartyMediaInfo) => void;
  setControlMode: (mode: ControlMode) => void;
  sendReaction: (emoji: string, xOffset?: number) => void;
  kickMember: (memberId: string) => void;
  clearSignal: () => void;
  clearError: () => void;
  resetUnreadCount: () => void;
  setIsMinimized: (minimized: boolean) => void;

  // Popup open/close state
  isPartyOpen: boolean;
  setIsPartyOpen: (open: boolean) => void;
  togglePartyOpen: () => void;
  autoJoinCode: string;
  setAutoJoinCode: (code: string) => void;

  // Derived helpers
  inviteLink: string;
  roomCode: string;
}

// ── Context ────────────────────────────────────────────────
const WatchPartyContext = createContext<WatchPartyContextValue | undefined>(undefined);

export function useWatchParty() {
  const ctx = useContext(WatchPartyContext);
  if (!ctx) throw new Error('useWatchParty must be used inside WatchPartyProvider');
  return ctx;
}

// ── Provider ───────────────────────────────────────────────
export const WatchPartyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<PartyStatus>('idle');
  const [room, setRoom] = useState<PartyRoom | null>(null);
  const [members, setMembers] = useState<PartyMember[]>([]);
  const [messages, setMessages] = useState<PartyMessage[]>([]);
  const [myId, setMyId] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [latestSignal, setLatestSignal] = useState<{ signal: PlaybackSignal; senderName: string; senderId?: string; alertText?: string; id: string } | null>(null);
  const [isPartyOpen, setIsPartyOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [autoJoinCode, setAutoJoinCode] = useState('');
  const [controlMode, setControlModeState] = useState<ControlMode>('all');
  const [hostTimeSync, setHostTimeSync] = useState<{ currentTime: number; isPlaying: boolean; timestamp: number } | null>(null);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [publicRooms, setPublicRooms] = useState<PublicPartyRoom[]>([]);

  const isPartyOpenRef = useRef(isPartyOpen);
  isPartyOpenRef.current = isPartyOpen;
  const isMinimizedRef = useRef(isMinimized);
  isMinimizedRef.current = isMinimized;

  const togglePartyOpen = useCallback(() => setIsPartyOpen((prev) => !prev), []);

  const resetUnreadCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  // Subscribe to real-time public lobby updates
  useEffect(() => {
    const unsub = subscribeToPublicLobby((rooms) => {
      setPublicRooms(rooms);
    });
    return () => {
      unsub();
    };
  }, []);

  // Register PeerJS callbacks once
  useEffect(() => {
    watchPartyService.setCallbacks({
      onRoomCreated: (r) => {
        setRoom({ ...r });
        setMembers(Object.values(r.members).filter((m) => m.isActive));
        setControlModeState(r.controlMode || 'all');
      },
      onJoined: (r, me) => {
        setRoom({ ...r });
        setMembers(Object.values(r.members).filter((m) => m.isActive));
        setMessages([...r.messages]);
        setMyId(me.id);
        setControlModeState(r.controlMode || 'all');
        setStatus('connected');
        soundFX.join();
      },
      onMemberJoined: (member) => {
        setMembers((prev) => {
          const filtered = prev.filter(
            (m) =>
              m.id !== member.id &&
              !(
                (member.userId && m.userId && member.userId === m.userId) ||
                (m.name.trim().toLowerCase() === member.name.trim().toLowerCase() && !m.isHost)
              )
          );
          return [...filtered, member];
        });
        soundFX.join();
      },
      onMemberLeft: (memberId) => {
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
        soundFX.leave();
      },
      onMessage: (msg) => {
        setMessages((prev) => {
          if (prev.find((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });

        // Increment unread count if popup is closed or minimized
        if (!isPartyOpenRef.current || isMinimizedRef.current) {
          setUnreadCount((c) => c + 1);
        }

        if (msg.memberId !== watchPartyService.getMyId()) {
          soundFX.pop();
        }
      },
      onSignal: (signal, senderName, senderId, alertText) => {
        setLatestSignal({
          signal,
          senderName,
          senderId,
          alertText,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        });
      },
      onSyncTime: (currentTime, isPlaying, timestamp) => {
        setHostTimeSync({ currentTime, isPlaying, timestamp });
      },
      onMediaChange: (mediaInfo) => {
        setRoom((prev) => prev ? { ...prev, mediaInfo } : null);
        soundFX.success();
      },
      onControlModeChange: (mode) => {
        setControlModeState(mode);
        setRoom((prev) => prev ? { ...prev, controlMode: mode } : null);
      },
      onReaction: (reaction) => {
        setReactions((prev) => [...prev.slice(-20), reaction]);
        soundFX.pop();
        // Auto-prune reaction after 3.8s
        setTimeout(() => {
          setReactions((prev) => prev.filter((r) => r.id !== reaction.id));
        }, 3800);
      },
      onKicked: () => {
        setStatus('disconnected');
        setErrorMsg('kicked_by_host');
      },
      onHostLeft: () => {
        setStatus('disconnected');
        setErrorMsg('host_left');
      },
      onError: (err) => {
        setErrorMsg(err);
        setStatus('error');
      },
    });

    return () => {
      watchPartyService.setCallbacks({});
    };
  }, []);

  // ── Actions ───────────────────────────────────────────────

  const refreshPublicRooms = useCallback(async () => {
    try {
      const rooms = await fetchActivePublicRooms();
      setPublicRooms(rooms);
    } catch {
      // Ignore
    }
  }, []);

  const createParty = useCallback(async (name: string, mediaInfo: PartyMediaInfo, userId?: string, isPublic: boolean = true) => {
    const effectiveUserId = userId || user?.id;
    if (!user && !effectiveUserId) {
      setErrorMsg('Login diperlukan untuk membuat room Watch Party.');
      setStatus('error');
      return;
    }
    setStatus('creating');
    setErrorMsg('');
    try {
      const r = await watchPartyService.createRoom(name, mediaInfo, effectiveUserId, isPublic);
      setMyId(watchPartyService.getMyId());
      setIsHost(true);
      setRoom({ ...r });
      setMembers(Object.values(r.members).filter((m) => m.isActive));
      setMessages([]);
      setControlModeState('all');
      setStatus('connected');
      soundFX.success();

      saveActivePartySession({
        roomCode: r.roomCode,
        isHost: true,
        myName: name,
        userId: effectiveUserId,
        mediaInfo,
        isPublic,
        createdAt: Date.now(),
        lastActive: Date.now(),
      });
    } catch (err) {
      setErrorMsg(String(err));
      setStatus('error');
    }
  }, [user]);

  const reclaimPartyHost = useCallback(async (
    roomCodeToReclaim: string,
    name: string,
    mediaInfo: PartyMediaInfo,
    userId?: string,
    isPublic: boolean = true
  ) => {
    const effectiveUserId = userId || user?.id;
    if (!user && !effectiveUserId) {
      setErrorMsg('Login diperlukan untuk mengelola room Watch Party.');
      setStatus('error');
      return;
    }
    setStatus('reconnecting');
    setErrorMsg('');
    try {
      const r = await watchPartyService.reclaimRoom(roomCodeToReclaim, name, mediaInfo, effectiveUserId, isPublic);
      setMyId(watchPartyService.getMyId());
      setIsHost(true);
      setRoom({ ...r });
      setMembers(Object.values(r.members).filter((m) => m.isActive));
      setMessages([]);
      setControlModeState('all');
      setStatus('connected');
      setIsPartyOpen(true);
      soundFX.success();

      saveActivePartySession({
        roomCode: r.roomCode,
        isHost: true,
        myName: name,
        userId: effectiveUserId,
        mediaInfo,
        isPublic,
        createdAt: Date.now(),
        lastActive: Date.now(),
      });
    } catch (err) {
      setErrorMsg(String(err));
      setStatus('error');
    }
  }, [user]);

  const joinParty = useCallback(async (roomCode: string, name: string, userId?: string) => {
    const effectiveUserId = userId || user?.id;
    if (!user && !effectiveUserId) {
      setErrorMsg('Login diperlukan untuk bergabung ke room Watch Party.');
      setStatus('error');
      return;
    }
    setStatus('joining');
    setErrorMsg('');
    try {
      const r = await watchPartyService.joinRoom(roomCode, name, effectiveUserId);
      setMyId(watchPartyService.getMyId());
      setIsHost(false);
      setRoom({ ...r });
      setMembers(Object.values(r.members).filter((m) => m.isActive));
      setMessages([...r.messages]);
      setControlModeState(r.controlMode || 'all');
      setStatus('connected');
      setIsPartyOpen(true);
      soundFX.join();

      saveActivePartySession({
        roomCode: r.roomCode,
        isHost: false,
        myName: name,
        userId: effectiveUserId,
        mediaInfo: r.mediaInfo,
        isPublic: r.isPublic ?? true,
        createdAt: r.createdAt || Date.now(),
        lastActive: Date.now(),
      });
    } catch (err) {
      setErrorMsg(String(err));
      setStatus('error');
    }
  }, [user]);

  const leaveParty = useCallback(() => {
    clearActivePartySession();
    watchPartyService.leave();
    setStatus('idle');
    setRoom(null);
    setMembers([]);
    setMessages([]);
    setMyId('');
    setIsHost(false);
    setErrorMsg('');
    setLatestSignal(null);
    setHostTimeSync(null);
    setReactions([]);
    setUnreadCount(0);
  }, []);

  const closePartyRoom = useCallback(async (roomCodeToClose: string) => {
    try {
      await removePublicRoom(roomCodeToClose);
      const activeSession = getActivePartySession();
      if (activeSession && activeSession.roomCode.toUpperCase() === roomCodeToClose.toUpperCase()) {
        clearActivePartySession();
        watchPartyService.leave();
        setStatus('idle');
        setRoom(null);
        setMembers([]);
        setMessages([]);
        setMyId('');
        setIsHost(false);
      }
      await refreshPublicRooms();
    } catch (err) {
      console.warn('Gagal menutup room party:', err);
    }
  }, [refreshPublicRooms]);

  const sendChat = useCallback((text: string) => {
    const msg = watchPartyService.sendChat(text);
    if (msg) {
      setMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      soundFX.pop();
    }
  }, []);

  const sendSignal = useCallback((signal: PlaybackSignal, customAlertText?: string): boolean => {
    const sent = watchPartyService.sendSignal(signal, customAlertText);
    if (!sent) return false;
    // Also apply locally — sender gets confirmation feedback
    const me = members.find((m) => m.id === myId);
    const senderName = me?.name ?? 'Kamu';
    setLatestSignal({
      signal,
      senderName,
      senderId: myId,
      alertText: customAlertText,
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    });
    return true;
  }, [members, myId]);

  const sendTimeSync = useCallback((currentTime: number, isPlaying: boolean) => {
    watchPartyService.sendTimeSync(currentTime, isPlaying);
  }, []);

  const changeMedia = useCallback((mediaInfo: PartyMediaInfo) => {
    watchPartyService.changeMedia(mediaInfo);
    setRoom((prev) => prev ? { ...prev, mediaInfo } : null);
  }, []);

  const setControlMode = useCallback((mode: ControlMode) => {
    watchPartyService.setControlMode(mode);
    setControlModeState(mode);
    setRoom((prev) => prev ? { ...prev, controlMode: mode } : null);
  }, []);

  const sendReaction = useCallback((emoji: string, xOffset?: number) => {
    const reaction = watchPartyService.sendReaction(emoji, xOffset);
    if (reaction) {
      setReactions((prev) => [...prev.slice(-20), reaction]);
      soundFX.pop();
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== reaction.id));
      }, 3800);
    }
  }, []);

  const kickMember = useCallback((memberId: string) => {
    watchPartyService.kickMember(memberId);
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
  }, []);

  const clearSignal = useCallback(() => setLatestSignal(null), []);
  const clearError = useCallback(() => setErrorMsg(''), []);

  // Auto-reconnect to active session on initial mount
  const hasAttemptedRestoreRef = useRef(false);
  useEffect(() => {
    if (hasAttemptedRestoreRef.current) return;
    hasAttemptedRestoreRef.current = true;

    const session = getActivePartySession();
    if (!session || !session.roomCode) return;

    const timer = setTimeout(async () => {
      try {
        if (session.isHost) {
          await reclaimPartyHost(
            session.roomCode,
            session.myName,
            session.mediaInfo,
            session.userId,
            session.isPublic
          );
        } else {
          await joinParty(session.roomCode, session.myName, session.userId);
        }
      } catch (err) {
        console.warn('Gagal memulihkan sesi party otomatis:', err);
        clearActivePartySession();
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [reclaimPartyHost, joinParty]);

  // ── Derived ───────────────────────────────────────────────
  const roomCode = room?.roomCode ?? '';
  const inviteLink = roomCode
    ? `${window.location.origin}/party/${roomCode}`
    : '';

  return (
    <WatchPartyContext.Provider value={{
      status, room, members, messages, myId, isHost, errorMsg, latestSignal,
      controlMode, hostTimeSync, reactions, unreadCount, isMinimized,
      publicRooms, refreshPublicRooms,
      createParty, reclaimPartyHost, joinParty, leaveParty, closePartyRoom,
      sendChat, sendSignal, sendTimeSync,
      changeMedia, setControlMode, sendReaction, kickMember,
      clearSignal, clearError, resetUnreadCount, setIsMinimized,
      isPartyOpen, setIsPartyOpen, togglePartyOpen, autoJoinCode, setAutoJoinCode,
      inviteLink, roomCode,
    }}>
      {children}
    </WatchPartyContext.Provider>
  );
};
