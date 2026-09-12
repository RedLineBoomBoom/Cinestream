import type { MediaItem } from '../types/media';
import { getTmdbApiKey, fetchFullMediaItem } from './tmdb';
import { translateText } from './translator';

const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_W500 = 'https://image.tmdb.org/t/p/w500';
const IMAGE_BASE_ORIGINAL = 'https://image.tmdb.org/t/p/original';

// Regex to detect non-Latin scripts (Kanji, Kana, Hangul, Cyrillic, Arabic, Devanagari, Telugu, Tamil, Thai, Hebrew, etc.)
const NON_LATIN_REGEX = /[^\u0000-\u024F\u1E00-\u1EFF\s\d\p{P}\p{S}\u200B-\u200F\uFEFF]/u;

export type CurationType = 'cast' | 'director' | 'country' | 'genre';

export interface CurationTarget {
  type: CurationType;
  name: string;
  avatar?: string;
  role?: string;
}

/**
 * Split multiple names separated by comma, slash, pipe, or '&'
 */
export function splitMultipleNames(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[,/|]+|\s+&\s+|\s+and\s+|\s+dan\s+/gi)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export interface CurationCreditItem {
  id: string;
  tmdbId?: number;
  title: string;
  originalTitle?: string;
  poster: string;
  backdrop?: string;
  rating: number;
  year: number;
  type: 'movie' | 'series';
  character?: string;
  job?: string;
  synopsis?: string;
  popularity?: number;
  isLocal?: boolean;
  localMedia?: MediaItem;
  duration?: string;
  episodeDuration?: string;
}

export interface PersonProfile {
  id?: number;
  name: string;
  avatar?: string;
  biography?: string;
  birthday?: string;
  placeOfBirth?: string;
  knownFor?: string;
  roleType: 'cast' | 'director';
  totalTitles: number;
}

export interface CountryProfile {
  code: string;
  name: string;
  flag: string;
  totalTitles: number;
}

export interface GenreProfile {
  name: string;
  genreId?: number;
  description?: string;
  totalTitles: number;
}

// In-memory cache for speed
const personCache = new Map<string, { profile: PersonProfile; items: CurationCreditItem[] }>();
const countryCache = new Map<string, { profile: CountryProfile; items: CurationCreditItem[]; nextPage: number; hasMore: boolean }>();
const genreCache = new Map<string, { profile: GenreProfile; items: CurationCreditItem[]; nextPage: number; hasMore: boolean }>();

// Country dictionary mapping with flags
export const COUNTRY_FLAG_MAP: Record<string, { code: string; flag: string; labelId: string; labelEn: string }> = {
  id: { code: 'ID', flag: '🇮🇩', labelId: 'Indonesia', labelEn: 'Indonesia' },
  indonesia: { code: 'ID', flag: '🇮🇩', labelId: 'Indonesia', labelEn: 'Indonesia' },
  us: { code: 'US', flag: '🇺🇸', labelId: 'Amerika Serikat', labelEn: 'United States' },
  usa: { code: 'US', flag: '🇺🇸', labelId: 'Amerika Serikat', labelEn: 'United States' },
  'united states': { code: 'US', flag: '🇺🇸', labelId: 'Amerika Serikat', labelEn: 'United States' },
  'united states of america': { code: 'US', flag: '🇺🇸', labelId: 'Amerika Serikat', labelEn: 'United States' },
  'amerika serikat': { code: 'US', flag: '🇺🇸', labelId: 'Amerika Serikat', labelEn: 'United States' },
  kr: { code: 'KR', flag: '🇰🇷', labelId: 'Korea Selatan', labelEn: 'South Korea' },
  korea: { code: 'KR', flag: '🇰🇷', labelId: 'Korea Selatan', labelEn: 'South Korea' },
  'south korea': { code: 'KR', flag: '🇰🇷', labelId: 'Korea Selatan', labelEn: 'South Korea' },
  'korea selatan': { code: 'KR', flag: '🇰🇷', labelId: 'Korea Selatan', labelEn: 'South Korea' },
  jp: { code: 'JP', flag: '🇯🇵', labelId: 'Jepang', labelEn: 'Japan' },
  japan: { code: 'JP', flag: '🇯🇵', labelId: 'Jepang', labelEn: 'Japan' },
  jepang: { code: 'JP', flag: '🇯🇵', labelId: 'Jepang', labelEn: 'Japan' },
  gb: { code: 'GB', flag: '🇬🇧', labelId: 'Inggris', labelEn: 'United Kingdom' },
  uk: { code: 'GB', flag: '🇬🇧', labelId: 'Inggris', labelEn: 'United Kingdom' },
  'united kingdom': { code: 'GB', flag: '🇬🇧', labelId: 'Inggris', labelEn: 'United Kingdom' },
  inggris: { code: 'GB', flag: '🇬🇧', labelId: 'Inggris', labelEn: 'United Kingdom' },
  th: { code: 'TH', flag: '🇹🇭', labelId: 'Thailand', labelEn: 'Thailand' },
  thailand: { code: 'TH', flag: '🇹🇭', labelId: 'Thailand', labelEn: 'Thailand' },
  in: { code: 'IN', flag: '🇮🇳', labelId: 'India', labelEn: 'India' },
  india: { code: 'IN', flag: '🇮🇳', labelId: 'India', labelEn: 'India' },
  es: { code: 'ES', flag: '🇪🇸', labelId: 'Spanyol', labelEn: 'Spain' },
  spain: { code: 'ES', flag: '🇪🇸', labelId: 'Spanyol', labelEn: 'Spain' },
  spanyol: { code: 'ES', flag: '🇪🇸', labelId: 'Spanyol', labelEn: 'Spain' },
  fr: { code: 'FR', flag: '🇫🇷', labelId: 'Prancis', labelEn: 'France' },
  france: { code: 'FR', flag: '🇫🇷', labelId: 'Prancis', labelEn: 'France' },
  prancis: { code: 'FR', flag: '🇫🇷', labelId: 'Prancis', labelEn: 'France' },
  de: { code: 'DE', flag: '🇩🇪', labelId: 'Jerman', labelEn: 'Germany' },
  germany: { code: 'DE', flag: '🇩🇪', labelId: 'Jerman', labelEn: 'Germany' },
  jerman: { code: 'DE', flag: '🇩🇪', labelId: 'Jerman', labelEn: 'Germany' },
  it: { code: 'IT', flag: '🇮🇹', labelId: 'Italia', labelEn: 'Italy' },
  italy: { code: 'IT', flag: '🇮🇹', labelId: 'Italia', labelEn: 'Italy' },
  italia: { code: 'IT', flag: '🇮🇹', labelId: 'Italia', labelEn: 'Italy' },
  cn: { code: 'CN', flag: '🇨🇳', labelId: 'Tiongkok', labelEn: 'China' },
  china: { code: 'CN', flag: '🇨🇳', labelId: 'Tiongkok', labelEn: 'China' },
  tiongkok: { code: 'CN', flag: '🇨🇳', labelId: 'Tiongkok', labelEn: 'China' },
  hk: { code: 'HK', flag: '🇭🇰', labelId: 'Hong Kong', labelEn: 'Hong Kong' },
  'hong kong': { code: 'HK', flag: '🇭🇰', labelId: 'Hong Kong', labelEn: 'Hong Kong' },
  tw: { code: 'TW', flag: '🇹🇼', labelId: 'Taiwan', labelEn: 'Taiwan' },
  taiwan: { code: 'TW', flag: '🇹🇼', labelId: 'Taiwan', labelEn: 'Taiwan' },
  ph: { code: 'PH', flag: '🇵🇭', labelId: 'Filipina', labelEn: 'Philippines' },
  philippines: { code: 'PH', flag: '🇵🇭', labelId: 'Filipina', labelEn: 'Philippines' },
  filipina: { code: 'PH', flag: '🇵🇭', labelId: 'Filipina', labelEn: 'Philippines' },
  my: { code: 'MY', flag: '🇲🇾', labelId: 'Malaysia', labelEn: 'Malaysia' },
  malaysia: { code: 'MY', flag: '🇲🇾', labelId: 'Malaysia', labelEn: 'Malaysia' },
  ca: { code: 'CA', flag: '🇨🇦', labelId: 'Kanada', labelEn: 'Canada' },
  canada: { code: 'CA', flag: '🇨🇦', labelId: 'Kanada', labelEn: 'Canada' },
  kanada: { code: 'CA', flag: '🇨🇦', labelId: 'Kanada', labelEn: 'Canada' },
  au: { code: 'AU', flag: '🇦🇺', labelId: 'Australia', labelEn: 'Australia' },
  australia: { code: 'AU', flag: '🇦🇺', labelId: 'Australia', labelEn: 'Australia' },
  tr: { code: 'TR', flag: '🇹🇷', labelId: 'Turki', labelEn: 'Turkey' },
  turkey: { code: 'TR', flag: '🇹🇷', labelId: 'Turki', labelEn: 'Turkey' },
  turki: { code: 'TR', flag: '🇹🇷', labelId: 'Turki', labelEn: 'Turkey' },
  mx: { code: 'MX', flag: '🇲🇽', labelId: 'Meksiko', labelEn: 'Mexico' },
  mexico: { code: 'MX', flag: '🇲🇽', labelId: 'Meksiko', labelEn: 'Mexico' },
  meksiko: { code: 'MX', flag: '🇲🇽', labelId: 'Meksiko', labelEn: 'Mexico' },
  br: { code: 'BR', flag: '🇧🇷', labelId: 'Brasil', labelEn: 'Brazil' },
  brazil: { code: 'BR', flag: '🇧🇷', labelId: 'Brasil', labelEn: 'Brazil' },
  brasil: { code: 'BR', flag: '🇧🇷', labelId: 'Brasil', labelEn: 'Brazil' },
  sg: { code: 'SG', flag: '🇸🇬', labelId: 'Singapura', labelEn: 'Singapore' },
  singapore: { code: 'SG', flag: '🇸🇬', labelId: 'Singapura', labelEn: 'Singapore' },
  singapura: { code: 'SG', flag: '🇸🇬', labelId: 'Singapura', labelEn: 'Singapore' },
};

export function resolveCountryInfo(rawCountry: string): { code: string; name: string; flag: string } {
  const normalized = rawCountry.trim().toLowerCase();
  const matched = COUNTRY_FLAG_MAP[normalized];
  if (matched) {
    return {
      code: matched.code,
      name: rawCountry.trim(),
      flag: matched.flag,
    };
  }
  // Try partial match
  for (const [key, val] of Object.entries(COUNTRY_FLAG_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return {
        code: val.code,
        name: rawCountry.trim(),
        flag: val.flag,
      };
    }
  }
  return {
    code: rawCountry.slice(0, 2).toUpperCase(),
    name: rawCountry.trim(),
    flag: '🌐',
  };
}

/**
 * Fetch filmography for a person (Cast or Director) from TMDB and merge with local catalog
 */
export async function fetchPersonFilmography(
  personName: string,
  roleType: 'cast' | 'director',
  catalog: MediaItem[] = [],
  lang: 'id' | 'en' = 'id'
): Promise<{ profile: PersonProfile; items: CurationCreditItem[] }> {
  const cacheKey = `${personName.trim().toLowerCase()}_${roleType}_${lang}`;
  if (personCache.has(cacheKey)) {
    return personCache.get(cacheKey)!;
  }

  const apiKey = getTmdbApiKey();
  const cleanName = personName.trim();

  // 1. Gather Local Catalog items
  const localMatched: CurationCreditItem[] = [];
  const lowerName = cleanName.toLowerCase();

  for (const item of catalog) {
    if (roleType === 'director') {
      if (item.director && item.director.toLowerCase().includes(lowerName)) {
        localMatched.push({
          id: item.id,
          title: item.title,
          originalTitle: item.originalTitle,
          poster: item.poster,
          backdrop: item.backdrop,
          rating: item.rating,
          year: item.year,
          type: item.type === 'movie' ? 'movie' : 'series',
          job: 'Director',
          synopsis: item.synopsis,
          isLocal: true,
          localMedia: item,
          duration: item.duration,
          episodeDuration: item.episodeDuration,
        });
      }
    } else {
      const foundCast = item.cast?.find((c) => c.name.toLowerCase().includes(lowerName));
      if (foundCast) {
        localMatched.push({
          id: item.id,
          title: item.title,
          originalTitle: item.originalTitle,
          poster: item.poster,
          backdrop: item.backdrop,
          rating: item.rating,
          year: item.year,
          type: item.type === 'movie' ? 'movie' : 'series',
          character: foundCast.role,
          synopsis: item.synopsis,
          isLocal: true,
          localMedia: item,
          duration: item.duration,
          episodeDuration: item.episodeDuration,
        });
      }
    }
  }

  // 2. Fetch from TMDB
  let tmdbPersonId: number | null = null;
  let tmdbProfile: any = null;
  let tmdbCredits: any = null;
  let enCredits: any = null;

  try {
    // Note: Universal search without language parameter to preserve original Latin names
    // and avoid TMDB replacing Romanized names with native Asian Kanji scripts which skews relevance ranking
    const searchRes = await fetch(
      `${BASE_URL}/search/person?api_key=${apiKey}&query=${encodeURIComponent(cleanName)}&include_adult=false`
    );
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const candidates = searchData.results || [];
      if (candidates.length > 0) {
        const targetDept = roleType === 'director' ? 'Directing' : 'Acting';
        // Score candidates to guarantee selecting the intended famous actor or director
        const scored = candidates.map((c: any) => {
          let score = (c.popularity || 0) * 10;
          if (c.known_for_department === targetDept) score += 100;
          if (c.name?.toLowerCase() === cleanName.toLowerCase()) score += 50;
          if (c.profile_path) score += 25;
          if (c.known_for && c.known_for.length > 0) score += 10;
          return { candidate: c, score };
        });
        scored.sort((a: any, b: any) => b.score - a.score);
        const best = scored[0].candidate;
        tmdbPersonId = best.id;

        if (lang === 'id') {
          // In Indonesian mode, fetch both id-ID and en-US in parallel
          // This prevents empty biographies and missing Asian film titles
          const [detailRes, creditsRes, enDetailRes, enCreditsRes] = await Promise.all([
            fetch(`${BASE_URL}/person/${best.id}?api_key=${apiKey}&language=id-ID`),
            fetch(`${BASE_URL}/person/${best.id}/combined_credits?api_key=${apiKey}&language=id-ID`),
            fetch(`${BASE_URL}/person/${best.id}?api_key=${apiKey}&language=en-US`),
            fetch(`${BASE_URL}/person/${best.id}/combined_credits?api_key=${apiKey}&language=en-US`),
          ]);

          if (detailRes.ok) tmdbProfile = await detailRes.json();
          const enProfile = enDetailRes.ok ? await enDetailRes.json() : null;

          // Biography handling: If Indonesian biography is empty, fallback to English and translate to Indonesian
          let bio = tmdbProfile?.biography?.trim();
          if (!bio && enProfile?.biography?.trim()) {
            try {
              bio = await translateText(enProfile.biography, 'id');
            } catch {
              bio = enProfile.biography;
            }
          }
          if (tmdbProfile) {
            tmdbProfile.biography = bio || tmdbProfile.biography;
            // Prevent name from turning into Kanji if user clicked Romanized name
            if (NON_LATIN_REGEX.test(tmdbProfile.name || '') && (enProfile?.name || cleanName)) {
              tmdbProfile.name = enProfile?.name || cleanName;
            }
            if (!tmdbProfile.profile_path && enProfile?.profile_path) {
              tmdbProfile.profile_path = enProfile.profile_path;
            }
          }

          if (creditsRes.ok) tmdbCredits = await creditsRes.json();
          if (enCreditsRes.ok) enCredits = await enCreditsRes.json();
        } else {
          // English mode
          const [detailRes, creditsRes] = await Promise.all([
            fetch(`${BASE_URL}/person/${best.id}?api_key=${apiKey}&language=en-US`),
            fetch(`${BASE_URL}/person/${best.id}/combined_credits?api_key=${apiKey}&language=en-US`),
          ]);
          if (detailRes.ok) tmdbProfile = await detailRes.json();
          if (creditsRes.ok) tmdbCredits = await creditsRes.json();
        }
      }
    }
  } catch (err) {
    console.warn('Failed to fetch TMDB person details:', err);
  }

  // 3. Process credits
  const creditMap = new Map<string, CurationCreditItem>();

  // Add local matches first
  for (const item of localMatched) {
    creditMap.set(item.title.toLowerCase(), item);
  }

  if (tmdbCredits) {
    const enCreditsMap = new Map<number, any>();
    if (enCredits) {
      (enCredits.cast || []).forEach((c: any) => enCreditsMap.set(c.id, c));
      (enCredits.crew || []).forEach((c: any) => enCreditsMap.set(c.id, c));
    }

    const rawList: any[] =
      roleType === 'director'
        ? (tmdbCredits.crew || []).filter(
            (c: any) =>
              c.job === 'Director' ||
              c.job === 'Co-Director' ||
              c.job === 'Series Director' ||
              c.department === 'Directing'
          )
        : tmdbCredits.cast || [];

    // Sort by popularity / vote_count
    rawList.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

    for (const c of rawList) {
      const enCredit = enCreditsMap.get(c.id);

      // Always prioritize official English / international title
      let title = enCredit?.title || enCredit?.name || c.title || c.name || '';

      // If the title still contains non-Latin characters (Kanji, Hangul, Telugu, Cyrillic, etc.),
      // fallback to Romanized original_title or original_name if it is Latin
      if (NON_LATIN_REGEX.test(title)) {
        const orig = (c.original_title || c.original_name || enCredit?.original_title || enCredit?.original_name || '').trim();
        if (orig && !NON_LATIN_REGEX.test(orig)) {
          title = orig;
        }
      }
      if (!title) continue;

      const titleKey = title.toLowerCase();
      // Skip if already in map from local catalog
      if (creditMap.has(titleKey)) continue;

      const isMovie = c.media_type === 'movie';
      const dateStr = isMovie ? c.release_date : c.first_air_date;
      const year = dateStr ? new Date(dateStr).getFullYear() : 0;

      // Always prioritize official English / international poster and backdrop
      const posterPath = enCredit?.poster_path || c.poster_path;
      const poster = posterPath
        ? `${IMAGE_BASE_W500}${posterPath}`
        : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=500&auto=format&fit=crop';
      const backdropPath = enCredit?.backdrop_path || c.backdrop_path;
      const backdrop = backdropPath
        ? `${IMAGE_BASE_ORIGINAL}${backdropPath}`
        : undefined;

      // Retain Indonesian synopsis if available, fallback to English overview
      let synopsis = c.overview || '';
      if (!synopsis && enCredit?.overview) {
        synopsis = enCredit.overview;
      }

      creditMap.set(titleKey, {
        id: `tmdb-${c.media_type}-${c.id}`,
        tmdbId: c.id,
        title,
        originalTitle: c.original_title || c.original_name,
        poster,
        backdrop,
        rating: Math.round((c.vote_average || 7.0) * 10) / 10,
        year: year || 2024,
        type: isMovie ? 'movie' : 'series',
        character: c.character || (roleType === 'cast' ? 'Pemeran' : undefined),
        job: c.job || (roleType === 'director' ? 'Director' : undefined),
        synopsis,
        isLocal: false,
      });
    }
  }

  const items = Array.from(creditMap.values()).sort((a, b) => {
    // Local items first, then by year descending
    if (a.isLocal && !b.isLocal) return -1;
    if (!a.isLocal && b.isLocal) return 1;
    return (b.year || 0) - (a.year || 0);
  });

  const profile: PersonProfile = {
    id: tmdbPersonId || undefined,
    name: tmdbProfile?.name || cleanName,
    avatar: tmdbProfile?.profile_path
      ? `${IMAGE_BASE_W500}${tmdbProfile.profile_path}`
      : localMatched[0]?.localMedia?.cast?.find((c) => c.name.toLowerCase().includes(lowerName))?.avatar,
    biography: tmdbProfile?.biography || undefined,
    birthday: tmdbProfile?.birthday || undefined,
    placeOfBirth: tmdbProfile?.place_of_birth || undefined,
    knownFor: tmdbProfile?.known_for_department || (roleType === 'director' ? 'Directing' : 'Acting'),
    roleType,
    totalTitles: items.length,
  };

  const result = { profile, items };
  personCache.set(cacheKey, result);
  return result;
}

/**
 * Fetch all movies & series originating from a specific country
 */
export async function fetchCountryCatalog(
  rawCountry: string,
  catalog: MediaItem[] = [],
  lang: 'id' | 'en' = 'id',
  startPage: number = 1,
  pageCount: number = 6
): Promise<{ profile: CountryProfile; items: CurationCreditItem[]; nextPage: number; hasMore: boolean }> {
  const info = resolveCountryInfo(rawCountry);
  const cacheKey = `${info.code}_${lang}`;
  if (startPage === 1 && countryCache.has(cacheKey)) {
    return countryCache.get(cacheKey)!;
  }

  const apiKey = getTmdbApiKey();
  const creditMap = new Map<string, CurationCreditItem>();

  // 1. Gather Local Catalog items for this country (only on first page)
  if (startPage === 1) {
    const lowerCountry = rawCountry.trim().toLowerCase();
    for (const item of catalog) {
      if (
        item.country &&
        (item.country.toLowerCase().includes(lowerCountry) ||
          lowerCountry.includes(item.country.toLowerCase()) ||
          item.country.toLowerCase() === info.code.toLowerCase())
      ) {
        creditMap.set(item.title.toLowerCase(), {
          id: item.id,
          title: item.title,
          originalTitle: item.originalTitle,
          poster: item.poster,
          backdrop: item.backdrop,
          rating: item.rating,
          year: item.year,
          type: item.type === 'movie' ? 'movie' : 'series',
          synopsis: item.synopsis,
          popularity: 9999,
          isLocal: true,
          localMedia: item,
          duration: item.duration,
          episodeDuration: item.episodeDuration,
        });
      }
    }
  }

  // 2. Fetch multiple pages of popular movies and TV shows originating from this country from TMDB in parallel
  let hasMore = true;
  try {
    // Always query TMDB discovery in en-US so titles and posters are in official English
    const pages = Array.from({ length: pageCount }, (_, i) => startPage + i);

    const moviePromises = pages.map((p) =>
      fetch(
        `${BASE_URL}/discover/movie?api_key=${apiKey}&with_origin_country=${info.code}&language=en-US&sort_by=popularity.desc&page=${p}`
      ).then((r) => (r.ok ? r.json() : { results: [] }))
    );
    const tvPromises = pages.map((p) =>
      fetch(
        `${BASE_URL}/discover/tv?api_key=${apiKey}&with_origin_country=${info.code}&language=en-US&sort_by=popularity.desc&page=${p}`
      ).then((r) => (r.ok ? r.json() : { results: [] }))
    );

    const [movieDataList, tvDataList] = await Promise.all([
      Promise.all(moviePromises),
      Promise.all(tvPromises),
    ]);

    let fetchedCount = 0;
    for (const movieData of movieDataList) {
      const results = movieData.results || [];
      fetchedCount += results.length;
      for (const m of results) {
        let title = m.title || '';
        if (NON_LATIN_REGEX.test(title)) {
          const orig = (m.original_title || '').trim();
          if (orig && !NON_LATIN_REGEX.test(orig)) {
            title = orig;
          }
        }
        if (!title || creditMap.has(title.toLowerCase())) continue;
        const year = m.release_date ? new Date(m.release_date).getFullYear() : 2024;
        creditMap.set(title.toLowerCase(), {
          id: `tmdb-movie-${m.id}`,
          tmdbId: m.id,
          title,
          originalTitle: m.original_title,
          poster: m.poster_path
            ? `${IMAGE_BASE_W500}${m.poster_path}`
            : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=500&auto=format&fit=crop',
          backdrop: m.backdrop_path ? `${IMAGE_BASE_ORIGINAL}${m.backdrop_path}` : undefined,
          rating: Math.round((m.vote_average || 7.0) * 10) / 10,
          year,
          type: 'movie',
          synopsis: m.overview || '',
          popularity: m.popularity || 0,
          isLocal: false,
        });
      }
    }

    for (const tvData of tvDataList) {
      const results = tvData.results || [];
      fetchedCount += results.length;
      for (const t of results) {
        let title = t.name || '';
        if (NON_LATIN_REGEX.test(title)) {
          const orig = (t.original_name || '').trim();
          if (orig && !NON_LATIN_REGEX.test(orig)) {
            title = orig;
          }
        }
        if (!title || creditMap.has(title.toLowerCase())) continue;
        const year = t.first_air_date ? new Date(t.first_air_date).getFullYear() : 2024;
        creditMap.set(title.toLowerCase(), {
          id: `tmdb-tv-${t.id}`,
          tmdbId: t.id,
          title,
          originalTitle: t.original_name,
          poster: t.poster_path
            ? `${IMAGE_BASE_W500}${t.poster_path}`
            : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=500&auto=format&fit=crop',
          backdrop: t.backdrop_path ? `${IMAGE_BASE_ORIGINAL}${t.backdrop_path}` : undefined,
          rating: Math.round((t.vote_average || 7.0) * 10) / 10,
          year,
          type: 'series',
          synopsis: t.overview || '',
          popularity: t.popularity || 0,
          isLocal: false,
        });
      }
    }

    if (fetchedCount === 0) {
      hasMore = false;
    }
  } catch (err) {
    console.warn('Failed to fetch TMDB country discovery:', err);
    hasMore = false;
  }

  const items = Array.from(creditMap.values()).sort((a, b) => {
    if (a.isLocal && !b.isLocal) return -1;
    if (!a.isLocal && b.isLocal) return 1;
    return (b.popularity || 0) - (a.popularity || 0);
  });

  const profile: CountryProfile = {
    code: info.code,
    name: info.name,
    flag: info.flag,
    totalTitles: items.length,
  };

  const result = { profile, items, nextPage: startPage + pageCount, hasMore };
  if (startPage === 1) {
    countryCache.set(cacheKey, result);
  }
  return result;
}

export const GENRE_NAME_TO_ID: Record<string, number> = {
  // Indonesian
  aksi: 28,
  petualangan: 12,
  animasi: 16,
  komedi: 35,
  kriminal: 80,
  dokumenter: 99,
  drama: 18,
  keluarga: 10751,
  fantasi: 14,
  sejarah: 36,
  horor: 27,
  musik: 10402,
  misteri: 9648,
  romantis: 10749,
  'sci-fi': 878,
  'film tv': 10770,
  thriller: 53,
  perang: 10752,
  western: 37,
  'aksi & petualangan': 10759,
  'anak-anak': 10762,

  // English
  action: 28,
  adventure: 12,
  animation: 16,
  comedy: 35,
  crime: 80,
  documentary: 99,
  family: 10751,
  fantasy: 14,
  history: 36,
  horror: 27,
  music: 10402,
  mystery: 9648,
  romance: 10749,
  scifi: 878,
  'science fiction': 878,
  war: 10752,
};

export function resolveGenreId(genreName: string): number | undefined {
  const norm = genreName.trim().toLowerCase();
  if (GENRE_NAME_TO_ID[norm]) return GENRE_NAME_TO_ID[norm];
  for (const [k, id] of Object.entries(GENRE_NAME_TO_ID)) {
    if (norm.includes(k) || k.includes(norm)) return id;
  }
  return undefined;
}

/**
 * Fetch all movies & series for a specific genre from TMDB and merge with local catalog
 */
export async function fetchGenreCatalog(
  rawGenre: string,
  catalog: MediaItem[] = [],
  lang: 'id' | 'en' = 'id',
  startPage: number = 1,
  pageCount: number = 6
): Promise<{ profile: GenreProfile; items: CurationCreditItem[]; nextPage: number; hasMore: boolean }> {
  const cleanGenre = rawGenre.trim();
  const cacheKey = `${cleanGenre.toLowerCase()}_${lang}`;
  if (startPage === 1 && genreCache.has(cacheKey)) {
    return genreCache.get(cacheKey)!;
  }

  const apiKey = getTmdbApiKey();
  const creditMap = new Map<string, CurationCreditItem>();
  const lowerGenre = cleanGenre.toLowerCase();
  const genreId = resolveGenreId(cleanGenre);

  // 1. Gather Local Catalog items for this genre (only on first page)
  if (startPage === 1) {
    for (const item of catalog) {
      if (
        item.genres &&
        item.genres.some(
          (g) =>
            g.toLowerCase().includes(lowerGenre) ||
            lowerGenre.includes(g.toLowerCase())
        )
      ) {
        creditMap.set(item.title.toLowerCase(), {
          id: item.id,
          title: item.title,
          originalTitle: item.originalTitle,
          poster: item.poster,
          backdrop: item.backdrop,
          rating: item.rating,
          year: item.year,
          type: item.type === 'movie' ? 'movie' : 'series',
          synopsis: item.synopsis,
          popularity: 9999,
          isLocal: true,
          localMedia: item,
          duration: item.duration,
          episodeDuration: item.episodeDuration,
        });
      }
    }
  }

  // 2. Fetch multiple pages of popular movies and TV shows for this genre from TMDB in parallel
  let hasMore = true;
  if (genreId) {
    try {
      // Always query TMDB discovery in en-US so titles and posters are in official English
      const pages = Array.from({ length: pageCount }, (_, i) => startPage + i);

      const moviePromises = pages.map((p) =>
        fetch(
          `${BASE_URL}/discover/movie?api_key=${apiKey}&with_genres=${genreId}&language=en-US&sort_by=popularity.desc&page=${p}`
        ).then((r) => (r.ok ? r.json() : { results: [] }))
      );
      const tvPromises = pages.map((p) =>
        fetch(
          `${BASE_URL}/discover/tv?api_key=${apiKey}&with_genres=${genreId}&language=en-US&sort_by=popularity.desc&page=${p}`
        ).then((r) => (r.ok ? r.json() : { results: [] }))
      );

      const [movieDataList, tvDataList] = await Promise.all([
        Promise.all(moviePromises),
        Promise.all(tvPromises),
      ]);

      let fetchedCount = 0;
      for (const movieData of movieDataList) {
        const results = movieData.results || [];
        fetchedCount += results.length;
        for (const m of results) {
          let title = m.title || '';
          if (NON_LATIN_REGEX.test(title)) {
            const orig = (m.original_title || '').trim();
            if (orig && !NON_LATIN_REGEX.test(orig)) {
              title = orig;
            }
          }
          if (!title || creditMap.has(title.toLowerCase())) continue;
          const year = m.release_date ? new Date(m.release_date).getFullYear() : 2024;
          creditMap.set(title.toLowerCase(), {
            id: `tmdb-movie-${m.id}`,
            tmdbId: m.id,
            title,
            originalTitle: m.original_title,
            poster: m.poster_path
              ? `${IMAGE_BASE_W500}${m.poster_path}`
              : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=500&auto=format&fit=crop',
            backdrop: m.backdrop_path ? `${IMAGE_BASE_ORIGINAL}${m.backdrop_path}` : undefined,
            rating: Math.round((m.vote_average || 7.0) * 10) / 10,
            year,
            type: 'movie',
            synopsis: m.overview || '',
            popularity: m.popularity || 0,
            isLocal: false,
          });
        }
      }

      for (const tvData of tvDataList) {
        const results = tvData.results || [];
        fetchedCount += results.length;
        for (const t of results) {
          let title = t.name || '';
          if (NON_LATIN_REGEX.test(title)) {
            const orig = (t.original_name || '').trim();
            if (orig && !NON_LATIN_REGEX.test(orig)) {
              title = orig;
            }
          }
          if (!title || creditMap.has(title.toLowerCase())) continue;
          const year = t.first_air_date ? new Date(t.first_air_date).getFullYear() : 2024;
          creditMap.set(title.toLowerCase(), {
            id: `tmdb-tv-${t.id}`,
            tmdbId: t.id,
            title,
            originalTitle: t.original_name,
            poster: t.poster_path
              ? `${IMAGE_BASE_W500}${t.poster_path}`
              : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=500&auto=format&fit=crop',
            backdrop: t.backdrop_path ? `${IMAGE_BASE_ORIGINAL}${t.backdrop_path}` : undefined,
            rating: Math.round((t.vote_average || 7.0) * 10) / 10,
            year,
            type: 'series',
            synopsis: t.overview || '',
            popularity: t.popularity || 0,
            isLocal: false,
          });
        }
      }

      if (fetchedCount === 0) {
        hasMore = false;
      }
    } catch (err) {
      console.warn('Failed to fetch TMDB genre discovery:', err);
      hasMore = false;
    }
  } else {
    hasMore = false;
  }

  const items = Array.from(creditMap.values()).sort((a, b) => {
    if (a.isLocal && !b.isLocal) return -1;
    if (!a.isLocal && b.isLocal) return 1;
    return (b.popularity || 0) - (a.popularity || 0);
  });

  const profile: GenreProfile = {
    name: cleanGenre,
    genreId,
    description:
      lang === 'en'
        ? `Curated showcase of movies and series exploring the ${cleanGenre} genre, from timeless masterpieces to modern cinematic releases.`
        : `Koleksi kurasi film dan serial bertema ${cleanGenre}, mulai dari karya legendaris hingga rilisan sinematik modern terpopuler.`,
    totalTitles: items.length,
  };

  const result = { profile, items, nextPage: startPage + pageCount, hasMore };
  if (startPage === 1) {
    genreCache.set(cacheKey, result);
  }
  return result;
}

/**
 * Resolves a CurationCreditItem into a fully playable MediaItem
 */
export async function resolveCurationPlayableMedia(
  item: CurationCreditItem,
  _lang: 'id' | 'en' = 'id'
): Promise<MediaItem | null> {
  if (item.isLocal && item.localMedia) {
    return item.localMedia;
  }
  if (item.tmdbId) {
    return await fetchFullMediaItem(item.tmdbId, item.type === 'movie' ? 'movie' : 'tv');
  }
  return null;
}
