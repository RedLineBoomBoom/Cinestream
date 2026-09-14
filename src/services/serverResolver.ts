import type { Server, MediaItem } from '../types/media';
import { formatServerName } from '../utils/formatters';

export interface AutoResolveResult {
  bestServer: Server;
  cleanName: string;
  reason: string;
  latencyMs: number;
}

/**
 * Intelligently probes and selects the best streaming server for the current media item.
 * Evaluates domain reliability, content affinity (e.g. Asian Drama vs Hollywood),
 * and executes live reachability ping probes in parallel.
 */
export async function resolveBestServer(options: {
  servers: Server[];
  currentServerId: string;
  media?: Partial<MediaItem> | null;
  failedServerIds?: Set<string>;
  lang?: 'id' | 'en';
}): Promise<AutoResolveResult> {
  const { servers, currentServerId, media, failedServerIds = new Set(), lang = 'id' } = options;

  if (!servers || servers.length === 0) {
    throw new Error('No servers provided for resolution');
  }

  if (servers.length === 1) {
    const rawClean = servers[0].name.split('•')[1]?.trim() || servers[0].name;
    const clean = formatServerName(rawClean, lang);
    return {
      bestServer: servers[0],
      cleanName: clean,
      reason: lang === 'en' ? 'Default Streaming Engine' : 'Jalur Utama Sinema',
      latencyMs: 0,
    };
  }

  // 1. Determine Content Category (Indonesian vs Anime vs Asian Drama vs Western / General)
  const countryStr = (media?.country || '').toLowerCase();
  const genresList = media?.genres || [];
  const genreStr = genresList.join(' ').toLowerCase();

  const isIndo =
    countryStr.includes('indonesia') ||
    countryStr === 'id' ||
    (Array.isArray(media?.originCountry) && media?.originCountry.some((c) => c.toUpperCase() === 'ID')) ||
    media?.originalLanguage?.toLowerCase() === 'id';

  const isAnime =
    !isIndo &&
    (media?.type === 'anime' ||
    genreStr.includes('anime') ||
    genreStr.includes('anim') ||
    ((countryStr.includes('jepang') || countryStr.includes('japan')) && (media?.type === 'series' || genreStr.includes('anim'))));

  const isAsian =
    isIndo ||
    isAnime ||
    countryStr.includes('jepang') ||
    countryStr.includes('japan') ||
    countryStr.includes('korea') ||
    countryStr.includes('china') ||
    countryStr.includes('tiongkok') ||
    countryStr.includes('taiwan') ||
    countryStr.includes('thailand') ||
    countryStr.includes('india') ||
    genreStr.includes('drakor') ||
    genreStr.includes('asia') ||
    media?.type === 'drama';

  // 2. Candidate pool filtering (exclude currently failing server and marked failures)
  let candidates = servers.filter((s) => s.id !== currentServerId && !failedServerIds.has(s.id));
  if (candidates.length === 0) {
    // If all alternatives were exhausted, reset failed history except currently active
    candidates = servers.filter((s) => s.id !== currentServerId);
    if (candidates.length === 0) {
      candidates = [...servers];
    }
  }

  // 3. Domain Scoring Matrix
  const scoredList = candidates.map((srv) => {
    const id = (srv.id || '').toLowerCase();
    const url = (srv.url || '').toLowerCase();
    let baseScore = 50;

    if (id.includes('smashy') || url.includes('smashystream')) {
      // Multi-host aggregator with Indonesian subtitle streams & primary host for Indonesian media
      baseScore += isIndo ? 75 : isAnime ? 50 : isAsian ? 40 : 30;
    } else if (id.includes('2embed') || url.includes('2embed')) {
      // 2Embed has proven unmatched coverage for Asian drama & Anime original Japanese audio
      baseScore += isIndo ? 35 : isAnime ? 65 : isAsian ? 55 : 35;
    } else if (id.includes('vidlink') || url.includes('vidlink')) {
      // VidLink supports dual audio track switching
      baseScore += isAnime ? 35 : 22;
    } else if (id.includes('vidsrc') || url.includes('vidsrc')) {
      // VidSrc has massive global library for Hollywood and worldwide titles
      baseScore += isIndo ? 20 : isAnime ? 25 : isAsian ? 42 : 55;
    } else if (id.includes('autoembed') || url.includes('autoembed')) {
      // Ultra-fast CDN 4K, but lacks Indonesian licenses and serves English dubs for Anime
      baseScore += isIndo ? -35 : isAnime ? -40 : isAsian ? -30 : 50;
    } else if (id.includes('multiembed') || url.includes('multiembed')) {
      baseScore += 28;
    }

    return { server: srv, baseScore };
  });

  // 4. Parallel Live Reachability / Latency Probe
  const probeResults = await Promise.all(
    scoredList.map(async (item) => {
      const t0 = performance.now();
      try {
        await fetch(item.server.url, {
          mode: 'no-cors',
          signal: AbortSignal.timeout(1800),
        });
        const latency = Math.round(performance.now() - t0);
        const latencyBonus = Math.max(0, Math.round(25 - latency / 80));
        return {
          ...item,
          totalScore: item.baseScore + latencyBonus,
          latency,
          isHealthy: true,
        };
      } catch {
        return {
          ...item,
          totalScore: item.baseScore - 60,
          latency: 9999,
          isHealthy: false,
        };
      }
    })
  );

  // 5. Select Champion Server
  probeResults.sort((a, b) => b.totalScore - a.totalScore);
  const winner = probeResults[0];

  const rawClean = winner.server.name.split('•')[1]?.trim() || winner.server.name;
  const cleanName = formatServerName(rawClean, lang);
  let reason = '';
  if (isIndo && winner.server.id.includes('smashy')) {
    reason = lang === 'en' ? 'Primary Server for Indonesian Cinema' : 'Jalur Prioritas Sinema & Serial Indonesia';
  } else if (isAnime && winner.server.id.includes('2embed')) {
    reason = lang === 'en' ? 'Original Japanese Audio (Subbed)' : 'Prioritas Audio Asli Jepang (Sub)';
  } else if (isAnime && winner.server.id.includes('smashy')) {
    reason = lang === 'en' ? 'Japanese Audio + Indonesian Subtitles' : 'Audio Jepang + Teks Sub Indo';
  } else if (isAsian && (winner.server.id.includes('2embed') || winner.server.id.includes('smashy'))) {
    reason = lang === 'en' ? 'Optimized for Asian Drama & Cinema' : 'Optimal untuk Drama & Sinema Asia';
  } else if (winner.latency < 700) {
    reason = lang === 'en' ? 'Ultra-Fast Latency & Buffer-Free' : 'Latensi Tercepat & Anti-Macet';
  } else {
    reason = lang === 'en' ? 'Verified Active Stream' : 'Server Terverifikasi Lancar';
  }

  return {
    bestServer: winner.server,
    cleanName,
    reason,
    latencyMs: winner.latency,
  };
}
