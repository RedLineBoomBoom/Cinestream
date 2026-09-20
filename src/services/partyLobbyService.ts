/**
 * partyLobbyService.ts
 * Layanan Lobi Publik Watch Party & Sinkronisasi Realtime Cloud
 * Memungkinkan penonton menemukan room nonton bareng publik yang sedang live secara global & lokal.
 */

import { supabase, isSupabaseConfigured } from './supabase';
import type { PartyRoom, PublicPartyRoom } from '../types/party';

const LOCAL_STORAGE_PUBLIC_ROOMS_KEY = 'cinestream_public_party_rooms';
const REALTIME_LOBBY_CHANNEL = 'cinestream_public_party_lobby';
const HEARTBEAT_TIMEOUT_MS = 35_000; // 35 detik timeout untuk room yang tidak lagi aktif

export const SUPABASE_PARTY_ROOMS_SQL = `-- 1. Buat Tabel Lobi Publik Watch Party
CREATE TABLE IF NOT EXISTS public.public_party_rooms (
  room_code TEXT PRIMARY KEY,
  host_id TEXT NOT NULL,
  host_name TEXT NOT NULL,
  host_avatar TEXT,
  media_id TEXT NOT NULL,
  media_title TEXT NOT NULL,
  media_poster TEXT,
  media_type TEXT NOT NULL DEFAULT 'movie',
  episode_title TEXT,
  season_number INT,
  episode_number INT,
  member_count INT NOT NULL DEFAULT 1,
  members_preview JSONB DEFAULT '[]'::jsonb,
  control_mode TEXT NOT NULL DEFAULT 'all',
  is_playing BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true,
  created_at BIGINT NOT NULL,
  last_heartbeat BIGINT NOT NULL
);

-- 2. Index Pencarian Cepat
CREATE INDEX IF NOT EXISTS idx_public_party_rooms_heartbeat ON public.public_party_rooms(last_heartbeat DESC);
CREATE INDEX IF NOT EXISTS idx_public_party_rooms_media_id ON public.public_party_rooms(media_id);

-- 3. Row Level Security
ALTER TABLE public.public_party_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active party rooms" ON public.public_party_rooms;
CREATE POLICY "Public can view active party rooms" ON public.public_party_rooms
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Anyone can insert public party rooms" ON public.public_party_rooms;
CREATE POLICY "Anyone can insert public party rooms" ON public.public_party_rooms
  FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update public party rooms" ON public.public_party_rooms;
CREATE POLICY "Anyone can update public party rooms" ON public.public_party_rooms
  FOR UPDATE TO public USING (true);

DROP POLICY IF EXISTS "Anyone can delete public party rooms" ON public.public_party_rooms;
CREATE POLICY "Anyone can delete public party rooms" ON public.public_party_rooms
  FOR DELETE TO public USING (true);
`;

// ── Local Fallback & BroadcastChannel ──────────────────────
let localBroadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    localBroadcastChannel = new BroadcastChannel(REALTIME_LOBBY_CHANNEL);
  }
} catch {
  // Ignore
}

function getLocalRooms(): PublicPartyRoom[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PUBLIC_ROOMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PublicPartyRoom[];
    const now = Date.now();
    // Filter out stale rooms
    return parsed.filter((r) => now - r.lastHeartbeat < HEARTBEAT_TIMEOUT_MS);
  } catch {
    return [];
  }
}

function saveLocalRooms(rooms: PublicPartyRoom[]): void {
  try {
    const now = Date.now();
    const activeOnly = rooms.filter((r) => now - r.lastHeartbeat < HEARTBEAT_TIMEOUT_MS);
    localStorage.setItem(LOCAL_STORAGE_PUBLIC_ROOMS_KEY, JSON.stringify(activeOnly));
  } catch (e) {
    console.warn('Gagal menyimpan room publik lokal:', e);
  }
}

// ── Supabase Realtime Channel ──────────────────────────────
let supabaseLobbyChannel: ReturnType<typeof supabase.channel> | null = null;

function getSupabaseLobbyChannel() {
  if (!isSupabaseConfigured) return null;
  if (!supabaseLobbyChannel) {
    supabaseLobbyChannel = supabase.channel(REALTIME_LOBBY_CHANNEL, {
      config: { broadcast: { ack: false, self: true } },
    });
    supabaseLobbyChannel.subscribe();
  }
  return supabaseLobbyChannel;
}

// ── Listeners / Subscribers ────────────────────────────────
type LobbyListener = (rooms: PublicPartyRoom[]) => void;
const subscribers = new Set<LobbyListener>();

function notifySubscribers(rooms: PublicPartyRoom[]) {
  subscribers.forEach((fn) => {
    try {
      fn(rooms);
    } catch (err) {
      console.error('Error notifying lobby subscriber:', err);
    }
  });
}

// Initialize Cross-Tab & Supabase Broadcast Listeners
if (typeof window !== 'undefined') {
  localBroadcastChannel?.addEventListener('message', (event) => {
    if (event.data?.type === 'lobby_refresh') {
      fetchActivePublicRooms().then(notifySubscribers);
    }
  });

  window.addEventListener('storage', (e) => {
    if (e.key === LOCAL_STORAGE_PUBLIC_ROOMS_KEY) {
      notifySubscribers(getLocalRooms());
    }
  });

  const sbChannel = getSupabaseLobbyChannel();
  if (sbChannel) {
    sbChannel.on('broadcast', { event: 'lobby_update' }, () => {
      fetchActivePublicRooms().then(notifySubscribers);
    });
  }
}

// ── Public API ─────────────────────────────────────────────

/**
 * Mendaftarkan room baru ke Lobi Publik
 */
export async function publishPublicRoom(
  room: PartyRoom,
  isPlaying: boolean = true,
  isPublic?: boolean
): Promise<void> {
  const now = Date.now();
  const hostMember = room.members[room.hostId];
  const membersList = Object.values(room.members).filter((m) => m.isActive);
  const resolvedIsPublic = isPublic !== undefined ? isPublic : (room.isPublic !== undefined ? room.isPublic : true);

  const publicRoom: PublicPartyRoom = {
    roomCode: room.roomCode,
    hostId: room.hostId,
    hostName: hostMember?.name || 'Host',
    mediaId: room.mediaInfo.mediaId,
    mediaTitle: room.mediaInfo.mediaTitle,
    mediaPoster: room.mediaInfo.mediaPoster,
    mediaType: room.mediaInfo.mediaType,
    episodeTitle: room.mediaInfo.episodeTitle,
    seasonNumber: room.mediaInfo.seasonNumber,
    episodeNumber: room.mediaInfo.episodeNumber,
    memberCount: Math.max(1, membersList.length),
    membersPreview: membersList.map((m) => ({ name: m.name, isHost: m.isHost })),
    controlMode: room.controlMode,
    createdAt: room.createdAt || now,
    lastHeartbeat: now,
    isPlaying,
    isPublic: resolvedIsPublic,
  };

  // 1. Simpan lokal
  const localList = getLocalRooms().filter((r) => r.roomCode !== room.roomCode);
  localList.unshift(publicRoom);
  saveLocalRooms(localList);

  // 2. Siarkan via Local BroadcastChannel
  try {
    localBroadcastChannel?.postMessage({ type: 'lobby_refresh', roomCode: room.roomCode });
  } catch {}

  notifySubscribers(localList);

  // 3. Simpan ke Supabase jika tersedia
  if (isSupabaseConfigured) {
    try {
      await supabase.from('public_party_rooms').upsert({
        room_code: publicRoom.roomCode,
        host_id: publicRoom.hostId,
        host_name: publicRoom.hostName,
        media_id: publicRoom.mediaId,
        media_title: publicRoom.mediaTitle,
        media_poster: publicRoom.mediaPoster,
        media_type: publicRoom.mediaType,
        episode_title: publicRoom.episodeTitle || null,
        season_number: publicRoom.seasonNumber ?? null,
        episode_number: publicRoom.episodeNumber ?? null,
        member_count: publicRoom.memberCount,
        members_preview: publicRoom.membersPreview,
        control_mode: publicRoom.controlMode,
        is_playing: publicRoom.isPlaying,
        is_public: publicRoom.isPublic ?? true,
        created_at: publicRoom.createdAt,
        last_heartbeat: publicRoom.lastHeartbeat,
      });

      const sbCh = getSupabaseLobbyChannel();
      sbCh?.send({
        type: 'broadcast',
        event: 'lobby_update',
        payload: { event: 'room_published', roomCode: room.roomCode },
      });
    } catch (err) {
      console.warn('Gagal sinkronisasi publish room ke Supabase:', err);
    }
  }
}

/**
 * Mengirim denyut jantung (heartbeat) room untuk memperbarui waktu aktif dan jumlah penonton
 */
export async function heartbeatPublicRoom(
  roomCode: string,
  memberCount: number,
  membersPreview: { name: string; isHost: boolean }[],
  isPlaying?: boolean
): Promise<void> {
  const now = Date.now();

  // 1. Update lokal
  const localList = getLocalRooms();
  const room = localList.find((r) => r.roomCode === roomCode);
  if (room) {
    room.lastHeartbeat = now;
    room.memberCount = memberCount;
    room.membersPreview = membersPreview;
    if (isPlaying !== undefined) room.isPlaying = isPlaying;
    saveLocalRooms(localList);
  }

  // 2. Update Supabase
  if (isSupabaseConfigured) {
    try {
      const updatePayload: Record<string, any> = {
        member_count: memberCount,
        members_preview: membersPreview,
        last_heartbeat: now,
      };
      if (isPlaying !== undefined) updatePayload.is_playing = isPlaying;

      await supabase
        .from('public_party_rooms')
        .update(updatePayload)
        .eq('room_code', roomCode);
    } catch {
      // Ignore heartbeat network glitches
    }
  }
}

/**
 * Menghapus room dari lobi publik saat ditutup
 */
export async function removePublicRoom(roomCode: string): Promise<void> {
  // 1. Hapus dari memori lokal
  const localList = getLocalRooms().filter((r) => r.roomCode !== roomCode);
  saveLocalRooms(localList);

  try {
    localBroadcastChannel?.postMessage({ type: 'lobby_refresh', roomCode });
  } catch {}

  notifySubscribers(localList);

  // 2. Hapus dari Supabase
  if (isSupabaseConfigured) {
    try {
      await supabase.from('public_party_rooms').delete().eq('room_code', roomCode);

      const sbCh = getSupabaseLobbyChannel();
      sbCh?.send({
        type: 'broadcast',
        event: 'lobby_update',
        payload: { event: 'room_closed', roomCode },
      });
    } catch (err) {
      console.warn('Gagal menghapus room dari Supabase:', err);
    }
  }
}

/**
 * Mengambil daftar seluruh room publik yang sedang live
 */
export async function fetchActivePublicRooms(): Promise<PublicPartyRoom[]> {
  const localRooms = getLocalRooms();

  if (!isSupabaseConfigured) {
    return localRooms.sort((a, b) => b.lastHeartbeat - a.lastHeartbeat);
  }

  try {
    const minHeartbeat = Date.now() - HEARTBEAT_TIMEOUT_MS;
    const { data, error } = await supabase
      .from('public_party_rooms')
      .select('*')
      .gt('last_heartbeat', minHeartbeat)
      .order('member_count', { ascending: false });

    if (error || !data) {
      return localRooms.sort((a, b) => b.lastHeartbeat - a.lastHeartbeat);
    }

    const cloudRooms: PublicPartyRoom[] = data.map((item: any) => ({
      roomCode: item.room_code,
      hostId: item.host_id,
      hostName: item.host_name,
      hostAvatar: item.host_avatar,
      mediaId: item.media_id,
      mediaTitle: item.media_title,
      mediaPoster: item.media_poster || '',
      mediaType: item.media_type,
      episodeTitle: item.episode_title,
      seasonNumber: item.season_number,
      episodeNumber: item.episode_number,
      memberCount: item.member_count || 1,
      membersPreview: Array.isArray(item.members_preview) ? item.members_preview : [],
      controlMode: item.control_mode || 'all',
      createdAt: Number(item.created_at) || Date.now(),
      lastHeartbeat: Number(item.last_heartbeat) || Date.now(),
      isPlaying: Boolean(item.is_playing),
      isPublic: item.is_public !== false,
    }));

    // Gabungkan cloud dan local, deduplikasi berdasarkan roomCode
    const mergedMap = new Map<string, PublicPartyRoom>();
    for (const r of cloudRooms) {
      mergedMap.set(r.roomCode, r);
    }
    for (const r of localRooms) {
      if (!mergedMap.has(r.roomCode)) {
        mergedMap.set(r.roomCode, r);
      }
    }

    const finalList = Array.from(mergedMap.values()).filter(
      (r) => Date.now() - r.lastHeartbeat < HEARTBEAT_TIMEOUT_MS
    );

    return finalList.sort((a, b) => b.memberCount - a.memberCount || b.lastHeartbeat - a.lastHeartbeat);
  } catch (err) {
    console.warn('Gagal memuat room publik dari Supabase:', err);
    return localRooms.sort((a, b) => b.lastHeartbeat - a.lastHeartbeat);
  }
}

/**
 * Berlangganan event pembaruan lobi publik secara live
 */
export function subscribeToPublicLobby(listener: LobbyListener): () => void {
  subscribers.add(listener);
  // Trigger initial fetch
  fetchActivePublicRooms().then(listener);

  return () => {
    subscribers.delete(listener);
  };
}

/**
  * Verifikasi apakah kode yang dimasukkan cocok dengan kode room target.
  * Jika isAdmin = true, verifikasi selalu berhasil (Master Key Bypass).
  */
export function verifyPrivateRoomCode(enteredCode: string, targetRoomCode: string, isAdmin?: boolean): boolean {
  if (isAdmin) return true;
  if (!enteredCode || !targetRoomCode) return false;
  return enteredCode.trim().toUpperCase() === targetRoomCode.trim().toUpperCase();
}
