import React, { useState, useEffect, useMemo } from 'react';
import {
  Star,
  MessageSquare,
  Send,
  ThumbsUp,
  AlertTriangle,
  Eye,
  EyeOff,
  Sparkles,
  Trash2,
  Lock,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import type { MediaItem } from '../../types/media';
import {
  fetchMediaReviews,
  submitMediaReview,
  toggleHelpfulVote,
  deleteReview,
  calculateCommunityRating,
  hasVotedHelpful,
  type MediaReview,
} from '../../services/reviewService';
import { useAuth } from '../../context/AuthContext';
import { useUserProfile } from '../../context/UserProfileContext';
import { useLanguage } from '../../context/LanguageContext';
import { useSound } from '../../context/SoundContext';
import { isAdminUser } from '../../utils/admin';

interface CommunityReviewsSectionProps {
  media: MediaItem;
  className?: string;
  onReviewCountChange?: (count: number) => void;
}

export const CommunityReviewsSection: React.FC<CommunityReviewsSectionProps> = ({
  media,
  className = '',
  onReviewCountChange,
}) => {
  const { user, openAuthModal } = useAuth();
  const { profile } = useUserProfile();
  const { language } = useLanguage();
  const { playClick, playHover, playSuccess } = useSound();

  const [reviews, setReviews] = useState<MediaReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Form State
  const [userRating, setUserRating] = useState<number>(8);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [reviewContent, setReviewContent] = useState('');
  const [hasSpoilers, setHasSpoilers] = useState(false);

  // Filter / Sort & Spoiler reveals
  const [sortBy, setSortBy] = useState<'newest' | 'helpful' | 'highest' | 'lowest'>('newest');
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<string, boolean>>({});

  const isAdmin = isAdminUser(user, profile);

  // Fetch reviews on mount or media change
  const loadReviews = async () => {
    setIsLoading(true);
    try {
      const data = await fetchMediaReviews(media.id);
      setReviews(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [media.id]);

  useEffect(() => {
    onReviewCountChange?.(reviews.length);
  }, [reviews.length, onReviewCountChange]);

  // Aggregated rating
  const ratingSummary = useMemo(() => {
    return calculateCommunityRating(reviews);
  }, [reviews]);

  // Sorting
  const sortedReviews = useMemo(() => {
    const list = [...reviews];
    switch (sortBy) {
      case 'helpful':
        return list.sort((a, b) => b.helpfulCount - a.helpfulCount);
      case 'highest':
        return list.sort((a, b) => b.rating - a.rating);
      case 'lowest':
        return list.sort((a, b) => a.rating - b.rating);
      case 'newest':
      default:
        return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }, [reviews, sortBy]);

  // Star label descriptors
  const getRatingDescriptor = (r: number): { id: string; en: string; color: string } => {
    if (r === 10) return { id: 'Mahakarya Sinematik', en: 'Cinematic Masterpiece', color: 'text-amber-300' };
    if (r === 9) return { id: 'Luar Biasa Memukau', en: 'Outstanding & Phenomenal', color: 'text-amber-400' };
    if (r === 8) return { id: 'Sangat Bagus', en: 'Very Good', color: 'text-emerald-400' };
    if (r === 7) return { id: 'Bagus & Menghibur', en: 'Good & Entertaining', color: 'text-cyan-400' };
    if (r === 6) return { id: 'Lumayan Asyik', en: 'Decent & Enjoyable', color: 'text-sky-400' };
    if (r === 5) return { id: 'Cukup Rata-Rata', en: 'Average', color: 'text-slate-300' };
    if (r === 4) return { id: 'Kurang Menarik', en: 'Below Average', color: 'text-yellow-500' };
    if (r === 3) return { id: 'Mengecewakan', en: 'Disappointing', color: 'text-orange-400' };
    if (r === 2) return { id: 'Buruk Sekali', en: 'Poor', color: 'text-rose-500' };
    return { id: 'Bencana Total', en: 'Terrible Waste', color: 'text-red-500' };
  };

  const getTierBadge = (avg: number) => {
    if (avg >= 9.0) {
      return {
        label: language === 'en' ? 'Masterpiece' : 'Mahakarya',
        color: 'from-amber-500/25 to-yellow-500/10 text-amber-300 border-amber-400/40',
      };
    }
    if (avg >= 8.0) {
      return {
        label: language === 'en' ? 'Must Watch' : 'Wajib Nonton',
        color: 'from-emerald-500/25 to-emerald-500/10 text-emerald-300 border-emerald-400/40',
      };
    }
    if (avg >= 7.0) {
      return {
        label: language === 'en' ? 'Recommended' : 'Direkomendasikan',
        color: 'from-cyan-500/25 to-cyan-500/10 text-cyan-300 border-cyan-400/40',
      };
    }
    if (avg >= 5.0) {
      return {
        label: language === 'en' ? 'Decent' : 'Cukup Menghibur',
        color: 'from-blue-500/25 to-blue-500/10 text-blue-300 border-blue-400/40',
      };
    }
    return {
      label: language === 'en' ? 'Mixed Reviews' : 'Ulasan Beragam',
      color: 'from-rose-500/25 to-rose-500/10 text-rose-300 border-rose-400/40',
    };
  };

  // Submit Handler
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      playClick();
      openAuthModal('signin');
      return;
    }

    if (!reviewContent.trim()) return;

    playClick();
    setIsSubmitting(true);

    try {
      const authorName = profile?.name || user?.user_metadata?.name || user.email?.split('@')[0] || 'Penonton Cinestream';
      const authorAvatar = user?.user_metadata?.avatar_url || (profile?.avatarType === 'emoji' ? profile?.emoji : undefined);

      const created = await submitMediaReview({
        mediaId: media.id,
        mediaTitle: media.title,
        mediaType: media.type,
        userId: user.id,
        userName: authorName,
        userEmail: user.email,
        userAvatar: authorAvatar,
        rating: userRating,
        content: reviewContent,
        hasSpoilers: hasSpoilers,
      });

      // Update state
      setReviews((prev) => {
        const filtered = prev.filter((r) => r.id !== created.id);
        return [created, ...filtered];
      });

      setReviewContent('');
      setHasSpoilers(false);
      setSubmitSuccess(true);
      playSuccess();

      setTimeout(() => setSubmitSuccess(false), 3500);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helpful toggle
  const handleToggleHelpful = async (review: MediaReview) => {
    playClick();
    const newCount = await toggleHelpfulVote(review.id, review.helpfulCount);
    setReviews((prev) =>
      prev.map((r) => (r.id === review.id ? { ...r, helpfulCount: newCount } : r))
    );
  };

  // Delete handler
  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm(language === 'en' ? 'Are you sure you want to delete this review?' : 'Apakah Anda yakin ingin menghapus ulasan ini?')) {
      return;
    }
    playClick();
    await deleteReview(reviewId);
    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
  };

  // Spoiler toggle per review
  const toggleSpoiler = (reviewId: string) => {
    playClick();
    setRevealedSpoilers((prev) => ({
      ...prev,
      [reviewId]: !prev[reviewId],
    }));
  };

  const activeHoverScore = hoverRating !== null ? hoverRating : userRating;
  const activeDescriptor = getRatingDescriptor(activeHoverScore);
  const tier = getTierBadge(ratingSummary.averageRating);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* ── 1. Cinestream Community Score Summary Card ── */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-white/[0.04] via-[#161618] to-black/60 border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Big Rating Badge & Title */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#E50914] text-white text-[10px] font-black tracking-wider uppercase">
                Cinestream
              </span>
              <span className="text-xs font-semibold text-slate-300">
                {language === 'en' ? 'Community Audience Score' : 'Skor Komunitas Penonton'}
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              {ratingSummary.totalReviews > 0 ? (
                <>
                  <div className="flex items-center gap-1.5">
                    <Star className="w-7 h-7 sm:w-8 sm:h-8 fill-amber-400 text-amber-400" />
                    <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                      {ratingSummary.averageRating.toFixed(1)}
                    </span>
                    <span className="text-sm font-semibold text-slate-400">/ 10</span>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border bg-gradient-to-r ${tier.color}`}>
                    {tier.label}
                  </span>
                </>
              ) : (
                <div className="flex items-center gap-2 text-slate-400 py-1">
                  <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                  <span className="text-sm font-medium">
                    {language === 'en'
                      ? 'No audience ratings yet. Be the first to rate!'
                      : 'Belum ada rating penonton. Jadilah yang pertama memberi nilai!'}
                  </span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-400 flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                {language === 'en'
                  ? `Based on ${ratingSummary.totalReviews} verified community reviews`
                  : `Berdasarkan ${ratingSummary.totalReviews} ulasan penonton terverifikasi`}
              </span>
            </p>
          </div>

          {/* Mini 10-Star Distribution Bar */}
          {ratingSummary.totalReviews > 0 && (
            <div className="w-full md:w-64 space-y-1 pt-2 md:pt-0 border-t md:border-t-0 md:border-l border-white/[0.08] md:pl-6">
              <span className="text-[11px] font-semibold text-slate-400 block mb-1.5 uppercase tracking-wider">
                {language === 'en' ? 'Rating Distribution' : 'Distribusi Rating'}
              </span>
              {[10, 8, 6, 4, 2].map((starBucket) => {
                const count = (ratingSummary.ratingDistribution[starBucket] || 0) +
                              (ratingSummary.ratingDistribution[starBucket - 1] || 0);
                const pct = ratingSummary.totalReviews > 0 ? (count / ratingSummary.totalReviews) * 100 : 0;
                return (
                  <div key={starBucket} className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                    <span className="w-7 text-right">{starBucket}★</span>
                    <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-red-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-6 text-slate-500 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── 2. Write Review Form ── */}
      <form
        onSubmit={handleSubmitReview}
        className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-4 shadow-xl"
      >
        {/* Header: Form Title & Live Rating Status Badge */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-red-500 shrink-0" />
            <h4 className="text-sm font-bold text-white">
              {language === 'en' ? 'Your Review & Star Rating' : 'Rating Bintang & Ulasan Anda'}
            </h4>
          </div>

          {/* Live Score Badge with Descriptor */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 shadow-sm shrink-0">
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />
              <span className="text-sm font-black font-mono text-amber-300">
                {activeHoverScore}
                <span className="text-xs font-normal text-slate-400">/10</span>
              </span>
            </div>
            <span className="w-px h-3.5 bg-white/15" />
            <span className={`text-xs font-semibold ${activeDescriptor.color}`}>
              {language === 'en' ? activeDescriptor.en : activeDescriptor.id}
            </span>
          </div>
        </div>

        {/* Dedicated 10-Star Interactive Bar */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-black/40 border border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-0.5 max-w-full">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((starNum) => {
              const isFilled = starNum <= activeHoverScore;
              return (
                <button
                  type="button"
                  key={starNum}
                  onClick={() => {
                    playClick();
                    setUserRating(starNum);
                  }}
                  onMouseEnter={() => {
                    playHover();
                    setHoverRating(starNum);
                  }}
                  onMouseLeave={() => setHoverRating(null)}
                  className="p-1 sm:p-1.5 rounded-lg hover:bg-white/10 active:scale-95 transition-all cursor-pointer group shrink-0"
                  title={`${starNum} / 10`}
                >
                  <Star
                    className={`w-4 h-4 sm:w-5 sm:h-5 transition-all duration-150 group-hover:scale-110 ${
                      isFilled
                        ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.45)]'
                        : 'text-slate-600 hover:text-slate-400'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          <div className="text-[11px] text-slate-400 font-light flex items-center gap-1.5">
            <span className="hidden sm:inline">
              {language === 'en' ? 'Click any star to rate' : 'Pilih bintang untuk memberi nilai'}
            </span>
            <span className="text-amber-400 font-mono font-medium">({activeHoverScore}/10)</span>
          </div>
        </div>

        {/* Text Input */}
        <div className="space-y-2">
          <textarea
            value={reviewContent}
            onChange={(e) => setReviewContent(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder={
              language === 'en'
                ? 'Share your thoughts on the plot, cinematography, performance, and pacing...'
                : 'Bagikan ulasan Anda tentang alur cerita, akting pemeran, visual sinematografi, atau musik...'
            }
            className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914]/40 transition-all resize-none leading-relaxed"
          />

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Spoiler Checkbox */}
            <label className="inline-flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white select-none">
              <input
                type="checkbox"
                checked={hasSpoilers}
                onChange={(e) => setHasSpoilers(e.target.checked)}
                className="rounded bg-black border-white/20 text-red-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className="flex items-center gap-1.5 text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-medium text-[11px] sm:text-xs">
                  {language === 'en' ? 'Contains Spoilers' : 'Mengandung Bocoran Cerita (Spoiler)'}
                </span>
              </span>
            </label>

            <span className="text-[11px] font-mono text-slate-500">
              {reviewContent.length} / 2000
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between pt-1">
          {submitSuccess && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {language === 'en'
                  ? 'Review published successfully! Thank you.'
                  : 'Ulasan Anda berhasil diterbitkan! Terima kasih.'}
              </span>
            </div>
          )}

          <div className="ml-auto">
            {user ? (
              <button
                type="submit"
                disabled={isSubmitting || !reviewContent.trim()}
                className="px-5 py-2.5 rounded-full bg-[#E50914] hover:bg-red-600 disabled:opacity-40 disabled:hover:bg-[#E50914] text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-red-950/50 transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {isSubmitting
                    ? language === 'en' ? 'Publishing...' : 'Menerbitkan...'
                    : language === 'en' ? 'Publish Review' : 'Terbitkan Ulasan'}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  playClick();
                  openAuthModal('signin');
                }}
                className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center gap-2 border border-white/15 transition-all cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {language === 'en'
                    ? 'Sign In to Rate & Review'
                    : 'Masuk Akun untuk Memberikan Rating'}
                </span>
              </button>
            )}
          </div>
        </div>
      </form>

      {/* ── 3. Reviews List with Sort Controls ── */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <span>{language === 'en' ? 'Audience Reviews' : 'Ulasan Penonton'}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono">
              {reviews.length}
            </span>
          </h3>

          {/* Sort Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'newest', labelId: 'Terbaru', labelEn: 'Newest' },
              { id: 'helpful', labelId: 'Paling Membantu', labelEn: 'Most Helpful' },
              { id: 'highest', labelId: 'Skor Tertinggi', labelEn: 'Highest Rating' },
              { id: 'lowest', labelId: 'Skor Terendah', labelEn: 'Lowest Rating' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  playClick();
                  setSortBy(tab.id as any);
                }}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  sortBy === tab.id
                    ? 'bg-white text-black shadow-md'
                    : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {language === 'en' ? tab.labelEn : tab.labelId}
              </button>
            ))}
          </div>
        </div>

        {/* Reviews Cards */}
        {isLoading ? (
          <div className="py-8 text-center text-xs text-slate-500 animate-pulse">
            {language === 'en' ? 'Loading community reviews...' : 'Memuat ulasan komunitas...'}
          </div>
        ) : sortedReviews.length === 0 ? (
          <div className="py-10 text-center rounded-2xl bg-white/[0.02] border border-white/[0.05] p-6 space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-white/5 flex items-center justify-center text-xl text-slate-400">
              💬
            </div>
            <p className="text-sm font-semibold text-slate-300">
              {language === 'en' ? 'No reviews written yet' : 'Belum ada ulasan yang ditulis'}
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {language === 'en'
                ? 'Be the first to share your rating and review for this film or series!'
                : 'Jadilah yang pertama membagikan rating dan ulasan untuk film atau serial ini!'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedReviews.map((rev) => {
              const isSpoilerRevealed = revealedSpoilers[rev.id];
              const isAuthor = user?.id === rev.userId;
              const canDelete = isAuthor || isAdmin;
              const hasVoted = hasVotedHelpful(rev.id);

              return (
                <div
                  key={rev.id}
                  className="p-4 rounded-2xl bg-white/[0.025] hover:bg-white/[0.04] border border-white/[0.06] transition-all space-y-3 shadow-md"
                >
                  {/* Top Bar: User, Date, Rating, Delete */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      {rev.userAvatar ? (
                        <img
                          src={rev.userAvatar}
                          alt={rev.userName}
                          className="w-8 h-8 rounded-full object-cover border border-white/10"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center text-xs font-black text-white shadow-inner">
                          {rev.userName.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">{rev.userName}</span>
                          {rev.userEmail?.toLowerCase() === 'renaldy.maulana.rm@gmail.com' && (
                            <span className="px-1.5 py-0.2 rounded bg-red-600/30 text-red-400 text-[9px] font-black uppercase border border-red-500/40">
                              Admin
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 block">
                          {new Date(rev.createdAt).toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Rating Badge */}
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 font-mono text-xs font-black">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{rev.rating}/10</span>
                      </div>

                      {/* Delete button (Author or Admin) */}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDeleteReview(rev.id)}
                          className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title={language === 'en' ? 'Delete review' : 'Hapus ulasan'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Review Text / Spoiler Card */}
                  {rev.hasSpoilers && !isSpoilerRevealed ? (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-amber-300">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                        <span className="font-semibold">
                          {language === 'en'
                            ? 'Warning: This review contains spoilers'
                            : 'Peringatan: Ulasan ini mengandung bocoran cerita (spoiler)'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleSpoiler(rev.id)}
                        className="px-3 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>{language === 'en' ? 'Reveal' : 'Buka'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {rev.hasSpoilers && (
                        <div className="flex items-center justify-between text-[11px] text-amber-400/80">
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {language === 'en' ? 'Contains spoilers' : 'Mengandung spoiler'}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleSpoiler(rev.id)}
                            className="hover:underline flex items-center gap-1 cursor-pointer text-slate-400"
                          >
                            <EyeOff className="w-3 h-3" />
                            <span>{language === 'en' ? 'Hide spoiler' : 'Tutup kembali'}</span>
                          </button>
                        </div>
                      )}
                      <p className="text-xs sm:text-sm text-slate-200 font-light leading-relaxed whitespace-pre-line">
                        {rev.content}
                      </p>
                    </div>
                  )}

                  {/* Bottom Footer: Helpful Vote */}
                  <div className="flex items-center justify-between pt-1 border-t border-white/[0.04] text-xs">
                    <button
                      type="button"
                      onClick={() => handleToggleHelpful(rev)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                        hasVoted
                          ? 'bg-red-600/20 text-red-400 border border-red-500/30'
                          : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <ThumbsUp className={`w-3.5 h-3.5 ${hasVoted ? 'fill-red-400' : ''}`} />
                      <span>
                        {language === 'en' ? 'Helpful' : 'Membantu'} ({rev.helpfulCount})
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
