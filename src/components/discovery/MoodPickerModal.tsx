import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Shuffle, Sparkles, Star, Play, RefreshCw } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useSound } from '../../context/SoundContext';
import { fetchFullMediaItem } from '../../services/tmdb';
import { translateText } from '../../services/translator';
import { MOCK_CATALOG } from '../../data/mockCatalog';
import type { MediaItem } from '../../types/media';

interface MoodPickerModalProps {
  onClose: () => void;
  onSelectMedia?: (media: MediaItem) => void;
}

const TMDB_API_KEY = '4e44d9029b1270a757cddc766a1bcb63';

interface MoodConfig {
  id: string;
  emoji: string;
  labelId: string;
  labelEn: string;
  color: string;
  endpoint: 'movie' | 'tv';
  withGenres: string;
  extraQuery?: string;
}

const MOODS: MoodConfig[] = [
  {
    id: 'action',
    emoji: '💥',
    labelId: 'Aksi & Thrill',
    labelEn: 'Action & Thrill',
    color: '#ef4444',
    endpoint: 'movie',
    withGenres: '28',
  },
  {
    id: 'romance',
    emoji: '❤️',
    labelId: 'Romantis',
    labelEn: 'Romance',
    color: '#ec4899',
    endpoint: 'movie',
    withGenres: '10749',
  },
  {
    id: 'comedy',
    emoji: '😂',
    labelId: 'Komedi',
    labelEn: 'Comedy',
    color: '#f59e0b',
    endpoint: 'movie',
    withGenres: '35',
  },
  {
    id: 'horror',
    emoji: '👻',
    labelId: 'Horor',
    labelEn: 'Horror',
    color: '#7c3aed',
    endpoint: 'movie',
    withGenres: '27',
  },
  {
    id: 'scifi',
    emoji: '🚀',
    labelId: 'Sci-Fi',
    labelEn: 'Sci-Fi & Fantasy',
    color: '#0ea5e9',
    endpoint: 'movie',
    withGenres: '878',
  },
  {
    id: 'anime',
    emoji: '⚔️',
    labelId: 'Anime',
    labelEn: 'Anime',
    color: '#10b981',
    endpoint: 'tv',
    withGenres: '16',
    extraQuery: '&with_original_language=ja',
  },
  {
    id: 'family',
    emoji: '👨‍👩‍👧',
    labelId: 'Keluarga',
    labelEn: 'Family & Kids',
    color: '#f97316',
    endpoint: 'movie',
    withGenres: '10751',
  },
  {
    id: 'mystery',
    emoji: '🔍',
    labelId: 'Misteri',
    labelEn: 'Mystery & Crime',
    color: '#64748b',
    endpoint: 'movie',
    withGenres: '9648',
  },
];

const WHEEL_SEGMENTS = MOODS.length;
const SEGMENT_ANGLE = 360 / WHEEL_SEGMENTS;

export interface MoodRecommendation {
  tmdbId: number;
  title: string;
  poster: string;
  backdrop: string;
  rating: number;
  year: string;
  synopsis: string;
  mediaType: 'movie' | 'tv';
}

export const MoodPickerModal: React.FC<MoodPickerModalProps> = ({ onClose, onSelectMedia }) => {
  useBodyScrollLock(true);

  const { language } = useLanguage();
  const { playClick, playSuccess, playWhoosh } = useSound();
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [selectedMood, setSelectedMood] = useState<MoodConfig | null>(null);
  const [recommendations, setRecommendations] = useState<MoodRecommendation[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [loadingMediaId, setLoadingMediaId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const totalRotRef = useRef(0);

  // Draw wheel on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const r = cx - 4;

    ctx.clearRect(0, 0, size, size);

    MOODS.forEach((mood, i) => {
      const startAngle = (i * SEGMENT_ANGLE - 90) * (Math.PI / 180);
      const endAngle = ((i + 1) * SEGMENT_ANGLE - 90) * (Math.PI / 180);

      // Segment fill
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = mood.color;
      ctx.fill();
      ctx.strokeStyle = '#0f0e17';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Emoji + label text
      const midAngle = (startAngle + endAngle) / 2;
      const textR = r * 0.65;
      const tx = cx + textR * Math.cos(midAngle);
      const ty = cy + textR * Math.sin(midAngle);

      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(midAngle + Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(mood.emoji, 0, -8);

      ctx.font = 'bold 10px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      const label = language === 'en' ? mood.labelEn.split('&')[0].trim() : mood.labelId.split('&')[0].trim();
      ctx.fillText(label, 0, 8);
      ctx.restore();
    });

    // Center pivot circle
    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.fillStyle = '#0f0e17';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = 'white';
    ctx.fillText('🎲', cx, cy);
  }, [language]);

  // Fetch real diverse recommendations from TMDB for a specific mood
  const fetchMoodRecommendations = useCallback(async (mood: MoodConfig) => {
    setIsLoadingRecs(true);
    setErrorMsg(null);

    try {
      // Pick a random page between 1 and 4 for maximum freshness and variety
      const randomPage = Math.floor(Math.random() * 3) + 1;
      const extra = mood.extraQuery || '';
      let rawList: any[] = [];
      const enMap = new Map<number, any>();

      if (language === 'id') {
        const [resId, resEn] = await Promise.all([
          fetch(
            `https://api.themoviedb.org/3/discover/${mood.endpoint}?api_key=${TMDB_API_KEY}&language=id-ID&with_genres=${mood.withGenres}&vote_count.gte=80&sort_by=popularity.desc&page=${randomPage}${extra}`
          ).catch(() => null),
          fetch(
            `https://api.themoviedb.org/3/discover/${mood.endpoint}?api_key=${TMDB_API_KEY}&language=en-US&with_genres=${mood.withGenres}&vote_count.gte=80&sort_by=popularity.desc&page=${randomPage}${extra}`
          ).catch(() => null),
        ]);

        const dataId = resId && resId.ok ? await resId.json() : null;
        const dataEn = resEn && resEn.ok ? await resEn.json() : null;

        for (const item of dataEn?.results || []) {
          if (item.id) enMap.set(item.id, item);
        }

        rawList = (dataId?.results && dataId.results.length > 0) ? dataId.results : (dataEn?.results || []);
      } else {
        const res = await fetch(
          `https://api.themoviedb.org/3/discover/${mood.endpoint}?api_key=${TMDB_API_KEY}&language=en-US&with_genres=${mood.withGenres}&vote_count.gte=80&sort_by=popularity.desc&page=${randomPage}${extra}`
        );
        if (!res.ok) throw new Error('Failed to fetch from TMDB');
        const data = await res.json();
        rawList = data.results || [];
      }

      // Filter items with valid poster and title
      const validItems = rawList.filter((item) => (item.poster_path || enMap.get(item.id)?.poster_path) && (item.title || item.name || enMap.get(item.id)?.title || enMap.get(item.id)?.name));

      // Shuffle valid items and pick 3 top recommendations
      const shuffled = [...validItems].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 3);

      const mapped: MoodRecommendation[] = await Promise.all(
        selected.map(async (item) => {
          const enItem = enMap.get(item.id);
          const rawSynopsis = (item.overview || '').trim() || (enItem?.overview || '').trim();
          let finalSynopsis = rawSynopsis;

          if (language === 'id' && rawSynopsis && !(item.overview || '').trim()) {
            try {
              const translated = await translateText(rawSynopsis, 'id');
              if (translated && translated.trim()) {
                finalSynopsis = translated.trim();
              }
            } catch {
              finalSynopsis = rawSynopsis;
            }
          }

          return {
            tmdbId: item.id,
            title: item.title || item.name || enItem?.title || enItem?.name || 'Untitled',
            poster: `https://image.tmdb.org/t/p/w500${item.poster_path || enItem?.poster_path}`,
            backdrop: item.backdrop_path
              ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}`
              : enItem?.backdrop_path
              ? `https://image.tmdb.org/t/p/w1280${enItem.backdrop_path}`
              : '',
            rating: item.vote_average ? Number(item.vote_average.toFixed(1)) : 0,
            year: (item.release_date || item.first_air_date || enItem?.release_date || enItem?.first_air_date || '').slice(0, 4),
            synopsis: finalSynopsis || (language === 'en' ? 'No synopsis available.' : 'Sinopsis belum tersedia.'),
            mediaType: mood.endpoint,
          };
        })
      );

      setRecommendations(mapped);
    } catch (err) {
      console.warn('Mood recommendation error:', err);
      setErrorMsg(
        language === 'en'
          ? 'Failed to fetch recommendations. Tap shuffle to try again.'
          : 'Gagal mengambil rekomendasi. Tekan acak untuk coba lagi.'
      );
    } finally {
      setIsLoadingRecs(false);
    }
  }, [language]);

  // Spin the wheel with cubic ease-out animation
  const spin = () => {
    if (isSpinning) return;
    playClick();
    setSelectedMood(null);
    setRecommendations([]);
    setIsSpinning(true);

    const extraSpins = 5 + Math.floor(Math.random() * 4);
    const randomSegment = Math.floor(Math.random() * WHEEL_SEGMENTS);
    const targetAngle = 360 - (randomSegment * SEGMENT_ANGLE + SEGMENT_ANGLE / 2);
    const totalDeg = extraSpins * 360 + ((targetAngle - (totalRotRef.current % 360) + 360) % 360);

    const duration = 3500;
    const startTime = performance.now();
    const startRot = totalRotRef.current;

    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const currentRot = startRot + totalDeg * easeOut(progress);

      totalRotRef.current = currentRot;
      setRotation(currentRot);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        const landed = MOODS[randomSegment];
        setSelectedMood(landed);
        playSuccess();
        fetchMoodRecommendations(landed);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Handle playing a recommendation directly
  const handlePlayRecommendation = async (rec: MoodRecommendation) => {
    playClick();
    setLoadingMediaId(rec.tmdbId);

    try {
      // 1. Check if it already exists in mock catalog
      const localMatch = MOCK_CATALOG.find((m) => m.tmdbId === rec.tmdbId);
      if (localMatch) {
        onSelectMedia?.(localMatch);
        onClose();
        return;
      }

      // 2. Fetch full metadata & servers from TMDB
      const fullItem = await fetchFullMediaItem(rec.tmdbId, rec.mediaType);
      if (fullItem) {
        onSelectMedia?.(fullItem);
        onClose();
        return;
      }
    } catch (err) {
      console.warn('Failed to load recommendation details:', err);
    } finally {
      setLoadingMediaId(null);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200 overscroll-contain"
      onClick={onClose}
    >
      {/* Backdrop touch blocker */}
      <div className="absolute inset-0 touch-none" />
      <div
        className="relative w-full max-w-2xl bg-cinema-950/95 border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            </div>
            <div>
              <h2 className="font-display font-bold text-white text-sm sm:text-base leading-tight">
                {language === 'en' ? 'Mood Picker — Spin & Discover' : 'Mood Picker — Putar & Temukan Film'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {language === 'en' ? 'Tailored real recommendations for your current vibe' : 'Rekomendasi nyata dari TMDB sesuai suasana hatimu'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
            title={language === 'en' ? 'Close' : 'Tutup'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-white/10">
          {/* Wheel Section */}
          <div className="flex flex-col items-center gap-3">
            {/* Arrow Pointer */}
            <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[18px] border-l-transparent border-r-transparent border-t-white filter drop-shadow-lg z-10 -mb-1" />

            {/* Canvas Wheel */}
            <div className="relative">
              <canvas
                ref={canvasRef}
                width={270}
                height={270}
                style={{ transform: `rotate(${rotation}deg)` }}
                className="rounded-full shadow-2xl cursor-pointer select-none transition-none"
                onClick={spin}
              />
            </div>

            {/* Spin Button */}
            <button
              onClick={spin}
              disabled={isSpinning}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-sm transition-all cursor-pointer shadow-xl active:scale-95 ${
                isSpinning
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-400 hover:to-red-400 text-white shadow-amber-900/40'
              }`}
            >
              <Shuffle className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
              <span>
                {isSpinning
                  ? (language === 'en' ? 'Spinning wheel…' : 'Memutar roda…')
                  : selectedMood
                  ? (language === 'en' ? 'Spin Again!' : 'Putar Roda Lagi!')
                  : (language === 'en' ? 'Spin the Wheel!' : 'Putar Roda Sekarang!')}
              </span>
            </button>
          </div>

          {/* Results Section */}
          {selectedMood && (
            <div className="space-y-4 pt-2 border-t border-white/[0.08] animate-in fade-in duration-300">
              {/* Landed Mood Header */}
              <div
                className="flex items-center justify-between p-3.5 rounded-2xl border"
                style={{
                  background: `${selectedMood.color}18`,
                  borderColor: `${selectedMood.color}45`,
                }}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{selectedMood.emoji}</span>
                  <div>
                    <span className="text-xs uppercase tracking-wider font-bold" style={{ color: selectedMood.color }}>
                      {language === 'en' ? 'Mood Selected' : 'Suasana Hati Terpilih'}
                    </span>
                    <h3 className="text-base font-display font-bold text-white leading-tight">
                      {language === 'en' ? selectedMood.labelEn : selectedMood.labelId}
                    </h3>
                  </div>
                </div>

                {/* Reshuffle Picks Button */}
                <button
                  onClick={() => {
                    playWhoosh();
                    fetchMoodRecommendations(selectedMood);
                  }}
                  disabled={isLoadingRecs}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                  title={language === 'en' ? 'Shuffle other picks for this mood' : 'Acak pilihan lain untuk suasana ini'}
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-amber-300 ${isLoadingRecs ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{language === 'en' ? 'Shuffle Picks' : 'Acak Pilihan Lain'}</span>
                </button>
              </div>

              {/* Recommendations List / Grid */}
              {isLoadingRecs ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-3 animate-pulse space-y-2.5">
                      <div className="aspect-[2/3] bg-white/[0.06] rounded-xl" />
                      <div className="h-3.5 bg-white/[0.08] rounded-full w-4/5" />
                      <div className="h-2.5 bg-white/[0.04] rounded-full w-1/2" />
                    </div>
                  ))}
                </div>
              ) : errorMsg ? (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs text-center">
                  {errorMsg}
                </div>
              ) : recommendations.length > 0 ? (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    {language === 'en' ? '3 Curated Recommendations for You:' : '3 Rekomendasi Pilihan untuk Anda:'}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {recommendations.map((rec) => {
                      const isActionLoading = loadingMediaId === rec.tmdbId;

                      return (
                        <div
                          key={rec.tmdbId}
                          className="flex flex-col justify-between rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/20 p-2.5 transition-all duration-200 group"
                        >
                          <div>
                            {/* Poster with badges */}
                            <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-neutral-900 mb-2">
                              <img
                                src={rec.poster}
                                alt={rec.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                loading="lazy"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                              {/* Rating badge */}
                              {rec.rating > 0 && (
                                <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/80 backdrop-blur-sm text-[9.5px] font-bold text-amber-300 border border-white/10">
                                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                  <span>{rec.rating}</span>
                                </div>
                              )}
                              {/* Year badge */}
                              {rec.year && (
                                <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-full bg-black/75 backdrop-blur-sm text-[9px] font-mono text-white border border-white/10">
                                  {rec.year}
                                </div>
                              )}
                            </div>

                            {/* Title & overview */}
                            <h4 className="font-bold text-white text-xs sm:text-sm line-clamp-1 group-hover:text-amber-300 transition-colors">
                              {rec.title}
                            </h4>
                            <p className="text-[10.5px] text-slate-400 line-clamp-2 mt-1 font-light leading-relaxed">
                              {rec.synopsis}
                            </p>
                          </div>

                          {/* Watch Now Button */}
                          <button
                            onClick={() => handlePlayRecommendation(rec)}
                            disabled={isActionLoading}
                            className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#E50914] hover:bg-red-600 active:scale-95 text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-60"
                          >
                            {isActionLoading ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-white text-white" />
                            )}
                            <span>{language === 'en' ? 'Watch Now' : 'Tonton Sekarang'}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {!selectedMood && !isSpinning && (
            <p className="text-center text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              {language === 'en'
                ? 'Spin the wheel to explore real, trending movies & anime from TMDB based on your mood!'
                : 'Putar roda untuk mendapatkan rekomendasi nyata dan beragam dari TMDB sesuai suasana hatimu!'}
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
