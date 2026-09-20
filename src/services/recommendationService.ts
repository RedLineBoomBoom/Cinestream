/**
 * recommendationService.ts
 * Mesin Rekomendasi Pintar AI & Personalisasi Sinematik Cinestream
 * Fitur 3: "Karena Anda Menonton [Judul]..." (Because You Watched [Title]) & Pilihan Spesial
 */

import type { MediaItem, WatchHistoryItem, PlayProgress } from '../types/media';
import { fetchTmdbRecommendations } from './tmdb';
import { getAllLocalReviews } from './reviewService';
import { getStoredGeminiApiKey } from './aiSearch';
import { MOCK_CATALOG } from '../data/mockCatalog';
import { getMediaTitle } from '../utils/formatters';

export interface RecommendedMediaItem {
  media: MediaItem;
  matchPercentage: number; // 86% - 99%
  matchReasons: { id: string; en: string }[];
  aiRationaleId: string;
  aiRationaleEn: string;
  anchorTitle: string;
}

export interface RecommendationFeedData {
  type: 'because_you_watched' | 'top_picks' | 'community_trending';
  anchorMedia?: MediaItem;
  availableAnchors: MediaItem[];
  items: RecommendedMediaItem[];
}

export interface UserTasteProfile {
  favoriteGenres: { genre: string; weight: number }[];
  topGenres: string[];
  recentAnchorIds: string[];
  highRatedMediaIds: string[];
  totalWatchedCount: number;
}

const CACHE_PREFIX = 'cinestream_rec_cache_v1_';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 menit

interface CachedData {
  timestamp: number;
  data: RecommendationFeedData;
}

// ─────────────────────────────────────────────────────────────
// 1. PROFIL SELERA PENGGUNA (TASTE PROFILE EXTRACTION)
// ─────────────────────────────────────────────────────────────

export function extractUserTasteProfile(
  historyItems: WatchHistoryItem[] = [],
  continueWatching: PlayProgress[] = [],
  watchlist: string[] = [],
  watchlistMediaMap: Record<string, MediaItem> = {}
): UserTasteProfile {
  const genreWeights: Record<string, number> = {};
  const recentAnchorIds: string[] = [];
  const highRatedMediaIds: string[] = [];

  // 1. Bobot dari Riwayat Tontonan (Watch History)
  for (const item of historyItems) {
    if (!item.media) continue;
    if (!recentAnchorIds.includes(item.media.id)) {
      recentAnchorIds.push(item.media.id);
    }

    const weight = item.completed ? 4 : item.currentTime > 300 ? 2.5 : 1.5;
    for (const g of item.media.genres || []) {
      const normalized = g.trim();
      if (normalized) {
        genreWeights[normalized] = (genreWeights[normalized] || 0) + weight;
      }
    }
  }

  // 2. Bobot dari Progres Berjalan (Continue Watching)
  for (const prog of continueWatching) {
    if (!recentAnchorIds.includes(prog.mediaId)) {
      recentAnchorIds.push(prog.mediaId);
    }
  }

  // 3. Bobot dari Rating & Ulasan Komunitas Pengguna (Rating >= 7)
  try {
    const reviews = getAllLocalReviews();
    for (const rev of reviews) {
      if (rev.rating >= 7) {
        highRatedMediaIds.push(rev.mediaId);
        // Tambahan bobot tinggi jika pengguna memberi bintang 8 - 10
        const bonusWeight = rev.rating >= 9 ? 5 : 3;
        // Cari di catalog
        const found = MOCK_CATALOG.find((m) => m.id === rev.mediaId);
        if (found?.genres) {
          for (const g of found.genres) {
            genreWeights[g] = (genreWeights[g] || 0) + bonusWeight;
          }
        }
      }
    }
  } catch {
    // Abaikan kegagalan baca ulasan
  }

  // 4. Bobot dari Watchlist
  for (const wId of watchlist) {
    const media = watchlistMediaMap[wId] || MOCK_CATALOG.find((m) => m.id === wId);
    if (media?.genres) {
      for (const g of media.genres) {
        genreWeights[g] = (genreWeights[g] || 0) + 2;
      }
    }
  }

  const sortedGenres = Object.entries(genreWeights)
    .sort((a, b) => b[1] - a[1])
    .map(([genre, weight]) => ({ genre, weight }));

  return {
    favoriteGenres: sortedGenres,
    topGenres: sortedGenres.slice(0, 4).map((g) => g.genre),
    recentAnchorIds,
    highRatedMediaIds,
    totalWatchedCount: historyItems.length,
  };
}

// ─────────────────────────────────────────────────────────────
// 2. DETEKSI ANCHOR TERBAIK (ACTIVE ANCHOR SELECTION)
// ─────────────────────────────────────────────────────────────

export function getAvailableAnchors(
  historyItems: WatchHistoryItem[] = [],
  fullCatalog: MediaItem[] = []
): MediaItem[] {
  const anchors: MediaItem[] = [];
  const seenIds = new Set<string>();

  // Prioritas 1: Item terakhir di riwayat tontonan
  for (const item of historyItems) {
    if (item.media && !seenIds.has(item.media.id)) {
      seenIds.add(item.media.id);
      anchors.push(item.media);
    }
  }

  // Prioritas 2: Jika masih sedikit, lengkapi dengan catalog terfavorit yang ada
  if (anchors.length === 0) {
    for (const item of fullCatalog) {
      if ((item.featured || item.trending) && !seenIds.has(item.id)) {
        seenIds.add(item.id);
        anchors.push(item);
        if (anchors.length >= 5) break;
      }
    }
  }

  return anchors;
}

// ─────────────────────────────────────────────────────────────
// 3. KALKULATOR SKOR KECOCOKAN & TAG ALASAN (MATCH SCORE ENGINE)
// ─────────────────────────────────────────────────────────────

function computeMatchScoreAndReasons(
  anchorMedia: MediaItem,
  candidate: MediaItem
): {
  percentage: number;
  reasons: { id: string; en: string }[];
} {
  let score = 84; // Skor dasar awal 84%
  const reasons: { id: string; en: string }[] = [];

  const anchorGenres = (anchorMedia.genres || []).map((g) => g.toLowerCase());
  const candidateGenres = (candidate.genres || []).map((g) => g.toLowerCase());

  // Hitung irisan genre
  const sharedGenres = candidateGenres.filter((g) => anchorGenres.includes(g));
  if (sharedGenres.length > 0) {
    score += Math.min(10, sharedGenres.length * 4);
    const topShared = sharedGenres.slice(0, 2).map((g) => g.toUpperCase()).join(' • ');
    reasons.push({
      id: `Genre Serupa: ${topShared}`,
      en: `Shared Genre: ${topShared}`,
    });
  }

  // Skor rating tinggi
  if (candidate.rating >= 8.0) {
    score += 3;
    reasons.push({
      id: `Rating Tinggi ★${candidate.rating}`,
      en: `High Rating ★${candidate.rating}`,
    });
  }

  // Kesamaan sutradara / creator
  if (
    anchorMedia.director &&
    candidate.director &&
    anchorMedia.director !== 'Kreator Sinematik' &&
    anchorMedia.director.toLowerCase() === candidate.director.toLowerCase()
  ) {
    score += 5;
    reasons.push({
      id: `Sutradara Sama (${candidate.director})`,
      en: `Same Director (${candidate.director})`,
    });
  }

  // Kesamaan tipe format (movie ke movie, series ke series)
  if (anchorMedia.type === candidate.type) {
    score += 1;
  }

  // Rentang tahun rilis yang berdekatan
  if (anchorMedia.year && candidate.year && Math.abs(anchorMedia.year - candidate.year) <= 3) {
    reasons.push({
      id: `Era Sinematik Serupa (${candidate.year})`,
      en: `Similar Cinematic Era (${candidate.year})`,
    });
  }

  // Batasi persentase realistis 86% s.d. 99%
  const finalPercentage = Math.min(99, Math.max(86, score));

  // Jika tag alasan masih kurang dari 2, tambahkan tag estetik
  if (reasons.length < 2) {
    if (candidate.quality?.includes('4K')) {
      reasons.push({ id: 'Kualitas 4K Ultra HD', en: '4K Ultra HD Quality' });
    } else {
      reasons.push({ id: 'Pilihan Populer Komunitas', en: 'Community Favorite' });
    }
  }

  return {
    percentage: finalPercentage,
    reasons: reasons.slice(0, 3),
  };
}

// ─────────────────────────────────────────────────────────────
// 4. GENERATOR PENALARAN SINEMATIK AI (AI RATIONALE GENERATOR)
// ─────────────────────────────────────────────────────────────

export function generateLocalAiRationale(
  anchor: MediaItem,
  candidate: MediaItem
): { id: string; en: string } {
  const anchorTitle = anchor.title || 'tayangan ini';
  const candGenres = candidate.genres || [];
  const gStr = candGenres.join(', ').toLowerCase();

  if (gStr.includes('sci-fi') || gStr.includes('fiksi ilmiah')) {
    return {
      id: `Memiliki atmosfer fiksi ilmiah epik, misteri antarbintang yang megah, dan sinematografi imersif yang seirama dengan ${anchorTitle}.`,
      en: `Shares the epic sci-fi atmosphere, grand interstellar mystery, and immersive cinematography found in ${anchorTitle}.`,
    };
  }

  if (gStr.includes('action') || gStr.includes('aksi') || gStr.includes('adventure')) {
    return {
      id: `Menampilkan ketegangan aksi intens, perjuangan karakter yang mendalam, dan dinamika cerita berkecepatan tinggi seperti di ${anchorTitle}.`,
      en: `Features intense action pacing, high-stakes character struggles, and adrenaline-fueled storytelling reminiscent of ${anchorTitle}.`,
    };
  }

  if (gStr.includes('drama') || gStr.includes('crime') || gStr.includes('thriller')) {
    return {
      id: `Mengangkat kedalaman emosi, konflik moral tajam, dan narasi sinematik berbobot yang disukai penonton ${anchorTitle}.`,
      en: `Delivers emotional depth, sharp psychological intrigue, and prestige narrative weight praised by fans of ${anchorTitle}.`,
    };
  }

  if (gStr.includes('anime') || gStr.includes('animasi') || candidate.type === 'anime') {
    return {
      id: `Menyajikan visual memukau, alur petualangan emosional, dan pembangunan dunia fantasi yang sangat dinamis sejiwa dengan ${anchorTitle}.`,
      en: `Showcases stunning animation craft, emotional character journeys, and breathtaking world-building aligned with ${anchorTitle}.`,
    };
  }

  if (gStr.includes('horror') || gStr.includes('misteri') || gStr.includes('mystery')) {
    return {
      id: `Membangun atmosfer suspense gelap, teka-teki misteri berlapis, dan klimaks tak terduga yang memikat penonton ${anchorTitle}.`,
      en: `Crafts dark psychological suspense, layered puzzle-box tension, and unexpected plot twists that resonate with ${anchorTitle}.`,
    };
  }

  return {
    id: `Dipilih khusus oleh algoritma AI Cinestream karena kesamaan ritme cerita, pengakuan kritikus, dan tone sinematik dengan ${anchorTitle}.`,
    en: `Handpicked by the Cinestream AI engine due to shared narrative cadence, critical acclaim, and cinematic tone with ${anchorTitle}.`,
  };
}

/**
 * Mencoba meminta alasan rekomendasi personal dari Gemini Flash jika API key tersedia.
 * Fallback seketika ke arketipe sinema lokal tanpa jeda jika offline / tanpa key.
 */
export async function getAiRationaleWithGeminiFallback(
  anchor: MediaItem,
  candidate: MediaItem
): Promise<{ id: string; en: string }> {
  const localFallback = generateLocalAiRationale(anchor, candidate);
  const geminiKey = getStoredGeminiApiKey();

  if (!geminiKey) {
    return localFallback;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const prompt = `Berikan 1 kalimat pendek ringkas dan puitis (maksimal 20 kata) mengapa film "${candidate.title}" direkomendasikan kepada penonton yang baru saja menyukai "${anchor.title}". Format JSON: {"id": "kalimat indonesia", "en": "english sentence"}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.3 },
        }),
      }
    );

    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        const parsed = JSON.parse(text);
        if (parsed.id && parsed.en) {
          return { id: parsed.id, en: parsed.en };
        }
      }
    }
  } catch {
    // Gunakan fallback lokal
  }

  return localFallback;
}

// ─────────────────────────────────────────────────────────────
// 5. PENYUSUN FEED "KARENA ANDA MENONTON" (FEED BUILDER)
// ─────────────────────────────────────────────────────────────

export async function fetchBecauseYouWatchedFeed(
  anchorMedia: MediaItem,
  availableAnchors: MediaItem[],
  fullCatalog: MediaItem[],
  language: 'id' | 'en' = 'id'
): Promise<RecommendationFeedData> {
  // Cek cache sessionStorage
  const cacheKey = `${CACHE_PREFIX}${anchorMedia.id}_${language}`;
  try {
    const rawCache = sessionStorage.getItem(cacheKey);
    if (rawCache) {
      const parsed: CachedData = JSON.parse(rawCache);
      if (Date.now() - parsed.timestamp < CACHE_TTL_MS && parsed.data.items.length > 0) {
        return {
          ...parsed.data,
          availableAnchors, // Update daftar anchor terkini
        };
      }
    }
  } catch {
    // Abaikan cache error
  }

  const rawRecommended: MediaItem[] = [];
  const seenIds = new Set<string>([anchorMedia.id]);

  // 1. Ambil dari endpoint TMDB Recommendations jika tmdbId ada
  if (anchorMedia.tmdbId) {
    try {
      const tmdbItems = await fetchTmdbRecommendations(
        anchorMedia.tmdbId,
        anchorMedia.type,
        14
      );
      for (const item of tmdbItems) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          rawRecommended.push(item);
        }
      }
    } catch (err) {
      console.warn('Gagal memuat TMDB recommendations:', err);
    }
  }

  // 2. Lengkapi dari fullCatalog jika TMDB kurang dari 8 item
  if (rawRecommended.length < 8) {
    const anchorGenres = (anchorMedia.genres || []).map((g) => g.toLowerCase());
    const catalogMatches = fullCatalog.filter((item) => {
      if (seenIds.has(item.id)) return false;
      const itemGenres = (item.genres || []).map((g) => g.toLowerCase());
      return itemGenres.some((g) => anchorGenres.includes(g)) || item.featured || item.trending;
    });

    for (const match of catalogMatches) {
      if (!seenIds.has(match.id)) {
        seenIds.add(match.id);
        rawRecommended.push(match);
        if (rawRecommended.length >= 12) break;
      }
    }
  }

  // 3. Hitung skor kecocokan dan alasan untuk setiap kandidat
  const scoredItems: RecommendedMediaItem[] = rawRecommended.slice(0, 12).map((item) => {
    const { percentage, reasons } = computeMatchScoreAndReasons(anchorMedia, item);
    const rationales = generateLocalAiRationale(anchorMedia, item);

    return {
      media: item,
      matchPercentage: percentage,
      matchReasons: reasons,
      aiRationaleId: rationales.id,
      aiRationaleEn: rationales.en,
      anchorTitle: getMediaTitle(anchorMedia, language),
    };
  });

  // Urutkan berdasarkan persentase kecocokan tertinggi
  scoredItems.sort((a, b) => b.matchPercentage - a.matchPercentage);

  const feedData: RecommendationFeedData = {
    type: 'because_you_watched',
    anchorMedia,
    availableAnchors,
    items: scoredItems,
  };

  // Simpan ke sessionStorage
  try {
    const cacheObj: CachedData = {
      timestamp: Date.now(),
      data: feedData,
    };
    sessionStorage.setItem(cacheKey, JSON.stringify(cacheObj));
  } catch {
    // Abaikan penyimpanan jika kuota penuh
  }

  return feedData;
}

// ─────────────────────────────────────────────────────────────
// 6. FEED POPULER KOMUNITAS (GUEST / FALLBACK FEED)
// ─────────────────────────────────────────────────────────────

export function getCommunityTrendingFeed(
  fullCatalog: MediaItem[],
  language: 'id' | 'en' = 'id'
): RecommendationFeedData {
  const topCatalog = fullCatalog
    .filter((m) => m.rating >= 7.8 || m.featured || m.trending)
    .slice(0, 12);

  const scoredItems: RecommendedMediaItem[] = topCatalog.map((item, idx) => {
    const baseScore = 98 - (idx * 1); // 98%, 97%, 96% ...
    const percentage = Math.max(88, baseScore);
    const genres = (item.genres || []).slice(0, 2).join(' • ');

    return {
      media: item,
      matchPercentage: percentage,
      matchReasons: [
        { id: `Genre Populer: ${genres}`, en: `Top Genre: ${genres}` },
        { id: `Skor Komunitas ★${item.rating}`, en: `Community Score ★${item.rating}` },
        { id: 'Rekomendasi Terhangat', en: 'Trending Spotlight' },
      ],
      aiRationaleId: `Karya sinematik berperingkat tinggi yang paling banyak direkomendasikan dan disukai oleh komunitas penonton Cinestream minggu ini.`,
      aiRationaleEn: `High-rated cinematic masterpiece most praised and recommended by the Cinestream viewer community this week.`,
      anchorTitle: language === 'en' ? 'Top Community Picks' : 'Pilihan Komunitas',
    };
  });

  return {
    type: 'community_trending',
    availableAnchors: [],
    items: scoredItems,
  };
}
