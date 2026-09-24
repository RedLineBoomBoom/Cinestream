/**
 * Global and Regional Network Air Time Mapping (WIB - UTC+7)
 * Defines standard premiering hours for major streaming services and broadcast networks.
 */
export const NETWORK_TIME_MAP: Record<string, string> = {
  // Global Streaming Services (US/Global VOD drop times converted to WIB UTC+7)
  // Standard 00:00 PT / 03:00 ET = 07:00 UTC = 14:00 WIB
  'paramount+': '14:00',
  'netflix': '14:00',
  'disney+': '15:00',
  'prime video': '07:00',
  'apple tv+': '11:00',
  'max': '08:00',
  'hbo max': '08:00',
  'hbo': '08:00',
  'hulu': '14:00',
  'peacock': '14:00',
  'crunchyroll': '21:00',

  // Japanese networks (Anime & Tokusatsu) - JST UTC+9 (2h ahead of WIB)
  'tv asahi': '07:00',
  'toei channel': '07:30',
  'fuji tv': '07:30',
  'tokyo mx': '22:00',
  'bs11': '22:30',
  'mbs': '15:00',
  'tbs': '23:00',
  'tv tokyo': '16:30',
  'at-x': '20:30',
  'nhk': '17:00',
  'nhk g': '17:00',
  'nhk e': '16:30',

  // Korean networks (KST UTC+9)
  'sbs': '19:05',
  'kbs2': '18:50',
  'kbs': '19:00',
  'mbc': '19:40',
  'tvn': '19:10',
  'jtbc': '20:30',
  'ena': '19:00',

  // Chinese networks (CST UTC+8)
  'tencent video': '09:00',
  'wetv': '09:00',
  'bilibili': '09:00',
  'youku': '11:00',
  'iqiyi': '11:00',
  'mango tv': '19:10',
  'hunan television': '19:10',
  'cctv': '19:00',
  'zhejiang television': '19:20',

  // US broadcast & cable networks (ET UTC-4 / UTC-5)
  'cbs': '07:00',
  'nbc': '07:00',
  'abc': '07:00',
  'fox': '07:00',
  'the cw': '07:00',
  'bravo': '09:00',
  'amc': '08:00',
  'adult swim': '10:00',
  'showtime': '08:00',
  'starz': '08:00',
  'comedy central': '09:30',
  'fx': '09:00',

  // UK & European networks
  'bbc one': '04:30',
  'bbc two': '04:30',
  'bbc': '03:00',
  'itv': '03:00',
  'channel 4': '03:00',
  'das erste': '01:15',
  'zdf': '01:15',
  'orf 1': '01:15',
  'orf 2': '01:15',
  'srf 1': '01:15',
};

export interface AirTimeOptions {
  networks?: Array<string | { name?: string }>;
  genreIds?: number[];
  originalLanguage?: string;
  originCountry?: string[];
  showId?: number;
  useBroadcastTime?: boolean;
}

/**
 * Resolves the estimated/official air time in WIB (UTC+7) string 'HH:mm'.
 */
export function resolveAirTimeWIB(options?: AirTimeOptions): string {
  if (!options) return '14:00';

  const { networks, genreIds = [], originalLanguage, originCountry = [], showId = 0 } = options;

  // 1. Try matching network names
  if (networks && networks.length > 0) {
    for (const netItem of networks) {
      const netName = typeof netItem === 'string' ? netItem : netItem?.name;
      if (!netName) continue;
      const key = netName.toLowerCase().trim();
      for (const [mapKey, timeWIB] of Object.entries(NETWORK_TIME_MAP)) {
        if (key.includes(mapKey) || mapKey.includes(key)) {
          return timeWIB;
        }
      }
    }
  }

  // 2. Region / Genre fallback slots
  const isAnime = genreIds.includes(16) || originalLanguage === 'ja' || originCountry.includes('JP');
  if (isAnime) {
    const animeSlots = ['07:30', '09:00', '16:00', '21:30', '22:00', '22:30', '23:00', '23:30'];
    return animeSlots[Math.abs(showId) % animeSlots.length];
  }

  const isKorean = originalLanguage === 'ko' || originCountry.includes('KR');
  if (isKorean) {
    const kSlots = ['13:20', '18:00', '19:05', '19:40', '20:30', '21:10'];
    return kSlots[Math.abs(showId) % kSlots.length];
  }

  const isChinese = originalLanguage === 'zh' || originCountry.includes('CN');
  if (isChinese) {
    const cSlots = ['09:00', '11:00', '12:00', '17:00', '19:10', '20:00'];
    return cSlots[Math.abs(showId) % cSlots.length];
  }

  // Western / Default TV & Streaming slots (Default 14:00 WIB = 07:00 UTC = 00:00 PDT)
  if (showId > 0) {
    const defaultSlots = ['07:00', '08:00', '09:00', '14:00', '15:00', '19:00', '20:00', '21:00'];
    return defaultSlots[Math.abs(showId) % defaultSlots.length];
  }

  return '14:00';
}

/**
 * Calculates absolute millisecond UTC timestamp of an episode release.
 * If airDate is YYYY-MM-DD, converts the resolved WIB hour (UTC+7) into exact UTC timestamp.
 * If airDate includes ISO or explicit time, uses direct timestamp.
 */
export function getAirDateTimestamp(airDate?: string | null, options?: AirTimeOptions): number | null {
  if (!airDate) return null;
  const trimmed = String(airDate).trim();
  if (!trimmed) return null;

  // 1. Explicit ISO string or string with time (e.g. 2026-09-25T14:00:00Z)
  if (trimmed.includes('T') || (trimmed.includes(':') && trimmed.includes(' '))) {
    const parsed = new Date(trimmed).getTime();
    return isNaN(parsed) ? null : parsed;
  }

  // 2. YYYY-MM-DD
  const dateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateMatch) {
    const year = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10);
    const day = parseInt(dateMatch[3], 10);

    // Official release time aligned with global broadcast & streaming network schedule.
    // Standard streaming originals premiere at 00:00 PT / 03:00 ET = 07:00 UTC = 14:00 WIB.
    const airTimeWIB = resolveAirTimeWIB(options);
    const [hWib, mWib] = airTimeWIB.split(':').map(Number);

    // WIB is UTC+7 -> UTC hour is hWib - 7
    return Date.UTC(year, month - 1, day, (hWib || 14) - 7, mWib || 0, 0, 0);
  }

  // Fallback to standard Date parse
  const fallback = new Date(trimmed).getTime();
  return isNaN(fallback) ? null : fallback;
}

/**
 * Checks whether the release time of an airDate has already passed (released).
 */
export function isAirDateReleased(airDate?: string | null, options?: AirTimeOptions): boolean {
  if (!airDate) return false;
  const targetTs = getAirDateTimestamp(airDate, options);
  if (targetTs === null) return false;
  return Date.now() >= targetTs;
}

/**
 * Checks whether an airDate is still unreleased (in the future).
 */
export function isAirDateUnreleased(airDate?: string | null, options?: AirTimeOptions): boolean {
  return !isAirDateReleased(airDate, options);
}
