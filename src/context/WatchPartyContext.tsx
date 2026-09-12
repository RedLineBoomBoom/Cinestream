import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { watchPartyService } from '../services/watchParty';
import type {
  PartyRoom,
  PartyMember,
  PartyMessage,
  PartyStatus,
  PartyMediaInfo,
  PlaybackSignal,
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

  // Actions
  createParty: (name: string, mediaInfo: PartyMediaInfo) => Promise<void>;
  joinParty: (roomCode: string, name: string) => Promise<void>;
  leaveParty: () => void;
  sendChat: (text: string) => void;
  sendSignal: (signal: PlaybackSignal, customAlertText?: string) => void;
  clearSignal: () => void;
  clearError: () => void;

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
  const [status, setStatus] = useState<PartyStatus>('idle');
  const [room, setRoom] = useState<PartyRoom | null>(null);
  const [members, setMembers] = useState<PartyMember[]>([]);
  const [messages, setMessages] = useState<PartyMessage[]>([]);
  const [myId, setMyId] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [latestSignal, setLatestSignal] = useState<{ signal: PlaybackSignal; senderName: string; senderId?: string; alertText?: string; id: string } | null>(null);
  const [isPartyOpen, setIsPartyOpen] = useState(false);
  const [autoJoinCode, setAutoJoinCode] = useState('');
  const togglePartyOpen = useCallback(() => setIsPartyOpen((prev) => !prev), []);

  // Keep latest room ref for callbacks
  const roomRef = useRef(room);
  roomRef.current = room;

  // Register PeerJS callbacks once
  useEffect(() => {
    watchPartyService.setCallbacks({
      onRoomCreated: (r) => {
        setRoom({ ...r });
        setMembers(Object.values(r.members));
      },
      onJoined: (r, me) => {
        setRoom({ ...r });
        setMembers(Object.values(r.members));
        setMessages([...r.messages]);
        setMyId(me.id);
        setStatus('connected');
      },
      onMemberJoined: (member) => {
        setMembers((prev) => {
          const exists = prev.find((m) => m.id === member.id);
          if (exists) return prev.map((m) => m.id === member.id ? member : m);
          return [...prev, member];
        });
      },
      onMemberLeft: (memberId) => {
        setMembers((prev) =>
          prev.map((m) => m.id === memberId ? { ...m, isActive: false } : m)
        );
      },
      onMessage: (msg) => {
        setMessages((prev) => {
          if (prev.find((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
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

  const createParty = useCallback(async (name: string, mediaInfo: PartyMediaInfo) => {
    setStatus('creating');
    setErrorMsg('');
    try {
      const r = await watchPartyService.createRoom(name, mediaInfo);
      setMyId(watchPartyService.getMyId());
      setIsHost(true);
      setRoom({ ...r });
      setMembers(Object.values(r.members));
      setMessages([]);
      setStatus('connected');
    } catch (err) {
      setErrorMsg(String(err));
      setStatus('error');
    }
  }, []);

  const joinParty = useCallback(async (roomCode: string, name: string) => {
    setStatus('joining');
    setErrorMsg('');
    try {
      await watchPartyService.joinRoom(roomCode, name);
      setMyId(watchPartyService.getMyId());
      setIsHost(false);
    } catch (err) {
      setErrorMsg(String(err));
      setStatus('error');
    }
  }, []);

  const leaveParty = useCallback(() => {
    watchPartyService.leave();
    setStatus('idle');
    setRoom(null);
    setMembers([]);
    setMessages([]);
    setMyId('');
    setIsHost(false);
    setErrorMsg('');
    setLatestSignal(null);
  }, []);

  const sendChat = useCallback((text: string) => {
    const msg = watchPartyService.sendChat(text);
    if (msg) {
      setMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    }
  }, []);

  const sendSignal = useCallback((signal: PlaybackSignal, customAlertText?: string) => {
    watchPartyService.sendSignal(signal, customAlertText);
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
  }, [members, myId]);

  const clearSignal = useCallback(() => setLatestSignal(null), []);
  const clearError = useCallback(() => setErrorMsg(''), []);

  // ── Derived ───────────────────────────────────────────────
  const roomCode = room?.roomCode ?? '';
  const inviteLink = roomCode
    ? `${window.location.origin}${window.location.pathname}#/party/${roomCode}`
    : '';

  return (
    <WatchPartyContext.Provider value={{
      status, room, members, messages, myId, isHost, errorMsg, latestSignal,
      createParty, joinParty, leaveParty, sendChat, sendSignal, clearSignal, clearError,
      isPartyOpen, setIsPartyOpen, togglePartyOpen, autoJoinCode, setAutoJoinCode,
      inviteLink, roomCode,
    }}>
      {children}
    </WatchPartyContext.Provider>
  );
};
