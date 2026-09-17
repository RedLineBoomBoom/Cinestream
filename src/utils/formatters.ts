import type { MediaItem, Server, NextEpisodeAirInfo } from '../types/media';

export function formatTime(seconds: number): string {
  if (isNaN(seconds)) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function formatViews(count: number): string {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  return count.toString();
}

export function getQualityBadgeColor(quality: string): string {
  switch (quality) {
    case '4K ULTRA HD':
      return 'bg-[#E50914]/20 text-white border border-[#E50914]/40 font-semibold tracking-widest text-[9px] uppercase';
    case '1080p FHD':
      return 'bg-white/10 text-slate-200 border border-white/15 tracking-wider text-[9px] uppercase';
    case '720p HD':
      return 'bg-white/5 text-slate-300 border border-white/10 tracking-wider text-[9px] uppercase';
    default:
      return 'bg-white/5 text-slate-400 border border-white/5';
  }
}

export function formatRemainingTime(currentTime: number, duration: number, lang: 'id' | 'en' = 'id'): string {
  const remaining = Math.max(0, duration - currentTime);
  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  if (h > 0) {
    return `${h}${lang === 'en' ? 'h' : 'j'} ${m}m ${lang === 'en' ? 'left' : 'tersisa'}`;
  }
  return `${Math.max(1, m)}m ${lang === 'en' ? 'left' : 'tersisa'}`;
}

export function formatRelativeDate(timestamp: number, lang: 'id' | 'en' = 'id'): string {
  const diff = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 5) return lang === 'en' ? 'Just now' : 'Baru saja';
  if (minutes < 60) return `${minutes} ${lang === 'en' ? 'min ago' : 'menit lalu'}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${lang === 'en' ? 'hours ago' : 'jam lalu'}`;
  const days = Math.floor(hours / 24);
  if (days === 1) return lang === 'en' ? 'Yesterday' : 'Kemarin';
  if (days < 7) return `${days} ${lang === 'en' ? 'days ago' : 'hari lalu'}`;
  return new Date(timestamp).toLocaleDateString(lang === 'en' ? 'en-US' : 'id-ID', {
    month: 'short',
    day: 'numeric',
  });
}

export function parseDurationToSeconds(durationStr?: string | number): number {
  if (!durationStr) return 7200;
  if (typeof durationStr === 'number') {
    return durationStr > 300 ? durationStr : durationStr * 60;
  }
  const str = String(durationStr).trim();
  if (/^\d+$/.test(str)) {
    const num = parseInt(str, 10);
    return num > 300 ? num : num * 60;
  }
  let total = 0;
  const hMatch = str.match(/(\d+)\s*(?:j|h|hr|hour|hours)/i);
  const mMatch = str.match(/(\d+)\s*(?:m|min|mins|minute|minutes)/i);
  if (hMatch) total += parseInt(hMatch[1], 10) * 3600;
  if (mMatch) total += parseInt(mMatch[1], 10) * 60;
  return total > 0 ? total : 7200;
}

export interface SeasonStatusDetail {
  seasonNumber: number;
  isOngoing: boolean;
  isCompleted: boolean;
  statusText: 'ON GOING' | 'COMPLETE';
  label: string;
}

export interface SeriesStatusInfo {
  status: 'ongoing' | 'completed';
  label: 'ON GOING' | 'COMPLETE';
  badgeClass: string;
  isOngoing: boolean;
  releasedEpisodes?: number;
  totalEpisodes?: number;
  progressText?: string;
  currentSeason?: number;
  totalSeasons?: number;
  completedSeasons?: number[];
  ongoingSeason?: number;
  completedSeasonsLabel?: string;
  ongoingSeasonLabel?: string;
  seasonBreakdown?: string;
  seasonsDetail?: SeasonStatusDetail[];
  nextEpisodeToAir?: string;
  nextEpisodeInfo?: NextEpisodeAirInfo;
}

/**
 * Helper to format season numbers into ranges, e.g. [1, 2, 3] -> "S1-S3", [1, 2] -> "S1-S2", [1] -> "S1"
 */
export function formatSeasonRange(seasons: number[]): string {
  if (!seasons || seasons.length === 0) return '';
  const sorted = Array.from(new Set(seasons)).filter((n) => typeof n === 'number' && n > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return '';

  const parts: string[] = [];
  let start = sorted[0];
  let end = start;

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      parts.push(start === end ? `S${start}` : `S${start}-S${end}`);
      start = sorted[i];
      end = start;
    }
  }
  parts.push(start === end ? `S${start}` : `S${start}-S${end}`);
  return parts.join(', ');
}

/**
 * Determine whether a series, anime, or drama is ON GOING or COMPLETE,
 * and calculate which seasons are complete and which season is still ongoing.
 */
export function getSeriesStatus(
  item: {
    type?: string;
    mediaType?: string;
    status?: string;
    isOngoing?: boolean;
    totalEpisodes?: number;
    releasedEpisodes?: number;
    currentSeasonTotalEpisodes?: number;
    currentSeasonReleasedEpisodes?: number;
    nextEpisodeToAir?: string;
    nextEpisodeInfo?: NextEpisodeAirInfo;
    seasons?: Array<{ seasonNumber?: number; episodeCount?: number; episodes?: any[]; name?: string }>;
    year?: number;
    currentSeason?: number;
    totalSeasons?: number;
    completedSeasons?: number[];
    ongoingSeason?: number;
    seasonBreakdown?: string;
  } | null | undefined
): SeriesStatusInfo | null {
  if (!item) return null;

  const type = item.type || item.mediaType;
  if (type === 'movie') return null;

  const currentYear = new Date().getFullYear();

  // Derive season number: explicit field, or from seasons array
  const derivedSeasonNumber = (() => {
    if (item.currentSeason && item.currentSeason > 0) return item.currentSeason;
    if (item.seasons && item.seasons.length > 0) {
      const regular = item.seasons.filter((s) => (s.seasonNumber || 0) > 0);
      if (regular.length > 0) return regular[regular.length - 1].seasonNumber;
    }
    return undefined;
  })();

  const regularSeasonsCount = item.seasons && item.seasons.length > 0
    ? item.seasons.filter((s) => (s.seasonNumber || 0) > 0).length
    : undefined;

  const detectedTotalSeasons = item.totalSeasons || regularSeasonsCount || (derivedSeasonNumber ? Math.max(derivedSeasonNumber, 1) : 1);

  // Helper to build breakdown labels
  const buildResult = (
    isOngoing: boolean,
    relEp?: number,
    totEp?: number,
    progressText?: string,
    currSeasonNum?: number
  ): SeriesStatusInfo => {
    let ongoingSeason = item.ongoingSeason;
    let completedSeasons = item.completedSeasons;

    if (isOngoing) {
      ongoingSeason = ongoingSeason || currSeasonNum || derivedSeasonNumber || detectedTotalSeasons || 1;
      if (!completedSeasons) {
        completedSeasons = ongoingSeason > 1
          ? Array.from({ length: ongoingSeason - 1 }, (_, i) => i + 1)
          : [];
      }
    } else {
      ongoingSeason = undefined;
      if (!completedSeasons) {
        completedSeasons = detectedTotalSeasons > 0
          ? Array.from({ length: detectedTotalSeasons }, (_, i) => i + 1)
          : [1];
      }
    }

    const completedSeasonsLabel = completedSeasons.length > 0
      ? `${formatSeasonRange(completedSeasons)} COMPLETE`
      : undefined;

    const ongoingSeasonLabel = ongoingSeason
      ? `S${ongoingSeason} ON GOING`
      : undefined;

    let seasonBreakdown = item.seasonBreakdown;
    if (!seasonBreakdown) {
      if (completedSeasonsLabel && ongoingSeasonLabel) {
        seasonBreakdown = `${completedSeasonsLabel} • ${ongoingSeasonLabel}`;
      } else if (ongoingSeasonLabel) {
        seasonBreakdown = ongoingSeasonLabel;
      } else if (completedSeasonsLabel) {
        seasonBreakdown = completedSeasonsLabel;
      } else {
        seasonBreakdown = isOngoing ? 'ON GOING' : 'COMPLETE';
      }
    }

    const seasonsDetail: SeasonStatusDetail[] = [];
    const maxSeason = Math.max(detectedTotalSeasons, ongoingSeason || 0, ...(completedSeasons || [1]));
    for (let s = 1; s <= maxSeason; s++) {
      const isThisOngoing = s === ongoingSeason;
      seasonsDetail.push({
        seasonNumber: s,
        isOngoing: isThisOngoing,
        isCompleted: !isThisOngoing,
        statusText: isThisOngoing ? 'ON GOING' : 'COMPLETE',
        label: isThisOngoing ? `S${s} ON GOING` : `S${s} COMPLETE`,
      });
    }

    return {
      status: isOngoing ? 'ongoing' : 'completed',
      label: isOngoing ? 'ON GOING' : 'COMPLETE',
      badgeClass: isOngoing
        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm',
      isOngoing,
      releasedEpisodes: relEp,
      totalEpisodes: totEp,
      progressText,
      currentSeason: isOngoing ? (ongoingSeason || currSeasonNum || derivedSeasonNumber) : undefined,
      totalSeasons: detectedTotalSeasons,
      completedSeasons,
      ongoingSeason,
      completedSeasonsLabel,
      ongoingSeasonLabel,
      seasonBreakdown,
      seasonsDetail,
      nextEpisodeToAir: item.nextEpisodeToAir,
      nextEpisodeInfo: item.nextEpisodeInfo,
    };
  };

  // 1. If explicit isOngoing is provided
  if (typeof item.isOngoing === 'boolean') {
    let isOngoing = item.isOngoing;

    // Safety check: if status explicitly indicates Ended / Finished / Canceled / Complete, it is completed
    const isStatusEnded = item.status && /ended|finished|canceled|cancelled|complete|tamat/i.test(item.status);
    if (isStatusEnded) {
      isOngoing = false;
    } else if (
      isOngoing &&
      item.year &&
      item.year < currentYear - 1 &&
      !item.nextEpisodeToAir &&
      !item.status?.toLowerCase().includes('returning') &&
      !item.status?.toLowerCase().includes('production')
    ) {
      // Historical/older series (e.g. 2007, 2014) without active next episode or returning status are completed
      isOngoing = false;
    }

    const relEp = item.currentSeasonReleasedEpisodes ?? item.releasedEpisodes;
    const totEp = item.currentSeasonTotalEpisodes ?? item.totalEpisodes;

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const hasNextEpInFuture = Boolean(item.nextEpisodeToAir && item.nextEpisodeToAir > todayStr);

    // Critical check: if all episodes of the current/latest season have already been released
    if (
      isOngoing &&
      typeof relEp === 'number' &&
      typeof totEp === 'number' &&
      totEp > 0 &&
      relEp >= totEp &&
      !hasNextEpInFuture
    ) {
      isOngoing = false;
    }

    const progressText = (isOngoing && relEp && totEp && totEp > 0 && relEp < totEp)
      ? `Ep ${relEp}/${totEp}`
      : (isOngoing && relEp ? `Ep ${relEp}` : undefined);

    return buildResult(isOngoing, relEp, totEp, progressText, isOngoing ? derivedSeasonNumber : undefined);
  }

  // 2. Check episodes count in current / latest season
  const relEp = item.currentSeasonReleasedEpisodes ?? item.releasedEpisodes;
  const totEp = item.currentSeasonTotalEpisodes ?? item.totalEpisodes;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const hasNextEpInFuture = Boolean(item.nextEpisodeToAir && item.nextEpisodeToAir > todayStr);

  if (typeof relEp === 'number' && typeof totEp === 'number' && totEp > 0) {
    const isOngoing = relEp < totEp || hasNextEpInFuture;
    const progressText = isOngoing && relEp < totEp ? `Ep ${relEp}/${totEp}` : undefined;
    return buildResult(isOngoing, relEp, totEp, progressText, isOngoing ? derivedSeasonNumber : undefined);
  }

  // 3. Check seasons array if available (MediaItem)
  if (item.seasons && item.seasons.length > 0) {
    const regularSeasons = item.seasons.filter((s) => (s.seasonNumber || 0) > 0);
    const activeSeason = regularSeasons[regularSeasons.length - 1] || item.seasons[0];
    const seasonEpCount = activeSeason?.episodes?.length || activeSeason?.episodeCount || 0;
    const activeSeasonNum = activeSeason?.seasonNumber;

    const hasNextEp = hasNextEpInFuture;
    const isStatusOngoing = item.status && /returning|production|airing|current|running|ongoing|planned/i.test(item.status);
    const isStatusEnded = item.status && /ended|finished|canceled|complete|tamat/i.test(item.status);

    let isOngoing = false;
    if (hasNextEp) {
      isOngoing = true;
    } else if (totEp && seasonEpCount < totEp) {
      isOngoing = true;
    } else if (isStatusEnded) {
      isOngoing = false;
    } else if (totEp && seasonEpCount >= totEp) {
      // All scheduled episodes of active season are out
      isOngoing = false;
    } else if (isStatusOngoing && !totEp) {
      isOngoing = true;
    } else if (item.year && item.year >= currentYear && !isStatusEnded) {
      isOngoing = true;
    }

    const progressText = isOngoing && seasonEpCount > 0 && totEp && seasonEpCount < totEp ? `Ep ${seasonEpCount}/${totEp}` : undefined;

    return buildResult(isOngoing, seasonEpCount, totEp, progressText, isOngoing ? activeSeasonNum : undefined);
  }

  // 4. Status string evaluation
  if (item.status) {
    const lower = item.status.toLowerCase();
    const isEnded = lower.includes('ended') || lower.includes('finished') || lower.includes('complete') || lower.includes('tamat') || lower.includes('canceled');
    const isOngoing = !isEnded && (lower.includes('returning') || lower.includes('production') || lower.includes('airing') || lower.includes('current') || lower.includes('running') || lower.includes('ongoing') || lower.includes('planned'));

    return buildResult(isOngoing, relEp, totEp, relEp ? `Ep ${relEp}` : undefined, isOngoing ? derivedSeasonNumber : undefined);
  }

  // 5. Fallback based on release year
  if (item.year && item.year >= currentYear) {
    return buildResult(true, undefined, undefined, undefined, derivedSeasonNumber);
  }

  return buildResult(false, undefined, undefined, undefined, undefined);
}

export interface ServerBadgeInfo {
  label: string;
  color: string;
}

/**
 * Bidirectional server name localization:
 * Translates server tag descriptions between Indonesian and English seamlessly.
 */
export function formatServerName(name: string, lang: 'id' | 'en' = 'id'): string {
  if (!name) return '';
  if (lang === 'en') {
    return name
      .replace(/\(Anti-Macet 4K\)/gi, '(Buffer-Free HD)')
      .replace(/\(Anti-Macet HD\)/gi, '(Buffer-Free HD)')
      .replace(/\(Anti-Macet\)/gi, '(Buffer-Free)')
      .replace(/\(Anti-Macot\)/gi, '(Buffer-Free)')
      .replace(/\(Ultra Stabil\)/gi, '(Ultra Stable)')
      .replace(/\(Sinema Asia & Anime\)/gi, '(Asian & Anime)')
      .replace(/\(Asia & Anime\)/gi, '(Asian & Anime)')
      .replace(/\(Multi-Sumber & Failover\)/gi, '(Multi-Source & Failover)')
      .replace(/\(Multi-Sumber\)/gi, '(Multi-Source)')
      .replace(/\(Multi-Sub & Cepat\)/gi, '(Multi-Sub & Fast Stream)')
      .replace(/\(Sub Indo Multi-Host\)/gi, '(Multi-Sub Host)')
      .replace(/\(Cadangan Siap Saji\)/gi, '(Instant Backup)')
      .replace(/\(Cadangan\)/gi, '(Backup)')
      .replace(/\(Audio Stereo Jernih\)/gi, '(Crystal Clear Audio)');
  }

  // Indonesian localization
  return name
    .replace(/\(Buffer-Free 4K\)/gi, '(Anti-Macet HD)')
    .replace(/\(Buffer-Free HD\)/gi, '(Anti-Macet HD)')
    .replace(/\(Buffer-Free\)/gi, '(Anti-Macet)')
    .replace(/\(Ultra Stable\)/gi, '(Ultra Stabil)')
    .replace(/\(Asian & Anime\)/gi, '(Sinema Asia & Anime)')
    .replace(/\(Multi-Source & Failover\)/gi, '(Multi-Sumber & Failover)')
    .replace(/\(Multi-Source\)/gi, '(Multi-Sumber)')
    .replace(/\(Multi-Sub & Fast Stream\)/gi, '(Multi-Sub & Cepat)')
    .replace(/\(Multi-Sub Host\)/gi, '(Sub Indo Multi-Host)')
    .replace(/\(Instant Backup\)/gi, '(Cadangan Siap Saji)')
    .replace(/\(Backup\)/gi, '(Cadangan)')
    .replace(/\(Crystal Clear Audio\)/gi, '(Audio Stereo Jernih)');
}

/**
 * Detects whether a media item is an anime (Japanese animation).
 */
export function isAnimeMedia(
  media?: { type?: string; mediaType?: string; genres?: string[]; country?: string } | null
): boolean {
  if (!media) return false;
  const mediaType = (media.type || media.mediaType || '').toLowerCase();
  if (mediaType === 'anime') return true;
  const genres = media.genres || [];
  if (
    genres.some((g) => {
      const l = g.toLowerCase();
      return l.includes('anime') || l.includes('animasi jepang');
    })
  ) {
    return true;
  }
  const country = (media.country || '').toLowerCase();
  if (
    (country.includes('jepang') || country.includes('japan')) &&
    (mediaType === 'series' || genres.some((g) => g.toLowerCase().includes('anim')))
  ) {
    return true;
  }
  return false;
}

/**
 * Detect if a media item is originating from Indonesia (Indonesian movies or TV series).
 */
export function isIndonesianMedia(media?: Partial<MediaItem> | null): boolean {
  if (!media) return false;
  if (media.country && (media.country.toLowerCase().includes('indonesia') || media.country.toUpperCase() === 'ID')) {
    return true;
  }
  if (media.originCountry) {
    if (Array.isArray(media.originCountry) && media.originCountry.some((c) => typeof c === 'string' && c.toUpperCase() === 'ID')) {
      return true;
    }
    if (typeof media.originCountry === 'string' && (media.originCountry as string).toUpperCase() === 'ID') {
      return true;
    }
  }
  if (media.originalLanguage && (media.originalLanguage.toLowerCase() === 'id' || media.originalLanguage.toLowerCase() === 'ind')) {
    return true;
  }
  return false;
}

/**
 * Resolves the default server for watching movies, TV series, or anime.
 * - For Indonesian Movies/Series: Strictly prioritizes Server 5 (SmashyStream: Sub Indo Multi-Host).
 * - For Anime: Prioritizes Server 3 (2Embed: Original Japanese Audio & Asian Cinema), then Server 5 (SmashyStream: Sub Indo / JP Audio).
 * - For Standard Movies/Series: Prioritizes Server 2 (AutoEmbed Ultra / index 1), with graceful fallback to index 0.
 */
export function getDefaultServer(
  servers?: Server[],
  fallback?: Server[],
  media?: Partial<MediaItem> | null
): Server {
  const list = servers && servers.length > 0 ? servers : (fallback && fallback.length > 0 ? fallback : []);
  if (list.length === 0) {
    return {
      id: 'srv-autoembed',
      name: 'Server 2 • AutoEmbed Ultra (Anti-Macet HD)',
      speed: '8 ms',
      quality: '1080p / 60fps HD',
      url: '',
      status: 'online',
      isEmbed: true,
    };
  }

  // 1. KHUSUS Film & Series Indonesia: Prioritaskan Server 5 (SmashyStream: Sub Indo Multi-Host) sebagai andalan utama
  if (isIndonesianMedia(media)) {
    const server5 = list.find((s) => {
      const id = (s.id || '').toLowerCase();
      const name = (s.name || '').toLowerCase();
      return id.includes('smashy') || id.includes('vidsrc-pro') || name.includes('server 5') || name.includes('server-5') || id.includes('server-5');
    });
    if (server5) return server5;

    const server1 = list.find((s) => {
      const id = (s.id || '').toLowerCase();
      const name = (s.name || '').toLowerCase();
      return id.includes('vidsrc') || name.includes('server 1') || name.includes('server-1');
    });
    if (server1) return server1;

    const server4 = list.find((s) => {
      const id = (s.id || '').toLowerCase();
      const name = (s.name || '').toLowerCase();
      return id.includes('multiembed') || name.includes('server 4') || name.includes('server-4');
    });
    if (server4) return server4;

    const server3 = list.find((s) => {
      const id = (s.id || '').toLowerCase();
      const name = (s.name || '').toLowerCase();
      return id.includes('2embed') || name.includes('server 3') || name.includes('server-3');
    });
    if (server3) return server3;
  }

  // 2. KHUSUS Anime: Prioritaskan Server 3 (2Embed: Original Japanese Audio), lalu Server 5 (SmashyStream: Sub Indo Multi-Host)
  if (isAnimeMedia(media)) {
    const serverAnime = list.find((s) => {
      const id = (s.id || '').toLowerCase();
      const name = (s.name || '').toLowerCase();
      return id.includes('2embed') || name.includes('2embed') || name.includes('anime') || name.includes('asia');
    });
    if (serverAnime) return serverAnime;

    const serverPro = list.find((s) => {
      const id = (s.id || '').toLowerCase();
      const name = (s.name || '').toLowerCase();
      return id.includes('smashy') || id.includes('vidsrc-pro') || name.includes('server 5') || name.includes('server-5');
    });
    if (serverPro) return serverPro;
  }

  // 3. Film / Series Standar (Hollywood & Internasional): Prioritaskan Server 2 (AutoEmbed Ultra)
  const server2 = list.find((s) => {
    const id = (s.id || '').toLowerCase();
    const name = (s.name || '').toLowerCase();
    return id.includes('autoembed') || name.includes('server 2') || name.includes('server-2');
  });
  if (server2) return server2;

  // 4. Return index 1 (Server 2 in 0-indexed list) if present, else fallback to index 0
  return list[1] || list[0];
}

/**
 * Get distinct feature badge for servers
 */
export function getServerBadgeInfo(
  server: { id?: string; name?: string },
  lang: 'id' | 'en' = 'id',
  isAnime = false,
  isIndonesian = false
): { label: string; color: string } {
  const id = (server.id || '').toLowerCase();
  const name = (server.name || '').toLowerCase();

  // Indonesian cinema badges
  if (isIndonesian) {
    if (id.includes('smashy') || id.includes('vidsrc-pro') || name.includes('smashy') || name.includes('server 5')) {
      return {
        label: lang === 'en' ? '🇮🇩 Indo Cinema (Primary)' : '🇮🇩 Utama Sinema Indo (Server 5)',
        color: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30 font-bold',
      };
    }
    if (id.includes('vidsrc') || name.includes('vidsrc')) {
      return {
        label: lang === 'en' ? '🔥 Ultra Stable' : '🔥 Ultra Stabil',
        color: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
      };
    }
    if (id.includes('multiembed') || name.includes('multiembed') || name.includes('server 4')) {
      return {
        label: lang === 'en' ? '🔄 Multi-Source Failover' : '🔄 Multi-Sumber Cadangan',
        color: 'text-blue-300 bg-blue-500/10 border-blue-500/20',
      };
    }
    if (id.includes('2embed') || name.includes('2embed')) {
      return {
        label: lang === 'en' ? '🌏 Asian Backup' : '🌏 Cadangan Asia',
        color: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20',
      };
    }
    if (id.includes('autoembed') || name.includes('autoembed')) {
      return {
        label: lang === 'en' ? '⚡ Global / Hollywood Only' : '⚡ Khusus Film Global',
        color: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
      };
    }
  }

  // Anime-tailored audio and language badges
  if (isAnime) {
    if (id.includes('2embed') || name.includes('2embed')) {
      return {
        label: lang === 'en' ? '🇯🇵 Original JP Audio' : '🇯🇵 Audio Asli Jepang',
        color: 'text-cyan-300 bg-cyan-500/15 border-cyan-500/30 font-bold',
      };
    }
    if (id.includes('vidsrc-pro') || id.includes('smashy') || name.includes('vidsrc pro') || name.includes('server 5')) {
      return {
        label: lang === 'en' ? '⚡ Fast Multi-Sub' : '⚡ Multi-Sub Cepat',
        color: 'text-cyan-300 bg-cyan-500/15 border-cyan-500/30 font-semibold',
      };
    }
    if (id.includes('vidlink') || name.includes('vidlink')) {
      return {
        label: '🔊 Dual Audio (JP/EN)',
        color: 'text-amber-400 bg-amber-500/15 border-amber-500/30 font-semibold',
      };
    }
    if (id.includes('autoembed') || name.includes('autoembed')) {
      return {
        label: lang === 'en' ? '⚡ 60fps (Dub Eng)' : '⚡ 60fps (Dub Eng)',
        color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
      };
    }
    if (id.includes('vidsrc') || name.includes('vidsrc')) {
      return {
        label: lang === 'en' ? '🔥 Ultra Stable (Dub Eng)' : '🔥 Ultra Stabil (Dub Eng)',
        color: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
      };
    }
  }

  // Standard non-anime badges
  if (id.includes('vidsrc-pro') || id.includes('smashy') || name.includes('vidsrc pro') || name.includes('server 5')) {
    return {
      label: lang === 'en' ? '🌐 Multi-Sub Fast' : '⚡ Multi-Sub Cepat',
      color: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20',
    };
  }
  if (id.includes('vidsrc') || name.includes('vidsrc')) {
    return {
      label: lang === 'en' ? '🔥 Ultra Stable' : '🔥 Ultra Stabil',
      color: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
    };
  }
  if (id.includes('autoembed') || name.includes('autoembed')) {
    return {
      label: '⚡ 60fps HD',
      color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
    };
  }
  if (id.includes('2embed') || name.includes('2embed')) {
    return {
      label: lang === 'en' ? '🌏 Asian & Anime' : '🌏 Asia & Anime',
      color: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20',
    };
  }
  if (id.includes('multiembed') || name.includes('multiembed') || name.includes('multistream')) {
    return {
      label: lang === 'en' ? '🛡️ Multi-Source' : '🛡️ Multi-Sumber',
      color: 'text-purple-300 bg-purple-500/10 border-purple-500/20',
    };
  }
  if (id.includes('vidlink') || name.includes('vidlink')) {
    return {
      label: lang === 'en' ? '🔊 Stereo Audio HD' : '🔊 Audio Stereo Jernih',
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20 font-semibold',
    };
  }
  return {
    label: lang === 'en' ? '🔄 Backup' : '🔄 Cadangan',
    color: 'text-blue-300 bg-blue-500/10 border-blue-500/20',
  };
}

const GENRE_TRANSLATIONS: Record<string, { id: string; en: string }> = {
  // TMDB Standard Movie & TV
  action: { id: 'Aksi', en: 'Action' },
  aksi: { id: 'Aksi', en: 'Action' },
  adventure: { id: 'Petualangan', en: 'Adventure' },
  petualangan: { id: 'Petualangan', en: 'Adventure' },
  'action & adventure': { id: 'Aksi & Petualangan', en: 'Action & Adventure' },
  'aksi & petualangan': { id: 'Aksi & Petualangan', en: 'Action & Adventure' },
  animation: { id: 'Animasi', en: 'Animation' },
  animasi: { id: 'Animasi', en: 'Animation' },
  anime: { id: 'Anime', en: 'Anime' },
  comedy: { id: 'Komedi', en: 'Comedy' },
  komedi: { id: 'Komedi', en: 'Comedy' },
  crime: { id: 'Kriminal', en: 'Crime' },
  kriminal: { id: 'Kriminal', en: 'Crime' },
  documentary: { id: 'Dokumenter', en: 'Documentary' },
  dokumenter: { id: 'Dokumenter', en: 'Documentary' },
  drama: { id: 'Drama', en: 'Drama' },
  family: { id: 'Keluarga', en: 'Family' },
  keluarga: { id: 'Keluarga', en: 'Family' },
  fantasy: { id: 'Fantasi', en: 'Fantasy' },
  fantasi: { id: 'Fantasi', en: 'Fantasy' },
  history: { id: 'Sejarah', en: 'History' },
  sejarah: { id: 'Sejarah', en: 'History' },
  horror: { id: 'Horor', en: 'Horror' },
  horor: { id: 'Horor', en: 'Horror' },
  music: { id: 'Musik', en: 'Music' },
  musik: { id: 'Musik', en: 'Music' },
  mystery: { id: 'Misteri', en: 'Mystery' },
  misteri: { id: 'Misteri', en: 'Mystery' },
  romance: { id: 'Romantis', en: 'Romance' },
  romantis: { id: 'Romantis', en: 'Romance' },
  'sci-fi': { id: 'Sci-Fi', en: 'Sci-Fi' },
  scifi: { id: 'Sci-Fi', en: 'Sci-Fi' },
  'science fiction': { id: 'Fiksi Ilmiah', en: 'Sci-Fi' },
  'fiksi ilmiah': { id: 'Fiksi Ilmiah', en: 'Sci-Fi' },
  'sci-fi & fantasy': { id: 'Sci-Fi & Fantasi', en: 'Sci-Fi & Fantasy' },
  'sci-fi & fantasi': { id: 'Sci-Fi & Fantasi', en: 'Sci-Fi & Fantasy' },
  'tv movie': { id: 'Film TV', en: 'TV Movie' },
  'film tv': { id: 'Film TV', en: 'TV Movie' },
  thriller: { id: 'Thriller', en: 'Thriller' },
  war: { id: 'Perang', en: 'War' },
  perang: { id: 'Perang', en: 'War' },
  'war & politics': { id: 'Perang & Politik', en: 'War & Politics' },
  'perang & politik': { id: 'Perang & Politik', en: 'War & Politics' },
  western: { id: 'Western', en: 'Western' },
  biography: { id: 'Biografi', en: 'Biography' },
  biografi: { id: 'Biografi', en: 'Biography' },
  supernatural: { id: 'Supranatural', en: 'Supernatural' },
  supranatural: { id: 'Supranatural', en: 'Supernatural' },
  kids: { id: 'Anak-anak', en: 'Kids' },
  'anak-anak': { id: 'Anak-anak', en: 'Kids' },
  news: { id: 'Berita', en: 'News' },
  berita: { id: 'Berita', en: 'News' },
  reality: { id: 'Reality', en: 'Reality' },
  soap: { id: 'Sinetron', en: 'Soap' },
  sinetron: { id: 'Sinetron', en: 'Soap' },
  talk: { id: 'Talkshow', en: 'Talk' },
  talkshow: { id: 'Talkshow', en: 'Talk' },
  short: { id: 'Film Pendek', en: 'Short' },
  'film pendek': { id: 'Film Pendek', en: 'Short' },
  musical: { id: 'Musikal', en: 'Musical' },
  musikal: { id: 'Musikal', en: 'Musical' },
  sport: { id: 'Olahraga', en: 'Sport' },
  olahraga: { id: 'Olahraga', en: 'Sport' },

  // UI labels & General
  'semua genre': { id: 'Semua Genre', en: 'All Genres' },
  'all genres': { id: 'Semua Genre', en: 'All Genres' },
  'popular cinema': { id: 'Sinema Populer', en: 'Popular Cinema' },
  'sinema populer': { id: 'Sinema Populer', en: 'Popular Cinema' },
  cinema: { id: 'Sinema', en: 'Cinema' },
  sinema: { id: 'Sinema', en: 'Cinema' },
  'streaming kustom': { id: 'Streaming Kustom', en: 'Custom Stream' },
  'custom stream': { id: 'Streaming Kustom', en: 'Custom Stream' },
};

/**
 * Translates a genre name automatically between Indonesian and English based on the active website language.
 */
export function formatGenre(genre?: string, lang: 'id' | 'en' = 'id'): string {
  if (!genre) return '';
  const trimmed = genre.trim();
  const lower = trimmed.toLowerCase();

  // Direct dictionary hit
  if (GENRE_TRANSLATIONS[lower]) {
    return GENRE_TRANSLATIONS[lower][lang];
  }

  // Handle prefix / truncated strings (e.g. "Aksi & Petualang..." or "Action & Adventur...")
  if (lower.startsWith('aksi & petualang') || lower.startsWith('action & adventur')) {
    return lang === 'en' ? 'Action & Adventure' : 'Aksi & Petualangan';
  }
  if (lower.startsWith('sci-fi & fantas') || lower.startsWith('sci-fi & pantas')) {
    return lang === 'en' ? 'Sci-Fi & Fantasy' : 'Sci-Fi & Fantasi';
  }
  if (lower.startsWith('perang & politik') || lower.startsWith('war & politic')) {
    return lang === 'en' ? 'War & Politics' : 'Perang & Politik';
  }

  // Compound delimited with comma or slash
  if (trimmed.includes(',')) {
    return trimmed.split(',').map((part) => formatGenre(part.trim(), lang)).join(', ');
  }
  if (trimmed.includes('/')) {
    return trimmed.split('/').map((part) => formatGenre(part.trim(), lang)).join(' / ');
  }

  return trimmed;
}

/**
 * Translates an array of genres automatically to the target language.
 */
export function formatGenres(genres: string[] | undefined, lang: 'id' | 'en' = 'id'): string[] {
  if (!genres || !Array.isArray(genres)) return [];
  return genres.map((g) => formatGenre(g, lang));
}

const COUNTRY_TRANSLATIONS: Record<string, { id: string; en: string }> = {
  'semua negara': { id: 'Semua Negara', en: 'All Countries' },
  'all countries': { id: 'Semua Negara', en: 'All Countries' },
  'indonesia': { id: 'Indonesia', en: 'Indonesia' },
  'amerika serikat': { id: 'Amerika Serikat', en: 'United States' },
  'united states': { id: 'Amerika Serikat', en: 'United States' },
  'korea selatan': { id: 'Korea Selatan', en: 'South Korea' },
  'south korea': { id: 'Korea Selatan', en: 'South Korea' },
  'jepang': { id: 'Jepang', en: 'Japan' },
  'japan': { id: 'Jepang', en: 'Japan' },
  'inggris': { id: 'Inggris', en: 'United Kingdom' },
  'united kingdom': { id: 'Inggris', en: 'United Kingdom' },
  'inggris (uk)': { id: 'Inggris (UK)', en: 'United Kingdom' },
  'prancis': { id: 'Prancis', en: 'France' },
  'france': { id: 'Prancis', en: 'France' },
  'jerman': { id: 'Jerman', en: 'Germany' },
  'germany': { id: 'Jerman', en: 'Germany' },
  'spanyol': { id: 'Spanyol', en: 'Spain' },
  'spain': { id: 'Spanyol', en: 'Spain' },
  'italia': { id: 'Italia', en: 'Italy' },
  'italy': { id: 'Italia', en: 'Italy' },
  'kanada': { id: 'Kanada', en: 'Canada' },
  'canada': { id: 'Kanada', en: 'Canada' },
  'australia': { id: 'Australia', en: 'Australia' },
  'india': { id: 'India', en: 'India' },
  'china': { id: 'China', en: 'China' },
  'thailand': { id: 'Thailand', en: 'Thailand' },
  'hong kong': { id: 'Hong Kong', en: 'Hong Kong' },
};

/**
 * Translates country names between Indonesian and English based on active language.
 */
export function formatCountry(country?: string, lang: 'id' | 'en' = 'id'): string {
  if (!country) return '';
  const trimmed = country.trim();
  const lower = trimmed.toLowerCase();
  if (COUNTRY_TRANSLATIONS[lower]) {
    return COUNTRY_TRANSLATIONS[lower][lang];
  }
  return country;
}

/**
 * Formats filter year label between Indonesian and English.
 */
export function formatYearFilter(year?: string, lang: 'id' | 'en' = 'id'): string {
  if (!year) return '';
  if (year === 'Semua Tahun' || year.toLowerCase() === 'all years') {
    return lang === 'en' ? 'All Years' : 'Semua Tahun';
  }
  return year;
}


/**
 * Regex detecting non-Latin characters (Hangul, Tamil, Devanagari, Hanzi, Kanji/Kana, Cyrillic, Thai, Arabic, etc.)
 */
export const NON_LATIN_REGEX = /[^\u0000-\u024F\u1E00-\u1EFF\s\d\p{P}\p{S}\u200B-\u200F\uFEFF]/u;

/**
 * Get the localized title of a media item based on active language and origin country.
 * When website language is Indonesian ('id'):
 * - Movies and series from Indonesia are strictly displayed using their authentic Indonesian titles.
 * - International movies/series with raw non-Latin titles (Korean Hangul, Tamil, Chinese, Japanese, etc.)
 *   strictly fallback to official Latin / English international titles to prevent reader confusion.
 */
export function getMediaTitle(media?: Partial<MediaItem> | null, lang: 'id' | 'en' = 'id'): string {
  if (!media) return '';
  const isIndo = isIndonesianMedia(media);

  if (lang === 'id') {
    if (isIndo) {
      if (media.titleId && media.titleId.trim()) {
        return media.titleId.trim();
      }
      if (media.originalTitle && media.originalTitle.trim()) {
        // Strip trailing year in parenthesis, e.g. "Agak Laen (2024)" -> "Agak Laen"
        return media.originalTitle.replace(/\s*\(\d{4}\)$/, '').trim();
      }
      return media.title || '';
    }

    // For foreign / international media when viewing in Indonesian:
    // 1. If media has a valid Latin titleId (translated to Indonesian in Latin script), use it:
    if (media.titleId && media.titleId.trim() && !NON_LATIN_REGEX.test(media.titleId)) {
      return media.titleId.trim();
    }
    // 2. If titleId contains foreign non-Latin script (Hangul, Tamil, Kanji, Cyrillic, etc.),
    // NEVER display foreign non-Latin script to Indonesian users! Fallback to Latin international title:
    if (media.titleEn && media.titleEn.trim() && !NON_LATIN_REGEX.test(media.titleEn)) {
      return media.titleEn.trim();
    }
    if (media.originalTitle && media.originalTitle.trim() && !NON_LATIN_REGEX.test(media.originalTitle)) {
      return media.originalTitle.replace(/\s*\(\d{4}\)$/, '').trim();
    }
    if (media.title && media.title.trim() && !NON_LATIN_REGEX.test(media.title)) {
      return media.title.trim();
    }

    // Final fallback if all titles happen to have non-Latin characters
    return media.titleEn?.trim() || media.titleId?.trim() || media.title?.trim() || '';
  }

  // English
  if (media.titleEn && media.titleEn.trim() && !NON_LATIN_REGEX.test(media.titleEn)) {
    return media.titleEn.trim();
  }
  if (media.originalTitle && media.originalTitle.trim() && !NON_LATIN_REGEX.test(media.originalTitle)) {
    return media.originalTitle.replace(/\s*\(\d{4}\)$/, '').trim();
  }
  if (media.title && media.title.trim() && !NON_LATIN_REGEX.test(media.title)) {
    return media.title.trim();
  }
  return media.titleEn?.trim() || media.title?.trim() || '';
}

/**
 * Get the localized poster / cover photo of a media item based on active language.
 * When website language is Indonesian ('id'), Indonesian movies/series display their authentic Indonesian poster.
 */
export function getMediaPoster(media?: Partial<MediaItem> | null, lang: 'id' | 'en' = 'id'): string {
  if (!media) return '';
  if (lang === 'id') {
    return media.posterId || media.poster || '';
  }
  return media.posterEn || media.poster || '';
}

/**
 * Get the localized backdrop of a media item based on active language.
 * Uses a stable canonical backdrop so changing UI language does not cause
 * the movie background or hero banner to swap photos.
 */
export function getMediaBackdrop(media?: Partial<MediaItem> | null, _lang: 'id' | 'en' = 'id'): string {
  if (!media) return '';
  return media.backdrop || media.backdropEn || media.backdropId || media.poster || '';
}

/**
 * Get the localized synopsis of a media item based on active language.
 */
export function getMediaSynopsis(media?: Partial<MediaItem> | null, lang: 'id' | 'en' = 'id'): string {
  if (!media) return '';
  if (lang === 'id') {
    return media.synopsisId || media.synopsis || media.synopsisEn || '';
  }
  return media.synopsisEn || media.synopsis || media.synopsisId || '';
}

/**
 * Format duration for display on media cards:
 * - For movies: formats total duration, e.g. "2j 42m" (ID) or "2h 42m" (EN).
 * - For series/anime/drama: formats per-episode duration, e.g. "58m / ep" or "1j 18m / ep" (ID) or "1h 18m / ep" (EN).
 */
export function formatMediaDuration(
  item?: {
    type?: string;
    mediaType?: string;
    duration?: string;
    episodeDuration?: string;
    episodeLength?: number;
    seasons?: Array<{ episodes?: Array<{ duration?: string }> }>;
    genres?: string[];
  } | null,
  language: 'id' | 'en' = 'id'
): string {
  if (!item) return '';

  const isMovie = (item.type || item.mediaType) === 'movie';
  const genresList = (item.genres || []).map((g) => (typeof g === 'string' ? g.toLowerCase() : ''));

  // 1. Movie Duration
  if (isMovie) {
    if (item.duration) {
      const raw = item.duration.trim();
      // If it's in format "163 min" or "115 Menit"
      if (/^\d+\s*(min|menit|mins)$/i.test(raw)) {
        const mins = parseInt(raw.replace(/\D/g, ''), 10);
        if (mins > 0) {
          const h = Math.floor(mins / 60);
          const m = mins % 60;
          const hUnit = language === 'en' ? 'h' : 'j';
          return h > 0 ? `${h}${hUnit} ${m}m` : `${m}m`;
        }
      }
      if (language === 'en') {
        return raw.replace(/j\b/g, 'h').replace(/Menit/gi, 'm').replace(/menit/gi, 'm');
      }
      return raw.replace(/h\b/g, 'j').replace(/min\b/gi, 'm');
    }

    // Universal fallback: Every single movie will ALWAYS have a realistic runtime!
    if (genresList.some((g) => g.includes('anim') || g.includes('kartun'))) {
      return language === 'en' ? '1h 38m' : '1j 38m';
    }
    if (genresList.some((g) => g.includes('action') || g.includes('sci-fi') || g.includes('adventure') || g.includes('petualang'))) {
      return language === 'en' ? '2h 12m' : '2j 12m';
    }
    if (genresList.some((g) => g.includes('horror') || g.includes('thriller') || g.includes('horor'))) {
      return language === 'en' ? '1h 36m' : '1j 36m';
    }
    if (genresList.some((g) => g.includes('comedy') || g.includes('romance') || g.includes('komedi') || g.includes('romantis'))) {
      return language === 'en' ? '1h 44m' : '1j 44m';
    }
    if (genresList.some((g) => g.includes('drama') || g.includes('crime') || g.includes('mystery') || g.includes('misteri'))) {
      return language === 'en' ? '1h 58m' : '1j 58m';
    }
    return language === 'en' ? '1h 52m' : '1j 52m';
  }

  // 2. Series / Anime / Drama: Duration PER EPISODE
  if (item.episodeDuration) {
    const epDur = item.episodeDuration.trim();
    if (/^\d+\s*(min|menit|mins)$/i.test(epDur)) {
      const mins = parseInt(epDur.replace(/\D/g, ''), 10);
      if (mins > 0) {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        const hUnit = language === 'en' ? 'h' : 'j';
        const formatted = h > 0 ? (m > 0 ? `${h}${hUnit} ${m.toString().padStart(2, '0')}m` : `${h}${hUnit}`) : `${m}m`;
        return `${formatted} / ep`;
      }
    }
    const withEp = epDur.includes('/ ep') ? epDur : `${epDur} / ep`;
    if (language === 'en') {
      return withEp
        .replace(/j\b/g, 'h')
        .replace(/\s*menit/gi, 'm')
        .replace(/\s*mins?/gi, 'm');
    }
    return withEp
      .replace(/h\b/g, 'j')
      .replace(/\s*menit/gi, 'm')
      .replace(/\s*mins?/gi, 'm');
  }

  // Check if first episode has duration defined
  const firstEp = item.seasons?.[0]?.episodes?.[0]?.duration;
  if (firstEp) {
    const cleaned = firstEp
      .replace(/\s*Menit/gi, 'm')
      .replace(/\s*mins?/gi, 'm')
      .trim();
    const formatted = language === 'en' ? cleaned.replace(/j\b/g, 'h') : cleaned;
    return formatted.includes('/ ep') ? formatted : `${formatted} / ep`;
  }

  // Check if item.duration already has per-episode info
  if (item.duration) {
    const raw = item.duration.trim();
    if (raw.includes('/ ep') || raw.includes('/ eps') || raw.includes('per ep')) {
      return language === 'en' ? raw.replace(/j\b/g, 'h') : raw;
    }
    // If it's pure minutes like "45m" or "50m" (and not "10 Episode" or "1 Musim")
    if (/^\d+\s*m$/i.test(raw) || /^\d+\s*menit$/i.test(raw) || /^\d+\s*min$/i.test(raw)) {
      const mins = raw.replace(/\D/g, '');
      return `${mins}m / ep`;
    }
  }

  // Check if anime/series item has episodeLength in minutes
  if (item.episodeLength && typeof item.episodeLength === 'number' && item.episodeLength > 0) {
    return `${item.episodeLength}m / ep`;
  }

  // Universal fallback: Every single series/anime/drama will ALWAYS have a realistic per-episode runtime!
  const isAnime = (item.type || item.mediaType) === 'anime' || genresList.some((g) => g.includes('anim'));
  if (isAnime) {
    return '24m / ep';
  }
  const isDrama = (item.type || item.mediaType) === 'drama' || genresList.some((g) => g.includes('drama') || g.includes('romance'));
  if (isDrama) {
    return language === 'en' ? '1h 05m / ep' : '1j 05m / ep';
  }
  return '52m / ep';
}

