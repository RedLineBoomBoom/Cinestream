/**
 * OMDb / IMDb Search Service
 * Direct search engine for IMDb titles, IMDb IDs (tt...), Rotten Tomatoes, and classic cinema.
 */

export interface OmdbItem {
  imdbId: string;
  title: string;
  year: number;
  type: 'movie' | 'series' | 'episode';
  poster: string;
}

const OMDB_API_KEY = 'trilogy';
const OMDB_BASE = 'https://www.omdbapi.com';

/**
 * Search movies and series on OMDb
 */
export async function searchOmdb(query: string): Promise<OmdbItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // If query is an IMDb ID like tt1234567
  if (/^tt\d+$/i.test(trimmed)) {
    try {
      const res = await fetch(`${OMDB_BASE}/?i=${trimmed}&apikey=${OMDB_API_KEY}`);
      if (!res.ok) return [];
      const data = await res.json();
      if (data.Response === 'False') return [];

      const yearNum = parseInt(data.Year, 10);
      return [
        {
          imdbId: data.imdbID,
          title: data.Title,
          year: isNaN(yearNum) ? 0 : yearNum,
          type: data.Type === 'series' ? 'series' : 'movie',
          poster: data.Poster && data.Poster !== 'N/A' ? data.Poster : '',
        },
      ];
    } catch (err) {
      console.warn('OMDb id lookup error:', err);
      return [];
    }
  }

  // Standard text search
  try {
    const url = `${OMDB_BASE}/?s=${encodeURIComponent(trimmed)}&apikey=${OMDB_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    if (data.Response === 'False' || !Array.isArray(data.Search)) return [];

    return data.Search.map((item: any): OmdbItem => {
      const yearClean = (item.Year || '').replace(/[^0-9]/g, '').slice(0, 4);
      const yearNum = parseInt(yearClean, 10);
      return {
        imdbId: item.imdbID,
        title: item.Title,
        year: isNaN(yearNum) ? 0 : yearNum,
        type: item.Type === 'series' ? 'series' : 'movie',
        poster: item.Poster && item.Poster !== 'N/A' ? item.Poster : '',
      };
    });
  } catch (err) {
    console.warn('OMDb search error:', err);
    return [];
  }
}
