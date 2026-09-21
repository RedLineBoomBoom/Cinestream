import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Shuffle, Film, Sparkles } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useSound } from '../../context/SoundContext';
import { MOCK_CATALOG } from '../../data/mockCatalog';
import type { MediaItem } from '../../types/media';

interface MoodPickerModalProps {
  onClose: () => void;
  onSelectMedia?: (media: MediaItem) => void;
}

const MOODS = [
  { id: 'action', emoji: '💥', label: 'Aksi / Action', color: '#ef4444', genres: ['Action', 'Thriller'] },
  { id: 'romance', emoji: '❤️', label: 'Romantis', color: '#ec4899', genres: ['Romance', 'Drama'] },
  { id: 'comedy', emoji: '😂', label: 'Komedi', color: '#f59e0b', genres: ['Comedy'] },
  { id: 'horror', emoji: '👻', label: 'Horor', color: '#7c3aed', genres: ['Horror'] },
  { id: 'scifi', emoji: '🚀', label: 'Sci-Fi', color: '#0ea5e9', genres: ['Sci-Fi', 'Science Fiction'] },
  { id: 'anime', emoji: '⚔️', label: 'Anime', color: '#10b981', genres: ['Anime', 'Animation'] },
  { id: 'family', emoji: '👨‍👩‍👧', label: 'Keluarga', color: '#f97316', genres: ['Family', 'Adventure'] },
  { id: 'documentary', emoji: '🎬', label: 'Dokumenter', color: '#64748b', genres: ['Documentary'] },
] as const;

const WHEEL_SEGMENTS = MOODS.length;
const SEGMENT_ANGLE = 360 / WHEEL_SEGMENTS;

export const MoodPickerModal: React.FC<MoodPickerModalProps> = ({ onClose, onSelectMedia }) => {
  const { language } = useLanguage();
  const { playClick, playSuccess } = useSound();
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [selectedMood, setSelectedMood] = useState<(typeof MOODS)[number] | null>(null);
  const [recommendation, setRecommendation] = useState<MediaItem | null>(null);
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
      ctx.lineWidth = 2;
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
      ctx.font = 'bold 9px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillText(mood.label.split('/')[0].trim(), 0, 8);
      ctx.restore();
    });

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.fillStyle = '#0f0e17';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = 'white';
    ctx.fillText('🎲', cx, cy);
  }, []);

  const spin = () => {
    if (isSpinning) return;
    playClick();
    setSelectedMood(null);
    setRecommendation(null);
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

        // Find recommendation
        const catalog = MOCK_CATALOG;
        const matches = catalog.filter((m) =>
          m.genres?.some((g) => landed.genres.some((lg) => g.toLowerCase().includes(lg.toLowerCase())))
        );
        const pool = matches.length > 0 ? matches : catalog;
        const pick = pool[Math.floor(Math.random() * pool.length)];
        setRecommendation(pick);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-cinema-950/95 border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <h2 className="font-display font-bold text-white text-sm">
              {language === 'en' ? 'Mood Picker — Spin & Discover' : 'Mood Picker — Putar & Temukan'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Wheel */}
          <div className="flex flex-col items-center gap-2">
            {/* Pointer */}
            <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[18px] border-l-transparent border-r-transparent border-t-white filter drop-shadow-md z-10" />

            {/* Canvas wheel */}
            <div className="relative">
              <canvas
                ref={canvasRef}
                width={280}
                height={280}
                style={{ transform: `rotate(${rotation}deg)` }}
                className="rounded-full shadow-2xl cursor-pointer select-none transition-none"
                onClick={spin}
              />
            </div>

            <button
              onClick={spin}
              disabled={isSpinning}
              className={`flex items-center gap-2 px-5 py-2 rounded-full font-bold text-sm transition-all cursor-pointer shadow-lg active:scale-95 ${
                isSpinning
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-amber-900/30'
              }`}
            >
              <Shuffle className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
              {isSpinning
                ? (language === 'en' ? 'Spinning…' : 'Berputar…')
                : (language === 'en' ? 'Spin the Wheel!' : 'Putar Roda!')}
            </button>
          </div>

          {/* Result */}
          {selectedMood && recommendation && (
            <div
              className="rounded-2xl overflow-hidden border animate-in fade-in slide-in-from-bottom-4 duration-300"
              style={{ borderColor: selectedMood.color + '60' }}
            >
              <div
                className="px-4 py-2 flex items-center gap-2"
                style={{ background: selectedMood.color + '25' }}
              >
                <span className="text-lg">{selectedMood.emoji}</span>
                <span className="text-sm font-bold text-white">{selectedMood.label}</span>
              </div>

              <div className="flex gap-3 p-3 bg-white/[0.03]">
                {recommendation.poster && (
                  <img
                    src={recommendation.poster}
                    alt={recommendation.title}
                    className="w-14 h-20 object-cover rounded-xl shrink-0 shadow-lg"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                <div className="flex flex-col justify-between min-w-0 py-0.5">
                  <div>
                    <p className="font-bold text-white text-sm leading-tight truncate">{recommendation.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{recommendation.synopsis}</p>
                  </div>
                  <button
                    onClick={() => {
                      playClick();
                      onSelectMedia?.(recommendation);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-xl bg-[#E50914] hover:bg-red-600 text-white text-xs font-bold transition-all cursor-pointer shadow-md self-start"
                  >
                    <Film className="w-3 h-3" />
                    {language === 'en' ? 'Watch Now' : 'Tonton Sekarang'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {!selectedMood && !isSpinning && (
            <p className="text-center text-xs text-slate-500">
              {language === 'en'
                ? 'Spin to get a random movie/series recommendation based on your mood!'
                : 'Putar roda untuk mendapatkan rekomendasi film/series acak berdasarkan suasana hatimu!'}
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
