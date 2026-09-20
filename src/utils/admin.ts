import type { User } from '@supabase/supabase-js';
import type { UserProfile } from '../context/UserProfileContext';

/**
 * Whitelist of primary administrator emails.
 * Includes project owner / developer email.
 */
export const DEFAULT_ADMIN_EMAILS: string[] = [
  'renaldy.maulana.rm@gmail.com',
];

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

export function saveAnnouncement(announcement: BroadcastAnnouncement | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (announcement) {
      localStorage.setItem(BROADCAST_STORAGE_KEY, JSON.stringify(announcement));
      window.dispatchEvent(new CustomEvent('cinestream_announcement_updated', { detail: announcement }));
    } else {
      localStorage.removeItem(BROADCAST_STORAGE_KEY);
      window.dispatchEvent(new CustomEvent('cinestream_announcement_updated', { detail: null }));
    }
  } catch (err) {
    console.error('Failed to save announcement:', err);
  }
}
