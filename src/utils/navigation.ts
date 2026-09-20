export type RouteInfo =
  | { type: 'watch'; mediaId: string; episodeId?: string }
  | { type: 'party'; code: string }
  | { type: 'tab'; tab: string };

export const VALID_TABS = [
  'home',
  'advanced-search',
  'movie',
  'series',
  'anime',
  'drama',
  'watchlist',
  'history',
  'watched',
  'admin',
] as const;

export type ValidTab = (typeof VALID_TABS)[number];

const TAB_ALIASES: Record<string, ValidTab> = {
  movies: 'movie',
  film: 'movie',
  films: 'movie',
  cinema: 'movie',
  tv: 'series',
  show: 'series',
  shows: 'series',
  search: 'advanced-search',
  filter: 'advanced-search',
  filters: 'advanced-search',
  riwayat: 'history',
  dashboard: 'admin',
};

/**
 * Returns a clean relative watch URL (e.g. /watch/dune-part-2?ep=s1e1)
 */
export function getMediaWatchUrl(mediaId: string, episodeId?: string): string {
  const cleanId = encodeURIComponent(mediaId.trim());
  return `/watch/${cleanId}${episodeId ? `?ep=${encodeURIComponent(episodeId.trim())}` : ''}`;
}

/**
 * Returns a clean relative tab URL (e.g. /movie, /series, /)
 */
export function getTabUrl(tabId: string): string {
  if (!tabId || tabId === 'home') return '/';
  return `/${tabId.trim()}`;
}

/**
 * Returns the full absolute URL for sharing or opening in new browser tabs
 */
export function getAbsoluteWatchUrl(mediaId: string, episodeId?: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${getMediaWatchUrl(mediaId, episodeId)}`;
}

/**
 * Returns the full absolute URL for a tab
 */
export function getAbsoluteTabUrl(tabId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${getTabUrl(tabId)}`;
}

/**
 * Parses the current browser URL (both clean pathname and legacy hash)
 */
export function parseCurrentRoute(): RouteInfo {
  if (typeof window === 'undefined') {
    return { type: 'tab', tab: 'home' };
  }

  const pathname = window.location.pathname || '/';
  const hash = window.location.hash || '';
  const search = window.location.search || '';

  // 1. Check Watch route in pathname (e.g. /watch/dune-part-2)
  const watchPathMatch = pathname.match(/^\/watch\/([^/?#]+)/i);
  if (watchPathMatch) {
    const rawId = decodeURIComponent(watchPathMatch[1]);
    const urlParams = new URLSearchParams(search);
    const episodeId = urlParams.get('ep') || undefined;
    return { type: 'watch', mediaId: rawId, episodeId };
  }

  // 2. Check Watch route in hash (e.g. #/watch/dune-part-2) for backwards compatibility
  const watchHashMatch = hash.match(/^#\/watch\/([^/?#]+)(?:\?(.*))?/i);
  if (watchHashMatch) {
    const rawId = decodeURIComponent(watchHashMatch[1]);
    const query = watchHashMatch[2] || '';
    const hashParams = new URLSearchParams(query);
    const episodeId = hashParams.get('ep') || undefined;
    return { type: 'watch', mediaId: rawId, episodeId };
  }

  // 3. Check Watch Party route in pathname or hash (/party/CODE or #/party/CODE)
  const partyPathMatch = pathname.match(/^\/party\/([A-Z0-9]{4,8})/i);
  if (partyPathMatch) {
    return { type: 'party', code: partyPathMatch[1].toUpperCase() };
  }
  const partyHashMatch = hash.match(/^#\/party\/([A-Z0-9]{4,8})/i);
  if (partyHashMatch) {
    return { type: 'party', code: partyHashMatch[1].toUpperCase() };
  }

  // 4. Check clean section tabs in pathname (e.g. /movie, /series, /watchlist)
  const cleanPath = pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  if (cleanPath) {
    if ((VALID_TABS as readonly string[]).includes(cleanPath)) {
      return { type: 'tab', tab: cleanPath };
    }
    if (TAB_ALIASES[cleanPath]) {
      return { type: 'tab', tab: TAB_ALIASES[cleanPath] };
    }
  }

  // 5. Check tabs in legacy hash (e.g. #/series, #watchlist)
  const cleanHash = hash.replace(/^#\/?/, '').split('?')[0].toLowerCase();
  if (cleanHash) {
    if ((VALID_TABS as readonly string[]).includes(cleanHash)) {
      return { type: 'tab', tab: cleanHash };
    }
    if (TAB_ALIASES[cleanHash]) {
      return { type: 'tab', tab: TAB_ALIASES[cleanHash] };
    }
    if (cleanHash.includes('advanced') || cleanHash.includes('filter')) return { type: 'tab', tab: 'advanced-search' };
    if (cleanHash.includes('movie') || cleanHash.includes('film')) return { type: 'tab', tab: 'movie' };
    if (cleanHash.includes('series') || cleanHash.includes('tv')) return { type: 'tab', tab: 'series' };
    if (cleanHash.includes('anime')) return { type: 'tab', tab: 'anime' };
    if (cleanHash.includes('drama')) return { type: 'tab', tab: 'drama' };
    if (cleanHash.includes('watchlist')) return { type: 'tab', tab: 'watchlist' };
    if (cleanHash.includes('watched')) return { type: 'tab', tab: 'watched' };
    if (cleanHash.includes('history') || cleanHash.includes('riwayat')) return { type: 'tab', tab: 'history' };
  }

  // 6. Default to home
  return { type: 'tab', tab: 'home' };
}
