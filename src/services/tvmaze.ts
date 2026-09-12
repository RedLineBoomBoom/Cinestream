/**
 * TVMaze API Service
 * 100% Free & Open REST API for TV Series, Air Schedules, Networks, and IMDb mappings.
 * https://www.tvmaze.com/api
 */

export interface TvMazeShow {
  id: number;
  name: string;
  type: string;
  language: string;
  genres: string[];
  status: string;
  premiered?: string;
  ended?: string;
  officialSite?: string;
  schedule?: {
    time: string;
    days: string[];
  };
  rating: {
    average?: number;
  };
  network?: {
    name: string;
    country?: { name: string };
  };
  webChannel?: {
    name: string;
    country?: { name: string };
  };
  externals: {
    tvrage?: number;
    thetvdb?: number;
    imdb?: string;
  };
  image?: {
    medium?: string;
    original?: string;
  };
  runtime?: number;
  averageRuntime?: number;
  summary?: string;
}

export interface TvMazeSearchResult {
  score: number;
  show: TvMazeShow;
}

const BASE_URL = 'https://api.tvmaze.com';

function stripHtml(html?: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '').trim();
}

/**
 * Search TV shows on TVMaze
 */
export async function searchTvMaze(query: string): Promise<TvMazeShow[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const url = `${BASE_URL}/search/shows?q=${encodeURIComponent(trimmed)}`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const data: TvMazeSearchResult[] = await res.json();
    return data.map((item) => ({
      ...item.show,
      summary: stripHtml(item.show.summary),
    }));
  } catch (err) {
    console.warn('TVMaze search error:', err);
    return [];
  }
}

/**
 * Get detailed TV show info
 */
export async function fetchTvMazeShow(id: number): Promise<TvMazeShow | null> {
  try {
    const url = `${BASE_URL}/shows/${id}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data: TvMazeShow = await res.json();
    return {
      ...data,
      summary: stripHtml(data.summary),
    };
  } catch (err) {
    console.warn('TVMaze fetch show error:', err);
    return null;
  }
}
