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

/**
 * Fetches the active broadcast announcement from Supabase cloud.
 * This guarantees all mobile devices, tablets, desktop browsers, and PWAs see the announcement.
 */
export async function fetchActiveAnnouncementFromCloud(): Promise<BroadcastAnnouncement | null> {
  if (!isSupabaseConfigured) {
    return getActiveAnnouncement();
  }

  try {
    const { data, error } = await supabase
      .from('watchlist')
      .select('*')
      .eq('media_id', BROADCAST_MEDIA_ID)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return null;
    }

    const row = data[0];
    const isActive = row.year === '1' || row.year === 'true';
    if (!isActive || !row.synopsis) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(BROADCAST_STORAGE_KEY);
      }
      return null;
    }

    const parsed: BroadcastAnnouncement = {
      id: String(row.id || row.created_at || 'broadcast_cloud'),
      title: row.title || 'PENGUMUMAN',
      message: row.synopsis,
      type: (row.media_type as any) || 'info',
      active: true,
      createdAt: row.created_at || new Date().toISOString(),
      linkText: row.backdrop || undefined,
      linkUrl: row.poster || undefined,
    };

    // Update local cache for instant future loads
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(BROADCAST_STORAGE_KEY, JSON.stringify(parsed));
      } catch {}
    }

    return parsed;
  } catch (err) {
    console.warn('[Broadcast] Error fetching cloud announcement:', err);
    return getActiveAnnouncement();
  }
}

/**
 * Saves and broadcasts announcement globally across all devices via Supabase cloud.
 */
export async function saveAnnouncement(
  announcement: BroadcastAnnouncement | null,
  userId?: string
): Promise<void> {
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

  // 2. Cloud Sync to Supabase so mobile, tablet, and PWA visitors immediately receive it
  if (isSupabaseConfigured && userId) {
    try {
      if (announcement && announcement.active && announcement.message.trim()) {
        await supabase.from('watchlist').upsert(
          {
            user_id: userId,
            media_id: BROADCAST_MEDIA_ID,
            title: announcement.title || 'PENGUMUMAN',
            synopsis: announcement.message.trim(),
            media_type: announcement.type || 'info',
            poster: announcement.linkUrl || '',
            backdrop: announcement.linkText || '',
            year: announcement.active ? '1' : '0',
            rating: Date.now(),
          },
          { onConflict: 'user_id,media_id' }
        );
      } else {
        // Deactivate or delete from cloud
        await supabase
          .from('watchlist')
          .delete()
          .match({ user_id: userId, media_id: BROADCAST_MEDIA_ID });
      }
    } catch (err) {
      console.error('Failed to sync announcement to Supabase cloud:', err);
    }
  }
}
