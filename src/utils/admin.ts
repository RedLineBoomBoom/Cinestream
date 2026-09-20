import type { User } from '@supabase/supabase-js';
import type { UserProfile } from '../context/UserProfileContext';
import { supabase, isSupabaseConfigured } from '../services/supabase';

/**
 * Whitelist of primary administrator emails.
 * Includes project owner / developer email.
 */
export const DEFAULT_ADMIN_EMAILS: string[] = [
  'renaldy.maulana.rm@gmail.com',
];

/**
 * Special database identifier for cloud-synced global announcements.
 * Stored in Supabase so every device (Desktop, Mobile, Tablet, PWA) receives it.
 */
export const BROADCAST_MEDIA_ID = '__cinestream_broadcast_announcement__';

/**
 * Supabase Realtime broadcast channel name for instant cross-device notifications.
 */
export const BROADCAST_REALTIME_CHANNEL = 'cinestream_announcements_channel';

/**
 * SQL script needed in Supabase SQL editor to enable public cross-device announcements.
 */
export const SUPABASE_ANNOUNCEMENT_SQL = `-- =========================================================================
-- Cinestream: Skrip SQL Pengumuman Global Supabase
-- Menjadikan pengumuman dapat dibaca oleh SELURUH pengunjung (HP, Tab, PWA, PC)
-- =========================================================================

-- 1. Buat tabel announcements jika belum ada
CREATE TABLE IF NOT EXISTS public.announcements (
    id text PRIMARY KEY DEFAULT 'active_announcement',
    title text NOT NULL DEFAULT 'PENGUMUMAN',
    message text NOT NULL,
    type text NOT NULL DEFAULT 'info',
    active boolean NOT NULL DEFAULT true,
    link_text text,
    link_url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Aktifkan Row Level Security (RLS)
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- 3. Kebijakan BACA PUBLIK: Siapa pun (termasuk pengunjung HP / Tab / PWA tanpa login) BISA MEMBACA pengumuman
DROP POLICY IF EXISTS "Public can view announcements" ON public.announcements;
CREATE POLICY "Public can view announcements"
    ON public.announcements
    FOR SELECT
    TO public
    USING (true);

-- 4. Kebijakan KELOLA: Izinkan simpan, ubah, dan nonaktifkan pengumuman
DROP POLICY IF EXISTS "Anyone can manage announcements" ON public.announcements;
CREATE POLICY "Anyone can manage announcements"
    ON public.announcements
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

-- 5. Kebijakan Fallback pada tabel watchlist
DROP POLICY IF EXISTS "Public can view broadcast announcements on watchlist" ON public.watchlist;
CREATE POLICY "Public can view broadcast announcements on watchlist"
    ON public.watchlist
    FOR SELECT
    TO public
    USING (media_id = '__cinestream_broadcast_announcement__');
`;

/**
 * Retrieves the list of all registered admin emails, combining hardcoded defaults
 * and any emails provided in the environment variable `VITE_ADMIN_EMAILS`.
 */
export function getAdminEmails(): string[] {
  const envEmailsRaw = import.meta.env.VITE_ADMIN_EMAILS;
  const envEmails = typeof envEmailsRaw === 'string'
    ? envEmailsRaw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
    : [];

  const combined = new Set([
    ...DEFAULT_ADMIN_EMAILS.map((e) => e.trim().toLowerCase()),
    ...envEmails,
  ]);

  return Array.from(combined);
}

/**
 * Checks if a given user/profile has administrator privileges.
 * Returns true ONLY if:
 * 1. The user is logged in AND their verified email matches the admin email whitelist, OR
 * 2. The user profile has an explicit role === 'admin' or is_admin === true.
 */
export function isAdminUser(
  user: User | { email?: string | null } | null | undefined,
  profile?: (UserProfile & { role?: string; is_admin?: boolean }) | null | undefined
): boolean {
  if (!user && !profile) return false;

  // 1. Check user email against whitelist
  if (user?.email) {
    const userEmail = user.email.trim().toLowerCase();
    const adminEmails = getAdminEmails();
    if (adminEmails.includes(userEmail)) {
      return true;
    }
  }

  // 2. Check profile role or is_admin flag if configured
  if (profile) {
    if (profile.role === 'admin' || profile.role === 'superadmin' || profile.is_admin === true) {
      return true;
    }
  }

  return false;
}

export interface BroadcastAnnouncement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'alert' | 'success';
  active: boolean;
  createdAt: string;
  linkText?: string;
  linkUrl?: string;
}

export const BROADCAST_STORAGE_KEY = 'cinestream_broadcast_announcement_v1';

/**
 * Fast local read (cache) for instant zero-latency rendering.
 */
export function getActiveAnnouncement(): BroadcastAnnouncement | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(BROADCAST_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.active && parsed.message) {
      return parsed as BroadcastAnnouncement;
    }
  } catch {
    // ignore
  }
  return null;
}

// Global Supabase Realtime channel instance
let announcementChannel: ReturnType<typeof supabase.channel> | null = null;

/**
 * Gets or initializes the Supabase Realtime channel for instant cross-device broadcast.
 */
export function getAnnouncementChannel() {
  if (!isSupabaseConfigured) return null;
  if (!announcementChannel) {
    announcementChannel = supabase.channel(BROADCAST_REALTIME_CHANNEL, {
      config: {
        broadcast: { ack: false, self: true },
      },
    });
    announcementChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[Broadcast] Supabase Realtime channel subscribed successfully.');
      }
    });
  }
  return announcementChannel;
}

/**
 * Broadcasts an announcement update in real-time to all connected devices.
 */
export function broadcastAnnouncementRealtime(announcement: BroadcastAnnouncement | null) {
  try {
    const ch = getAnnouncementChannel();
    if (ch) {
      ch.send({
        type: 'broadcast',
        event: 'announcement_sync',
        payload: announcement,
      });
    }
  } catch (err) {
    console.warn('[Broadcast] Realtime broadcast error:', err);
  }
}

/**
 * Fetches the active broadcast announcement from Supabase cloud.
 * Queries the dedicated 'announcements' table first, falling back to 'watchlist',
 * ensuring all mobile devices, tablets, desktop browsers, and PWAs see the announcement.
 */
export async function fetchActiveAnnouncementFromCloud(): Promise<BroadcastAnnouncement | null> {
  if (!isSupabaseConfigured) {
    return getActiveAnnouncement();
  }

  // 1. Primary: Dedicated public 'announcements' table
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('id', 'active_announcement')
      .maybeSingle();

    if (!error && data) {
      if (data.active && data.message && data.message.trim()) {
        const parsed: BroadcastAnnouncement = {
          id: data.id || 'active_announcement',
          title: data.title || 'PENGUMUMAN',
          message: data.message.trim(),
          type: (data.type as any) || 'info',
          active: true,
          createdAt: data.updated_at || data.created_at || new Date().toISOString(),
          linkText: data.link_text || undefined,
          linkUrl: data.link_url || undefined,
        };

        // Cache locally for fast future loads
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(BROADCAST_STORAGE_KEY, JSON.stringify(parsed));
          } catch {}
        }
        return parsed;
      } else {
        // Explicitly deactivated
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem(BROADCAST_STORAGE_KEY);
          } catch {}
        }
        return null;
      }
    }
  } catch {
    // ignore, fall back to watchlist
  }

  // 2. Fallback: 'watchlist' table with broadcast media_id
  try {
    const { data, error } = await supabase
      .from('watchlist')
      .select('*')
      .eq('media_id', BROADCAST_MEDIA_ID)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!error && data && data.length > 0) {
      const row = data[0];
      const isActive = row.year === '1' || row.year === 'true';
      if (isActive && row.synopsis && row.synopsis.trim()) {
        const parsed: BroadcastAnnouncement = {
          id: String(row.id || row.created_at || 'broadcast_cloud'),
          title: row.title || 'PENGUMUMAN',
          message: row.synopsis.trim(),
          type: (row.genre as any) || (row.media_type as any) || 'info',
          active: true,
          createdAt: row.created_at || new Date().toISOString(),
          linkText: row.backdrop || undefined,
          linkUrl: row.poster || undefined,
        };

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(BROADCAST_STORAGE_KEY, JSON.stringify(parsed));
          } catch {}
        }
        return parsed;
      } else {
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem(BROADCAST_STORAGE_KEY);
          } catch {}
        }
        return null;
      }
    }
  } catch (err) {
    console.warn('[Broadcast] Error fetching cloud announcement fallback:', err);
  }

  // 3. Keep local cache if cloud returned no definitive row
  return getActiveAnnouncement();
}

/**
 * Saves and broadcasts announcement globally across all devices via Supabase cloud
 * and WebSocket realtime channel.
 */
export async function saveAnnouncement(
  announcement: BroadcastAnnouncement | null,
  userId?: string
): Promise<{ success: boolean; cloudSynced: boolean; error?: string }> {
  // 1. Update local storage & dispatch local event
  if (typeof window !== 'undefined') {
    try {
      if (announcement) {
        localStorage.setItem(BROADCAST_STORAGE_KEY, JSON.stringify(announcement));
        window.dispatchEvent(new CustomEvent('cinestream_announcement_updated', { detail: announcement }));
      } else {
        localStorage.removeItem(BROADCAST_STORAGE_KEY);
        window.dispatchEvent(new CustomEvent('cinestream_announcement_updated', { detail: null }));
      }
    } catch (err) {
      console.error('Failed to save announcement to localStorage:', err);
    }
  }

  // 2. Realtime WebSocket Push (instantly received by all connected devices)
  broadcastAnnouncementRealtime(announcement);

  let cloudSynced = false;
  let cloudError: string | undefined;

  // 3. Cloud Sync to Supabase
  if (isSupabaseConfigured) {
    // A. Dedicated 'announcements' table (public readable)
    try {
      if (announcement && announcement.active && announcement.message.trim()) {
        const { error: annError } = await supabase.from('announcements').upsert({
          id: 'active_announcement',
          title: announcement.title || 'PENGUMUMAN',
          message: announcement.message.trim(),
          type: announcement.type || 'info',
          active: true,
          link_text: announcement.linkText || '',
          link_url: announcement.linkUrl || '',
          updated_at: new Date().toISOString(),
        });

        if (!annError) {
          cloudSynced = true;
        } else {
          cloudError = annError.message;
        }
      } else {
        // Deactivate
        const { error: annError } = await supabase.from('announcements').upsert({
          id: 'active_announcement',
          title: '',
          message: '',
          type: 'info',
          active: false,
          updated_at: new Date().toISOString(),
        });

        if (!annError) {
          cloudSynced = true;
        } else {
          cloudError = annError.message;
        }
      }
    } catch (err: any) {
      cloudError = err?.message || String(err);
    }

    // B. Watchlist fallback sync (if user is authenticated)
    if (userId) {
      try {
        if (announcement && announcement.active && announcement.message.trim()) {
          await supabase.from('watchlist').upsert(
            {
              user_id: userId,
              media_id: BROADCAST_MEDIA_ID,
              title: announcement.title || 'PENGUMUMAN',
              synopsis: announcement.message.trim(),
              media_type: 'movie', // Safe enum
              genre: announcement.type || 'info', // Store type in genre
              poster: announcement.linkUrl || '',
              backdrop: announcement.linkText || '',
              year: announcement.active ? '1' : '0',
              rating: 9.9, // Safe numeric
            },
            { onConflict: 'user_id,media_id' }
          );
        } else {
          await supabase
            .from('watchlist')
            .delete()
            .match({ user_id: userId, media_id: BROADCAST_MEDIA_ID });
        }
      } catch (err) {
        console.warn('[Broadcast] Watchlist fallback sync notice:', err);
      }
    }
  }

  return { success: true, cloudSynced, error: cloudError };
}

export interface CloudSyncDiagnostic {
  isConfigured: boolean;
  canReadAnnouncements: boolean;
  canReadWatchlist: boolean;
  realtimeReady: boolean;
  hasActiveCloudAnnouncement: boolean;
  error?: string;
}

/**
 * Diagnostic tool to check whether Supabase is configured and whether public visitors
 * on mobile/tablet/PWA can read announcements from cloud tables.
 */
export async function checkCloudAnnouncementStatus(): Promise<CloudSyncDiagnostic> {
  if (!isSupabaseConfigured) {
    return {
      isConfigured: false,
      canReadAnnouncements: false,
      canReadWatchlist: false,
      realtimeReady: false,
      hasActiveCloudAnnouncement: false,
      error: 'Supabase URL / Key is not configured',
    };
  }

  let canReadAnnouncements = false;
  let canReadWatchlist = false;
  let hasActiveCloudAnnouncement = false;
  let detectedError: string | undefined;

  // 1. Check announcements table
  try {
    const { data, error } = await supabase.from('announcements').select('id, active').limit(1);
    if (!error) {
      canReadAnnouncements = true;
      if (data && data.length > 0 && data[0].active) {
        hasActiveCloudAnnouncement = true;
      }
    } else {
      detectedError = error.message;
    }
  } catch (err: any) {
    detectedError = err?.message;
  }

  // 2. Check watchlist table
  try {
    const { data, error } = await supabase
      .from('watchlist')
      .select('media_id, year')
      .eq('media_id', BROADCAST_MEDIA_ID)
      .limit(1);
    if (!error) {
      canReadWatchlist = true;
      if (data && data.length > 0 && (data[0].year === '1' || data[0].year === 'true')) {
        hasActiveCloudAnnouncement = true;
      }
    }
  } catch {}

  return {
    isConfigured: true,
    canReadAnnouncements,
    canReadWatchlist,
    realtimeReady: Boolean(getAnnouncementChannel()),
    hasActiveCloudAnnouncement,
    error: detectedError,
  };
}
