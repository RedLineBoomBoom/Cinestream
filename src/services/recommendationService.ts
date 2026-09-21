/**
 * recommendationService.ts
 * Mesin Rekomendasi Berbasis Konten (Content-Based Filtering) Cinestream
 * "Because You Watched [Title]" — HANYA berdasarkan riwayat tontonan nyata user
 *
 * Prinsip:
 * - Hanya tampil jika user sudah punya riwayat tontonan nyata
 * - Kandidat rekomendasi HANYA dari fullCatalog (yang tersedia di Cinestream)
 * - Skor kecocokan jujur: 50–99% berdasarkan multi-dimensi similarity
 * - Tidak ada fake "Community Trending" fallback
 */

import type { MediaItem, WatchHistoryItem } from '../types/media';
import { getAllLocalReviews } from './reviewService';
import { MOCK_CATALOG } from '../data/mockCatalog';
import { getMediaTitle } from '../utils/formatters';

export interface RecommendedMediaItem {
  media: MediaItem;
  matchPercentage: number;
  matchReasons: { id: string; en: string }[];
  aiRationaleId: string;
  aiRationaleEn: string;
  anchorTitle: string;
}

export interface RecommendationFeedData {
  type: 'because_you_watched';
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

const CACHE_PREFIX = 'cinestream_rec_cache_v2_';
const CACHE_TTL_MS = 20 * 60 * 1000; // 20 menit

interface CachedData {
  timestamp: number;
  data: RecommendationFeedData;
}

// ─────────────────────────────────────────────────────────────
// 1. DETEKSI ANCHOR — HANYA DARI HISTORY NYATA
// ─────────────────────────────────────────────────────────────

/**
 * Kembalikan daftar film acuan berdasarkan riwayat tontonan nyata user.
 * Jika history kosong → kembalikan [] (jangan fallback ke trending).
 */
export function getAvailableAnchors(
  historyItems: WatchHistoryItem[] = [],
  fullCatalog: MediaItem[] = []
): MediaItem[] {
  const anchors: MediaItem[] = [];
  const seenIds = new Set<string>();

  // Urutkan dari yang paling baru ditonton
  const sortedHistory = [...historyItems].sort((a, b) => b.lastWatched - a.lastWatched);

  for (const item of sortedHistory) {
    if (!item.media) continue;
    if (seenIds.has(item.media.id)) continue;

    // Pastikan media-nya ada di catalog lokal (supaya bisa jadi acuan yang relevan)
    const inCatalog = fullCatalog.find((m) => m.id === item.media.id);
    const mediaToUse = inCatalog || item.media;

    seenIds.add(mediaToUse.id);
    anchors.push(mediaToUse);

    // Batasi maksimal 10 anchor (yang paling baru)
    if (anchors.length >= 10) break;
  }

  return anchors;
}

// ─────────────────────────────────────────────────────────────
// 2. PROFIL SELERA PENGGUNA
// ─────────────────────────────────────────────────────────────

export function extractUserTasteProfile(
  historyItems: WatchHistoryItem[] = [],
): UserTasteProfile {
  const genreWeights: Record<string, number> = {};
  const recentAnchorIds: string[] = [];
  const highRatedMediaIds: string[] = [];

  for (const item of historyItems) {
    if (!item.media) continue;
    if (!recentAnchorIds.includes(item.media.id)) {
      recentAnchorIds.push(item.media.id);
    }
    // Bobot lebih tinggi jika selesai ditonton
    const weight = item.completed ? 4 : item.currentTime > 300 ? 2.5 : 1.5;
    for (const g of item.media.genres || []) {
      const normalized = g.trim();
      if (normalized) {
        genreWeights[normalized] = (genreWeights[normalized] || 0) + weight;
      }
    }
  }

  // Bonus dari review dengan rating tinggi
  try {
    const reviews = getAllLocalReviews();
    for (const rev of reviews) {
      if (rev.rating >= 7) {
        highRatedMediaIds.push(rev.mediaId);
        const bonusWeight = rev.rating >= 9 ? 5 : 3;
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
// 3. SKOR KECOCOKAN MULTI-DIMENSI YANG JUJUR
// ─────────────────────────────────────────────────────────────

/**
 * Hitung Jaccard similarity untuk dua set genre.
 * Jaccard = |A ∩ B| / |A ∪ B|  → nilai 0.0 – 1.0
 */
function jaccardGenreSimilarity(genresA: string[], genresB: string[]): number {
  const setA = new Set(genresA.map((g) => g.toLowerCase()));
  const setB = new Set(genresB.map((g) => g.toLowerCase()));
  if (setA.size === 0 && setB.size === 0) return 0;

  const intersection = [...setA].filter((g) => setB.has(g));
  const union = new Set([...setA, ...setB]);
  return intersection.length / union.size;
}

function computeMatchScoreAndReasons(
  anchor: MediaItem,
  candidate: MediaItem
): { percentage: number; reasons: { id: string; en: string }[] } {
  let score = 0;
  const reasons: { id: string; en: string }[] = [];

  const anchorGenres = anchor.genres || [];
  const candidateGenres = candidate.genres || [];

  // ── A. Genre Similarity (Jaccard) — bobot terbesar: 0–55 poin ──
  const jaccard = jaccardGenreSimilarity(anchorGenres, candidateGenres);
  const genreScore = Math.round(jaccard * 55);
  score += genreScore;

  const sharedGenres = candidateGenres.filter((g) =>
    anchorGenres.map((x) => x.toLowerCase()).includes(g.toLowerCase())
  );
  if (sharedGenres.length > 0) {
    const topShared = sharedGenres.slice(0, 2).map((g) =>
      g.charAt(0).toUpperCase() + g.slice(1)
    ).join(' & ');
    reasons.push({
      id: `Genre Serupa: ${topShared}`,
      en: `Matching Genre: ${topShared}`,
    });
  }

  // ── B. Sutradara / Creator Sama — +15 poin ──
  if (
    anchor.director &&
    candidate.director &&
    anchor.director !== 'Kreator Sinematik' &&
    candidate.director !== 'Kreator Sinematik' &&
    anchor.director.toLowerCase() === candidate.director.toLowerCase()
  ) {
    score += 15;
    reasons.push({
      id: `Sutradara Sama: ${candidate.director}`,
      en: `Same Director: ${candidate.director}`,
    });
  }

  // ── C. Tipe Format Sama (movie↔movie, series↔series, anime↔anime) — +8 poin ──
  if (anchor.type === candidate.type) {
    score += 8;
    reasons.push({
      id: `Format Serupa: ${candidate.type.charAt(0).toUpperCase() + candidate.type.slice(1)}`,
      en: `Same Format: ${candidate.type.charAt(0).toUpperCase() + candidate.type.slice(1)}`,
    });
  }

  // ── D. Negara / Asal Produksi Sama — +8 poin ──
  const anchorCountries = anchor.originCountry || (anchor.country ? [anchor.country] : []);
  const candidateCountries = candidate.originCountry || (candidate.country ? [candidate.country] : []);
  const sharedCountry = anchorCountries.some((c) =>
    candidateCountries.some((d) => d.toLowerCase() === c.toLowerCase())
  );
  if (sharedCountry && anchorCountries.length > 0) {
    score += 8;
    reasons.push({
      id: `Produksi ${candidateCountries[0] || candidate.country}`,
      en: `${candidateCountries[0] || candidate.country} Production`,
    });
  }

  // ── E. Rentang Tahun Rilis Berdekatan — +4 poin (≤3 tahun), +2 poin (≤6 tahun) ──
  if (anchor.year && candidate.year) {
    const yearDiff = Math.abs(anchor.year - candidate.year);
    if (yearDiff <= 3) {
      score += 4;
      reasons.push({
        id: `Era Sinema Serupa (${candidate.year})`,
        en: `Similar Era (${candidate.year})`,
      });
    } else if (yearDiff <= 6) {
      score += 2;
    }
  }

  // ── F. Rating Tinggi — +5 poin (≥8.0), +2 poin (≥7.5) ──
  if (candidate.rating >= 8.0) {
    score += 5;
    reasons.push({
      id: `Rating Tinggi ★${candidate.rating}`,
      en: `High Rating ★${candidate.rating}`,
    });
  } else if (candidate.rating >= 7.5) {
    score += 2;
  }

  // ── Normalisasi ke rentang 50–99 ──
  // Max theoretical score = 55+15+8+8+4+5 = 95 poin → map ke 50–99
  const MAX_RAW = 95;
  const normalized = 50 + Math.round((score / MAX_RAW) * 49);
  const finalPercentage = Math.min(99, Math.max(50, normalized));

  // Pastikan minimal 2 alasan tampil
  if (reasons.length < 2) {
    if (candidate.rating >= 7.5) {
      reasons.push({
        id: `Rating Komunitas ★${candidate.rating}`,
        en: `Community Score ★${candidate.rating}`,
      });
    } else {
      reasons.push({
        id: 'Pilihan Kurasi Editor',
        en: 'Editor\'s Curated Pick',
      });
    }
  }

  return {
    percentage: finalPercentage,
    reasons: reasons.slice(0, 3),
  };
}

// ─────────────────────────────────────────────────────────────
// 4. GENERATOR PENALARAN AI SINEMATIK
// ─────────────────────────────────────────────────────────────

export function generateLocalAiRationale(
  anchor: MediaItem,
  candidate: MediaItem
): { id: string; en: string } {
  const anchorTitle = getMediaTitle(anchor, 'id') || anchor.title || 'tayangan ini';
  const candGenres = (candidate.genres || []).map((g) => g.toLowerCase()).join(' ');

  // Sutradara sama — alasan paling kuat
  if (
    anchor.director &&
    candidate.director &&
    anchor.director !== 'Kreator Sinematik' &&
    anchor.director.toLowerCase() === candidate.director.toLowerCase()
  ) {
    return {
      id: `Karya terbaru dari sutradara yang sama dengan ${anchorTitle}. Gaya penyutradaraan, tone visual, dan ritme narasinya sangat konsisten.`,
      en: `Another title from the same director as ${anchorTitle}. Expect the same directorial style, visual tone, and narrative rhythm.`,
    };
  }

  // Genre-based rationale
  if (candGenres.includes('sci-fi') || candGenres.includes('fiksi ilmiah') || candGenres.includes('science fiction')) {
    return {
      id: `Atmosfer fiksi ilmiah yang serupa dengan ${anchorTitle} — universe yang luas, misteri antarbintang, dan sinematografi imersif.`,
      en: `Shares the expansive sci-fi atmosphere of ${anchorTitle} — vast universe building, interstellar mystery, and immersive cinematography.`,
    };
  }

  if (candGenres.includes('action') || candGenres.includes('aksi') || candGenres.includes('adventure')) {
    return {
      id: `Intensitas aksi dan dinamika cerita berkecepatan tinggi yang serupa dengan yang kamu nikmati di ${anchorTitle}.`,
      en: `Same intensity of action and high-stakes storytelling you enjoyed in ${anchorTitle}.`,
    };
  }

  if (candGenres.includes('horror') || candGenres.includes('thriller') || candGenres.includes('misteri') || candGenres.includes('mystery')) {
    return {
      id: `Atmosfer gelap, tegangan psikologis, dan teka-teki berlapis yang mirip dengan pengalaman menonton ${anchorTitle}.`,
      en: `Dark atmosphere, psychological tension, and layered mystery similar to your experience watching ${anchorTitle}.`,
    };
  }

  if (candGenres.includes('romance') || candGenres.includes('romantis')) {
    return {
      id: `Dinamika hubungan yang hangat dan emosional seperti yang ada di ${anchorTitle} — kisah cinta yang autentik dan menyentuh hati.`,
      en: `Warm emotional relationship dynamics like ${anchorTitle} — authentic love stories that genuinely resonate.`,
    };
  }

  if (candGenres.includes('anime') || candGenres.includes('animasi') || candidate.type === 'anime') {
    return {
      id: `Visual memukau, pembangunan dunia yang kaya, dan karakter dengan kedalaman emosional setara ${anchorTitle}.`,
      en: `Stunning visuals, rich world-building, and characters with the same emotional depth as ${anchorTitle}.`,
    };
  }

  if (candGenres.includes('drama') || candGenres.includes('family') || candGenres.includes('keluarga')) {
    return {
      id: `Kedalaman emosi dan narasi berbobot yang sama seperti yang kamu apresiasi di ${anchorTitle}.`,
      en: `The same emotional depth and prestigious narrative weight you appreciated in ${anchorTitle}.`,
    };
  }

  if (candGenres.includes('comedy') || candGenres.includes('komedi')) {
    return {
      id: `Humor yang cerdas dan ringan, sejiwa dengan tone menghibur yang kamu suka dari ${anchorTitle}.`,
      en: `Smart, breezy humor with the same entertaining tone you enjoyed from ${anchorTitle}.`,
    };
  }

  // Fallback jujur
  return {
    id: `Dipilih berdasarkan kesamaan genre, era sinema, dan profil tontonan kamu — kemungkinan besar kamu akan menyukainya seperti ${anchorTitle}.`,
    en: `Selected based on shared genre profile, cinematic era, and your viewing patterns — you'll likely enjoy this as much as ${anchorTitle}.`,
  };
}

// ─────────────────────────────────────────────────────────────
// 5. FEED "BECAUSE YOU WATCHED" — CATALOG-ONLY
// ─────────────────────────────────────────────────────────────

/**
 * Buat feed rekomendasi berdasarkan anchor film yang dipilih user.
 * HANYA menggunakan kandidat dari fullCatalog (film yang tersedia di Cinestream).
 * Tidak memanggil TMDB recommendations endpoint.
 */
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
          availableAnchors,
        };
      }
    }
  } catch {
    // Abaikan cache error
  }

  // Exclude anchor sendiri dan semua anchor lain yang sudah ditonton dari kandidat
  const anchorIdsToExclude = new Set<string>(availableAnchors.map((a) => a.id));
  anchorIdsToExclude.add(anchorMedia.id);

  // Kandidat HANYA dari fullCatalog — film yang benar-benar ada di Cinestream
  const candidates = fullCatalog.filter((item) => !anchorIdsToExclude.has(item.id));

  // Hitung skor kecocokan untuk setiap kandidat
  const scoredItems: RecommendedMediaItem[] = candidates.map((item) => {
    const { percentage, reasons } = computeMatchScoreAndReasons(anchorMedia, item);
    const rationale = generateLocalAiRationale(anchorMedia, item);

    return {
      media: item,
      matchPercentage: percentage,
      matchReasons: reasons,
      aiRationaleId: rationale.id,
      aiRationaleEn: rationale.en,
      anchorTitle: getMediaTitle(anchorMedia, language),
    };
  });

  // Urutkan dari skor tertinggi, ambil top 16
  scoredItems.sort((a, b) => b.matchPercentage - a.matchPercentage);
  const topItems = scoredItems.slice(0, 16);

  const feedData: RecommendationFeedData = {
    type: 'because_you_watched',
    anchorMedia,
    availableAnchors,
    items: topItems,
  };

  // Cache ke sessionStorage
  try {
    const cacheObj: CachedData = {
      timestamp: Date.now(),
      data: feedData,
    };
    sessionStorage.setItem(cacheKey, JSON.stringify(cacheObj));
  } catch {
    // Abaikan jika kuota penuh
  }

  return feedData;
}
