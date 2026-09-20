import { supabase, isSupabaseConfigured } from './supabase';
import type { MediaItem, WatchHistoryItem } from '../types/media';

/**
 * Cloud Sync Service for Supabase
 * Handles bi-directional synchronization of Watchlist and Watch History
 */

function createMinimalMediaItem(row: {
  media_id: string;
  media_type?: string | null;
  title: string;
  poster?: string | null;
  backdrop?: string | null;
  year?: string | null;
  rating?: number | string | null;
  genre?: string | null;
  synopsis?: string | null;
}): MediaItem {
  const typeMap: Record<string, 'movie' | 'series' | 'anime' | 'drama'> = {
    tv: 'series',
    series: 'series',
    movie: 'movie',
    anime: 'anime',
    drama: 'drama',
  };

  const parsedType = typeMap[row.media_type || 'movie'] || 'movie';

  return {
    id: row.media_id,
    type: parsedType,
    title: row.title,
    poster: row.poster || '',
    backdrop: row.backdrop || '',
    year: row.year ? parseInt(row.year, 10) || new Date().getFullYear() : new Date().getFullYear(),
    releaseDate: row.year ? `${row.year}-01-01` : '2024-01-01',
    duration: parsedType === 'movie' ? '120m' : '45m / ep',
    quality: '1080p FHD',
    ageRating: '13+',
    country: 'International',
    director: 'Various',
    rating: row.rating ? parseFloat(String(row.rating)) : 0,
    synopsis: row.synopsis || '',
    genres: row.genre ? [row.genre] : ['Featured'],
    cast: [],
    servers: [],
    audioTracks: ['Original'],
    subtitles: ['Indonesian', 'English'],
  };
}

// ── WATCHLIST CLOUD SYNC ──────────────────────────────────────────

export async function fetchWatchlistFromCloud(
  userId: string
): Promise<{ ids: string[]; mediaMap: Record<string, MediaItem> }> {
  if (!isSupabaseConfigured || !userId) return { ids: [], mediaMap: {} };

  try {
    const { data, error } = await supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Sync] Failed to fetch watchlist from cloud:', error);
      return { ids: [], mediaMap: {} };
    }

    const ids: string[] = [];
    const mediaMap: Record<string, MediaItem> = {};

    data?.forEach((row) => {
      if (row.media_id === '__cinestream_broadcast_announcement__') return;
      ids.push(row.media_id);
      mediaMap[row.media_id] = createMinimalMediaItem(row);
    });

    return { ids, mediaMap };
  } catch (err) {
    console.warn('[Sync] Exception fetching cloud watchlist:', err);
    return { ids: [], mediaMap: {} };
  }
}

export async function addToCloudWatchlist(userId: string, media: MediaItem): Promise<void> {
  if (!isSupabaseConfigured || !userId) return;

  try {
    await supabase.from('watchlist').upsert(
      {
        user_id: userId,
        media_id: media.id,
        media_type: media.type || 'movie',
        title: media.title,
        poster: media.poster || null,
        backdrop: media.backdrop || null,
        year: media.year ? String(media.year) : null,
        rating: media.rating || null,
        genre: media.genres && media.genres.length > 0 ? media.genres[0] : null,
        synopsis: media.synopsis || null,
      },
      { onConflict: 'user_id,media_id' }
    );
  } catch (err) {
    console.warn('[Sync] Failed to add item to cloud watchlist:', err);
  }
}

export async function removeFromCloudWatchlist(userId: string, mediaId: string): Promise<void> {
  if (!isSupabaseConfigured || !userId) return;

  try {
    await supabase.from('watchlist').delete().match({ user_id: userId, media_id: mediaId });
  } catch (err) {
    console.warn('[Sync] Failed to remove item from cloud watchlist:', err);
  }
}

// ── WATCH HISTORY CLOUD SYNC ──────────────────────────────────────

export async function fetchHistoryFromCloud(userId: string): Promise<WatchHistoryItem[]> {
  if (!isSupabaseConfigured || !userId) return [];

  try {
    const { data, error } = await supabase
      .from('watch_history')
      .select('*')
      .eq('user_id', userId)
      .order('last_watched_at', { ascending: false })
      .limit(100);

    if (error) {
      console.warn('[Sync] Failed to fetch watch history from cloud:', error);
      return [];
    }

    return (data || []).map((row) => ({
      historyId: row.media_id,
      mediaId: row.media_id,
      media: createMinimalMediaItem(row),
      currentTime: parseFloat(row.progress_seconds || 0),
      duration: parseFloat(row.duration_seconds || 0),
      seasonNumber: row.season || undefined,
      episodeNumber: row.episode || undefined,
      completed: Boolean(row.completed),
      lastWatched: new Date(row.last_watched_at).getTime(),
    }));
  } catch (err) {
    console.warn('[Sync] Exception fetching cloud history:', err);
    return [];
  }
}

export async function recordWatchInCloud(
  userId: string,
  item: WatchHistoryItem
): Promise<void> {
  if (!isSupabaseConfigured || !userId) return;

  try {
    await supabase.from('watch_history').upsert(
      {
        user_id: userId,
        media_id: item.mediaId,
        media_type: item.media?.type || 'movie',
        title: item.media?.title || 'Untitled',
        poster: item.media?.poster || null,
        backdrop: item.media?.backdrop || null,
        progress_seconds: Math.round(item.currentTime || 0),
        duration_seconds: Math.round(item.duration || 0),
        season: item.seasonNumber || null,
        episode: item.episodeNumber || null,
        completed: Boolean(item.completed),
        last_watched_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,media_id' }
    );
  } catch (err) {
    console.warn('[Sync] Failed to record watch in cloud:', err);
  }
}

export async function removeHistoryFromCloud(userId: string, mediaId: string): Promise<void> {
  if (!isSupabaseConfigured || !userId) return;

  try {
    await supabase.from('watch_history').delete().match({ user_id: userId, media_id: mediaId });
  } catch (err) {
    console.warn('[Sync] Failed to delete history from cloud:', err);
  }
}

export async function clearAllHistoryFromCloud(userId: string): Promise<void> {
  if (!isSupabaseConfigured || !userId) return;

  try {
    await supabase.from('watch_history').delete().eq('user_id', userId);
  } catch (err) {
    console.warn('[Sync] Failed to clear all history from cloud:', err);
  }
}
