import type { Episode, Season, NextEpisodeAirInfo } from '../types/media';
import { getSeriesStatus } from './formatters';

/**
 * Resolves the true season number of an episode by checking:
 * 1. Explicit `episode.seasonNumber` (number or numeric string)
 * 2. Containing season in `seasons` hierarchy
 * 3. Regex patterns in `episode.id` (e.g. s4-e3, season_4, 4x03)
 * 4. Fallback matching of episode number within unique seasons
 * 5. Default 1
 */
export function resolveEpisodeSeasonNumber(
  episode?: Partial<Episode> | null,
  seasons?: Season[] | null
): number {
  if (!episode) return 1;

  // 1. Direct property check (number or numeric string)
  if (typeof episode.seasonNumber === 'number' && episode.seasonNumber > 0) {
    return episode.seasonNumber;
  }
  if (typeof (episode as any).seasonNumber === 'string') {
    const parsed = parseInt((episode as any).seasonNumber, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (typeof (episode as any).season_number === 'number' && (episode as any).season_number > 0) {
    return (episode as any).season_number;
  }

  // 2. Search containing season in seasons list by episode ID
  if (episode.id && seasons && seasons.length > 0) {
    const targetId = episode.id;
    const parentSeason = seasons.find((s) =>
      s.episodes?.some(
        (e) =>
          e.id === targetId ||
          (Boolean(e.id) && e.id.toLowerCase() === targetId.toLowerCase())
      )
    );
    if (parentSeason) {
      const sNum = Number(parentSeason.seasonNumber || (parentSeason as any).season_number);
      if (!isNaN(sNum) && sNum > 0) return sNum;
    }
  }

  // 3. Regex extraction from episode.id
  if (episode.id) {
    const match =
      episode.id.match(/s(\d+)[-_eE]+(\d+)/i) ||
      episode.id.match(/season[_-]?(\d+)/i) ||
      episode.id.match(/(\d+)x(\d+)/i);
    if (match) {
      const parsedS = parseInt(match[1], 10);
      if (!isNaN(parsedS) && parsedS > 0) return parsedS;
    }
  }

  // 4. Fallback: if only 1 season exists in the media item, return that season's number
  if (seasons && seasons.length === 1) {
    const sNum = Number(seasons[0].seasonNumber || (seasons[0] as any).season_number);
    if (!isNaN(sNum) && sNum > 0) return sNum;
  }

  // 5. Fallback: check if episodeNumber uniquely belongs to only 1 season in seasons
  if (episode.episodeNumber !== undefined && seasons && seasons.length > 0) {
    const candidateSeasons = seasons.filter((s) =>
      s.episodes?.some((e) => e.episodeNumber === episode.episodeNumber)
    );
    if (candidateSeasons.length === 1) {
      const sNum = Number(candidateSeasons[0].seasonNumber || (candidateSeasons[0] as any).season_number);
      if (!isNaN(sNum) && sNum > 0) return sNum;
    }
  }

  return 1;
}

/**
 * Resolves the true episode number of an episode
 */
export function resolveEpisodeNumber(episode?: Partial<Episode> | null): number {
  if (!episode) return 1;

  if (typeof episode.episodeNumber === 'number' && episode.episodeNumber > 0) {
    return episode.episodeNumber;
  }
  if (typeof (episode as any).episodeNumber === 'string') {
    const parsed = parseInt((episode as any).episodeNumber, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (typeof (episode as any).episode_number === 'number' && (episode as any).episode_number > 0) {
    return (episode as any).episode_number;
  }

  // Regex extraction from episode.id
  if (episode.id) {
    const match =
      episode.id.match(/s\d+[-_eE]+(\d+)/i) ||
      episode.id.match(/ep[_-]?(\d+)/i) ||
      episode.id.match(/e(\d+)/i) ||
      episode.id.match(/(\d+)x(\d+)/i);
    if (match) {
      const parsedE = parseInt(match[match.length - 1], 10);
      if (!isNaN(parsedE) && parsedE > 0) return parsedE;
    }
  }

  return 1;
}

/**
 * Flatten all episodes across seasons in chronological order (Season 1..N, Episode 1..M)
 * Ensures each episode has explicit `seasonNumber` and `episodeNumber`
 */
export function getFlattenedEpisodes(seasons?: Season[] | null): Episode[] {
  if (!seasons || seasons.length === 0) return [];

  const eps: Episode[] = [];
  const sortedSeasons = [...seasons]
    .filter((s) => s && Array.isArray(s.episodes) && s.episodes.length > 0)
    .sort((a, b) => {
      const aNum = Number(a.seasonNumber || (a as any).season_number || 0);
      const bNum = Number(b.seasonNumber || (b as any).season_number || 0);
      return aNum - bNum;
    });

  for (let sIdx = 0; sIdx < sortedSeasons.length; sIdx++) {
    const season = sortedSeasons[sIdx];
    const sNum = Number(season.seasonNumber || (season as any).season_number || sIdx + 1);

    const sortedEpisodes = [...season.episodes].sort((a, b) => {
      const aEp = resolveEpisodeNumber(a);
      const bEp = resolveEpisodeNumber(b);
      return aEp - bEp;
    });

    for (let eIdx = 0; eIdx < sortedEpisodes.length; eIdx++) {
      const ep = sortedEpisodes[eIdx];
      const epNum = resolveEpisodeNumber(ep) || eIdx + 1;
      eps.push({
        ...ep,
        seasonNumber: Number(ep.seasonNumber || sNum),
        episodeNumber: epNum,
      });
    }
  }

  return eps;
}

export interface AdjacentEpisodesResult {
  prevEpisode?: Episode;
  nextEpisode?: Episode;
  currentIndex: number;
  allEpisodes: Episode[];
}

/**
 * High-accuracy, season-aware resolution of Previous and Next episodes.
 * 
 * Rules:
 * 1. ALWAYS search for next/prev episode within the CURRENT season first.
 *    (e.g., Season 4 Episode 3 -> Next is Season 4 Episode 4).
 * 2. Only if the current episode is the last episode of the season (season finale),
 *    advance to Episode 1 of the NEXT available season.
 * 3. Only if the current episode is Episode 1 of the season,
 *    retreat to the last episode of the PREVIOUS available season.
 * 4. Fallback to flattened list with ID-first matching to prevent accidental Season 1 resets.
 */
export function getAdjacentEpisodes({
  currentEpisode,
  seasons,
  allEpisodes: customAllEpisodes,
}: {
  currentEpisode?: Episode | null;
  seasons?: Season[] | null;
  allEpisodes?: Episode[] | null;
}): AdjacentEpisodesResult {
  const allEpisodes = customAllEpisodes || getFlattenedEpisodes(seasons);

  if (!currentEpisode || allEpisodes.length === 0) {
    return {
      prevEpisode: undefined,
      nextEpisode: undefined,
      currentIndex: -1,
      allEpisodes,
    };
  }

  const currentSeasonNum = resolveEpisodeSeasonNumber(currentEpisode, seasons);
  const currentEpNum = resolveEpisodeNumber(currentEpisode);

  let nextEpisode: Episode | undefined = undefined;
  let prevEpisode: Episode | undefined = undefined;

  // -------------------------------------------------------------
  // STRATEGY 1: Hierarchical Season-Aware Traversal
  // -------------------------------------------------------------
  if (seasons && seasons.length > 0) {
    const validSeasons = [...seasons]
      .filter((s) => s && Array.isArray(s.episodes) && s.episodes.length > 0)
      .sort((a, b) => {
        const aNum = Number(a.seasonNumber || (a as any).season_number || 0);
        const bNum = Number(b.seasonNumber || (b as any).season_number || 0);
        return aNum - bNum;
      });

    const activeSeason = validSeasons.find(
      (s) => Number(s.seasonNumber || (s as any).season_number) === currentSeasonNum
    );

    if (activeSeason) {
      const activeSeasonNum = Number(activeSeason.seasonNumber || (activeSeason as any).season_number);
      const sortedSeasonEpisodes = [...activeSeason.episodes].sort(
        (a, b) => resolveEpisodeNumber(a) - resolveEpisodeNumber(b)
      );

      // --- NEXT EPISODE ---
      // 1. Look in same season for currentEpNum + 1
      const nextInSameSeason = sortedSeasonEpisodes.find(
        (e) => resolveEpisodeNumber(e) === currentEpNum + 1
      );
      if (nextInSameSeason) {
        nextEpisode = {
          ...nextInSameSeason,
          seasonNumber: activeSeasonNum,
          episodeNumber: currentEpNum + 1,
        };
      } else {
        // 2. If not found in same season, check next season (Season Finale -> Next Season Ep 1)
        const nextSeasons = validSeasons.filter(
          (s) => Number(s.seasonNumber || (s as any).season_number) > activeSeasonNum
        );
        if (nextSeasons.length > 0) {
          const nextSeason = nextSeasons[0];
          const nextSNum = Number(nextSeason.seasonNumber || (nextSeason as any).season_number);
          const sortedNextSeasonEps = [...nextSeason.episodes].sort(
            (a, b) => resolveEpisodeNumber(a) - resolveEpisodeNumber(b)
          );
          if (sortedNextSeasonEps.length > 0) {
            const firstEp = sortedNextSeasonEps[0];
            nextEpisode = {
              ...firstEp,
              seasonNumber: nextSNum,
              episodeNumber: resolveEpisodeNumber(firstEp) || 1,
            };
          }
        }
      }

      // --- PREVIOUS EPISODE ---
      // 1. Look in same season for currentEpNum - 1
      if (currentEpNum > 1) {
        const prevInSameSeason = sortedSeasonEpisodes.find(
          (e) => resolveEpisodeNumber(e) === currentEpNum - 1
        );
        if (prevInSameSeason) {
          prevEpisode = {
            ...prevInSameSeason,
            seasonNumber: activeSeasonNum,
            episodeNumber: currentEpNum - 1,
          };
        }
      } else {
        // 2. If current episode is ep 1, look for previous season (Season Ep 1 -> Prev Season Finale)
        const prevSeasons = validSeasons
          .filter((s) => Number(s.seasonNumber || (s as any).season_number) < activeSeasonNum)
          .sort((a, b) => {
            const aNum = Number(a.seasonNumber || (a as any).season_number || 0);
            const bNum = Number(b.seasonNumber || (b as any).season_number || 0);
            return bNum - aNum; // descending
          });
        if (prevSeasons.length > 0) {
          const prevSeason = prevSeasons[0];
          const prevSNum = Number(prevSeason.seasonNumber || (prevSeason as any).season_number);
          const sortedPrevSeasonEps = [...prevSeason.episodes].sort(
            (a, b) => resolveEpisodeNumber(a) - resolveEpisodeNumber(b)
          );
          if (sortedPrevSeasonEps.length > 0) {
            const lastEp = sortedPrevSeasonEps[sortedPrevSeasonEps.length - 1];
            prevEpisode = {
              ...lastEp,
              seasonNumber: prevSNum,
              episodeNumber: resolveEpisodeNumber(lastEp),
            };
          }
        }
      }
    }
  }

  // -------------------------------------------------------------
  // STRATEGY 2: Flattened List Matching (Fallback & Index Calculation)
  // -------------------------------------------------------------
  // Step 1: Match by exact ID
  const curId = currentEpisode.id;
  let currentIndex = allEpisodes.findIndex(
    (ep) =>
      ep.id === curId ||
      (Boolean(ep.id) && Boolean(curId) && ep.id.toLowerCase() === curId.toLowerCase())
  );

  // Step 2: If ID match fails, match by BOTH seasonNumber and episodeNumber strictly
  if (currentIndex === -1) {
    currentIndex = allEpisodes.findIndex(
      (ep) =>
        resolveEpisodeSeasonNumber(ep, seasons) === currentSeasonNum &&
        resolveEpisodeNumber(ep) === currentEpNum
    );
  }

  // If nextEpisode was not found via Strategy 1, use flattened index
  if (!nextEpisode && currentIndex >= 0 && currentIndex < allEpisodes.length - 1) {
    nextEpisode = allEpisodes[currentIndex + 1];
  }

  // If prevEpisode was not found via Strategy 1, use flattened index
  if (!prevEpisode && currentIndex > 0) {
    prevEpisode = allEpisodes[currentIndex - 1];
  }

  return {
    prevEpisode,
    nextEpisode,
    currentIndex,
    allEpisodes,
  };
}

/**
 * Determines whether an episode is currently unreleased / upcoming.
 * Only episodes belonging to an ongoing season that have not yet reached
 * their air date, or exceed the verified released episode count, are considered unreleased.
 * Episodes that have active video servers or have reached their air date are ALWAYS released.
 */
export function isEpisodeUnreleased(
  ep: Episode | undefined | null,
  media: {
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
    seasons?: Season[];
    totalSeasons?: number;
    currentSeason?: number;
    completedSeasons?: number[];
    ongoingSeason?: number;
  } | null | undefined
): boolean {
  if (!ep || !media) return false;

  const type = media.type || (media as any).mediaType;
  if (type === 'movie') return false;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // 1. Explicit airDate on the episode: The absolute gold standard of truth!
  if (ep.airDate) {
    if (ep.airDate > todayStr) {
      return true; // Future date -> definitely unreleased!
    }
    return false; // Aired today or in the past -> officially released!
  }

  const sNum = resolveEpisodeSeasonNumber(ep, media.seasons);
  const seriesStatus = getSeriesStatus(media);

  const ongoingSeason =
    media.ongoingSeason ??
    seriesStatus?.ongoingSeason ??
    media.currentSeason ??
    seriesStatus?.currentSeason ??
    (media.seasons && media.seasons.length > 0 ? media.seasons.length : 1);

  // If this episode belongs to an earlier season than the ongoing season, it is completed & released!
  if (sNum < ongoingSeason) {
    return false;
  }

  // If this episode belongs to a future season that hasn't started yet, it is unreleased.
  if (sNum > ongoingSeason) {
    return true;
  }

  // 2. Explicit nextEpisodeInfo match
  if (media.nextEpisodeInfo && media.nextEpisodeInfo.seasonNumber === sNum) {
    if (media.nextEpisodeInfo.airDate && media.nextEpisodeInfo.airDate <= todayStr) {
      if (ep.episodeNumber <= media.nextEpisodeInfo.episodeNumber) {
        return false;
      }
    } else if (media.nextEpisodeInfo.airDate && media.nextEpisodeInfo.airDate > todayStr) {
      if (ep.episodeNumber >= media.nextEpisodeInfo.episodeNumber) {
        return true;
      }
    }
  }

  // 3. Fallback threshold check strictly for the ongoing season
  const effectiveNextEpNum =
    media.nextEpisodeInfo &&
    media.nextEpisodeInfo.seasonNumber === sNum &&
    media.nextEpisodeInfo.airDate &&
    media.nextEpisodeInfo.airDate <= todayStr
      ? media.nextEpisodeInfo.episodeNumber
      : 0;

  const baseThreshold =
    typeof media.currentSeasonReleasedEpisodes === 'number' && media.currentSeasonReleasedEpisodes > 0
      ? media.currentSeasonReleasedEpisodes
      : (typeof media.releasedEpisodes === 'number' && media.releasedEpisodes > 0 && sNum === 1
          ? media.releasedEpisodes
          : undefined);

  const releasedThreshold = Math.max(baseThreshold || 0, effectiveNextEpNum);

  if (releasedThreshold > 0 && ep.episodeNumber > releasedThreshold) {
    return true;
  }

  return false;
}

