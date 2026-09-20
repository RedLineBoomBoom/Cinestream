// ============================================================
//  Watch Party — Type Definitions
// ============================================================

export interface PartyMember {
  id: string;
  name: string;
  isHost: boolean;
  joinedAt: number;
  isActive: boolean;
  userId?: string;
}

export type PlaybackSignalType = 'play' | 'pause' | 'seek';

export interface PlaybackSignal {
  type: PlaybackSignalType;
  currentTime?: number;
  timestamp: number;
}

export type MessageType = 'chat' | 'system' | 'signal';

export type SystemMessageType =
  | 'control_mode_host_only'
  | 'control_mode_all'
  | 'pause_alert'
  | 'play_alert'
  | 'seek_alert'
  | 'user_joined'
  | 'user_reconnected'
  | 'user_left'
  | 'user_kicked'
  | 'media_changed';

export interface PartyMessage {
  id: string;
  memberId: string;
  memberName: string;
  text: string;
  timestamp: number;
  type: MessageType;
  systemKey?: SystemMessageType;
  systemParams?: Record<string, string | number>;
}

export interface PartyMediaInfo {
  mediaId: string;
  mediaTitle: string;
  mediaPoster: string;
  mediaType: string;
  episodeId?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeTitle?: string;
}

export type ControlMode = 'host_only' | 'all';

export interface FloatingReaction {
  id: string;
  emoji: string;
  senderName: string;
  timestamp: number;
  xOffset: number; // random offset percentage across bottom of screen (10% to 90%)
}

export interface PartyRoom {
  roomCode: string;
  hostId: string;
  members: Record<string, PartyMember>;
  messages: PartyMessage[];
  mediaInfo: PartyMediaInfo;
  createdAt: number;
  controlMode: ControlMode;
  isPublic?: boolean;
}

export interface PublicPartyRoom {
  roomCode: string;
  hostId: string;
  hostName: string;
  hostAvatar?: string;
  mediaId: string;
  mediaTitle: string;
  mediaPoster: string;
  mediaType: string;
  episodeTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  memberCount: number;
  membersPreview: { name: string; isHost: boolean }[];
  controlMode: ControlMode;
  createdAt: number;
  lastHeartbeat: number;
  isPlaying?: boolean;
  isPublic?: boolean;
}

export type LobbyPartyRoom = PublicPartyRoom;
export type LobbyFilter = 'all' | 'public' | 'private' | 'movie' | 'series';

export type PartyStatus = 'idle' | 'creating' | 'joining' | 'connected' | 'error' | 'disconnected';

export type PeerMessage =
  | { event: 'welcome';       room: PartyRoom }
  | { event: 'member_joined'; member: PartyMember }
  | { event: 'member_left';   memberId: string; memberName: string }
  | { event: 'chat';          message: PartyMessage }
  | { event: 'signal';        signal: PlaybackSignal; senderName: string; senderId?: string; alertText?: string }
  | { event: 'sync_time';     currentTime: number; isPlaying: boolean; timestamp: number }
  | { event: 'media_change';  mediaInfo: PartyMediaInfo }
  | { event: 'control_mode';  mode: ControlMode }
  | { event: 'reaction';      emoji: string; senderName: string; id: string; xOffset?: number }
  | { event: 'kick';          memberId: string }
  | { event: 'host_left' }
  | { event: 'ping' }
  | { event: 'pong' };

