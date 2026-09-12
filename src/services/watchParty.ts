import Peer, { type DataConnection } from 'peerjs';
import type {
  PartyMember,
  PartyMessage,
  PartyRoom,
  PartyMediaInfo,
  PlaybackSignal,
  PeerMessage,
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
  onHostLeft?: () => void;
  onError?: (err: string) => void;
}

// ── WatchPartyService ──────────────────────────────────────
export class WatchPartyService {
  private peer: Peer | null = null;
  private myId = '';
  private myName = '';
  private isHost = false;
  private room: PartyRoom | null = null;
  // host only: map of connected guest connections
  private guestConns: Map<string, DataConnection> = new Map();
  // guest only: connection to host
  private hostConn: DataConnection | null = null;
  private cbs: WatchPartyCallbacks = {};

  // ── Public API ────────────────────────────────────────────

  setCallbacks(cbs: WatchPartyCallbacks) {
    this.cbs = cbs;
  }

  /** Host: create a new room */
  createRoom(myName: string, mediaInfo: PartyMediaInfo): Promise<PartyRoom> {
    return new Promise((resolve, reject) => {
      const roomCode = nanoid(6);
      this.myName = myName;
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
        };
        this.room = {
          roomCode,
          hostId: id,
          members: { [id]: me },
          messages: [],
          mediaInfo,
          createdAt: Date.now(),
        };
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
  joinRoom(roomCode: string, myName: string): Promise<PartyRoom> {
    return new Promise((resolve, reject) => {
      this.myName = myName;
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
    const message: PartyMessage = {
      id: msgId(),
      memberId: this.myId,
      memberName: this.myName,
      text,
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
  sendSignal(signal: PlaybackSignal, customAlertText?: string) {
    if (!this.room) return;
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
  }

  /** Leave / destroy the party */
  leave() {
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

  private _onGuestConnect(conn: DataConnection) {
    conn.on('open', () => {
      this.guestConns.set(conn.peer, conn);
    });

    conn.on('data', (raw) => {
      const msg = raw as PeerMessage;

      if (msg.event === 'member_joined') {
        // Register member
        const member = msg.member;
        this.room!.members[member.id] = member;

        // Send welcome with full room state to just this guest
        conn.send({ event: 'welcome', room: this.room! } satisfies PeerMessage);

        // Broadcast join to all other guests
        this._broadcastExcept({ event: 'member_joined', member }, conn.peer);

        this.cbs.onMemberJoined?.(member);

        // System message
        const sysMsg: PartyMessage = {
          id: msgId(),
          memberId: 'system',
          memberName: 'System',
          text: `${member.name} bergabung ke room 🎬`,
          timestamp: Date.now(),
          type: 'system',
        };
        this.room!.messages.push(sysMsg);
        this._broadcast({ event: 'chat', message: sysMsg });
        this.cbs.onMessage?.(sysMsg);
      } else if (msg.event === 'chat') {
        // Forward to all
        this.room!.messages.push(msg.message);
        this._broadcastExcept({ event: 'chat', message: msg.message }, conn.peer);
        this.cbs.onMessage?.(msg.message);
      } else if (msg.event === 'signal') {
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
      } else if (msg.event === 'ping') {
        conn.send({ event: 'pong' } satisfies PeerMessage);
      }
    });

    conn.on('close', () => {
      const member = this.room?.members[conn.peer];
      if (member) {
        member.isActive = false;
        this.cbs.onMemberLeft?.(conn.peer, member.name);
        this._broadcast({ event: 'member_left', memberId: conn.peer, memberName: member.name });
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
      this.guestConns.delete(conn.peer);
    });
  }

  // ── Private: Guest ────────────────────────────────────────

  private _handleIncoming(msg: PeerMessage) {
    switch (msg.event) {
      case 'member_joined':
        if (this.room) this.room.members[msg.member.id] = msg.member;
        this.cbs.onMemberJoined?.(msg.member);
        break;
      case 'member_left':
        if (this.room?.members[msg.memberId]) {
          this.room.members[msg.memberId].isActive = false;
        }
        this.cbs.onMemberLeft?.(msg.memberId, msg.memberName);
        break;
      case 'chat':
        this.room?.messages.push(msg.message);
        this.cbs.onMessage?.(msg.message);
        break;
      case 'signal':
        this.cbs.onSignal?.(msg.signal, msg.senderName, msg.senderId, msg.alertText);
        break;
      case 'host_left':
        this.cbs.onHostLeft?.();
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
