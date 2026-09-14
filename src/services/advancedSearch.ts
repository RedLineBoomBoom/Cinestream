/**
 * Advanced Search & Discovery Engine
 * Multi-criteria cinema filter combining TMDB Discover API and local high-definition catalog.
 * Supports multi-genre, multi-country, release years/decades, minimum rating, quality, series status, and custom keywords.
 */

import type { MediaItem, Server, NextEpisodeAirInfo } from '../types/media';
import { createMovieServers, createTvServers } from '../data/mockCatalog';
import { getTmdbApiKey, getTvShowDetailsFast } from './tmdb';
import { GENRE_NAME_TO_ID } from './curation';
import { translateText } from './translator';

const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_W500 = 'https://image.tmdb.org/t/p/w500';
const IMAGE_BASE_ORIGINAL = 'https://image.tmdb.org/t/p/original';

// Regex to detect non-Latin scripts for title fallback
const NON_LATIN_REGEX = /[^\u0000-\u024F\u1E00-\u1EFF\s\d\p{P}\p{S}\u200B-\u200F\uFEFF]/u;

export type SortOption = 'popularity' | 'release_date' | 'rating' | 'title' | 'latest';
export type MediaTypeFilter = 'all' | 'movie' | 'series' | 'anime' | 'drama';
export type SeriesStatusFilter = 'all' | 'ongoing' | 'completed';

export interface AdvancedFilterCriteria {
  query?: string;
  sortBy?: SortOption;
  genres?: string[]; // e.g. ['Action', 'Sci-Fi']
  countries?: string[]; // e.g. ['US', 'KR', 'JP', 'ID']
  mediaType?: MediaTypeFilter;
  seriesStatus?: SeriesStatusFilter;
  quality?: string; // 'all' | '4k' | 'bluray' | '1080p' | 'web-dl' | 'hdtv'
  year?: string; // 'all' | '2026' | '2025' | '2024' | ... | '2010s' | '2000s' | 'classics'
  minRating?: number; // 0, 6, 7, 8, 8.5
  page?: number;
  language?: 'id' | 'en';
}

export interface AdvancedSearchResult {
  items: MediaItem[];
  totalCount: number;
  page: number;
  hasMore: boolean;
}

// Genre catalog definition for filter UI
export interface FilterGenreItem {
  id: string;
  tmdbId: number;
  nameId: string;
  nameEn: string;
  icon?: string;
}

export const ADVANCED_GENRES: FilterGenreItem[] = [
  { id: 'action', tmdbId: 28, nameId: 'Aksi', nameEn: 'Action', icon: '⚔️' },
  { id: 'adventure', tmdbId: 12, nameId: 'Petualangan', nameEn: 'Adventure', icon: '🧭' },
  { id: 'animation', tmdbId: 16, nameId: 'Animasi', nameEn: 'Animation', icon: '🎨' },
  { id: 'comedy', tmdbId: 35, nameId: 'Komedi', nameEn: 'Comedy', icon: '😂' },
  { id: 'crime', tmdbId: 80, nameId: 'Kriminal', nameEn: 'Crime', icon: '🕵️' },
  { id: 'documentary', tmdbId: 99, nameId: 'Dokumenter', nameEn: 'Documentary', icon: '📽️' },
  { id: 'drama', tmdbId: 18, nameId: 'Drama', nameEn: 'Drama', icon: '🎭' },
  { id: 'family', tmdbId: 10751, nameId: 'Keluarga', nameEn: 'Family', icon: '👨‍👩‍👧‍👦' },
  { id: 'fantasy', tmdbId: 14, nameId: 'Fantasi', nameEn: 'Fantasy', icon: '🧙' },
  { id: 'history', tmdbId: 36, nameId: 'Sejarah', nameEn: 'History', icon: '🏛️' },
  { id: 'horror', tmdbId: 27, nameId: 'Horor', nameEn: 'Horror', icon: '👻' },
  { id: 'music', tmdbId: 10402, nameId: 'Musik', nameEn: 'Music', icon: '🎵' },
  { id: 'mystery', tmdbId: 9648, nameId: 'Misteri', nameEn: 'Mystery', icon: '🔍' },
  { id: 'romance', tmdbId: 10749, nameId: 'Romantis', nameEn: 'Romance', icon: '❤️' },
  { id: 'scifi', tmdbId: 878, nameId: 'Fiksi Ilmiah', nameEn: 'Sci-Fi', icon: '🚀' },
  { id: 'thriller', tmdbId: 53, nameId: 'Thriller', nameEn: 'Thriller', icon: '⚡' },
  { id: 'war', tmdbId: 10752, nameId: 'Perang', nameEn: 'War', icon: '🪖' },
  { id: 'western', tmdbId: 37, nameId: 'Western', nameEn: 'Western', icon: '🤠' },
];

export interface FilterCountryItem {
  code: string;
  flag: string;
  nameId: string;
  nameEn: string;
}

export const ADVANCED_COUNTRIES: FilterCountryItem[] = [
  { code: 'US', flag: '🇺🇸', nameId: 'Amerika Serikat', nameEn: 'United States' },
  { code: 'KR', flag: '🇰🇷', nameId: 'Korea Selatan', nameEn: 'South Korea' },
  { code: 'JP', flag: '🇯🇵', nameId: 'Jepang', nameEn: 'Japan' },
  { code: 'ID', flag: '🇮🇩', nameId: 'Indonesia', nameEn: 'Indonesia' },
  { code: 'GB', flag: '🇬🇧', nameId: 'Inggris (UK)', nameEn: 'United Kingdom' },
  { code: 'FR', flag: '🇫🇷', nameId: 'Prancis', nameEn: 'France' },
  { code: 'DE', flag: '🇩🇪', nameId: 'Jerman', nameEn: 'Germany' },
  { code: 'ES', flag: '🇪🇸', nameId: 'Spanyol', nameEn: 'Spain' },
  { code: 'IT', flag: '🇮🇹', nameId: 'Italia', nameEn: 'Italy' },
  { code: 'CA', flag: '🇨🇦', nameId: 'Kanada', nameEn: 'Canada' },
  { code: 'AU', flag: '🇦🇺', nameId: 'Australia', nameEn: 'Australia' },
  { code: 'IN', flag: '🇮🇳', nameId: 'India', nameEn: 'India' },
  { code: 'CN', flag: '🇨🇳', nameId: 'China', nameEn: 'China' },
  { code: 'TH', flag: '🇹🇭', nameId: 'Thailand', nameEn: 'Thailand' },
  { code: 'HK', flag: '🇭🇰', nameId: 'Hong Kong', nameEn: 'Hong Kong' },
];

export const ADVANCED_YEARS = [
  { id: 'all', labelId: 'Semua Tahun', labelEn: 'All Years', label: 'Semua Tahun' },
  { id: '2026', labelId: '2026 (Terkini)', labelEn: '2026 (Latest)', label: '2026 (Terkini)' },
  { id: '2025', labelId: '2025', labelEn: '2025', label: '2025' },
  { id: '2024', labelId: '2024', labelEn: '2024', label: '2024' },
  { id: '2023', labelId: '2023', labelEn: '2023', label: '2023' },
  { id: '2022', labelId: '2022', labelEn: '2022', label: '2022' },
  { id: '2021', labelId: '2021', labelEn: '2021', label: '2021' },
  { id: '2020', labelId: '2020', labelEn: '2020', label: '2020' },
  { id: '2010s', labelId: 'Era 2010-an (2010–2019)', labelEn: '2010s Era (2010–2019)', label: 'Era 2010-an (2010–2019)' },
  { id: '2000s', labelId: 'Era 2000-an (2000–2009)', labelEn: '2000s Era (2000–2009)', label: 'Era 2000-an (2000–2009)' },
  { id: 'classics', labelId: 'Sinema Klasik (< 2000)', labelEn: 'Classic Cinema (< 2000)', label: 'Sinema Klasik (< 2000)' },
];

export const ADVANCED_RATINGS = [
  { value: 0, labelId: 'Semua Rating', labelEn: 'All Ratings', label: 'Semua Rating' },
  { value: 8.5, labelId: '⭐ 8.5+ (Mahakarya)', labelEn: '⭐ 8.5+ (Masterpiece)', label: '⭐ 8.5+ (Masterpiece)' },
  { value: 8.0, labelId: '⭐ 8.0+ (Sangat Bagus)', labelEn: '⭐ 8.0+ (Great)', label: '⭐ 8.0+ (Sangat Bagus)' },
  { value: 7.0, labelId: '⭐ 7.0+ (Bagus)', labelEn: '⭐ 7.0+ (Good)', label: '⭐ 7.0+ (Bagus)' },
  { value: 6.0, labelId: '⭐ 6.0+ (Layak Tonton)', labelEn: '⭐ 6.0+ (Watchable)', label: '⭐ 6.0+ (Layak Tonton)' },
];

export const ADVANCED_QUALITIES = [
  { id: 'all', labelId: 'Semua Kualitas', labelEn: 'All Qualities', label: 'Semua Kualitas' },
  { id: '1080p', labelId: '1080p Full HD', labelEn: '1080p Full HD', label: '1080p Full HD' },
  { id: 'bluray', labelId: 'BluRay HD', labelEn: 'BluRay HD', label: 'BluRay HD' },
  { id: 'web-dl', labelId: 'WEB-DL HD', labelEn: 'WEB-DL HD', label: 'WEB-DL HD' },
  { id: 'nf-web-dl', labelId: 'NF Web-DL', labelEn: 'NF Web-DL', label: 'NF Web-DL' },
  { id: 'hdtv', labelId: 'HDTV', labelEn: 'HDTV', label: 'HDTV' },
];

export const ADVANCED_SORTS = [
  { id: 'popularity', labelId: 'Paling Populer', labelEn: 'Most Popular', icon: 'Eye' },
  { id: 'release_date', labelId: 'Tanggal Rilis', labelEn: 'Release Date', icon: 'Calendar' },
  { id: 'rating', labelId: 'Rating Tertinggi', labelEn: 'Top Rated', icon: 'Star' },
  { id: 'title', labelId: 'Nama (A-Z)', labelEn: 'Name (A-Z)', icon: 'ArrowDownAZ' },
  { id: 'latest', labelId: 'Terkini Ditambahkan', labelEn: 'Latest', icon: 'Clock' },
];

// Helper to map TMDB genre IDs to genre names
const TMDB_GENRE_NAMES: Record<number, string> = {
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

/**
 * Filter local catalog with criteria
 */
function filterLocalCatalog(items: MediaItem[], criteria: AdvancedFilterCriteria): MediaItem[] {
  return items.filter((item) => {
    // 1. Keyword query
    if (criteria.query && criteria.query.trim()) {
      const q = criteria.query.toLowerCase().trim();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchOrig = item.originalTitle?.toLowerCase().includes(q);
      const matchDirector = item.director?.toLowerCase().includes(q);
      const matchCast = item.cast?.some((c) => c.name.toLowerCase().includes(q));
      const matchSynopsis = item.synopsis?.toLowerCase().includes(q);
      if (!matchTitle && !matchOrig && !matchDirector && !matchCast && !matchSynopsis) {
        return false;
      }
    }

    // 2. Media Type
    if (criteria.mediaType && criteria.mediaType !== 'all') {
      if (criteria.mediaType === 'movie' && item.type !== 'movie') return false;
      if (criteria.mediaType === 'series' && item.type !== 'series') return false;
      if (criteria.mediaType === 'anime' && item.type !== 'anime') return false;
      if (criteria.mediaType === 'drama' && item.type !== 'drama') return false;
    }

    // 3. Series Status
    if (criteria.seriesStatus && criteria.seriesStatus !== 'all') {
      if (criteria.seriesStatus === 'ongoing' && !item.isOngoing) return false;
      if (criteria.seriesStatus === 'completed' && item.isOngoing) return false;
    }

    // 4. Minimum Rating
    if (typeof criteria.minRating === 'number' && criteria.minRating > 0 && item.rating < criteria.minRating) {
      return false;
    }

    // 5. Year / Era
    if (criteria.year && criteria.year !== 'all') {
      if (criteria.year === '2010s') {
        if (item.year < 2010 || item.year > 2019) return false;
      } else if (criteria.year === '2000s') {
        if (item.year < 2000 || item.year > 2009) return false;
      } else if (criteria.year === 'classics') {
        if (item.year >= 2000) return false;
      } else {
        const targetYear = parseInt(criteria.year, 10);
        if (!isNaN(targetYear) && item.year !== targetYear) return false;
      }
    }

    // 6. Genres (Match ANY of selected genres if list not empty)
    if (criteria.genres && criteria.genres.length > 0) {
      const itemGenres = (item.genres || []).map((g) => g.toLowerCase());
      const hasGenre = criteria.genres.some((sel) =>
        itemGenres.some((g) => g.includes(sel.toLowerCase()) || sel.toLowerCase().includes(g))
      );
      if (!hasGenre) return false;
    }

    // 7. Country
    if (criteria.countries && criteria.countries.length > 0) {
      const itemCountry = (item.country || '').toLowerCase();
      const hasCountry = criteria.countries.some((c) => {
        const countryObj = ADVANCED_COUNTRIES.find((ac) => ac.code.toLowerCase() === c.toLowerCase());
        const codeMatch = itemCountry.includes(c.toLowerCase());
        const nameIdMatch = countryObj && itemCountry.includes(countryObj.nameId.toLowerCase());
        const nameEnMatch = countryObj && itemCountry.includes(countryObj.nameEn.toLowerCase());
        return codeMatch || nameIdMatch || nameEnMatch;
      });
      if (!hasCountry) return false;
    }

    // 8. Quality
    if (criteria.quality && criteria.quality !== 'all') {
      const itemQ = (item.quality || '').toLowerCase();
      if (criteria.quality === '4k' && !itemQ.includes('4k')) return false;
      if (criteria.quality === 'bluray' && !itemQ.includes('bluray') && !itemQ.includes('4k')) return false;
      if (criteria.quality === '1080p' && !itemQ.includes('1080p') && !itemQ.includes('fhd')) return false;
      if (criteria.quality.includes('web-dl') && !itemQ.includes('web') && !itemQ.includes('1080p')) return false;
    }

    return true;
  });
}

/**
 * Execute Advanced Search combining TMDB Discover and Local Catalog
 */
export async function searchAdvanced(
  rawCriteria: AdvancedFilterCriteria,
  localCatalog: MediaItem[] = []
): Promise<AdvancedSearchResult> {
  const criteria: Required<AdvancedFilterCriteria> = {
    query: rawCriteria.query?.trim() || '',
    sortBy: rawCriteria.sortBy || 'popularity',
    genres: rawCriteria.genres || [],
    countries: rawCriteria.countries || [],
    mediaType: rawCriteria.mediaType || 'all',
    seriesStatus: rawCriteria.seriesStatus || 'all',
    quality: rawCriteria.quality || 'all',
    year: rawCriteria.year || 'all',
    minRating: typeof rawCriteria.minRating === 'number' ? rawCriteria.minRating : 0,
    page: rawCriteria.page || 1,
    language: rawCriteria.language || 'id',
  };
  const page = criteria.page;
  const lang = criteria.language;
  const tmdbLang = lang === 'en' ? 'en-US' : 'id-ID';
  const apiKey = getTmdbApiKey();

  // 1. Filter local catalog first
  const matchedLocal = filterLocalCatalog(localCatalog, criteria);

  // If TMDB API key is missing, return filtered local catalog
  if (!apiKey) {
    const sorted = sortItems(matchedLocal, criteria.sortBy);
    return {
      items: sorted,
      totalCount: sorted.length,
      page: 1,
      hasMore: false,
    };
  }

  // 2. Build TMDB Discover Query Parameters
  const tmdbSortMap: Record<SortOption, string> = {
    popularity: 'popularity.desc',
    release_date: 'primary_release_date.desc',
    rating: 'vote_average.desc',
    title: 'original_title.asc',
    latest: 'primary_release_date.desc',
  };
  const tmdbTvSortMap: Record<SortOption, string> = {
    popularity: 'popularity.desc',
    release_date: 'first_air_date.desc',
    rating: 'vote_average.desc',
    title: 'original_name.asc',
    latest: 'first_air_date.desc',
  };

  // Convert selected genre names to TMDB genre IDs
  const genreIds: number[] = [];
  for (const gName of criteria.genres) {
    const found = ADVANCED_GENRES.find(
      (ag) => ag.nameEn.toLowerCase() === gName.toLowerCase() || ag.nameId.toLowerCase() === gName.toLowerCase()
    );
    if (found) {
      genreIds.push(found.tmdbId);
    } else {
      const resolved = GENRE_NAME_TO_ID[gName.toLowerCase()];
      if (resolved) genreIds.push(resolved);
    }
  }

  const withGenres = genreIds.length > 0 ? genreIds.join(',') : undefined;
  const withCountries = criteria.countries.length > 0 ? criteria.countries.join('|') : undefined;

  // Build year constraints
  let movieYearParam = '';
  let tvYearParam = '';
  if (criteria.year !== 'all') {
    if (criteria.year === '2010s') {
      movieYearParam = '&primary_release_date.gte=2010-01-01&primary_release_date.lte=2019-12-31';
      tvYearParam = '&first_air_date.gte=2010-01-01&first_air_date.lte=2019-12-31';
    } else if (criteria.year === '2000s') {
      movieYearParam = '&primary_release_date.gte=2000-01-01&primary_release_date.lte=2009-12-31';
      tvYearParam = '&first_air_date.gte=2000-01-01&first_air_date.lte=2009-12-31';
    } else if (criteria.year === 'classics') {
      movieYearParam = '&primary_release_date.lte=1999-12-31';
      tvYearParam = '&first_air_date.lte=1999-12-31';
    } else {
      const y = parseInt(criteria.year, 10);
      if (!isNaN(y)) {
        movieYearParam = `&primary_release_year=${y}`;
        tvYearParam = `&first_air_date_year=${y}`;
      }
    }
  }

  // Minimum rating
  let ratingParam = '';
  if (criteria.minRating > 0) {
    ratingParam = `&vote_average.gte=${criteria.minRating}&vote_count.gte=30`;
  } else if (criteria.sortBy === 'rating') {
    ratingParam = '&vote_count.gte=100';
  }

  // Series status
  let tvStatusParam = '';
  if (criteria.seriesStatus === 'ongoing') {
    tvStatusParam = '&with_status=0|2';
  } else if (criteria.seriesStatus === 'completed') {
    tvStatusParam = '&with_status=3';
  }

  // Determine what to query: movie, tv, or both
  const shouldQueryMovie =
    criteria.mediaType === 'all' || criteria.mediaType === 'movie';
  const shouldQueryTv =
    criteria.mediaType === 'all' ||
    criteria.mediaType === 'series' ||
    criteria.mediaType === 'anime' ||
    criteria.mediaType === 'drama';

  const fetchedItems: MediaItem[] = [];
  let hasMore = true;

  try {
    const promises: Promise<any>[] = [];

    // If query text is provided, use TMDB search endpoint instead of discover
    if (criteria.query && criteria.query.trim()) {
      const q = encodeURIComponent(criteria.query.trim());
      promises.push(
        fetch(`${BASE_URL}/search/multi?api_key=${apiKey}&language=${tmdbLang}&query=${q}&page=${page}&include_image_language=${lang},null,en`)
          .then((r) => (r.ok ? r.json() : { results: [], total_pages: 1, total_results: 0 }))
          .then((data) => ({
            type: 'multi',
            results: data.results || [],
            totalPages: data.total_pages || 1,
            totalResults: data.total_results || 0,
          }))
      );
      if (lang === 'id') {
        promises.push(
          fetch(`${BASE_URL}/search/multi?api_key=${apiKey}&language=en-US&query=${q}&page=${page}&include_image_language=en,null`)
            .then((r) => (r.ok ? r.json() : { results: [] }))
            .then((data) => ({
              type: 'multi-en',
              results: data.results || [],
              totalPages: 1,
              totalResults: 0,
            }))
        );
      }
    } else {
      // TMDB Discover Movie
      if (shouldQueryMovie) {
        let movieUrl = `${BASE_URL}/discover/movie?api_key=${apiKey}&language=${tmdbLang}&sort_by=${tmdbSortMap[criteria.sortBy]}&page=${page}&include_image_language=${lang},null,en`;
        if (withGenres) movieUrl += `&with_genres=${withGenres}`;
        if (withCountries) movieUrl += `&with_origin_country=${withCountries}`;
        if (movieYearParam) movieUrl += movieYearParam;
        if (ratingParam) movieUrl += ratingParam;
        promises.push(
          fetch(movieUrl)
            .then((r) => (r.ok ? r.json() : { results: [], total_pages: 1, total_results: 0 }))
            .then((data) => ({
              type: 'movie',
              results: data.results || [],
              totalPages: data.total_pages || 1,
              totalResults: data.total_results || 0,
            }))
        );
        if (lang === 'id') {
          const enMovieUrl = movieUrl.replace(`language=${tmdbLang}`, 'language=en-US');
          promises.push(
            fetch(enMovieUrl)
              .then((r) => (r.ok ? r.json() : { results: [] }))
              .then((data) => ({
                type: 'movie-en',
                results: data.results || [],
                totalPages: 1,
                totalResults: 0,
              }))
          );
        }
      }

      // TMDB Discover TV
      if (shouldQueryTv) {
        let tvUrl = `${BASE_URL}/discover/tv?api_key=${apiKey}&language=${tmdbLang}&sort_by=${tmdbTvSortMap[criteria.sortBy]}&page=${page}&include_image_language=${lang},null,en`;
        if (criteria.mediaType === 'anime') {
          tvUrl += `&with_genres=16&with_original_language=ja`;
        } else if (criteria.mediaType === 'drama') {
          tvUrl += `&with_origin_country=KR|JP|CN|TH`;
        }
        if (withGenres && criteria.mediaType !== 'anime') tvUrl += `&with_genres=${withGenres}`;
        if (withCountries && criteria.mediaType !== 'drama') tvUrl += `&with_origin_country=${withCountries}`;
        if (tvYearParam) tvUrl += tvYearParam;
        if (ratingParam) tvUrl += ratingParam;
        if (tvStatusParam) tvUrl += tvStatusParam;

        promises.push(
          fetch(tvUrl)
            .then((r) => (r.ok ? r.json() : { results: [], total_pages: 1, total_results: 0 }))
            .then((data) => ({
              type: 'tv',
              results: data.results || [],
              totalPages: data.total_pages || 1,
              totalResults: data.total_results || 0,
            }))
        );
        if (lang === 'id') {
          const enTvUrl = tvUrl.replace(`language=${tmdbLang}`, 'language=en-US');
          promises.push(
            fetch(enTvUrl)
              .then((r) => (r.ok ? r.json() : { results: [] }))
              .then((data) => ({
                type: 'tv-en',
                results: data.results || [],
                totalPages: 1,
                totalResults: 0,
              }))
          );
        }
      }
    }

    const responses = await Promise.all(promises);
    const maxPages = responses.length > 0 ? Math.max(...responses.map((r) => r.totalPages || 1)) : 1;

    const enOverviewMap = new Map<number, any>();
    for (const res of responses) {
      if (res.type.endsWith('-en')) {
        for (const item of res.results || []) {
          if (item.id) enOverviewMap.set(item.id, item);
        }
      }
    }

    // Collect all TV show IDs to batch-fetch accurate show status
    const tvDetailsMap = new Map<number, any>();
    const tvIds: number[] = [];
    for (const res of responses) {
      for (const item of res.results || []) {
        const isTv = res.type === 'tv' || item.media_type === 'tv' || !!item.first_air_date;
        if (isTv && item.id && !tvIds.includes(item.id)) {
          tvIds.push(item.id);
        }
      }
    }

    if (tvIds.length > 0 && apiKey) {
      await Promise.allSettled(
        tvIds.map(async (id) => {
          const details = await getTvShowDetailsFast(id, apiKey);
          if (details) {
            tvDetailsMap.set(id, details);
          }
        })
      );
    }

    const currentYear = new Date().getFullYear();
    let totalRawFetched = 0;
    for (const res of responses) {
      const results = res.results || [];
      totalRawFetched += results.length;

      for (const item of results) {
        const isTv = res.type === 'tv' || item.media_type === 'tv' || !!item.first_air_date;
        const origTitle = ((isTv ? item.original_name : item.original_title) || '').trim();
        let tmdbTitle = (isTv ? item.name : item.title) || '';

        // Detect Indonesian origin
        const isIndo =
          item.original_language === 'id' ||
          (Array.isArray(item.origin_country) && item.origin_country.includes('ID')) ||
          (item.origin_country?.[0] === 'ID');

        let title = tmdbTitle;
        let titleId = '';
        let titleEn = '';

        if (isIndo) {
          // For Indonesian media, original title is the authentic Indonesian title
          titleId = (lang === 'id' && tmdbTitle) ? tmdbTitle : (origTitle || tmdbTitle);
          titleEn = (lang === 'en' && tmdbTitle) ? tmdbTitle : (origTitle !== tmdbTitle ? tmdbTitle : origTitle);
          if (lang === 'id') {
            title = titleId;
          } else {
            title = titleEn;
          }
        } else {
          titleId = tmdbTitle;
          titleEn = tmdbTitle;
        }

        if (!title && origTitle) {
          title = origTitle;
        }

        // If title is non-latin, fallback to original title if latin
        if (NON_LATIN_REGEX.test(title)) {
          if (origTitle && !NON_LATIN_REGEX.test(origTitle)) {
            title = origTitle;
          }
        }
        if (!title || !item.poster_path) continue;

        // Skip if already in local matches (to avoid duplicates)
        if (matchedLocal.some((m) => m.tmdbId === item.id || m.title.toLowerCase() === title.toLowerCase() || (m.originalTitle && origTitle && m.originalTitle.toLowerCase() === origTitle.toLowerCase()))) {
          continue;
        }

        const dateStr = (isTv ? item.first_air_date : item.release_date) || '';
        const year = dateStr ? new Date(dateStr).getFullYear() : 2024;
        const genres = (item.genre_ids || [])
          .map((id: number) => TMDB_GENRE_NAMES[id])
          .filter(Boolean) as string[];

        // Detect type
        let detectedType: MediaItem['type'] = isTv ? 'series' : 'movie';
        if (item.original_language === 'ja' && (genres.includes('Animation') || item.genre_ids?.includes(16))) {
          detectedType = 'anime';
        } else if (isTv && ['ko', 'ja', 'zh', 'th'].includes(item.original_language)) {
          detectedType = 'drama';
        }

        // Apply quality tag
        const qualityBadge: MediaItem['quality'] = '1080p FHD';

        // TV status, on-going detection, and seasons resolution
        let tvStatus: string | undefined = undefined;
        let isOngoing = false;
        let totalSeasons: number | undefined = undefined;
        let totalEpisodes: number | undefined = undefined;
        let completedSeasons: number[] = [1];
        let ongoingSeason: number | undefined = undefined;
        let nextEpisodeToAir: string | undefined = undefined;
        let nextEpisodeInfo: NextEpisodeAirInfo | undefined = undefined;

        if (isTv) {
          const tvData = tvDetailsMap.get(item.id);
          if (tvData) {
            tvStatus = tvData.status || 'Ended';
            const regularSeasons = (tvData.seasons || []).filter((s: any) => s.season_number > 0);
            totalSeasons = tvData.number_of_seasons || regularSeasons.length || 1;
            totalEpisodes = tvData.number_of_episodes || 10;
            const latestSeason = regularSeasons[regularSeasons.length - 1];
            const currentSeasonTotalEpisodes = latestSeason?.episode_count || tvData.number_of_episodes;
            const lastEp = tvData.last_episode_to_air;
            const currentSeasonReleasedEpisodes = lastEp?.episode_number || 0;

            const hasNextEp = Boolean(tvData.next_episode_to_air);
            nextEpisodeToAir = tvData.next_episode_to_air?.air_date;
            if (tvData.next_episode_to_air?.air_date) {
              const nEp = tvData.next_episode_to_air;
              nextEpisodeInfo = {
                airDate: nEp.air_date,
                episodeNumber: nEp.episode_number,
                seasonNumber: nEp.season_number,
                title: nEp.name || undefined,
                overview: nEp.overview || undefined,
                stillPath: nEp.still_path ? `https://image.tmdb.org/t/p/w500${nEp.still_path}` : undefined,
              };
            }
            const inProd = Boolean(tvData.in_production);
            const isReturning = tvData.status === 'Returning Series';
            const isEnded = tvData.status === 'Ended' || tvData.status === 'Canceled';
            const isSeasonIncomplete =
              (currentSeasonReleasedEpisodes ?? 0) > 0 &&
              (currentSeasonTotalEpisodes ?? 0) > 0 &&
              (currentSeasonReleasedEpisodes ?? 0) < (currentSeasonTotalEpisodes ?? 0);

            if (!isEnded && (hasNextEp || isSeasonIncomplete || inProd || isReturning)) {
              isOngoing = true;
            } else {
              isOngoing = false;
            }

            if (isOngoing) {
              ongoingSeason = tvData.next_episode_to_air?.season_number || latestSeason?.season_number || totalSeasons;
              completedSeasons = regularSeasons
                .map((s: any) => s.season_number)
                .filter((n: number) => typeof n === 'number' && n > 0 && n < ongoingSeason!);
            } else {
              ongoingSeason = undefined;
              completedSeasons = regularSeasons
                .map((s: any) => s.season_number)
                .filter((n: number) => typeof n === 'number' && n > 0);
              if (completedSeasons.length === 0 && typeof totalSeasons === 'number' && totalSeasons > 0) {
                completedSeasons = Array.from({ length: totalSeasons }, (_, i) => i + 1);
              }
            }
          } else {
            // Fallback when details are offline/unavailable
            if (criteria.seriesStatus === 'ongoing') {
              isOngoing = true;
              tvStatus = 'Returning Series';
            } else if (criteria.seriesStatus === 'completed') {
              isOngoing = false;
              tvStatus = 'Ended';
            } else {
              // Historical/older shows (e.g. 2007, 2014, earlier than current year) are COMPLETED
              isOngoing = year >= currentYear;
              tvStatus = isOngoing ? 'Returning Series' : 'Ended';
            }
            totalSeasons = 1;
            completedSeasons = [1];
          }

          // Respect explicit series status filter
          if (criteria.seriesStatus === 'ongoing' && !isOngoing) continue;
          if (criteria.seriesStatus === 'completed' && isOngoing) continue;
        }

        // Extract real episode duration if TV show
        let epDuration: string | undefined = undefined;
        if (isTv) {
          const tvData = tvDetailsMap.get(item.id);
          let epMins = 0;
          if (tvData) {
            const runtimes = tvData.episode_run_time;
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
          }
          if (epMins > 0) {
            const h = Math.floor(epMins / 60);
            const m = epMins % 60;
            epDuration = `${h > 0 ? `${h}j ` : ''}${m}m / ep`;
          } else {
            epDuration = detectedType === 'anime' ? '24m / ep' : detectedType === 'drama' ? '1j 05m / ep' : '52m / ep';
          }
        }

        // Create playable media item
        const servers: Server[] = isTv
          ? createTvServers(item.id, 1, 1)
          : createMovieServers(item.id);

        const posterUrl = `${IMAGE_BASE_W500}${item.poster_path}`;
        const posterId = posterUrl;
        const posterEn = posterUrl;

        const enItem = enOverviewMap.get(item.id);
        const enOverview = (enItem?.overview || '').trim();
        const idOverview = (item.overview || '').trim();
        const finalSynopsis = lang === 'en'
          ? (enOverview || idOverview || 'Official synopsis not available yet.')
          : (idOverview || enOverview || 'Sinopsis resmi belum tersedia untuk karya ini.');

        const mediaItem: MediaItem = {
          id: `tmdb-${isTv ? 'tv' : 'movie'}-${item.id}`,
          tmdbId: item.id,
          title,
          titleId,
          titleEn,
          originalTitle: origTitle,
          type: detectedType,
          poster: posterUrl,
          posterId,
          posterEn,
          backdrop: item.backdrop_path ? `${IMAGE_BASE_ORIGINAL}${item.backdrop_path}` : posterUrl,
          synopsis: finalSynopsis,
          synopsisEn: enOverview || undefined,
          synopsisId: idOverview || undefined,
          rating: Math.round((item.vote_average || 7.0) * 10) / 10,
          year,
          releaseDate: dateStr || `${year}`,
          duration: isTv ? (totalEpisodes ? `${totalEpisodes} Episode` : (epDuration || '52m / ep')) : '1j 50m',
          episodeDuration: isTv ? epDuration : undefined,
          quality: qualityBadge,
          ageRating: '13+',
          genres: genres.length > 0 ? genres : ['Cinema'],
          country: isIndo ? 'Indonesia' : (item.origin_country?.[0] || (item.original_language === 'ko' ? 'Korea Selatan' : item.original_language === 'ja' ? 'Jepang' : 'Amerika Serikat')),
          originCountry: item.origin_country || (isIndo ? ['ID'] : []),
          originalLanguage: item.original_language || (isIndo ? 'id' : undefined),
          director: 'Studio International',
          cast: [],
          servers,
          audioTracks: ['Original Audio (Dolby Atmos)', 'English 5.1'],
          subtitles: ['Bahasa Indonesia (Lengkap)', 'English VIP'],
          status: isTv ? tvStatus : undefined,
          isOngoing: isTv ? isOngoing : false,
          totalSeasons: isTv ? totalSeasons : undefined,
          totalEpisodes: isTv ? totalEpisodes : undefined,
          completedSeasons: isTv ? completedSeasons : undefined,
          ongoingSeason: isTv ? ongoingSeason : undefined,
          nextEpisodeToAir: isTv ? nextEpisodeToAir : undefined,
          nextEpisodeInfo: isTv ? nextEpisodeInfo : undefined,
        };

        fetchedItems.push(mediaItem);
      }
    }

    if (totalRawFetched === 0 || page >= maxPages) {
      hasMore = false;
    }
  } catch (err) {
    console.warn('Advanced Search TMDB Discover error:', err);
    hasMore = false;
  }

  // Combine: local items first (ONLY ON PAGE 1 to avoid repeating on load more), then TMDB items
  const localItemsToInclude = page === 1 ? matchedLocal : [];
  const combined = [...localItemsToInclude, ...fetchedItems];

  // Deduplicate by ID and normalized title
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();
  const deduplicated: MediaItem[] = [];
  for (const item of combined) {
    const key = item.tmdbId ? `tmdb-${item.tmdbId}` : item.id;
    const titleKey = item.title.trim().toLowerCase();
    if (!seenIds.has(key) && !seenTitles.has(titleKey)) {
      seenIds.add(key);
      seenTitles.add(titleKey);
      deduplicated.push(item);
    }
  }

  if (deduplicated.length === 0) {
    hasMore = false;
  }

  // Sort results based on criteria
  const sorted = sortItems(deduplicated, criteria.sortBy);

  // Auto-translate synopses in parallel to ensure 100% language consistency
  const itemsNeedingTranslation = sorted.filter((m) => {
    if (lang === 'id') {
      return !m.synopsisId && (m.synopsisEn || m.synopsis);
    }
    return !m.synopsisEn && (m.synopsisId || m.synopsis);
  });

  if (itemsNeedingTranslation.length > 0) {
    await Promise.allSettled(
      itemsNeedingTranslation.map(async (media) => {
        const source = (lang === 'id' ? (media.synopsisEn || media.synopsis) : (media.synopsisId || media.synopsis)) || '';
        if (source) {
          try {
            const translated = await translateText(source, lang);
            if (translated && translated.trim().length > 0) {
              if (lang === 'id') {
                media.synopsisId = translated;
                media.synopsis = translated;
              } else {
                media.synopsisEn = translated;
                media.synopsis = translated;
              }
            }
          } catch {
            // Graceful fallback to source text
          }
        }
      })
    );
  }

  return {
    items: sorted,
    totalCount: sorted.length,
    page,
    hasMore,
  };
}

/**
 * Sort media items by selected criteria
 */
function sortItems(items: MediaItem[], sortBy: SortOption): MediaItem[] {
  return [...items].sort((a, b) => {
    switch (sortBy) {
      case 'release_date':
      case 'latest':
        return b.year - a.year;
      case 'rating':
        return (b.rating || 0) - (a.rating || 0);
      case 'title':
        return a.title.localeCompare(b.title);
      case 'popularity':
      default:
        // Prioritize local catalog items slightly, then rating
        if (a.id.startsWith('tmdb-') && !b.id.startsWith('tmdb-')) return 1;
        if (!a.id.startsWith('tmdb-') && b.id.startsWith('tmdb-')) return -1;
        return (b.rating || 0) - (a.rating || 0);
    }
  });
}
