import type { MediaItem, Season, Episode, CastMember, NextEpisodeAirInfo } from '../types/media';
import { createMovieServers, createTvServers } from '../data/mockCatalog';
import { fetchImdbDetails, getImdbUrl } from './imdb';
import { translateText } from './translator';
import { formatSeasonRange, NON_LATIN_REGEX } from '../utils/formatters';

const DEFAULT_TMDB_API_KEY = '4e44d9029b1270a757cddc766a1bcb63';

export const getTmdbApiKey = (): string => {
  try {
    return import.meta.env?.VITE_TMDB_API_KEY || DEFAULT_TMDB_API_KEY;
  } catch {
    return DEFAULT_TMDB_API_KEY;
  }
};

const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_W500 = 'https://image.tmdb.org/t/p/w500';
const IMAGE_BASE_ORIGINAL = 'https://image.tmdb.org/t/p/original';

// In-memory cache for TV show details to instantly provide on-going / completed status
const tvShowDetailsCache = new Map<number, any>();

export async function getTvShowDetailsFast(tvId: number, apiKey: string): Promise<any> {
  if (tvShowDetailsCache.has(tvId)) {
    return tvShowDetailsCache.get(tvId);
  }
  try {
    const res = await fetch(`${BASE_URL}/tv/${tvId}?api_key=${apiKey}&append_to_response=season/1`);
    if (res.ok) {
      const data = await res.json();
      tvShowDetailsCache.set(tvId, data);
      return data;
    }
  } catch {
    // Ignore fetch failure
  }
  return null;
}

// In-memory cache for Movie details to instantly provide runtime & duration
const movieDetailsCache = new Map<number, any>();

export async function getMovieDetailsFast(movieId: number, apiKey: string): Promise<any> {
  if (movieDetailsCache.has(movieId)) {
    return movieDetailsCache.get(movieId);
  }
  try {
    const res = await fetch(`${BASE_URL}/movie/${movieId}?api_key=${apiKey}`);
    if (res.ok) {
      const data = await res.json();
      movieDetailsCache.set(movieId, data);
      return data;
    }
  } catch {
    // Ignore fetch failure
  }
  return null;
}

export interface TmdbSearchResult {
  id: number;
  title: string;
  titleId?: string;
  titleEn?: string;
  originalTitle?: string;
  mediaType: 'movie' | 'tv';
  poster: string;
  posterId?: string;
  posterEn?: string;
  backdrop: string;
  backdropId?: string;
  backdropEn?: string;
  originCountry?: string[];
  originalLanguage?: string;
  rating: number;
  year: number;
  releaseDate?: string;
  duration?: string;
  episodeDuration?: string;
  synopsis: string;
  synopsisEn?: string;
  synopsisId?: string;
  genreIds: number[];
  status?: string;
  isOngoing?: boolean;
  totalEpisodes?: number;
  releasedEpisodes?: number;
  currentSeasonTotalEpisodes?: number;
  currentSeasonReleasedEpisodes?: number;
  nextEpisodeToAir?: string;
  nextEpisodeInfo?: NextEpisodeAirInfo;
  totalSeasons?: number;
  currentSeason?: number;
  completedSeasons?: number[];
  ongoingSeason?: number;
  seasonBreakdown?: string;
  seasons?: any[];
}

export function calculateSeriesStatusFromTmdb(tvData: any) {
  const regularSeasons = (tvData.seasons || []).filter((s: any) => s.season_number > 0);
  const totalSeasons = tvData.number_of_seasons || regularSeasons.length || 1;
  const latestSeason = regularSeasons[regularSeasons.length - 1];
  const currentSeasonTotalEpisodes = latestSeason?.episode_count || tvData.number_of_episodes;

  const lastEp = tvData.last_episode_to_air;
  const currentSeasonReleasedEpisodes =
    lastEp?.season_number === latestSeason?.season_number
      ? lastEp?.episode_number || 0
      : latestSeason?.episode_count || 0;
  const totalEpisodes = tvData.number_of_episodes;
  const releasedEpisodes = lastEp?.episode_number || totalEpisodes;

  const hasNextEp = Boolean(tvData.next_episode_to_air);
  const nextEpSeason = tvData.next_episode_to_air?.season_number;
  const isEnded = tvData.status === 'Ended' || tvData.status === 'Canceled';

  const isLatestSeasonComplete =
    (currentSeasonReleasedEpisodes ?? 0) > 0 &&
    (currentSeasonTotalEpisodes ?? 0) > 0 &&
    (currentSeasonReleasedEpisodes ?? 0) >= (currentSeasonTotalEpisodes ?? 0) &&
    (!hasNextEp || (Boolean(nextEpSeason) && nextEpSeason! > (latestSeason?.season_number || 1)));

  let isOngoing = false;
  let ongoingSeason: number | undefined = undefined;
  let currentSeason: number | undefined = undefined;
  let completedSeasons: number[] = [];

  if (hasNextEp && nextEpSeason && nextEpSeason > (latestSeason?.season_number || 1)) {
    isOngoing = true;
    ongoingSeason = nextEpSeason;
    currentSeason = ongoingSeason;
    completedSeasons = regularSeasons
      .map((s: any) => s.season_number)
      .filter((n: number) => typeof n === 'number' && n > 0);
  } else if (!isEnded && !isLatestSeasonComplete) {
    isOngoing = true;
    ongoingSeason = latestSeason?.season_number || totalSeasons;
    currentSeason = ongoingSeason;
    completedSeasons = regularSeasons
      .map((s: any) => s.season_number)
      .filter((n: number) => typeof n === 'number' && n > 0 && n < ongoingSeason!);
  } else {
    isOngoing = false;
    ongoingSeason = undefined;
    currentSeason = undefined;
    completedSeasons = regularSeasons
      .map((s: any) => s.season_number)
      .filter((n: number) => typeof n === 'number' && n > 0);
    if (completedSeasons.length === 0 && typeof totalSeasons === 'number' && totalSeasons > 0) {
      completedSeasons = Array.from({ length: totalSeasons }, (_, i) => i + 1);
    }
  }

  const completedLabel = completedSeasons.length > 0 ? `${formatSeasonRange(completedSeasons)} COMPLETE` : undefined;
  const ongoingLabel = ongoingSeason ? `S${ongoingSeason} ON GOING` : undefined;
  let seasonBreakdown: string | undefined = undefined;
  if (completedLabel && ongoingLabel) {
    seasonBreakdown = `${completedLabel} • ${ongoingLabel}`;
  } else if (ongoingLabel) {
    seasonBreakdown = ongoingLabel;
  } else if (completedLabel) {
    seasonBreakdown = completedLabel;
  }

  return {
    regularSeasons,
    totalSeasons,
    currentSeasonTotalEpisodes,
    currentSeasonReleasedEpisodes,
    releasedEpisodes,
    totalEpisodes,
    isOngoing,
    ongoingSeason,
    currentSeason,
    completedSeasons,
    seasonBreakdown,
  };
}

// Genre mapping helper (Indonesian)
const GENRE_MAP_ID: Record<number, string> = {
  28: 'Aksi',
  12: 'Petualangan',
  16: 'Animasi',
  35: 'Komedi',
  80: 'Kriminal',
  99: 'Dokumenter',
  18: 'Drama',
  10751: 'Keluarga',
  14: 'Fantasi',
  36: 'Sejarah',
  27: 'Horor',
  10402: 'Musik',
  9648: 'Misteri',
  10749: 'Romantis',
  878: 'Sci-Fi',
  10770: 'Film TV',
  53: 'Thriller',
  10752: 'Perang',
  37: 'Western',
  10759: 'Aksi & Petualangan',
  10762: 'Anak-anak',
  10763: 'Berita',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasi',
  10766: 'Sinetron',
  10767: 'Talkshow',
  10768: 'Perang & Politik',
};

// Genre mapping helper (English)
const GENRE_MAP_EN: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
};

export const getGenreNames = (genreIds: number[], lang: 'id' | 'en' = 'id'): string[] => {
  const map = lang === 'en' ? GENRE_MAP_EN : GENRE_MAP_ID;
  if (!genreIds || genreIds.length === 0) return [lang === 'en' ? 'Popular Cinema' : 'Sinema Populer'];
  return genreIds.map((id) => map[id] || 'Drama').slice(0, 3);
};

/**
 * Live multi-search for movies and TV shows across TMDB
 */
export async function searchTMDB(query: string, page = 1, lang: 'id' | 'en' = 'id'): Promise<TmdbSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const apiKey = getTmdbApiKey();

  try {
    const enUrl = `${BASE_URL}/search/multi?api_key=${apiKey}&language=en-US&query=${encodeURIComponent(
      trimmed
    )}&page=${page}&include_adult=false`;
    const idUrl =
      lang === 'id'
        ? `${BASE_URL}/search/multi?api_key=${apiKey}&language=id-ID&query=${encodeURIComponent(
            trimmed
          )}&page=${page}&include_adult=false`
        : null;

    const [enRes, idRes] = await Promise.all([
      fetch(enUrl).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      idUrl ? fetch(idUrl).then((r) => (r.ok ? r.json() : null)).catch(() => null) : Promise.resolve(null),
    ]);

    const enResults: any[] = enRes?.results || [];
    const idResults: any[] = idRes?.results || [];
    const idMap = new Map<number, any>(idResults.map((it: any) => [it.id, it]));

    const validItems = enResults.filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv');

    const searchResults: TmdbSearchResult[] = await Promise.all(
      validItems.map(async (enItem: any) => {
        const isMovie = enItem.media_type === 'movie';
        const idItem = idMap.get(enItem.id);
        const dateStr = isMovie ? enItem.release_date : enItem.first_air_date;
        let year = 0;
        if (dateStr && typeof dateStr === 'string') {
          const parsed = parseInt(dateStr.slice(0, 4), 10);
          if (!isNaN(parsed) && parsed > 1800) {
            year = parsed;
          }
        }
        // Always preserve official international English title and original posters
        const title =
          (isMovie ? enItem.title : enItem.name) ||
          enItem.original_title ||
          enItem.original_name ||
          'Tanpa Judul';
        const origTitle = isMovie ? enItem.original_title : enItem.original_name;

        // Detect Indonesian media
        const isIndonesian =
          enItem.original_language === 'id' ||
          (Array.isArray(enItem.origin_country) && enItem.origin_country.includes('ID')) ||
          (idItem?.origin_country && Array.isArray(idItem.origin_country) && idItem.origin_country.includes('ID'));

        const idTitleRaw = idItem ? (isMovie ? idItem.title : idItem.name) : undefined;
        const titleId = (isIndonesian && origTitle) ? origTitle : (idTitleRaw || origTitle || title);
        const titleEn = title;

        const posterId = idItem?.poster_path ? `${IMAGE_BASE_W500}${idItem.poster_path}` : (enItem.poster_path ? `${IMAGE_BASE_W500}${enItem.poster_path}` : undefined);
        const posterEn = enItem.poster_path ? `${IMAGE_BASE_W500}${enItem.poster_path}` : undefined;

        const finalTitle = (lang === 'id' && isIndonesian)
          ? titleId
          : (lang === 'id' ? (titleId || title) : titleEn);

        const finalPoster = (lang === 'id' && isIndonesian && posterId)
          ? posterId
          : (posterEn || posterId || (enItem.poster_path ? `${IMAGE_BASE_W500}${enItem.poster_path}` : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=600&auto=format&fit=crop'));

        const enOverview = (enItem.overview || '').trim();
        const idOverview = (idItem?.overview || '').trim();

        let finalSynopsis = '';
        if (lang === 'en') {
          finalSynopsis = enOverview || idOverview || 'Official synopsis not available yet.';
        } else {
          if (idOverview) {
            finalSynopsis = idOverview;
          } else if (enOverview) {
            try {
              finalSynopsis = await translateText(enOverview, 'id');
            } catch {
              finalSynopsis = enOverview;
            }
          } else {
            finalSynopsis = 'Sinopsis resmi belum tersedia untuk karya ini.';
          }
        }

        let tvStatus: string | undefined = undefined;
        let isOngoing: boolean | undefined = undefined;
        let totalEpisodes: number | undefined = undefined;
        let releasedEpisodes: number | undefined = undefined;
        let currentSeasonTotalEpisodes: number | undefined = undefined;
        let currentSeasonReleasedEpisodes: number | undefined = undefined;
        let nextEpisodeToAir: string | undefined = undefined;
        let nextEpisodeInfo: NextEpisodeAirInfo | undefined = undefined;
        let totalSeasons: number | undefined = undefined;
        let currentSeason: number | undefined = undefined;
        let completedSeasons: number[] = [];
        let ongoingSeason: number | undefined = undefined;
        let seasonBreakdown: string | undefined = undefined;
        let seasonsList: any[] | undefined = undefined;

        let movieDuration: string | undefined = undefined;
        let tvEpisodeDuration: string | undefined = undefined;

        if (isMovie) {
          const movieData = await getMovieDetailsFast(enItem.id, apiKey);
          if (movieData?.runtime && movieData.runtime > 0) {
            const h = Math.floor(movieData.runtime / 60);
            const m = movieData.runtime % 60;
            movieDuration = `${h > 0 ? `${h}j ` : ''}${m}m`;
          }
        } else {
          const tvData = await getTvShowDetailsFast(enItem.id, apiKey);
          if (tvData) {
            const runtimes = tvData.episode_run_time;
            let epMins = 0;
            if (Array.isArray(runtimes) && runtimes.length > 0 && runtimes[0] > 0) {
              epMins = runtimes[0];
            } else if (tvData.last_episode_to_air?.runtime && tvData.last_episode_to_air.runtime > 0) {
              epMins = tvData.last_episode_to_air.runtime;
            } else if (tvData.next_episode_to_air?.runtime && tvData.next_episode_to_air.runtime > 0) {
              epMins = tvData.next_episode_to_air.runtime;
            } else if (tvData['season/1']?.episodes && Array.isArray(tvData['season/1'].episodes)) {
              const epWithRuntime = tvData['season/1'].episodes.find((e: any) => typeof e.runtime === 'number' && e.runtime > 0);
              if (epWithRuntime) {
                epMins = epWithRuntime.runtime;
              }
            }

            if (epMins > 0) {
              const h = Math.floor(epMins / 60);
              const m = epMins % 60;
              tvEpisodeDuration = `${h > 0 ? `${h}j ` : ''}${m}m / ep`;
            } else {
              tvEpisodeDuration = undefined;
            }

            tvStatus = tvData.status;
            totalEpisodes = tvData.number_of_episodes;
            nextEpisodeToAir = tvData.next_episode_to_air?.air_date;
            if (tvData.next_episode_to_air?.air_date) {
              const nEp = tvData.next_episode_to_air;
              nextEpisodeInfo = {
                airDate: nEp.air_date,
                episodeNumber: nEp.episode_number,
                seasonNumber: nEp.season_number,
                title: nEp.name || undefined,
                overview: nEp.overview || undefined,
                stillPath: nEp.still_path ? `${IMAGE_BASE_W500}${nEp.still_path}` : undefined,
              };
            }

            const statusCalc = calculateSeriesStatusFromTmdb(tvData);
            totalSeasons = statusCalc.totalSeasons;
            currentSeasonTotalEpisodes = statusCalc.currentSeasonTotalEpisodes;
            currentSeasonReleasedEpisodes = statusCalc.currentSeasonReleasedEpisodes;
            releasedEpisodes = statusCalc.releasedEpisodes;
            totalEpisodes = statusCalc.totalEpisodes;
            isOngoing = statusCalc.isOngoing;
            ongoingSeason = statusCalc.ongoingSeason;
            currentSeason = statusCalc.currentSeason;
            completedSeasons = statusCalc.completedSeasons;
            seasonBreakdown = statusCalc.seasonBreakdown;

            seasonsList = statusCalc.regularSeasons.map((s: any) => ({
              seasonNumber: s.season_number,
              name: s.name,
              episodeCount: s.episode_count,
              airDate: s.air_date,
            }));
          } else if (year >= new Date().getFullYear()) {
            isOngoing = true;
            tvStatus = 'Returning Series';
            currentSeason = 1;
            ongoingSeason = 1;
            totalSeasons = 1;
            seasonBreakdown = 'S1 ON GOING';
          }
        }

        return {
          id: enItem.id,
          title: finalTitle || 'Tanpa Judul',
          titleId,
          titleEn,
          originalTitle: origTitle,
          mediaType: isMovie ? 'movie' : 'tv',
          poster: finalPoster || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=600&auto=format&fit=crop',
          posterId,
          posterEn,
          backdrop: enItem.backdrop_path
            ? `${IMAGE_BASE_ORIGINAL}${enItem.backdrop_path}`
            : enItem.poster_path
            ? `${IMAGE_BASE_ORIGINAL}${enItem.poster_path}`
            : 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1920&auto=format&fit=crop',
          originCountry: enItem.origin_country || idItem?.origin_country,
          originalLanguage: enItem.original_language || idItem?.original_language,
          rating: enItem.vote_average ? Math.round(enItem.vote_average * 10) / 10 : 7.8,
          year,
          releaseDate: dateStr || '',
          duration: movieDuration,
          episodeDuration: tvEpisodeDuration,
          synopsis: finalSynopsis,
          synopsisEn: enOverview,
          synopsisId: idOverview || (lang === 'id' ? finalSynopsis : undefined),
          genreIds: enItem.genre_ids || [],
          status: tvStatus,
          isOngoing,
          totalEpisodes,
          releasedEpisodes,
          currentSeasonTotalEpisodes,
          currentSeasonReleasedEpisodes,
          nextEpisodeToAir,
          nextEpisodeInfo,
          totalSeasons,
          currentSeason,
          completedSeasons,
          ongoingSeason,
          seasonBreakdown,
          seasons: seasonsList,
        };
      })
    );

    // Urutkan berdasarkan tahun rilis terbaru (newest release year first)
    return searchResults.sort((a: TmdbSearchResult, b: TmdbSearchResult) => {
      const yearA = a.year || 0;
      const yearB = b.year || 0;
      if (yearB !== yearA) {
        return yearB - yearA;
      }
      if (a.releaseDate && b.releaseDate) {
        return b.releaseDate.localeCompare(a.releaseDate);
      }
      return (b.rating || 0) - (a.rating || 0);
    });
  } catch (err) {
    console.error('Failed to search TMDB:', err);
    return [];
  }
}

/**
 * Fetch daily trending movies and TV shows from TMDB API with bilingual overview & auto-translation
 */
export async function fetchTmdbTrending(
  timeWindow: 'day' | 'week' = 'day',
  lang: 'id' | 'en' = 'id'
): Promise<TmdbSearchResult[]> {
  const apiKey = getTmdbApiKey();

  try {
    const enUrl = `${BASE_URL}/trending/all/${timeWindow}?api_key=${apiKey}&language=en-US`;
    const idUrl =
      lang === 'id'
        ? `${BASE_URL}/trending/all/${timeWindow}?api_key=${apiKey}&language=id-ID`
        : null;

    const [enRes, idRes] = await Promise.all([
      fetch(enUrl).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      idUrl ? fetch(idUrl).then((r) => (r.ok ? r.json() : null)).catch(() => null) : Promise.resolve(null),
    ]);

    const enResults: any[] = enRes?.results || [];
    const idResults: any[] = idRes?.results || [];
    const idMap = new Map<number, any>(idResults.map((it: any) => [it.id, it]));

    const validItems = enResults.filter(
      (item: any) => item.media_type === 'movie' || item.media_type === 'tv'
    );

    const mapped: TmdbSearchResult[] = await Promise.all(
      validItems.map(async (enItem: any) => {
        const isMovie = enItem.media_type === 'movie';
        const idItem = idMap.get(enItem.id);
        const dateStr = isMovie ? enItem.release_date : enItem.first_air_date;
        const year = dateStr ? new Date(dateStr).getFullYear() : 2024;

        // Always preserve official international English title and original posters
        const enTitleRaw = (isMovie ? enItem.title : enItem.name) || '';
        const origTitle = isMovie ? enItem.original_title : enItem.original_name;
        let title = enTitleRaw || origTitle || 'Tanpa Judul';
        if (NON_LATIN_REGEX.test(title)) {
          if (origTitle && !NON_LATIN_REGEX.test(origTitle)) {
            title = origTitle;
          }
        }

        const enOverview = (enItem.overview || '').trim();
        const idOverview = (idItem?.overview || '').trim();

        let finalSynopsis = '';
        if (lang === 'en') {
          finalSynopsis = enOverview || idOverview || 'Official synopsis not available yet.';
        } else {
          if (idOverview) {
            finalSynopsis = idOverview;
          } else if (enOverview) {
            try {
              finalSynopsis = await translateText(enOverview, 'id');
            } catch {
              finalSynopsis = enOverview;
            }
          } else {
            finalSynopsis = 'Sinopsis resmi belum tersedia untuk karya ini.';
          }
        }

        let tvStatus: string | undefined = undefined;
        let isOngoing: boolean | undefined = undefined;
        let totalEpisodes: number | undefined = undefined;
        let releasedEpisodes: number | undefined = undefined;
        let currentSeasonTotalEpisodes: number | undefined = undefined;
        let currentSeasonReleasedEpisodes: number | undefined = undefined;
        let nextEpisodeToAir: string | undefined = undefined;
        let nextEpisodeInfo: NextEpisodeAirInfo | undefined = undefined;
        let totalSeasons: number | undefined = undefined;
        let currentSeason: number | undefined = undefined;
        let completedSeasons: number[] = [];
        let ongoingSeason: number | undefined = undefined;
        let seasonBreakdown: string | undefined = undefined;
        let seasonsList: any[] | undefined = undefined;

        let movieDuration: string | undefined = undefined;
        let tvEpisodeDuration: string | undefined = undefined;

        if (isMovie) {
          const movieData = await getMovieDetailsFast(enItem.id, apiKey);
          if (movieData?.runtime && movieData.runtime > 0) {
            const h = Math.floor(movieData.runtime / 60);
            const m = movieData.runtime % 60;
            movieDuration = `${h > 0 ? `${h}j ` : ''}${m}m`;
          }
        } else {
          const tvData = await getTvShowDetailsFast(enItem.id, apiKey);
          if (tvData) {
            const runtimes = tvData.episode_run_time;
            let epMins = 0;
            if (Array.isArray(runtimes) && runtimes.length > 0 && runtimes[0] > 0) {
              epMins = runtimes[0];
            } else if (tvData.last_episode_to_air?.runtime && tvData.last_episode_to_air.runtime > 0) {
              epMins = tvData.last_episode_to_air.runtime;
            } else if (tvData.next_episode_to_air?.runtime && tvData.next_episode_to_air.runtime > 0) {
              epMins = tvData.next_episode_to_air.runtime;
            } else if (tvData['season/1']?.episodes && Array.isArray(tvData['season/1'].episodes)) {
              const epWithRuntime = tvData['season/1'].episodes.find((e: any) => typeof e.runtime === 'number' && e.runtime > 0);
              if (epWithRuntime) {
                epMins = epWithRuntime.runtime;
              }
            }

            if (epMins > 0) {
              const h = Math.floor(epMins / 60);
              const m = epMins % 60;
              tvEpisodeDuration = `${h > 0 ? `${h}j ` : ''}${m}m / ep`;
            } else {
              tvEpisodeDuration = undefined;
            }

            tvStatus = tvData.status;
            totalEpisodes = tvData.number_of_episodes;
            nextEpisodeToAir = tvData.next_episode_to_air?.air_date;
            if (tvData.next_episode_to_air?.air_date) {
              const nEp = tvData.next_episode_to_air;
              nextEpisodeInfo = {
                airDate: nEp.air_date,
                episodeNumber: nEp.episode_number,
                seasonNumber: nEp.season_number,
                title: nEp.name || undefined,
                overview: nEp.overview || undefined,
                stillPath: nEp.still_path ? `${IMAGE_BASE_W500}${nEp.still_path}` : undefined,
              };
            }

            const statusCalc = calculateSeriesStatusFromTmdb(tvData);
            totalSeasons = statusCalc.totalSeasons;
            currentSeasonTotalEpisodes = statusCalc.currentSeasonTotalEpisodes;
            currentSeasonReleasedEpisodes = statusCalc.currentSeasonReleasedEpisodes;
            releasedEpisodes = statusCalc.releasedEpisodes;
            totalEpisodes = statusCalc.totalEpisodes;
            isOngoing = statusCalc.isOngoing;
            ongoingSeason = statusCalc.ongoingSeason;
            currentSeason = statusCalc.currentSeason;
            completedSeasons = statusCalc.completedSeasons;
            seasonBreakdown = statusCalc.seasonBreakdown;

            seasonsList = statusCalc.regularSeasons.map((s: any) => ({
              seasonNumber: s.season_number,
              name: s.name,
              episodeCount: s.episode_count,
              airDate: s.air_date,
            }));
          } else if (year >= new Date().getFullYear()) {
            isOngoing = true;
            tvStatus = 'Returning Series';
            currentSeason = 1;
            ongoingSeason = 1;
            totalSeasons = 1;
            seasonBreakdown = 'S1 ON GOING';
          }
        }

        return {
          id: enItem.id,
          title: title || 'Tanpa Judul',
          originalTitle: origTitle,
          mediaType: isMovie ? 'movie' : 'tv',
          poster: enItem.poster_path
            ? `${IMAGE_BASE_W500}${enItem.poster_path}`
            : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=600&auto=format&fit=crop',
          backdrop: enItem.backdrop_path
            ? `${IMAGE_BASE_ORIGINAL}${enItem.backdrop_path}`
            : enItem.poster_path
            ? `${IMAGE_BASE_ORIGINAL}${enItem.poster_path}`
            : 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1920&auto=format&fit=crop',
          rating: enItem.vote_average ? Math.round(enItem.vote_average * 10) / 10 : 7.8,
          originCountry: enItem.origin_country || idItem?.origin_country,
          originalLanguage: enItem.original_language || idItem?.original_language,
          year: isNaN(year) ? 2024 : year,
          duration: movieDuration,
          episodeDuration: tvEpisodeDuration,
          synopsis: finalSynopsis,
          synopsisEn: enOverview,
          synopsisId: idOverview || (lang === 'id' ? finalSynopsis : undefined),
          genreIds: enItem.genre_ids || [],
          status: tvStatus,
          isOngoing,
          totalEpisodes,
          releasedEpisodes,
          currentSeasonTotalEpisodes,
          currentSeasonReleasedEpisodes,
          nextEpisodeToAir,
          nextEpisodeInfo,
          totalSeasons,
          currentSeason,
          completedSeasons,
          ongoingSeason,
          seasonBreakdown,
          seasons: seasonsList,
        };
      })
    );

    return mapped;
  } catch (err) {
    console.error('Failed to fetch TMDB trending:', err);
    return [];
  }
}

/**
 * Strictly prioritize high-definition widescreen cinematic trailers over vertical YouTube Shorts or social media teasers
 */
export function selectBestWidescreenTrailer(videoResults: any[]): any {
  if (!videoResults || !Array.isArray(videoResults) || videoResults.length === 0) return null;

  // Filter out social media vertical shorts (TikTok, Reels, YouTube Shorts)
  const isVerticalOrShortRegex = /#shorts|\bshorts\b|\btiktok\b|\breels\b|\bvertical\b/i;
  const ytVideos = videoResults.filter(
    (v: any) => v.site === 'YouTube' && typeof v.key === 'string' && !isVerticalOrShortRegex.test(v.name || '')
  );

  return (
    // 1. Official Trailer with 'official trailer', 'main trailer', 'theatrical trailer', or 'final trailer'
    ytVideos.find(
      (v: any) =>
        v.type === 'Trailer' &&
        v.official &&
        /(official|main|theatrical|final)\s+trailer/i.test(v.name || '')
    ) ||
    // 2. Official Trailer with 'trailer' in title
    ytVideos.find(
      (v: any) => v.type === 'Trailer' && v.official && /trailer/i.test(v.name || '')
    ) ||
    // 3. Any Official Trailer
    ytVideos.find((v: any) => v.type === 'Trailer' && v.official) ||
    // 4. Any Trailer with 'trailer' in title
    ytVideos.find((v: any) => v.type === 'Trailer' && /trailer/i.test(v.name || '')) ||
    // 5. Any Trailer
    ytVideos.find((v: any) => v.type === 'Trailer') ||
    // 6. Official Teaser Trailer (widescreen teaser trailer)
    ytVideos.find(
      (v: any) => v.type === 'Teaser' && v.official && /teaser\s+trailer/i.test(v.name || '')
    ) ||
    // 7. Official Teaser
    ytVideos.find((v: any) => v.type === 'Teaser' && v.official) ||
    // 8. Any video matching Teaser
    ytVideos.find((v: any) => v.type === 'Teaser') ||
    // 9. Fallback to first available video
    ytVideos[0] ||
    videoResults.find((v: any) => v.site === 'YouTube')
  );
}

/**
 * Fetch complete details and construct full MediaItem for seamless playback
 */
export async function fetchFullMediaItem(
  tmdbId: number,
  type: 'movie' | 'tv'
): Promise<MediaItem | null> {
  const apiKey = getTmdbApiKey();
  const endpoint = type === 'movie' ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;
  const url = `${BASE_URL}${endpoint}?api_key=${apiKey}&language=en-US&append_to_response=credits,videos,external_ids,images&include_image_language=id,en,null`;

  try {
    let res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${type} details`);
    }

    let data = await res.json();

    let enOverview: string = data.overview || '';
    let idOverview: string = '';
    let idData: any = null;

    // Check if Indonesian data is directly available on TMDB
    try {
      const idRes = await fetch(`${BASE_URL}${endpoint}?api_key=${apiKey}&language=id-ID`);
      if (idRes.ok) {
        idData = await idRes.json();
        if (idData.overview && idData.overview.trim().length > 0) {
          idOverview = idData.overview.trim();
        }
      }
    } catch {
      // ignore
    }

    // Fetch official IMDb details if imdb_id is present
    const imdbId: string | undefined = data.imdb_id || data.external_ids?.imdb_id || undefined;
    let imdbDetails: any = null;
    if (imdbId) {
      try {
        imdbDetails = await fetchImdbDetails(imdbId);
      } catch {
        // graceful fallback if network error
      }
    }

    if (!enOverview && imdbDetails?.plot) {
      enOverview = imdbDetails.plot;
    }

    // If Indonesian synopsis is missing from TMDB, auto-translate English overview to Indonesian
    if (!idOverview && enOverview) {
      try {
        idOverview = await translateText(enOverview, 'id');
      } catch {
        // fallback
      }
    } else if (!enOverview && idOverview) {
      try {
        enOverview = await translateText(idOverview, 'en');
      } catch {
        // fallback
      }
    }

    const isMovie = type === 'movie';
    const title = isMovie ? data.title : data.name;
    const origTitle = isMovie ? data.original_title : data.original_name;
    const dateStr = isMovie ? data.release_date : data.first_air_date;
    const year = dateStr ? new Date(dateStr).getFullYear() : 2024;

    // Genres
    const genres = (data.genres && data.genres.length > 0)
      ? data.genres.map((g: any) => g.name)
      : ['Sinema Dunia', isMovie ? 'Film Bioskop' : 'Serial Drama'];

    // Director / Creators
    let director = imdbDetails?.director || 'Kreator Sinematik';
    if (isMovie && data.credits?.crew) {
      const dirObj = data.credits.crew.find((c: any) => c.job === 'Director');
      if (dirObj) director = dirObj.name;
    } else if (!isMovie && data.created_by && data.created_by.length > 0) {
      director = data.created_by.map((c: any) => c.name).join(', ');
    }

    // Writer
    let writer = imdbDetails?.writer || undefined;
    if (!writer && data.credits?.crew) {
      const writers = data.credits.crew.filter((c: any) => c.job === 'Writer' || c.job === 'Screenplay');
      if (writers.length > 0) {
        writer = writers.map((w: any) => w.name).join(', ');
      }
    }

    // Cast members
    const cast: CastMember[] = (data.credits?.cast || []).slice(0, 6).map((c: any) => ({
      name: c.name,
      role: c.character || 'Pemeran',
      avatar: c.profile_path
        ? `${IMAGE_BASE_W500}${c.profile_path}`
        : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=120&auto=format&fit=crop',
    }));

    // Country
    const country = (data.production_countries && data.production_countries.length > 0)
      ? data.production_countries[0].name
      : (data.origin_country && data.origin_country.length > 0)
      ? data.origin_country[0]
      : 'Internasional';

    // Duration formatting
    let duration = '2j 00m';
    let episodeDuration: string | undefined = undefined;
    if (isMovie && data.runtime) {
      const h = Math.floor(data.runtime / 60);
      const m = data.runtime % 60;
      duration = `${h > 0 ? `${h}j ` : ''}${m}m`;
    } else if (!isMovie) {
      const totalEps = data.number_of_episodes || (data.seasons ? data.seasons.reduce((acc: number, s: any) => acc + (s.episode_count || 0), 0) : 10);
      duration = `${data.number_of_seasons || 1} Musim (${totalEps} Episode)`;

      const runtimes = data.episode_run_time;
      let epMins = 0;
      if (Array.isArray(runtimes) && runtimes.length > 0 && runtimes[0] > 0) {
        epMins = runtimes[0];
      } else if (data.last_episode_to_air?.runtime && data.last_episode_to_air.runtime > 0) {
        epMins = data.last_episode_to_air.runtime;
      } else if (data.next_episode_to_air?.runtime && data.next_episode_to_air.runtime > 0) {
        epMins = data.next_episode_to_air.runtime;
      }

      if (epMins > 0) {
        const h = Math.floor(epMins / 60);
        const m = epMins % 60;
        episodeDuration = `${h > 0 ? `${h}j ` : ''}${m}m / ep`;
      }
    }

    // Seasons & Episodes for TV series
    let seasons: Season[] | undefined = undefined;
    if (!isMovie) {
      seasons = [];
      const rawSeasons = (data.seasons || []).filter((s: any) => s.season_number > 0);
      
      // If seasons found, let's load Season 1 episode details for full metadata
      for (const s of rawSeasons) {
        const sNum = s.season_number;
        let episodes: Episode[] = [];

        try {
          const seasonUrl = `${BASE_URL}/tv/${tmdbId}/season/${sNum}?api_key=${apiKey}&language=en-US`;
          const sRes = await fetch(seasonUrl);
          if (sRes.ok) {
            const sData = await sRes.json();
            if (sData.episodes && sData.episodes.length > 0) {
              if (!episodeDuration) {
                const epWithRuntime = sData.episodes.find((e: any) => typeof e.runtime === 'number' && e.runtime > 0);
                if (epWithRuntime) {
                  const h = Math.floor(epWithRuntime.runtime / 60);
                  const m = epWithRuntime.runtime % 60;
                  episodeDuration = `${h > 0 ? `${h}j ` : ''}${m}m / ep`;
                }
              }
              episodes = sData.episodes.map((ep: any) => ({
                id: `tmdb-tv-${tmdbId}-s${sNum}-e${ep.episode_number}`,
                episodeNumber: ep.episode_number,
                seasonNumber: sNum,
                title: ep.name || `Episode ${ep.episode_number}`,
                duration: ep.runtime ? `${ep.runtime} Menit` : '45 Menit',
                thumbnail: ep.still_path
                  ? `${IMAGE_BASE_W500}${ep.still_path}`
                  : (data.backdrop_path ? `${IMAGE_BASE_W500}${data.backdrop_path}` : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=600&auto=format&fit=crop'),
                synopsis: ep.overview || '',
                airDate: ep.air_date,
                videoUrl: `https://vidlink.pro/tv/${tmdbId}/${sNum}/${ep.episode_number}`,
                servers: createTvServers(tmdbId, sNum, ep.episode_number),
              }));
            }
          }
        } catch {
          // Fallback if season API fails
        }

        // Fallback synthetic episodes if detailed fetch is empty
        if (episodes.length === 0) {
          const epCount = s.episode_count || 10;
          for (let e = 1; e <= epCount; e++) {
            episodes.push({
              id: `tmdb-tv-${tmdbId}-s${sNum}-e${e}`,
              episodeNumber: e,
              seasonNumber: sNum,
              title: `Episode ${e}`,
              duration: '45 Menit',
              thumbnail: data.backdrop_path
                ? `${IMAGE_BASE_W500}${data.backdrop_path}`
                : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=600&auto=format&fit=crop',
              synopsis: '',
              videoUrl: `https://vidlink.pro/tv/${tmdbId}/${sNum}/${e}`,
              servers: createTvServers(tmdbId, sNum, e),
            });
          }
        }

        seasons.push({
          seasonNumber: sNum,
          title: s.name || `Musim ke-${sNum}`,
          episodes,
        });
      }

      // If no valid seasons were returned, provide Season 1 default
      if (seasons.length === 0) {
        const defEpisodes: Episode[] = Array.from({ length: 8 }).map((_, i) => ({
          id: `tmdb-tv-${tmdbId}-s1-e${i + 1}`,
          episodeNumber: i + 1,
          title: `Episode ${i + 1}`,
          duration: '45 Menit',
          thumbnail: data.backdrop_path
            ? `${IMAGE_BASE_W500}${data.backdrop_path}`
            : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=600&auto=format&fit=crop',
          synopsis: `Episode ${i + 1} dari ${title}.`,
          videoUrl: `https://vidlink.pro/tv/${tmdbId}/1/${i + 1}`,
          servers: createTvServers(tmdbId, 1, i + 1),
        }));

        seasons.push({
          seasonNumber: 1,
          title: 'Musim ke-1',
          episodes: defEpisodes,
        });
      }
    }

    // Extract official transparent title logo
    let logoUrl: string | undefined = undefined;
    if (data.images?.logos && Array.isArray(data.images.logos) && data.images.logos.length > 0) {
      const bestLogo =
        data.images.logos.find((l: any) => l.iso_639_1 === 'en') ||
        data.images.logos.find((l: any) => !l.iso_639_1) ||
        data.images.logos[0];
      if (bestLogo?.file_path) {
        logoUrl = `${IMAGE_BASE_ORIGINAL}${bestLogo.file_path}`;
      }
    }

    // Extract official YouTube trailer
    let trailerUrl: string | undefined = undefined;
    let trailerYoutubeKey: string | undefined = undefined;
    if (data.videos?.results && Array.isArray(data.videos.results) && data.videos.results.length > 0) {
      const ytTrailer = selectBestWidescreenTrailer(data.videos.results);
      if (ytTrailer?.key) {
        trailerYoutubeKey = ytTrailer.key;
        trailerUrl = `https://www.youtube.com/watch?v=${ytTrailer.key}`;
      }
    }
    if (!trailerUrl) {
      trailerUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent((title || 'Movie') + ' official trailer')}`;
    }

    // Extract official English & Indonesian poster
    let posterPath: string | undefined = data.poster_path;
    let posterIdPath: string | undefined = idData?.poster_path;
    let posterEnPath: string | undefined = data.poster_path;

    if (data.images?.posters && Array.isArray(data.images.posters) && data.images.posters.length > 0) {
      const idPoster = data.images.posters.find((p: any) => p.iso_639_1 === 'id');
      if (idPoster?.file_path) {
        posterIdPath = idPoster.file_path;
      }
      const enPoster =
        data.images.posters.find((p: any) => p.iso_639_1 === 'en') ||
        data.images.posters.find((p: any) => !p.iso_639_1);
      if (enPoster?.file_path) {
        posterEnPath = enPoster.file_path;
        posterPath = enPoster.file_path;
      }
    }

    // Extract official English & Indonesian backdrop
    let backdropPath: string | undefined = data.backdrop_path;
    let backdropIdPath: string | undefined = idData?.backdrop_path;
    let backdropEnPath: string | undefined = data.backdrop_path;

    if (data.images?.backdrops && Array.isArray(data.images.backdrops) && data.images.backdrops.length > 0) {
      const idBackdrop = data.images.backdrops.find((b: any) => b.iso_639_1 === 'id');
      if (idBackdrop?.file_path) {
        backdropIdPath = idBackdrop.file_path;
      }
      const enBackdrop =
        data.images.backdrops.find((b: any) => b.iso_639_1 === 'en') ||
        data.images.backdrops.find((b: any) => !b.iso_639_1);
      if (enBackdrop?.file_path) {
        backdropEnPath = enBackdrop.file_path;
        backdropPath = enBackdrop.file_path;
      }
    }

    const isIndonesian =
      data.original_language === 'id' ||
      (Array.isArray(data.origin_country) && data.origin_country.includes('ID')) ||
      country.toLowerCase().includes('indonesia');

    const idTitleRaw = idData ? (isMovie ? idData.title : idData.name) : undefined;
    const isIdTitleValid = idTitleRaw && !NON_LATIN_REGEX.test(idTitleRaw);
    const titleId = isIndonesian ? (origTitle || idTitleRaw || title) : (isIdTitleValid ? idTitleRaw : title);
    const titleEn = title;

    const posterIdUrl = posterIdPath ? `${IMAGE_BASE_W500}${posterIdPath}` : undefined;
    const posterEnUrl = posterEnPath ? `${IMAGE_BASE_W500}${posterEnPath}` : undefined;
    const backdropIdUrl = backdropIdPath ? `${IMAGE_BASE_ORIGINAL}${backdropIdPath}` : undefined;
    const backdropEnUrl = backdropEnPath ? `${IMAGE_BASE_ORIGINAL}${backdropEnPath}` : undefined;

    let isOngoing: boolean | undefined = undefined;
    let tvStatus: string | undefined = undefined;
    let totalEpisodes: number | undefined = undefined;
    let releasedEpisodes: number | undefined = undefined;
    let currentSeasonTotalEpisodes: number | undefined = undefined;
    let currentSeasonReleasedEpisodes: number | undefined = undefined;
    let nextEpisodeToAir: string | undefined = undefined;
    let nextEpisodeInfo: NextEpisodeAirInfo | undefined = undefined;
    let totalSeasons: number | undefined = undefined;
    let currentSeason: number | undefined = undefined;
    let completedSeasons: number[] = [];
    let ongoingSeason: number | undefined = undefined;
    let seasonBreakdown: string | undefined = undefined;

    if (!isMovie) {
      tvStatus = data.status;
      totalEpisodes = data.number_of_episodes;
      nextEpisodeToAir = data.next_episode_to_air?.air_date;
      if (data.next_episode_to_air?.air_date) {
        const nEp = data.next_episode_to_air;
        nextEpisodeInfo = {
          airDate: nEp.air_date,
          episodeNumber: nEp.episode_number,
          seasonNumber: nEp.season_number,
          title: nEp.name || undefined,
          overview: nEp.overview || undefined,
          stillPath: nEp.still_path ? `${IMAGE_BASE_W500}${nEp.still_path}` : undefined,
        };
      }

      const statusCalc = calculateSeriesStatusFromTmdb(data);
      totalSeasons = statusCalc.totalSeasons;
      currentSeasonTotalEpisodes = statusCalc.currentSeasonTotalEpisodes;
      currentSeasonReleasedEpisodes = statusCalc.currentSeasonReleasedEpisodes;
      releasedEpisodes = statusCalc.releasedEpisodes;
      totalEpisodes = statusCalc.totalEpisodes;
      isOngoing = statusCalc.isOngoing;
      ongoingSeason = statusCalc.ongoingSeason;
      currentSeason = statusCalc.currentSeason;
      completedSeasons = statusCalc.completedSeasons;
      seasonBreakdown = statusCalc.seasonBreakdown;
    }

    const item: MediaItem = {
      id: `tmdb-${type}-${tmdbId}`,
      tmdbId,
      title: (isIndonesian && titleId) ? titleId : (title || 'Sinema TMDB'),
      titleId,
      titleEn,
      originalTitle: origTitle,
      type: isMovie ? 'movie' : 'series',
      poster: (isIndonesian && posterIdUrl) ? posterIdUrl : (posterPath
        ? `${IMAGE_BASE_W500}${posterPath}`
        : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=600&auto=format&fit=crop'),
      posterId: posterIdUrl,
      posterEn: posterEnUrl,
      backdrop: (isIndonesian && backdropIdUrl) ? backdropIdUrl : (backdropPath
        ? `${IMAGE_BASE_ORIGINAL}${backdropPath}`
        : posterPath
        ? `${IMAGE_BASE_ORIGINAL}${posterPath}`
        : 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1920&auto=format&fit=crop'),
      backdropId: backdropIdUrl,
      backdropEn: backdropEnUrl,
      originCountry: data.origin_country || (isIndonesian ? ['ID'] : undefined),
      originalLanguage: data.original_language || (isIndonesian ? 'id' : undefined),
      synopsis: idOverview || enOverview || imdbDetails?.plot || 'Sinopsis resmi sinema belum tersedia dalam bahasa ini.',
      synopsisId: idOverview || undefined,
      synopsisEn: enOverview || imdbDetails?.plot || undefined,
      rating: imdbDetails?.rating || (data.vote_average ? Math.round(data.vote_average * 10) / 10 : 8.0),
      imdbId,
      imdbRating: imdbDetails?.rating || (data.vote_average ? Math.round(data.vote_average * 10) / 10 : undefined),
      imdbVotes: imdbDetails?.votes || (data.vote_count ? `${data.vote_count.toLocaleString()} voting` : undefined),
      imdbUrl: imdbId ? getImdbUrl(imdbId) : undefined,
      imdbPlot: imdbDetails?.plot || undefined,
      writer,
      awards: imdbDetails?.awards || undefined,
      boxOffice: imdbDetails?.boxOffice || undefined,
      year: isNaN(year) ? 2024 : year,
      releaseDate: dateStr || `${year}`,
      duration,
      episodeDuration,
      quality: '1080p FHD',
      ageRating: (imdbDetails?.rated as any) || '13+',
      genres,
      country,
      director,
      cast,
      servers: isMovie ? createMovieServers(tmdbId) : createTvServers(tmdbId, 1, 1),
      seasons,
      trailerUrl,
      trailerYoutubeKey,
      logoUrl,
      audioTracks: ['Bahasa Asli (Dolby Atmos)', 'Bahasa Inggris 5.1'],
      subtitles: ['Indonesia (Otomatis)', 'English (CC)', 'Off'],
      status: tvStatus,
      isOngoing,
      totalEpisodes,
      releasedEpisodes,
      currentSeasonTotalEpisodes,
      currentSeasonReleasedEpisodes,
      nextEpisodeToAir,
      nextEpisodeInfo,
      totalSeasons,
      currentSeason,
      completedSeasons,
      ongoingSeason,
      seasonBreakdown,
    };

    return item;
  } catch (err) {
    console.error(`Failed to fetch full TMDB item ${tmdbId}:`, err);
    return null;
  }
}

/**
 * Fetch top popular & trending movies and series for Hero Banner
 * Interleaves popular movies and popular series for a balanced experience
 */
export async function fetchPopularHeroItems(): Promise<MediaItem[]> {
  const apiKey = getTmdbApiKey();

  try {
    const [moviesRes, tvRes] = await Promise.all([
      fetch(`${BASE_URL}/trending/movie/week?api_key=${apiKey}&language=en-US`).then((r) =>
        r.ok ? r.json() : { results: [] }
      ),
      fetch(`${BASE_URL}/trending/tv/week?api_key=${apiKey}&language=en-US`).then((r) =>
        r.ok ? r.json() : { results: [] }
      ),
    ]);

    const topMovies = (moviesRes.results || [])
      .filter((x: any) => x.backdrop_path && x.overview)
      .slice(0, 3);
    const topTv = (tvRes.results || [])
      .filter((x: any) => x.backdrop_path && x.overview)
      .slice(0, 3);

    const candidates: any[] = [];
    const maxLen = Math.max(topMovies.length, topTv.length);
    for (let i = 0; i < maxLen; i++) {
      if (topMovies[i]) candidates.push({ ...topMovies[i], media_type: 'movie' });
      if (topTv[i]) candidates.push({ ...topTv[i], media_type: 'tv' });
    }

    if (candidates.length === 0) return [];

    const items = await Promise.all(
      candidates.map(async (c: any) => {
        try {
          return await fetchFullMediaItem(c.id, c.media_type);
        } catch {
          return null;
        }
      })
    );

    return items.filter((item): item is MediaItem => item !== null);
  } catch (err) {
    console.error('Failed to fetch popular hero items:', err);
    return [];
  }
}

/**
 * Fetch tailored recommendations for a movie or TV show based on TMDB ID.
 * Queries TMDB recommendations endpoint, falling back or supplementing with similar endpoint.
 */
export async function fetchTmdbRecommendations(
  tmdbId: number,
  type: 'movie' | 'tv' | 'series' | 'anime' | 'drama',
  limit: number = 12
): Promise<MediaItem[]> {
  const apiKey = getTmdbApiKey();
  const tmdbType = type === 'movie' ? 'movie' : 'tv';

  try {
    const recUrl = `${BASE_URL}/${tmdbType}/${tmdbId}/recommendations?api_key=${apiKey}&language=en-US`;
    const simUrl = `${BASE_URL}/${tmdbType}/${tmdbId}/similar?api_key=${apiKey}&language=en-US`;

    const [recRes, simRes] = await Promise.all([
      fetch(recUrl).then((r) => (r.ok ? r.json() : { results: [] })).catch(() => ({ results: [] })),
      fetch(simUrl).then((r) => (r.ok ? r.json() : { results: [] })).catch(() => ({ results: [] })),
    ]);

    const seenIds = new Set<number>([tmdbId]);
    const rawList: any[] = [];

    for (const item of recRes.results || []) {
      if (item.id && !seenIds.has(item.id) && item.poster_path) {
        seenIds.add(item.id);
        rawList.push(item);
      }
    }

    if (rawList.length < limit) {
      for (const item of simRes.results || []) {
        if (item.id && !seenIds.has(item.id) && item.poster_path) {
          seenIds.add(item.id);
          rawList.push(item);
        }
      }
    }

    const finalCandidates = rawList.slice(0, limit);

    return finalCandidates.map((x: any) => {
      const isMovie = x.media_type === 'movie' || (!x.media_type && tmdbType === 'movie');
      const dateStr = isMovie ? x.release_date : x.first_air_date;
      const year = dateStr ? new Date(dateStr).getFullYear() : 2024;
      const title = (isMovie ? x.title : x.name) || x.original_title || x.original_name || 'Sinema Rekomendasi';

      let itemType: MediaItem['type'] = isMovie ? 'movie' : 'series';
      if (!isMovie) {
        const isAnime =
          (x.genre_ids && x.genre_ids.includes(16)) &&
          (x.origin_country?.includes('JP') || x.original_language === 'ja');
        const isKdrama =
          x.origin_country?.includes('KR') || x.original_language === 'ko';
        if (isAnime) itemType = 'anime';
        else if (isKdrama) itemType = 'drama';
      }

      const genres =
        x.genre_ids && x.genre_ids.length > 0
          ? getGenreNames(x.genre_ids)
          : ['Sinema Pilihan'];

      const isIndo =
        x.original_language === 'id' ||
        (Array.isArray(x.origin_country) && x.origin_country.includes('ID'));
      const origTitle = isMovie ? x.original_title : x.original_name;
      const titleId = isIndo ? (origTitle || title) : title;
      const titleEn = title;

      return {
        id: `tmdb-${isMovie ? 'movie' : 'tv'}-${x.id}`,
        tmdbId: x.id,
        title,
        titleId,
        titleEn,
        originalTitle: origTitle,
        type: itemType,
        poster: x.poster_path
          ? `${IMAGE_BASE_W500}${x.poster_path}`
          : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=600&auto=format&fit=crop',
        backdrop: x.backdrop_path
          ? `${IMAGE_BASE_ORIGINAL}${x.backdrop_path}`
          : x.poster_path
          ? `${IMAGE_BASE_ORIGINAL}${x.poster_path}`
          : 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1920&auto=format&fit=crop',
        synopsis: x.overview || 'Sinopsis resmi belum tersedia dalam bahasa ini.',
        synopsisEn: x.overview || '',
        rating: x.vote_average ? Math.round(x.vote_average * 10) / 10 : 7.8,
        year: isNaN(year) ? 2024 : year,
        releaseDate: dateStr || `${year}`,
        duration: isMovie ? '2j 00m' : 'Serial TV',
        quality: '1080p FHD',
        ageRating: '13+',
        genres,
        country: isIndo ? 'Indonesia' : (x.origin_country?.[0] || 'Internasional'),
        originCountry: x.origin_country || (isIndo ? ['ID'] : undefined),
        originalLanguage: x.original_language || (isIndo ? 'id' : undefined),
        director: 'Kreator Sinematik',
        cast: [],
        servers: isMovie ? createMovieServers(x.id) : createTvServers(x.id, 1, 1),
        seasons: isMovie
          ? undefined
          : [
              {
                seasonNumber: 1,
                title: 'Musim ke-1',
                episodes: [
                  {
                    id: `tmdb-tv-${x.id}-s1-e1`,
                    episodeNumber: 1,
                    title: 'Episode 1',
                    duration: '45 Menit',
                    thumbnail: x.backdrop_path
                      ? `${IMAGE_BASE_W500}${x.backdrop_path}`
                      : x.poster_path
                      ? `${IMAGE_BASE_W500}${x.poster_path}`
                      : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=600&auto=format&fit=crop',
                    synopsis: x.overview || `Episode 1 dari ${title}.`,
                    videoUrl: `https://vidlink.pro/tv/${x.id}/1/1`,
                    servers: createTvServers(x.id, 1, 1),
                  },
                ],
              },
            ],
        audioTracks: ['Bahasa Asli (Dolby Atmos)', 'Bahasa Inggris 5.1'],
        subtitles: ['Indonesia (Otomatis)', 'English (CC)', 'Off'],
      } as MediaItem;
    });
  } catch (err) {
    console.error('Failed to fetch TMDB recommendations:', err);
    return [];
  }
}

/**
 * Fetch YouTube official trailer for any movie or TV series
 */
export async function fetchTrailerForMedia(
  tmdbId?: number,
  type?: string,
  title?: string
): Promise<{ key?: string; url: string }> {
  const fallbackQuery = encodeURIComponent(`${title || 'Movie'} official trailer`);
  const fallbackUrl = `https://www.youtube.com/results?search_query=${fallbackQuery}`;

  if (!tmdbId) {
    return { url: fallbackUrl };
  }

  const apiKey = getTmdbApiKey();
  const endpoint = type === 'movie' ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;

  try {
    const res = await fetch(`${BASE_URL}${endpoint}/videos?api_key=${apiKey}&language=en-US`);
    if (res.ok) {
      const data = await res.json();
      if (data.results && Array.isArray(data.results) && data.results.length > 0) {
        const ytTrailer = selectBestWidescreenTrailer(data.results);
        if (ytTrailer?.key) {
          return {
            key: ytTrailer.key,
            url: `https://www.youtube.com/watch?v=${ytTrailer.key}`,
          };
        }
      }
    }
  } catch (err) {
    console.warn('Failed to fetch TMDB trailer:', err);
  }

  return { url: fallbackUrl };
}

/**
 * Fetch official title logo PNG for any movie or TV series
 */
export async function fetchLogoForMedia(
  tmdbId?: number,
  type?: string
): Promise<string | undefined> {
  if (!tmdbId) return undefined;
  const apiKey = getTmdbApiKey();
  const endpoint = type === 'movie' ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;

  try {
    const res = await fetch(
      `${BASE_URL}${endpoint}/images?api_key=${apiKey}&include_image_language=en,null`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.logos && Array.isArray(data.logos) && data.logos.length > 0) {
        const bestLogo =
          data.logos.find((l: any) => l.iso_639_1 === 'en') ||
          data.logos.find((l: any) => !l.iso_639_1) ||
          data.logos[0];
        if (bestLogo?.file_path) {
          return `${IMAGE_BASE_ORIGINAL}${bestLogo.file_path}`;
        }
      }
    }
  } catch (err) {
    console.warn('Failed to fetch TMDB logo:', err);
  }
  return undefined;
}


