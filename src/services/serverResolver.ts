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

    if (id.includes('smashy') || id.includes('vidsrc-pro') || url.includes('smashystream') || url.includes('anyembed')) {
      // Server 5: SmashyStream (Sub Indo Multi-Host) - primary hub for Indonesian cinema & series
      baseScore += isIndo ? 75 : isAnime ? 45 : isAsian ? 45 : 40;
    } else if (id.includes('autoembed') || url.includes('autoembed')) {
      // AutoEmbed: Great for Hollywood/Western, but does not catalog Indonesian cinema/indie titles (leads to 404)
      baseScore += isIndo ? -40 : isAnime ? -20 : isAsian ? 30 : 60;
    } else if (id.includes('2embed') || url.includes('2embed')) {
      // 2Embed has proven unmatched coverage for Asian drama & Anime original Japanese audio
      baseScore += isIndo ? 35 : isAnime ? 65 : isAsian ? 55 : 35;
    } else if (id.includes('vidlink') || url.includes('vidlink')) {
      // VidLink supports dual audio track switching
      baseScore += isIndo ? 30 : isAnime ? 35 : 30;
    } else if (id.includes('vidsrc') || url.includes('vidsrc')) {
      // VidSrc Prime has massive global library for Hollywood, local, and worldwide titles
      baseScore += isIndo ? 55 : isAnime ? 25 : isAsian ? 45 : 55;
    } else if (id.includes('multiembed') || url.includes('multiembed')) {
      baseScore += isIndo ? 45 : 28;
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
        // Reward faster latency
        const latencyBonus = Math.max(0, 30 - Math.floor(latency / 50));
        return {
          server: item.server,
          latency,
          totalScore: item.baseScore + latencyBonus,
        };
      } catch {
        // Fallback score if ping times out or fails
        return {
          server: item.server,
          latency: 999,
          totalScore: item.baseScore - 15,
        };
      }
    })
  );

  // 5. Select the highest scored server
  probeResults.sort((a, b) => b.totalScore - a.totalScore);
  const winner = probeResults[0];

  const rawClean = winner.server.name.split('•')[1]?.trim() || winner.server.name;
  const cleanName = formatServerName(rawClean, lang);
  let reason = '';
  if (isIndo && (winner.server.id.includes('smashy') || winner.server.url.includes('smashystream') || winner.server.id.includes('vidsrc'))) {
    reason = lang === 'en' ? 'Verified Indonesian Cinema Primary Stream' : 'Jalur Andalan Sinema & Serial Indonesia';
  } else if (isAnime && winner.server.id.includes('2embed')) {
    reason = lang === 'en' ? 'Original Japanese Audio (Subbed)' : 'Prioritas Audio Asli Jepang (Sub)';
  } else if (winner.server.id.includes('smashy') || winner.server.url.includes('smashystream')) {
    reason = lang === 'en' ? 'SmashyStream Sub Indo Multi-Host' : 'SmashyStream Sub Indo Multi-Host';
  } else if (isAsian && (winner.server.id.includes('2embed') || winner.server.id.includes('vidlink'))) {
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
