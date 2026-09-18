/**
 * AI CineFinder Search Engine
 * Identifies movies, series, and anime from natural language plot, scene, or character descriptions.
 * Powered by Google Gemini with graceful semantic TMDB fallback.
 */

import type { UnifiedSearchResult } from './hybridSearch';
import { searchHybrid } from './hybridSearch';
import { getTmdbApiKey } from './tmdb';
import { translateText } from './translator';

export interface AiRecommendationItem {
  title: string;
  year?: number;
  type?: 'movie' | 'series' | 'anime';
  matchReason: string;
  confidence: number;
}

const GEMINI_STORAGE_KEY = 'cinestream_gemini_api_key';

export function getStoredGeminiApiKey(): string {
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(GEMINI_STORAGE_KEY);
      if (stored && stored.trim()) return stored.trim();
    }
  } catch {}
  return (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
}

export function setStoredGeminiApiKey(key: string): void {
  try {
    if (typeof window !== 'undefined') {
      if (key && key.trim()) {
        localStorage.setItem(GEMINI_STORAGE_KEY, key.trim());
      } else {
        localStorage.removeItem(GEMINI_STORAGE_KEY);
      }
    }
  } catch {}
}

/**
 * Direct query to Google Gemini Flash API
 */
async function queryGeminiApi(
  userQuery: string,
  apiKey: string,
  language: 'id' | 'en'
): Promise<AiRecommendationItem[]> {
  const promptInstruction = `You are CineStream AI CineFinder, an expert cinematic knowledge engine.
The user describes a movie, TV show, or anime using their own words (plot points, scenes, character traits, atmosphere, twists, or memorable moments).
Your task is to accurately identify the top 3-5 real titles that best match this description.
Respond ONLY with a valid JSON array of objects without markdown formatting or other text:
[
  {
    "title": "Exact English / Official Title",
    "year": 2014,
    "type": "movie",
    "confidence": 98,
    "matchReason": "1-2 sentences explaining specifically why this matches what the user described."
  }
]
Note for matchReason: ${
    language === 'id'
      ? 'Must be written in natural, fluent Bahasa Indonesia'
      : 'Must be written in fluent English'
  }.
type must be "movie", "series", or "anime". confidence must be integer between 60 and 99.`;

  const models = ['gemini-2.5-flash', 'gemini-1.5-flash'];
  for (const model of models) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${promptInstruction}\n\nUser Description: "${userQuery}"` }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const items: AiRecommendationItem[] = parsed.map((item: any) => {
            const mediaType: 'movie' | 'series' | 'anime' =
              item.type === 'anime' ? 'anime' : item.type === 'series' ? 'series' : 'movie';
            return {
              title: String(item.title || '').trim(),
              year: typeof item.year === 'number' ? item.year : undefined,
              type: mediaType,
              matchReason: String(item.matchReason || '').trim(),
              confidence: Math.min(99, Math.max(60, Number(item.confidence) || 85)),
            };
          });
          return items.filter((it) => it.title.length > 0);
        }
      }
    } catch {
      // Try next model fallback
    }
  }
  return [];
}

/**
 * Intelligent Semantic Keyword Fallback Engine
 * Used when no Gemini API key is configured or when offline
 */
async function querySemanticFallback(
  userQuery: string,
  language: 'id' | 'en'
): Promise<AiRecommendationItem[]> {
  try {
    // 1. Translate query to English for optimal TMDB keyword matching
    const translated = language === 'id' ? await translateText(userQuery, 'en') : userQuery;

    // 2. Remove filler stopwords
    const stopwords = new Set([
      'the', 'a', 'an', 'and', 'or', 'of', 'for', 'with', 'in', 'on', 'at', 'to', 'from',
      'movie', 'film', 'series', 'show', 'anime', 'about', 'who', 'where', 'when', 'that',
      'tentang', 'yang', 'dan', 'di', 'ke', 'dari', 'seorang', 'orang', 'adegan', 'cerita',
      'menceritakan', 'ada', 'itu', 'ini', 'seperti', 'mirip', 'judul', 'judulnya',
    ]);

    const keywords = translated
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopwords.has(w));

    if (keywords.length === 0) return [];

    const searchQuery = keywords.slice(0, 4).join(' ');
    const tmdbKey = getTmdbApiKey();

    // 3. Search TMDB multi search
    const url = `https://api.themoviedb.org/3/search/multi?api_key=${tmdbKey}&query=${encodeURIComponent(
      searchQuery
    )}&include_adult=false&page=1`;

    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];

    const data = await res.json();
    const results = (data.results || []).filter(
      (it: any) => it.media_type === 'movie' || it.media_type === 'tv'
    );

    const scored = results.map((item: any) => {
      const title = item.title || item.name || '';
      const overview = (item.overview || '').toLowerCase();
      let matchCount = 0;

      for (const kw of keywords) {
        if (overview.includes(kw)) matchCount += 2;
        if (title.toLowerCase().includes(kw)) matchCount += 3;
      }

      const confidence = Math.min(96, Math.max(68, 65 + matchCount * 7));
      const reason =
        language === 'id'
          ? `Ditemukan berdasarkan kecocokan alur cerita dan kata kunci (${keywords.slice(0, 3).join(', ')}). ${
              item.overview ? `Ringkasan: "${item.overview.slice(0, 110)}..."` : ''
            }`
          : `Matched by storyline concepts and keywords (${keywords.slice(0, 3).join(', ')}). ${
              item.overview ? `Synopsis: "${item.overview.slice(0, 110)}..."` : ''
            }`;

      return {
        title,
        year: item.release_date
          ? parseInt(item.release_date.slice(0, 4))
          : item.first_air_date
          ? parseInt(item.first_air_date.slice(0, 4))
          : undefined,
        type: item.media_type === 'tv' ? ('series' as const) : ('movie' as const),
        confidence,
        matchReason: reason,
      };
    });

    return scored.slice(0, 5);
  } catch {
    return [];
  }
}

/**
 * Main AI Search Entrypoint
 * Identifies movie/show by description and resolves into full UnifiedSearchResult objects with streaming servers
 */
export async function searchWithAI(
  userDescription: string,
  language: 'id' | 'en' = 'id'
): Promise<UnifiedSearchResult[]> {
  const cleanDesc = userDescription.trim();
  if (!cleanDesc || cleanDesc.length < 3) return [];

  // Step 1: Query AI (Gemini or Semantic Fallback)
  const geminiKey = getStoredGeminiApiKey();
  let recommendations: AiRecommendationItem[] = [];

  if (geminiKey) {
    recommendations = await queryGeminiApi(cleanDesc, geminiKey, language);
  }

  // Fallback if Gemini key is missing or query failed
  if (recommendations.length === 0) {
    recommendations = await querySemanticFallback(cleanDesc, language);
  }

  if (recommendations.length === 0) return [];

  // Step 2: Resolve each recommended title into rich UnifiedSearchResult from TMDB
  const resolvedResults: UnifiedSearchResult[] = [];

  await Promise.all(
    recommendations.map(async (rec) => {
      try {
        const hybridMatches = await searchHybrid(rec.title, 'tmdb', language);
        if (hybridMatches.length > 0) {
          // Find best match matching the recommended year/type if possible
          const best =
            hybridMatches.find(
              (m) =>
                rec.year &&
                Math.abs((m.year || 0) - rec.year) <= 1 &&
                (rec.type ? m.mediaType === rec.type : true)
            ) ||
            hybridMatches.find((m) => rec.year && Math.abs((m.year || 0) - rec.year) <= 1) ||
            hybridMatches[0];

          resolvedResults.push({
            ...best,
            source: 'ai',
            aiMatchReason: rec.matchReason,
            aiConfidence: rec.confidence,
          });
        }
      } catch {
        // Continue with other recommendations
      }
    })
  );

  // Sort by AI confidence descending
  return resolvedResults.sort((a, b) => (b.aiConfidence || 0) - (a.aiConfidence || 0));
}
