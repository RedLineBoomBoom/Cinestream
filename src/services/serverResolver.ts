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

  // 1. Determine Content Category (Asian Drama / Anime vs Western / General)
  const countryStr = (media?.country || '').toLowerCase();
  const genresList = media?.genres || [];
  const genreStr = genresList.join(' ').toLowerCase();

  const isAsian =
    countryStr.includes('jepang') ||
    countryStr.includes('japan') ||
    countryStr.includes('korea') ||
    countryStr.includes('china') ||
    countryStr.includes('tiongkok') ||
    countryStr.includes('taiwan') ||
    countryStr.includes('thailand') ||
    countryStr.includes('india') ||
    countryStr.includes('indonesia') ||
    genreStr.includes('anime') ||
    genreStr.includes('drakor') ||
    genreStr.includes('asia') ||
    media?.type === 'anime' ||
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

    if (id.includes('2embed') || url.includes('2embed')) {
      // 2Embed has proven unmatched coverage for Asian drama (Japanese, Korean) & Anime
      baseScore += isAsian ? 55 : 35;
    } else if (id.includes('vidsrc') || url.includes('vidsrc')) {
      // VidSrc has massive global library for Hollywood and worldwide titles
      baseScore += isAsian ? 42 : 55;
    } else if (id.includes('smashy') || url.includes('smashystream')) {
      // Multi-host aggregator with Indonesian subtitle streams
      baseScore += isAsian ? 40 : 30;
    } else if (id.includes('autoembed') || url.includes('autoembed')) {
      // Ultra-fast CDN 4K, but known to lack Asian drama licenses (frequent 404s)
      baseScore += isAsian ? -30 : 50;
    } else if (id.includes('multiembed') || url.includes('multiembed')) {
      baseScore += 28;
    } else if (id.includes('vidlink') || url.includes('vidlink')) {
      baseScore += 22;
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
  if (isAsian && (winner.server.id.includes('2embed') || winner.server.id.includes('smashy'))) {
    reason = lang === 'en' ? 'Optimized for Asian Drama & Anime' : 'Optimal untuk Drama Asia & Anime';
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
