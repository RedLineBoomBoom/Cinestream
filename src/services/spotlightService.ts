import { supabase, isSupabaseConfigured } from './supabase';
import type { MediaItem } from '../types/media';
import { createMovieServers } from '../data/mockCatalog';

export type SpotlightBadgeColor = 'amber' | 'red' | 'purple' | 'emerald' | 'cyan';

export interface SpotlightItem {
  id: string;
  mediaId: string;
  tmdbId?: number;
  mediaType: 'movie' | 'tv' | 'series' | 'anime' | 'drama';
  title: string;
  titleEn?: string;
  titleId?: string;
  originalTitle?: string;
  poster: string;
  posterEn?: string;
  posterId?: string;
  backdrop: string;
  backdropEn?: string;
  backdropId?: string;
  synopsis: string;
  synopsisEn?: string;
  synopsisId?: string;
  year: number;
  rating: number;
  duration?: string;
  genres: string[];
  director?: string;
  logoUrl?: string;
  trailerUrl?: string;
  trailerYoutubeKey?: string;
  customBadge?: string;
  customBadgeColor?: SpotlightBadgeColor;
  customTagline?: string;
  customBackdrop?: string;
  active: boolean;
  order: number;
  createdAt: string;
}

export interface SpotlightConfig {
  enabled: boolean;
  mode: 'pin_to_front' | 'override_hero';
  items: SpotlightItem[];
  updatedAt: string;
  updatedBy?: string;
}

export const SPOTLIGHT_STORAGE_KEY = 'cinestream_spotlight_config_v1';
export const SPOTLIGHT_REALTIME_CHANNEL = 'cinestream_spotlight_channel';
export const SPOTLIGHT_MEDIA_ID_FALLBACK = '__cinestream_spotlight_config__';

export const DEFAULT_SPOTLIGHT_CONFIG: SpotlightConfig = {
  enabled: false,
  mode: 'pin_to_front',
  items: [],
  updatedAt: new Date().toISOString(),
};

export const SUPABASE_SPOTLIGHT_SQL = `-- =========================================================================
-- Cinestream: Skrip SQL Konfigurasi Spotlight / Pilihan Editor Supabase
-- Menjadikan spotlight dapat dibaca oleh SELURUH pengunjung secara real-time
-- =========================================================================

-- 1. Buat tabel spotlight_config jika belum ada
CREATE TABLE IF NOT EXISTS public.spotlight_config (
    id text PRIMARY KEY DEFAULT 'active_spotlight',
    enabled boolean NOT NULL DEFAULT false,
    mode text NOT NULL DEFAULT 'pin_to_front',
    items jsonb NOT NULL DEFAULT '[]'::jsonb,
    updated_by text,
    updated_at timestamptz DEFAULT now()
);

-- 2. Aktifkan Row Level Security (RLS)
ALTER TABLE public.spotlight_config ENABLE ROW LEVEL SECURITY;

-- 3. Kebijakan BACA PUBLIK: Siapa pun dapat melihat tayangan spotlight aktif
DROP POLICY IF EXISTS "Public can view spotlight" ON public.spotlight_config;
CREATE POLICY "Public can view spotlight"
    ON public.spotlight_config
    FOR SELECT
    TO public
    USING (true);

-- 4. Kebijakan KELOLA HANYA UNTUK ADMIN:
DROP POLICY IF EXISTS "Anyone can manage spotlight" ON public.spotlight_config;
DROP POLICY IF EXISTS "Admin manage spotlight" ON public.spotlight_config;
CREATE POLICY "Admin manage spotlight"
    ON public.spotlight_config
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);
`;

/**
 * Get active spotlight config from local cache
 */
export function getLocalSpotlightConfig(): SpotlightConfig {
  if (typeof window === 'undefined') return DEFAULT_SPOTLIGHT_CONFIG;
  try {
    const raw = localStorage.getItem(SPOTLIGHT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        return {
          enabled: Boolean(parsed.enabled),
          mode: parsed.mode === 'override_hero' ? 'override_hero' : 'pin_to_front',
          items: Array.isArray(parsed.items) ? parsed.items : [],
          updatedAt: parsed.updatedAt || new Date().toISOString(),
          updatedBy: parsed.updatedBy,
        };
      }
    }
  } catch (err) {
    console.warn('[Spotlight] Failed to read local spotlight cache:', err);
  }
  return DEFAULT_SPOTLIGHT_CONFIG;
}

/**
 * Fetch active spotlight config with Supabase cloud check and local fallback
 */
export async function fetchSpotlightConfig(): Promise<SpotlightConfig> {
  const local = getLocalSpotlightConfig();

  if (!isSupabaseConfigured) {
    return local;
  }

  try {
    // 1. Primary: Dedicated spotlight_config table
    const { data, error } = await supabase
      .from('spotlight_config')
      .select('*')
      .eq('id', 'active_spotlight')
      .maybeSingle();

    if (!error && data) {
      const config: SpotlightConfig = {
        enabled: Boolean(data.enabled),
        mode: data.mode === 'override_hero' ? 'override_hero' : 'pin_to_front',
        items: Array.isArray(data.items) ? data.items : [],
        updatedAt: data.updated_at || new Date().toISOString(),
        updatedBy: data.updated_by || undefined,
      };

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(SPOTLIGHT_STORAGE_KEY, JSON.stringify(config));
        } catch {}
      }
      return config;
    }

    // 2. Fallback: Check if stored in announcements table (as json payload fallback)
    const { data: annData, error: annError } = await supabase
      .from('announcements')
      .select('*')
      .eq('id', SPOTLIGHT_MEDIA_ID_FALLBACK)
      .maybeSingle();

    if (!annError && annData && annData.message) {
      try {
        const parsed = JSON.parse(annData.message);
        if (parsed && typeof parsed === 'object') {
          const config: SpotlightConfig = {
            enabled: Boolean(parsed.enabled),
            mode: parsed.mode === 'override_hero' ? 'override_hero' : 'pin_to_front',
            items: Array.isArray(parsed.items) ? parsed.items : [],
            updatedAt: parsed.updatedAt || new Date().toISOString(),
            updatedBy: parsed.updatedBy,
          };
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(SPOTLIGHT_STORAGE_KEY, JSON.stringify(config));
            } catch {}
          }
          return config;
        }
      } catch {}
    }
  } catch (err) {
    console.warn('[Spotlight] Cloud fetch fallback error:', err);
  }

  return local;
}

/**
 * Broadcast spotlight update via Supabase WebSocket Realtime Channel
 */
let spotlightRealtimeChannel: any = null;

function getSpotlightRealtimeChannel() {
  if (!isSupabaseConfigured) return null;
  if (!spotlightRealtimeChannel) {
    try {
      spotlightRealtimeChannel = supabase.channel(SPOTLIGHT_REALTIME_CHANNEL, {
        config: { broadcast: { self: true, ack: false } },
      });
      spotlightRealtimeChannel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Spotlight] Realtime WebSocket connected');
        }
      });
    } catch (err) {
      console.warn('[Spotlight] Failed to initialize realtime channel:', err);
    }
  }
  return spotlightRealtimeChannel;
}

export function broadcastSpotlightRealtime(config: SpotlightConfig): void {
  try {
    const ch = getSpotlightRealtimeChannel();
    if (ch) {
      ch.send({
        type: 'broadcast',
        event: 'spotlight_sync',
        payload: config,
      });
    }
  } catch (err) {
    console.warn('[Spotlight] Realtime broadcast error:', err);
  }
}

/**
 * Save spotlight config to local storage, broadcast via WebSockets, and sync to Supabase
 */
export async function saveSpotlightConfig(
  config: SpotlightConfig,
  userId?: string
): Promise<{ success: boolean; cloudSynced: boolean; error?: string }> {
  const normalizedConfig: SpotlightConfig = {
    enabled: Boolean(config.enabled),
    mode: config.mode === 'override_hero' ? 'override_hero' : 'pin_to_front',
    items: (config.items || []).map((item, idx) => ({
      ...item,
      order: idx,
    })),
    updatedAt: new Date().toISOString(),
    updatedBy: userId || config.updatedBy,
  };

  // 1. Update localStorage & dispatch local event
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SPOTLIGHT_STORAGE_KEY, JSON.stringify(normalizedConfig));
      window.dispatchEvent(
        new CustomEvent('cinestream_spotlight_updated', { detail: normalizedConfig })
      );
    } catch (err) {
      console.error('[Spotlight] Failed to save to localStorage:', err);
    }
  }

  // 2. Broadcast via Supabase Realtime WebSocket
  broadcastSpotlightRealtime(normalizedConfig);

  let cloudSynced = false;
  let cloudError: string | undefined;

  // 3. Cloud Sync to Supabase
  if (isSupabaseConfigured) {
    try {
      // Primary: spotlight_config table
      const { error: upsertErr } = await supabase.from('spotlight_config').upsert({
        id: 'active_spotlight',
        enabled: normalizedConfig.enabled,
        mode: normalizedConfig.mode,
        items: normalizedConfig.items,
        updated_by: normalizedConfig.updatedBy || null,
        updated_at: normalizedConfig.updatedAt,
      });

      if (!upsertErr) {
        cloudSynced = true;
      } else {
        cloudError = upsertErr.message;
        // Fallback: Store into announcements table as json string
        try {
          await supabase.from('announcements').upsert({
            id: SPOTLIGHT_MEDIA_ID_FALLBACK,
            title: 'SPOTLIGHT_CONFIG',
            message: JSON.stringify(normalizedConfig),
            type: 'info',
            active: normalizedConfig.enabled,
            updated_at: new Date().toISOString(),
          });
          cloudSynced = true;
        } catch (fbErr: any) {
          console.warn('[Spotlight] Cloud fallback storage error:', fbErr);
        }
      }
    } catch (err: any) {
      cloudError = err?.message || String(err);
    }
  }

  return { success: true, cloudSynced, error: cloudError };
}

/**
 * Subscribes to real-time spotlight changes (WebSocket, local CustomEvent, storage, focus)
 */
export function subscribeSpotlightRealtime(
  callback: (config: SpotlightConfig) => void
): () => void {
  let isMounted = true;

  const refreshFromSource = async () => {
    try {
      const config = await fetchSpotlightConfig();
      if (isMounted) {
        callback(config);
      }
    } catch (err) {
      console.warn('[Spotlight] Refresh failed:', err);
    }
  };

  // 1. Supabase Realtime WebSocket subscription
  let ch = getSpotlightRealtimeChannel();
  if (ch) {
    ch.on('broadcast', { event: 'spotlight_sync' }, ({ payload }: any) => {
      if (!isMounted) return;
      if (payload && typeof payload === 'object') {
        const incoming = payload as SpotlightConfig;
        try {
          localStorage.setItem(SPOTLIGHT_STORAGE_KEY, JSON.stringify(incoming));
        } catch {}
        callback(incoming);
      }
    });
  }

  // 2. Listen to local window events
  const handleLocalEvent = (e: CustomEvent<SpotlightConfig>) => {
    if (!isMounted) return;
    if (e.detail) {
      callback(e.detail);
    }
  };

  // 3. Listen to browser window focus / visibility change
  const handleFocus = () => {
    refreshFromSource();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(
      'cinestream_spotlight_updated' as any,
      handleLocalEvent as any
    );
    window.addEventListener('storage', handleFocus);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
  }

  // 4. Polling fallback every 45 seconds
  const intervalId = setInterval(refreshFromSource, 45000);

  return () => {
    isMounted = false;
    if (typeof window !== 'undefined') {
      window.removeEventListener(
        'cinestream_spotlight_updated' as any,
        handleLocalEvent as any
      );
      window.removeEventListener('storage', handleFocus);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    }
    clearInterval(intervalId);
  };
}

/**
 * Helper: Convert a MediaItem into a SpotlightItem
 */
export function mediaItemToSpotlightItem(
  media: MediaItem,
  customProps?: Partial<SpotlightItem>
): SpotlightItem {
  const isMovie = media.type === 'movie';
  return {
    id: `spotlight-${media.id}-${Date.now()}`,
    mediaId: media.id,
    tmdbId: media.tmdbId,
    mediaType: media.type,
    title: media.title,
    titleEn: media.titleEn,
    titleId: media.titleId,
    originalTitle: media.originalTitle,
    poster: media.poster,
    posterEn: media.posterEn,
    posterId: media.posterId,
    backdrop: media.backdrop,
    backdropEn: media.backdropEn,
    backdropId: media.backdropId,
    synopsis: media.synopsis,
    synopsisEn: media.synopsisEn,
    synopsisId: media.synopsisId,
    year: media.year,
    rating: media.rating,
    duration: media.duration,
    genres: media.genres || [],
    director: media.director,
    logoUrl: media.logoUrl,
    trailerUrl: media.trailerUrl,
    trailerYoutubeKey: media.trailerYoutubeKey,
    customBadge: customProps?.customBadge || '⭐ PILIHAN EDITOR',
    customBadgeColor: customProps?.customBadgeColor || 'amber',
    customTagline: customProps?.customTagline || (isMovie ? 'Film Pilihan Kurasi Cinestream' : 'Serial Pilihan Kurasi Cinestream'),
    customBackdrop: customProps?.customBackdrop,
    active: customProps?.active !== undefined ? customProps.active : true,
    order: customProps?.order || 0,
    createdAt: new Date().toISOString(),
    ...customProps,
  };
}

/**
 * Helper: Convert a SpotlightItem back into a fully playable MediaItem for HeroBanner
 */
export function spotlightItemToMediaItem(spotlight: SpotlightItem): MediaItem {
  const isMovie = spotlight.mediaType === 'movie';
  const cleanId = spotlight.mediaId;
  const rawTmdbId = spotlight.tmdbId || Number(String(cleanId).replace(/\D/g, '')) || 550;

  return {
    id: cleanId,
    tmdbId: spotlight.tmdbId,
    title: spotlight.title,
    titleEn: spotlight.titleEn || spotlight.title,
    titleId: spotlight.titleId || spotlight.title,
    originalTitle: spotlight.originalTitle,
    type: (spotlight.mediaType === 'tv' ? 'series' : spotlight.mediaType) as 'movie' | 'series' | 'anime' | 'drama',
    poster: spotlight.poster,
    posterEn: spotlight.posterEn || spotlight.poster,
    posterId: spotlight.posterId || spotlight.poster,
    backdrop: spotlight.customBackdrop || spotlight.backdrop,
    backdropEn: spotlight.customBackdrop || spotlight.backdropEn || spotlight.backdrop,
    backdropId: spotlight.customBackdrop || spotlight.backdropId || spotlight.backdrop,
    synopsis: spotlight.synopsis,
    synopsisEn: spotlight.synopsisEn || spotlight.synopsis,
    synopsisId: spotlight.synopsisId || spotlight.synopsis,
    rating: spotlight.rating || 8.8,
    year: spotlight.year || new Date().getFullYear(),
    releaseDate: `${spotlight.year || new Date().getFullYear()}-01-01`,
    duration: spotlight.duration || (isMovie ? '2h 10m' : '45m per episode'),
    quality: '4K ULTRA HD',
    ageRating: '16+' as any,
    genres: spotlight.genres && spotlight.genres.length > 0 ? spotlight.genres : ['Action', 'Drama'],
    country: 'International',
    director: spotlight.director || 'Cinestream Editor Choice',
    cast: [],
    servers: isMovie ? createMovieServers(rawTmdbId) : [],
    seasons: !isMovie ? [] : undefined,
    trailerUrl: spotlight.trailerUrl,
    trailerYoutubeKey: spotlight.trailerYoutubeKey,
    logoUrl: spotlight.logoUrl,
    featured: true,
    trending: true,
    audioTracks: ['Original', 'English', 'Indonesian'],
    subtitles: ['Indonesian', 'English'],
    // Extended properties consumed by HeroBanner
    isSpotlight: true,
    customBadge: spotlight.customBadge || '⭐ PILIHAN EDITOR',
    customBadgeColor: spotlight.customBadgeColor || 'amber',
    customTagline: spotlight.customTagline,
  };
}
