// ============================================================
//  Watch Party — Type Definitions
// ============================================================

export interface PartyMember {
  id: string;
  name: string;
  isHost: boolean;
  joinedAt: number;
  isActive: boolean;
}

export type PlaybackSignalType = 'play' | 'pause' | 'seek';

export interface PlaybackSignal {
  type: PlaybackSignalType;
  currentTime?: number;
  timestamp: number;
}

export type MessageType = 'chat' | 'system' | 'signal';

export interface PartyMessage {
  id: string;
  memberId: string;
  memberName: string;
  text: string;
  timestamp: number;
  type: MessageType;
}

export interface PartyMediaInfo {
  mediaId: string;
  mediaTitle: string;
  mediaPoster: string;
  mediaType: string;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeTitle?: string;
}

export interface PartyRoom {
  roomCode: string;
  hostId: string;
  members: Record<string, PartyMember>;
  messages: PartyMessage[];
  mediaInfo: PartyMediaInfo;
  createdAt: number;
}

export type PartyStatus = 'idle' | 'creating' | 'joining' | 'connected' | 'error' | 'disconnected';

export type PeerMessage =
  | { event: 'welcome';      room: PartyRoom }
  | { event: 'member_joined'; member: PartyMember }
  | { event: 'member_left';  memberId: string; memberName: string }
  | { event: 'chat';         message: PartyMessage }
  | { event: 'signal';       signal: PlaybackSignal; senderName: string; senderId?: string; alertText?: string }
  | { event: 'host_left' }
  | { event: 'ping' }
  | { event: 'pong' };
