import { supabase, isSupabaseConfigured } from './supabase';
import { sanitizeText } from '../utils/security';

export type ReviewStatus = 'published' | 'hidden' | 'flagged';

export interface MediaReview {
  id: string;
  mediaId: string;
  mediaTitle: string;
  mediaType: 'movie' | 'tv' | 'series' | 'anime' | 'drama';
  userId: string;
  userName: string;
  userEmail?: string;
  userAvatar?: string;
  rating: number; // 1 to 10
  content: string;
  hasSpoilers: boolean;
  helpfulCount: number;
  status: ReviewStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface CommunityRatingSummary {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>; // 1 -> count, 2 -> count, ... 10 -> count
}

export interface ReviewInput {
  mediaId: string;
  mediaTitle: string;
  mediaType: 'movie' | 'tv' | 'series' | 'anime' | 'drama';
  userId: string;
  userName: string;
  userEmail?: string;
  userAvatar?: string;
  rating: number; // 1-10
  content: string;
  hasSpoilers?: boolean;
}

const LOCAL_STORAGE_REVIEWS_KEY = 'cinestream_local_media_reviews';
const LOCAL_STORAGE_VOTED_KEY = 'cinestream_voted_review_ids';

export const SUPABASE_REVIEWS_SQL = `-- 1. Buat Tabel Ulasan & Rating Komunitas Penonton
CREATE TABLE IF NOT EXISTS public.media_reviews (
  id TEXT PRIMARY KEY,
  media_id TEXT NOT NULL,
  media_title TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'movie',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_email TEXT,
  user_avatar TEXT,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 10),
  content TEXT NOT NULL,
  has_spoilers BOOLEAN NOT NULL DEFAULT false,
  helpful_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Index Pencarian Cepat
CREATE INDEX IF NOT EXISTS idx_media_reviews_media_id ON public.media_reviews(media_id);
CREATE INDEX IF NOT EXISTS idx_media_reviews_user_id ON public.media_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_media_reviews_created_at ON public.media_reviews(created_at DESC);

-- 3. Aktifkan Keamanan Baris (Row Level Security)
ALTER TABLE public.media_reviews ENABLE ROW LEVEL SECURITY;

-- 4. Semua Pengunjung Dapat Membaca Ulasan yang Diterbitkan (Published)
DROP POLICY IF EXISTS "Public can view published reviews" ON public.media_reviews;
CREATE POLICY "Public can view published reviews"
  ON public.media_reviews
  FOR SELECT
  TO public
  USING (status = 'published');

-- 5. Pengguna Terotentikasi Dapat Menulis Ulasan Sendiri
DROP POLICY IF EXISTS "Users can insert their own reviews" ON public.media_reviews;
CREATE POLICY "Users can insert their own reviews"
  ON public.media_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 6. Pengguna Dapat Mengupdate/Menghapus Ulasan Milik Sendiri
DROP POLICY IF EXISTS "Users can update own reviews" ON public.media_reviews;
CREATE POLICY "Users can update own reviews"
  ON public.media_reviews
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own reviews" ON public.media_reviews;
CREATE POLICY "Users can delete own reviews"
  ON public.media_reviews
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 7. Admin Memiliki Akses Penuh untuk Moderasi Seluruh Ulasan
DROP POLICY IF EXISTS "Admins can manage all reviews" ON public.media_reviews;
CREATE POLICY "Admins can manage all reviews"
  ON public.media_reviews
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') IN (
      'renaldy.maulana.rm@gmail.com'
    )
  )
  WITH CHECK (
    (auth.jwt() ->> 'email') IN (
      'renaldy.maulana.rm@gmail.com'
    )
  );
`;

// Helper: Membaca cache review dari localStorage
function getLocalReviews(): MediaReview[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_REVIEWS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as MediaReview[];
  } catch {
    return [];
  }
}

// Helper: Menyimpan cache review ke localStorage
function saveLocalReviews(reviews: MediaReview[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_REVIEWS_KEY, JSON.stringify(reviews));
  } catch (e) {
    console.warn('Gagal menyimpan ulasan ke localStorage:', e);
  }
}

// Helper: Memeriksa apakah user sudah vote helpful pada review tertentu
export function hasVotedHelpful(reviewId: string): boolean {
  try {
    const votedIds = JSON.parse(localStorage.getItem(LOCAL_STORAGE_VOTED_KEY) || '[]') as string[];
    return votedIds.includes(reviewId);
  } catch {
    return false;
  }
}

// Helper: Menandai review sudah di-vote
function recordHelpfulVote(reviewId: string, add: boolean): void {
  try {
    let votedIds = JSON.parse(localStorage.getItem(LOCAL_STORAGE_VOTED_KEY) || '[]') as string[];
    if (add) {
      if (!votedIds.includes(reviewId)) votedIds.push(reviewId);
    } else {
      votedIds = votedIds.filter((id) => id !== reviewId);
    }
    localStorage.setItem(LOCAL_STORAGE_VOTED_KEY, JSON.stringify(votedIds));
  } catch (e) {
    console.warn('Gagal mencatat vote review:', e);
  }
}

/**
 * Mengambil seluruh ulasan untuk suatu judul film/series tertentu.
 * Menggabungkan ulasan dari Supabase dengan ulasan offline lokal.
 */
export async function fetchMediaReviews(mediaId: string): Promise<MediaReview[]> {
  const localList = getLocalReviews().filter(
    (r) => r.mediaId === mediaId && r.status === 'published'
  );

  if (!isSupabaseConfigured) {
    return localList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  try {
    const { data, error } = await supabase
      .from('media_reviews')
      .select('*')
      .eq('media_id', mediaId)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (error || !data) {
      return localList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const cloudReviews: MediaReview[] = data.map((item) => ({
      id: item.id,
      mediaId: item.media_id,
      mediaTitle: item.media_title,
      mediaType: item.media_type,
      userId: item.user_id,
      userName: item.user_name,
      userEmail: item.user_email,
      userAvatar: item.user_avatar,
      rating: item.rating,
      content: item.content,
      hasSpoilers: item.has_spoilers,
      helpfulCount: item.helpful_count || 0,
      status: item.status,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));

    // Gabungkan dengan ulasan lokal yang belum sempat tersinkronisasi
    const cloudIds = new Set(cloudReviews.map((r) => r.id));
    const merged = [...cloudReviews];
    for (const loc of localList) {
      if (!cloudIds.has(loc.id)) {
        merged.push(loc);
      }
    }

    return merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.warn('Gagal memuat ulasan dari Supabase:', err);
    return localList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

/**
 * Menghitung agregasi skor komunitas Cinestream.
 */
export function calculateCommunityRating(reviews: MediaReview[]): CommunityRatingSummary {
  const distribution: Record<number, number> = {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
    6: 0, 7: 0, 8: 0, 9: 0, 10: 0,
  };

  const activeReviews = reviews.filter((r) => r.status === 'published');
  if (activeReviews.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: distribution,
    };
  }

  let totalScore = 0;
  for (const rev of activeReviews) {
    const clampedRating = Math.max(1, Math.min(10, Math.round(rev.rating)));
    distribution[clampedRating] = (distribution[clampedRating] || 0) + 1;
    totalScore += clampedRating;
  }

  const average = Number((totalScore / activeReviews.length).toFixed(1));
  return {
    averageRating: average,
    totalReviews: activeReviews.length,
    ratingDistribution: distribution,
  };
}

/**
 * Mengirimkan ulasan dan skor rating baru dari pengguna.
 */
export async function submitMediaReview(input: ReviewInput): Promise<MediaReview> {
  const sanitizedContent = sanitizeText(input.content, 2000);
  const sanitizedUserName = sanitizeText(input.userName, 80) || 'Penonton Cinestream';
  const clampedRating = Math.max(1, Math.min(10, Math.round(input.rating)));

  const newReview: MediaReview = {
    id: `rev-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    mediaId: input.mediaId,
    mediaTitle: input.mediaTitle,
    mediaType: input.mediaType,
    userId: input.userId,
    userName: sanitizedUserName,
    userEmail: input.userEmail,
    userAvatar: input.userAvatar,
    rating: clampedRating,
    content: sanitizedContent,
    hasSpoilers: Boolean(input.hasSpoilers),
    helpfulCount: 0,
    status: 'published',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Simpan ke cache lokal terlebih dahulu
  const localList = getLocalReviews();
  const existingIdx = localList.findIndex((r) => r.mediaId === input.mediaId && r.userId === input.userId);
  if (existingIdx >= 0) {
    localList[existingIdx] = newReview;
  } else {
    localList.unshift(newReview);
  }
  saveLocalReviews(localList);

  // Jika Supabase terhubung, simpan ke Cloud
  if (isSupabaseConfigured) {
    try {
      await supabase.from('media_reviews').insert({
        id: newReview.id,
        media_id: newReview.mediaId,
        media_title: newReview.mediaTitle,
        media_type: newReview.mediaType,
        user_id: newReview.userId,
        user_name: newReview.userName,
        user_email: newReview.userEmail,
        user_avatar: newReview.userAvatar,
        rating: newReview.rating,
        content: newReview.content,
        has_spoilers: newReview.hasSpoilers,
        helpful_count: 0,
        status: 'published',
        created_at: newReview.createdAt,
        updated_at: newReview.updatedAt,
      });
    } catch (err) {
      console.warn('Gagal sinkronisasi ulasan ke Supabase:', err);
    }
  }

  return newReview;
}

/**
 * Toggle upvote "Membantu / Helpful" pada suatu ulasan.
 */
export async function toggleHelpfulVote(reviewId: string, currentCount: number): Promise<number> {
  const isVoted = hasVotedHelpful(reviewId);
  const newCount = isVoted ? Math.max(0, currentCount - 1) : currentCount + 1;
  recordHelpfulVote(reviewId, !isVoted);

  // Update di cache lokal
  const localList = getLocalReviews();
  const found = localList.find((r) => r.id === reviewId);
  if (found) {
    found.helpfulCount = newCount;
    saveLocalReviews(localList);
  }

  // Update di Supabase jika ada koneksi
  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('media_reviews')
        .update({ helpful_count: newCount })
        .eq('id', reviewId);
    } catch (err) {
      console.warn('Gagal update helpful vote di Supabase:', err);
    }
  }

  return newCount;
}

/**
 * Menghapus ulasan secara permanen.
 */
export async function deleteReview(reviewId: string): Promise<boolean> {
  // Hapus dari cache lokal
  const localList = getLocalReviews().filter((r) => r.id !== reviewId);
  saveLocalReviews(localList);

  // Hapus dari Supabase jika ada koneksi
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('media_reviews').delete().eq('id', reviewId);
      if (error) {
        console.warn('Gagal menghapus ulasan di Supabase:', error);
        return false;
      }
    } catch (err) {
      console.warn('Gagal menghapus ulasan di Supabase:', err);
      return false;
    }
  }

  return true;
}

/**
 * Mengambil seluruh ulasan untuk keperluan tab moderasi di Admin Dashboard.
 */
export async function fetchAllReviewsForAdmin(): Promise<MediaReview[]> {
  const localList = getLocalReviews();

  if (!isSupabaseConfigured) {
    return localList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  try {
    const { data, error } = await supabase
      .from('media_reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error || !data) {
      return localList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const cloudReviews: MediaReview[] = data.map((item) => ({
      id: item.id,
      mediaId: item.media_id,
      mediaTitle: item.media_title,
      mediaType: item.media_type,
      userId: item.user_id,
      userName: item.user_name,
      userEmail: item.user_email,
      userAvatar: item.user_avatar,
      rating: item.rating,
      content: item.content,
      hasSpoilers: item.has_spoilers,
      helpfulCount: item.helpful_count || 0,
      status: item.status as ReviewStatus,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));

    const cloudIds = new Set(cloudReviews.map((r) => r.id));
    const merged = [...cloudReviews];
    for (const loc of localList) {
      if (!cloudIds.has(loc.id)) {
        merged.push(loc);
      }
    }

    return merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.warn('Gagal memuat seluruh ulasan untuk admin:', err);
    return localList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

/**
 * Memperbarui status moderasi ulasan (published, hidden, flagged).
 */
export async function updateReviewStatus(reviewId: string, status: ReviewStatus): Promise<boolean> {
  const localList = getLocalReviews();
  const found = localList.find((r) => r.id === reviewId);
  if (found) {
    found.status = status;
    saveLocalReviews(localList);
  }

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from('media_reviews')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', reviewId);
      if (error) {
        console.warn('Gagal update status ulasan di Supabase:', error);
        return false;
      }
    } catch (err) {
      console.warn('Gagal update status ulasan di Supabase:', err);
      return false;
    }
  }

  return true;
}
