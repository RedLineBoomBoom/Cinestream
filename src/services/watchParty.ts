import Peer, { type DataConnection } from 'peerjs';
import type {
  PartyMember,
  PartyMessage,
  PartyRoom,
  PartyMediaInfo,
  PlaybackSignal,
  PeerMessage,
  ControlMode,
  FloatingReaction,
} from '../types/party';

// ── Helpers ────────────────────────────────────────────────
function nanoid(len = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function msgId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ── Callbacks ──────────────────────────────────────────────
export interface WatchPartyCallbacks {
  onRoomCreated?: (room: PartyRoom) => void;
  onJoined?: (room: PartyRoom, myMember: PartyMember) => void;
  onMemberJoined?: (member: PartyMember) => void;
  onMemberLeft?: (memberId: string, memberName: string) => void;
  onMessage?: (message: PartyMessage) => void;
  onSignal?: (signal: PlaybackSignal, senderName: string, senderId?: string, alertText?: string) => void;
  onSyncTime?: (currentTime: number, isPlaying: boolean, timestamp: number) => void;
  onMediaChange?: (mediaInfo: PartyMediaInfo) => void;
  onControlModeChange?: (mode: ControlMode) => void;
  onReaction?: (reaction: FloatingReaction) => void;
  onKicked?: () => void;
  onHostLeft?: () => void;
  onError?: (err: string) => void;
}

// ── WatchPartyService ──────────────────────────────────────
export class WatchPartyService {
  private peer: Peer | null = null;
  private myId = '';
  private myName = '';
  private userId = '';
  private isHost = false;
  private room: PartyRoom | null = null;
  // host only: map of connected guest connections
  private guestConns: Map<string, DataConnection> = new Map();
  // guest only: connection to host
  private hostConn: DataConnection | null = null;
  private cbs: WatchPartyCallbacks = {};
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  // ── Public API ────────────────────────────────────────────

  setCallbacks(cbs: WatchPartyCallbacks) {
    this.cbs = cbs;
  }

  /** Host: create a new room */
  createRoom(myName: string, mediaInfo: PartyMediaInfo, userId?: string): Promise<PartyRoom> {
    return new Promise((resolve, reject) => {
      const roomCode = nanoid(6);
      this.myName = myName;
      this.userId = userId || '';
      this.isHost = true;

      // Peer ID = room code prefixed so it is globally unique
      this.peer = new Peer(`CINESTREAM-${roomCode}`, {
        // PeerJS default cloud server — free, no key needed
        host: '0.peerjs.com',
        port: 443,
        path: '/',
        secure: true,
        debug: 0,
      });

      this.peer.on('open', (id) => {
        this.myId = id;
        const me: PartyMember = {
          id,
          name: myName,
          isHost: true,
          joinedAt: Date.now(),
          isActive: true,
          userId: this.userId || undefined,
        };
        this.room = {
          roomCode,
          hostId: id,
          members: { [id]: me },
          messages: [],
          mediaInfo,
          createdAt: Date.now(),
          controlMode: 'all',
        };
        this._startHostHeartbeat();
        this.cbs.onRoomCreated?.(this.room);
        resolve(this.room);
      });

      this.peer.on('connection', (conn) => this._onGuestConnect(conn));

      this.peer.on('error', (err) => {
        const msg = String(err.message ?? err);
        this.cbs.onError?.(msg.includes('ID taken') ? 'Kode room sudah dipakai, coba lagi.' : msg);
        reject(msg);
      });
    });
  }

  /** Guest: join an existing room */
  joinRoom(roomCode: string, myName: string, userId?: string): Promise<PartyRoom> {
    return new Promise((resolve, reject) => {
      this.myName = myName;
      this.userId = userId || '';
      this.isHost = false;

      this.peer = new Peer({
        host: '0.peerjs.com',
        port: 443,
        path: '/',
        secure: true,
        debug: 0,
      });

      this.peer.on('open', (id) => {
        this.myId = id;
        const hostPeerId = `CINESTREAM-${roomCode.toUpperCase()}`;
        const conn = this.peer!.connect(hostPeerId, { reliable: true });
        this.hostConn = conn;

        conn.on('open', () => {
          // Send join request
          this._sendToHost({
            event: 'member_joined',
            member: {
              id,
              name: myName,
              isHost: false,
              joinedAt: Date.now(),
              isActive: true,
              userId: this.userId || undefined,
            },
          });
        });

        conn.on('data', (raw) => {
          const msg = raw as PeerMessage;
          if (msg.event === 'welcome') {
            this.room = msg.room;
            const me = this.room.members[id];
            resolve(this.room);
            this.cbs.onJoined?.(this.room, me);
          } else {
            this._handleIncoming(msg);
          }
        });

        conn.on('close', () => {
          this.cbs.onHostLeft?.();
        });

        conn.on('error', (err) => {
          reject(String(err));
          this.cbs.onError?.(String(err));
        });
      });

      this.peer.on('error', (err) => {
        const msg = String(err.message ?? err);
        const friendly = msg.includes('not found') || msg.includes('Could not connect')
          ? 'Kode room tidak ditemukan. Pastikan host masih aktif.'
          : msg;
        reject(friendly);
        this.cbs.onError?.(friendly);
      });

      setTimeout(() => {
        if (!this.room) {
          reject('Timeout: Room tidak ditemukan atau host tidak aktif.');
          this.cbs.onError?.('Timeout: Room tidak ditemukan atau host tidak aktif.');
        }
      }, 15000);
    });
  }

  /** Send a chat message */
  sendChat(text: string) {
    if (!this.room) return;
    const cleanText = String(text || '').trim().slice(0, 500);
    if (!cleanText) return;

    const message: PartyMessage = {
      id: msgId(),
      memberId: this.myId,
      memberName: (this.myName || 'User').trim().slice(0, 50),
      text: cleanText,
      timestamp: Date.now(),
      type: 'chat',
    };
    this.room.messages.push(message);
    const payload: PeerMessage = { event: 'chat', message };
    if (this.isHost) {
      this._broadcast(payload);
    } else {
      this._sendToHost(payload);
    }
    // Return message so context can display immediately
    return message;
  }

  /** Broadcast a playback signal (Play / Pause / Seek) and post a warning notification to all room participants */
  sendSignal(signal: PlaybackSignal, customAlertText?: string): boolean {
    if (!this.room) return false;

    // In host_only control mode, guests cannot send play/pause signals
    if (this.room.controlMode === 'host_only' && !this.isHost) {
      return false;
    }

    const defaultAlertText =
      signal.type === 'pause'
        ? `⚠️ ${this.myName} meminta MENJEDA film/series yang sedang ditonton bersama`
        : signal.type === 'play'
        ? `▶️ ${this.myName} meminta MEMUTAR film/series yang sedang ditonton bersama`
        : `⏩ ${this.myName} mengubah posisi tayangan`;

    const alertText = customAlertText || defaultAlertText;

    const payload: PeerMessage = {
      event: 'signal',
      signal,
      senderName: this.myName,
      senderId: this.myId,
      alertText,
    };

    if (this.isHost) {
      this._broadcast(payload);
      // Publish system message into chat transcript for all members
      const sysMsg: PartyMessage = {
        id: msgId(),
        memberId: 'system',
        memberName: 'System',
        text: alertText,
        timestamp: Date.now(),
        type: 'system',
      };
      this.room.messages.push(sysMsg);
      this._broadcast({ event: 'chat', message: sysMsg });
      this.cbs.onMessage?.(sysMsg);
    } else {
      this._sendToHost(payload);
    }

    // Also fire locally so sender UI gets instant feedback
    this.cbs.onSignal?.(signal, this.myName, this.myId, alertText);
    return true;
  }

  /** Host: Broadcast playback time heartbeat so guests stay in sync */
  sendTimeSync(currentTime: number, isPlaying: boolean) {
    if (!this.room || !this.isHost) return;
    this._broadcast({
      event: 'sync_time',
      currentTime,
      isPlaying,
      timestamp: Date.now(),
    });
  }

  /** Host: Change movie or TV episode being watched by the whole room */
  changeMedia(mediaInfo: PartyMediaInfo) {
    if (!this.room || !this.isHost) return;
    this.room.mediaInfo = mediaInfo;
    const payload: PeerMessage = { event: 'media_change', mediaInfo };
    this._broadcast(payload);

    const epSuffix = mediaInfo.episodeTitle
      ? ` - ${mediaInfo.seasonNumber ? `S${mediaInfo.seasonNumber}E${mediaInfo.episodeNumber || 1} ` : ''}${mediaInfo.episodeTitle}`
      : '';
    const sysMsg: PartyMessage = {
      id: msgId(),
      memberId: 'system',
      memberName: 'System',
      text: `🎬 Host mengalihkan tayangan ke: ${mediaInfo.mediaTitle}${epSuffix}`,
      timestamp: Date.now(),
      type: 'system',
    };
    this.room.messages.push(sysMsg);
    this._broadcast({ event: 'chat', message: sysMsg });
    this.cbs.onMessage?.(sysMsg);
    this.cbs.onMediaChange?.(mediaInfo);
  }

  /** Host: Set room playback control permission (Host only vs Everyone) */
  setControlMode(mode: ControlMode) {
    if (!this.room || !this.isHost) return;
    this.room.controlMode = mode;
    this._broadcast({ event: 'control_mode', mode });

    const modeText =
      mode === 'host_only'
        ? '👑 Mode Kontrol: Hanya Host yang dapat mengontrol pemutaran video'
        : '👥 Mode Kontrol: Semua anggota bebas mengontrol pemutaran video';

    const sysMsg: PartyMessage = {
      id: msgId(),
      memberId: 'system',
      memberName: 'System',
      text: modeText,
      timestamp: Date.now(),
      type: 'system',
    };
    this.room.messages.push(sysMsg);
    this._broadcast({ event: 'chat', message: sysMsg });
    this.cbs.onMessage?.(sysMsg);
    this.cbs.onControlModeChange?.(mode);
  }

  /** Send a floating emoji reaction to all room members */
  sendReaction(emoji: string, xOffset?: number) {
    if (!this.room) return;
    const reaction: FloatingReaction = {
      id: msgId(),
      emoji,
      senderName: this.myName,
      timestamp: Date.now(),
      xOffset: xOffset ?? (Math.random() * 70 + 15),
    };
    const payload: PeerMessage = {
      event: 'reaction',
      emoji,
      senderName: this.myName,
      id: reaction.id,
      xOffset: reaction.xOffset,
    };
    if (this.isHost) {
      this._broadcast(payload);
    } else {
      this._sendToHost(payload);
    }
    this.cbs.onReaction?.(reaction);
    return reaction;
  }

  /** Host: Kick a member from the room */
  kickMember(memberId: string) {
    if (!this.room || !this.isHost || memberId === this.myId) return;
    const member = this.room.members[memberId];
    const memberName = member?.name || 'Anggota';

    const conn = this.guestConns.get(memberId);
    if (conn && conn.open) {
      try {
        conn.send({ event: 'kick', memberId } satisfies PeerMessage);
      } catch {}
    }

    this._handleGuestDisconnect(memberId);

    const sysMsg: PartyMessage = {
      id: msgId(),
      memberId: 'system',
      memberName: 'System',
      text: `🚫 ${memberName} telah dikeluarkan dari room oleh Host`,
      timestamp: Date.now(),
      type: 'system',
    };
    this.room.messages.push(sysMsg);
    this._broadcast({ event: 'chat', message: sysMsg });
    this.cbs.onMessage?.(sysMsg);
  }

  /** Leave / destroy the party */
  leave() {
    this._stopHeartbeat();
    if (this.isHost) {
      this._broadcast({ event: 'host_left' });
    }
    this.guestConns.forEach((c) => c.close());
    this.hostConn?.close();
    this.peer?.destroy();
    this.peer = null;
    this.room = null;
    this.guestConns.clear();
    this.hostConn = null;
  }

  getRoom() { return this.room; }
  getMyId() { return this.myId; }
  getIsHost() { return this.isHost; }

  // ── Private: Host ─────────────────────────────────────────

  private _startHostHeartbeat() {
    this._stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (!this.room || !this.isHost) return;
      this.guestConns.forEach((conn, peerId) => {
        if (!conn.open) {
          this._handleGuestDisconnect(peerId);
        } else {
          try {
            conn.send({ event: 'ping' } satisfies PeerMessage);
          } catch {
            this._handleGuestDisconnect(peerId);
          }
        }
      });
    }, 7000);
  }

  private _stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private _handleGuestDisconnect(peerId: string) {
    const member = this.room?.members[peerId];
    if (member) {
      delete this.room!.members[peerId];
      this.cbs.onMemberLeft?.(peerId, member.name);
      this._broadcast({ event: 'member_left', memberId: peerId, memberName: member.name });
      const sysMsg: PartyMessage = {
        id: msgId(),
        memberId: 'system',
        memberName: 'System',
        text: `${member.name} meninggalkan room`,
        timestamp: Date.now(),
        type: 'system',
      };
      this.room!.messages.push(sysMsg);
      this._broadcast({ event: 'chat', message: sysMsg });
      this.cbs.onMessage?.(sysMsg);
    }
    const existingConn = this.guestConns.get(peerId);
    if (existingConn) {
      try { existingConn.close(); } catch { /* ignore */ }
      this.guestConns.delete(peerId);
    }
  }

  private _onGuestConnect(conn: DataConnection) {
    conn.on('open', () => {
      this.guestConns.set(conn.peer, conn);
    });

    conn.on('data', (raw) => {
      const msg = raw as PeerMessage;

      if (msg.event === 'member_joined') {
        const newMember = msg.member;

        // 1. Detect and clean up any previous stale/zombie connection for the same user
        // (Happens when a user unexpectedly disconnects and reconnects before the old connection timed out)
        let isReconnection = false;
        const stalePeerIds: string[] = [];

        if (this.room?.members) {
          for (const [peerId, existingMember] of Object.entries(this.room.members)) {
            if (peerId === newMember.id) continue;
            const sameUser =
              (newMember.userId && existingMember.userId && newMember.userId === existingMember.userId) ||
              existingMember.name.trim().toLowerCase() === newMember.name.trim().toLowerCase();

            if (sameUser) {
              isReconnection = true;
              stalePeerIds.push(peerId);
            }
          }
        }

        // Clean up stale connections immediately so duplicates don't linger
        for (const oldPeerId of stalePeerIds) {
          const oldMember = this.room!.members[oldPeerId];
          delete this.room!.members[oldPeerId];
          const oldConn = this.guestConns.get(oldPeerId);
          if (oldConn) {
            try { oldConn.close(); } catch { /* ignore */ }
            this.guestConns.delete(oldPeerId);
          }
          this._broadcastExcept({ event: 'member_left', memberId: oldPeerId, memberName: oldMember?.name || '' }, conn.peer);
          this.cbs.onMemberLeft?.(oldPeerId, oldMember?.name || '');
        }

        // 2. Register the new member in room
        this.room!.members[newMember.id] = newMember;

        // 3. Send welcome with clean room state to just this guest
        conn.send({ event: 'welcome', room: this.room! } satisfies PeerMessage);

        // 4. Broadcast join to all other active guests
        this._broadcastExcept({ event: 'member_joined', member: newMember }, conn.peer);

        this.cbs.onMemberJoined?.(newMember);

        // 5. System chat notification
        const noticeText = isReconnection
          ? `${newMember.name} terhubung kembali ke room 🔄`
          : `${newMember.name} bergabung ke room 🎬`;

        const sysMsg: PartyMessage = {
          id: msgId(),
          memberId: 'system',
          memberName: 'System',
          text: noticeText,
          timestamp: Date.now(),
          type: 'system',
        };
        this.room!.messages.push(sysMsg);
        this._broadcast({ event: 'chat', message: sysMsg });
        this.cbs.onMessage?.(sysMsg);
      } else if (msg.event === 'chat') {
        if (!msg.message || typeof msg.message.text !== 'string') return;
        const sanitizedMsg: PartyMessage = {
          ...msg.message,
          text: String(msg.message.text).trim().slice(0, 500),
          memberName: String(msg.message.memberName || 'User').trim().slice(0, 50),
        };
        if (!sanitizedMsg.text) return;

        // Forward to all
        this.room!.messages.push(sanitizedMsg);
        this._broadcastExcept({ event: 'chat', message: sanitizedMsg }, conn.peer);
        this.cbs.onMessage?.(sanitizedMsg);
      } else if (msg.event === 'signal') {
        // In host-only control mode, guests cannot control playback
        if (this.room?.controlMode === 'host_only') {
          return;
        }

        // Broadcast guest playback signal to all other guests
        this._broadcastExcept(msg, conn.peer);
        // Also publish system announcement to chat transcript so all room members see it
        const alertText =
          msg.alertText ||
          (msg.signal.type === 'pause'
            ? `⚠️ ${msg.senderName} meminta MENJEDA film/series yang sedang ditonton bersama`
            : msg.signal.type === 'play'
            ? `▶️ ${msg.senderName} meminta MEMUTAR film/series yang sedang ditonton bersama`
            : `⏩ ${msg.senderName} mengubah posisi tayangan`);

        const sysMsg: PartyMessage = {
          id: msgId(),
          memberId: 'system',
          memberName: 'System',
          text: alertText,
          timestamp: Date.now(),
          type: 'system',
        };
        this.room!.messages.push(sysMsg);
        this._broadcast({ event: 'chat', message: sysMsg });
        this.cbs.onMessage?.(sysMsg);

        // Fire locally on host
        this.cbs.onSignal?.(msg.signal, msg.senderName, msg.senderId ?? conn.peer, alertText);
      } else if (msg.event === 'reaction') {
        // Broadcast reaction to all other guests
        this._broadcastExcept(msg, conn.peer);
        // Fire locally on host
        this.cbs.onReaction?.({
          id: msg.id,
          emoji: msg.emoji,
          senderName: msg.senderName,
          timestamp: Date.now(),
          xOffset: msg.xOffset ?? (Math.random() * 70 + 15),
        });
      } else if (msg.event === 'ping') {
        conn.send({ event: 'pong' } satisfies PeerMessage);
      }
    });

    conn.on('close', () => {
      this._handleGuestDisconnect(conn.peer);
    });
  }

  // ── Private: Guest ────────────────────────────────────────

  private _handleIncoming(msg: PeerMessage) {
    switch (msg.event) {
      case 'member_joined':
        if (this.room) {
          // Remove any duplicate member with same userId or name
          for (const [peerId, m] of Object.entries(this.room.members)) {
            if (peerId !== msg.member.id) {
              const same =
                (msg.member.userId && m.userId && msg.member.userId === m.userId) ||
                m.name.trim().toLowerCase() === msg.member.name.trim().toLowerCase();
              if (same) {
                delete this.room.members[peerId];
              }
            }
          }
          this.room.members[msg.member.id] = msg.member;
        }
        this.cbs.onMemberJoined?.(msg.member);
        break;
      case 'member_left':
        if (this.room?.members[msg.memberId]) {
          delete this.room.members[msg.memberId];
        }
        this.cbs.onMemberLeft?.(msg.memberId, msg.memberName);
        break;
      case 'chat':
        if (msg.message && typeof msg.message.text === 'string') {
          const sanitizedMsg: PartyMessage = {
            ...msg.message,
            text: String(msg.message.text).trim().slice(0, 500),
            memberName: String(msg.message.memberName || 'User').trim().slice(0, 50),
          };
          if (sanitizedMsg.text) {
            this.room?.messages.push(sanitizedMsg);
            this.cbs.onMessage?.(sanitizedMsg);
          }
        }
        break;
      case 'signal':
        this.cbs.onSignal?.(msg.signal, msg.senderName, msg.senderId, msg.alertText);
        break;
      case 'sync_time':
        this.cbs.onSyncTime?.(msg.currentTime, msg.isPlaying, msg.timestamp);
        break;
      case 'media_change':
        if (this.room) {
          this.room.mediaInfo = msg.mediaInfo;
        }
        this.cbs.onMediaChange?.(msg.mediaInfo);
        break;
      case 'control_mode':
        if (this.room) {
          this.room.controlMode = msg.mode;
        }
        this.cbs.onControlModeChange?.(msg.mode);
        break;
      case 'reaction':
        this.cbs.onReaction?.({
          id: msg.id,
          emoji: msg.emoji,
          senderName: msg.senderName,
          timestamp: Date.now(),
          xOffset: msg.xOffset ?? (Math.random() * 70 + 15),
        });
        break;
      case 'kick':
        if (msg.memberId === this.myId) {
          this.leave();
          this.cbs.onKicked?.();
        }
        break;
      case 'host_left':
        this.cbs.onHostLeft?.();
        break;
      case 'ping':
        this.hostConn?.send({ event: 'pong' } satisfies PeerMessage);
        break;
    }
  }

  // ── Utils ─────────────────────────────────────────────────

  private _broadcast(msg: PeerMessage) {
    this.guestConns.forEach((conn) => {
      if (conn.open) conn.send(msg);
    });
  }

  private _broadcastExcept(msg: PeerMessage, excludeId: string) {
    this.guestConns.forEach((conn, id) => {
      if (id !== excludeId && conn.open) conn.send(msg);
    });
  }

  private _sendToHost(msg: PeerMessage) {
    if (this.hostConn?.open) this.hostConn.send(msg);
  }
}

// Singleton instance shared across the app
export const watchPartyService = new WatchPartyService();
