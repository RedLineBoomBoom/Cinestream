/**
 * Anime Database Service (Kitsu API + Jikan / MyAnimeList Engine)
 * Provides ultra-fast search for Anime, Donghua, OVA, and Japanese titles (Romaji / Kanji / English).
 * 100% Free, No API Key Required!
 */

export interface AnimeItem {
  id: string;
  malId?: number;
  title: string;
  englishTitle?: string;
  romajiTitle?: string;
  japaneseTitle?: string;
  synopsis: string;
  rating: number; // Scaled to 0 - 10
  year: number;
  episodeCount?: number;
  episodeLength?: number;
  type: 'TV' | 'movie' | 'OVA' | 'ONA' | 'special' | 'music';
  status: string;
  poster: string;
  backdrop: string;
  youtubeTrailerId?: string;
}

const KITSU_BASE = 'https://kitsu.io/api/edge';
const JIKAN_BASE = 'https://api.jikan.moe/v4';

/**
 * Search anime across Kitsu with Jikan/MAL as secondary fallback
 */
export async function searchAnime(query: string): Promise<AnimeItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // Try Kitsu first (fastest, high uptime)
  try {
    const url = `${KITSU_BASE}/anime?filter[text]=${encodeURIComponent(trimmed)}&page[limit]=20`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.data) && data.data.length > 0) {
        return data.data.map((item: any): AnimeItem => {
          const attr = item.attributes || {};
          const ratingPercent = parseFloat(attr.averageRating || '0');
          const ratingOutOf10 = ratingPercent > 0 ? parseFloat((ratingPercent / 10).toFixed(1)) : 0;
          const year = attr.startDate ? parseInt(attr.startDate.split('-')[0], 10) : 0;

          return {
            id: `kitsu-${item.id}`,
            title: attr.canonicalTitle || attr.titles?.en || attr.titles?.en_jp || 'Anime Title',
            englishTitle: attr.titles?.en,
            romajiTitle: attr.titles?.en_jp,
            japaneseTitle: attr.titles?.ja_jp,
            synopsis: attr.synopsis || '',
            rating: ratingOutOf10,
            year: isNaN(year) ? 0 : year,
            episodeCount: attr.episodeCount,
            episodeLength: typeof attr.episodeLength === 'number' ? attr.episodeLength : 24,
            type: (attr.showType || 'TV').toLowerCase() === 'movie' ? 'movie' : 'TV',
            status: attr.status || '',
            poster: attr.posterImage?.large || attr.posterImage?.medium || attr.posterImage?.original || '',
            backdrop: attr.coverImage?.large || attr.coverImage?.original || attr.posterImage?.large || '',
            youtubeTrailerId: attr.youtubeVideoId,
          };
        });
      }
    }
  } catch (err) {
    console.warn('Kitsu search failed, trying Jikan fallback:', err);
  }

  // Fallback to Jikan (MyAnimeList)
  try {
    const jikanUrl = `${JIKAN_BASE}/anime?q=${encodeURIComponent(trimmed)}&limit=15&sfw=true`;
    const res = await fetch(jikanUrl);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.data)) {
        return data.data.map((item: any): AnimeItem => ({
          id: `mal-${item.mal_id}`,
          malId: item.mal_id,
          title: item.title_english || item.title || 'Anime Title',
          englishTitle: item.title_english,
          romajiTitle: item.title,
          japaneseTitle: item.title_japanese,
          synopsis: item.synopsis || '',
          rating: item.score || 0,
          year: item.year || (item.aired?.from ? parseInt(item.aired.from.split('-')[0], 10) : 0),
          episodeCount: item.episodes,
          episodeLength: item.duration ? parseInt(item.duration, 10) || 24 : 24,
          type: (item.type || 'TV').toLowerCase() === 'movie' ? 'movie' : 'TV',
          status: item.status || '',
          poster: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || '',
          backdrop: item.images?.jpg?.large_image_url || '',
          youtubeTrailerId: item.trailer?.youtube_id,
        }));
      }
    }
  } catch (err) {
    console.warn('Jikan fallback failed:', err);
  }

  return [];
}

/**
 * Fetch top trending anime
 */
export async function fetchTrendingAnime(): Promise<AnimeItem[]> {
  try {
    const res = await fetch(`${KITSU_BASE}/trending/anime?limit=12`, {
      headers: {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
      },
    });
    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data.data)) return [];

    return data.data.map((item: any): AnimeItem => {
      const attr = item.attributes || {};
      const ratingPercent = parseFloat(attr.averageRating || '0');
      const ratingOutOf10 = ratingPercent > 0 ? parseFloat((ratingPercent / 10).toFixed(1)) : 0;
      const year = attr.startDate ? parseInt(attr.startDate.split('-')[0], 10) : 0;

      return {
        id: `kitsu-${item.id}`,
        title: attr.canonicalTitle || attr.titles?.en || attr.titles?.en_jp || 'Anime Title',
        englishTitle: attr.titles?.en,
        romajiTitle: attr.titles?.en_jp,
        japaneseTitle: attr.titles?.ja_jp,
        synopsis: attr.synopsis || '',
        rating: ratingOutOf10,
        year: isNaN(year) ? 0 : year,
        episodeCount: attr.episodeCount,
        type: (attr.showType || 'TV').toLowerCase() === 'movie' ? 'movie' : 'TV',
        status: attr.status || '',
        poster: attr.posterImage?.large || attr.posterImage?.medium || attr.posterImage?.original || '',
        backdrop: attr.coverImage?.large || attr.coverImage?.original || attr.posterImage?.large || '',
        youtubeTrailerId: attr.youtubeVideoId,
      };
    });
  } catch (err) {
    console.warn('Failed to fetch trending anime:', err);
    return [];
  }
}
