/**
 * Official IMDb Integration Service
 * Fetches verified IMDb ratings, storyline/plot, writers, awards, and direct IMDb links.
 */

export interface ImdbDetails {
  imdbId: string;
  imdbUrl: string;
  poster?: string;
  rating: number;
  votes: string;
  plot: string;
  director?: string;
  writer?: string;
  actors?: string;
  awards?: string;
  boxOffice?: string;
  rated?: string;
  metascore?: string;
  ratings?: Array<{ Source: string; Value: string }>;
  Ratings?: Array<{ Source: string; Value: string }>;
}

const OMDB_API_KEY = 'trilogy';
const cache: Record<string, ImdbDetails> = {};

/**
 * Compresses and optimizes an IMDb or TMDB poster URL.
 * Transforms IMDb media CDN modifier to QL75_UX380_CR0,0,380,562 or SX380 for fast lightweight loading
 */
export function optimizePosterUrl(url?: string, width: number = 380): string {
  if (!url || url === 'N/A') return '';

  // If it's an IMDb Amazon CloudFront media URL
  if (url.includes('m.media-amazon.com/images/M/')) {
    const match = url.match(/^(https:\/\/m\.media-amazon\.com\/images\/M\/[^.]+)/);
    if (match) {
      return `${match[1]}._V1_QL75_UX${width}_CR0,0,${width},${Math.round(width * 1.48)}_.jpg`;
    }
  }

  // If it's TMDB, use compressed w342 or w500
  if (url.includes('image.tmdb.org/t/p/')) {
    return url.replace(/\/t\/p\/(?:original|w780)\//, `/t/p/w${width <= 342 ? '342' : '500'}/`);
  }

  return url;
}

/**
 * Get official IMDb URL for a title
 */
export function getImdbUrl(imdbId?: string): string {
  if (!imdbId) return 'https://www.imdb.com';
  const cleanId = imdbId.trim();
  return `https://www.imdb.com/title/${cleanId}/`;
}

/**
 * Fetch official IMDb data using OMDb API with in-memory caching
 */
export async function fetchImdbDetails(imdbId: string): Promise<ImdbDetails | null> {
  if (!imdbId || !imdbId.startsWith('tt')) return null;

  if (cache[imdbId]) {
    return cache[imdbId];
  }

  try {
    const url = `https://www.omdbapi.com/?i=${imdbId}&plot=full&apikey=${OMDB_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.Response === 'False') return null;

    const ratingNum = parseFloat(data.imdbRating);
    const details: ImdbDetails = {
      imdbId: data.imdbID || imdbId,
      imdbUrl: getImdbUrl(data.imdbID || imdbId),
      poster: data.Poster && data.Poster !== 'N/A' ? optimizePosterUrl(data.Poster, 380) : undefined,
      rating: isNaN(ratingNum) ? 0 : ratingNum,
      votes: data.imdbVotes && data.imdbVotes !== 'N/A' ? data.imdbVotes : '',
      plot: data.Plot && data.Plot !== 'N/A' ? data.Plot : '',
      director: data.Director && data.Director !== 'N/A' ? data.Director : undefined,
      writer: data.Writer && data.Writer !== 'N/A' ? data.Writer : undefined,
      actors: data.Actors && data.Actors !== 'N/A' ? data.Actors : undefined,
      awards: data.Awards && data.Awards !== 'N/A' ? data.Awards : undefined,
      boxOffice: data.BoxOffice && data.BoxOffice !== 'N/A' ? data.BoxOffice : undefined,
      rated: data.Rated && data.Rated !== 'N/A' ? data.Rated : undefined,
      metascore: data.Metascore && data.Metascore !== 'N/A' ? data.Metascore : undefined,
      ratings: Array.isArray(data.Ratings) ? data.Ratings : undefined,
      Ratings: Array.isArray(data.Ratings) ? data.Ratings : undefined,
    };

    cache[imdbId] = details;
    return details;
  } catch (err) {
    console.warn('Failed to fetch official IMDb details:', err);
    return null;
  }
}
