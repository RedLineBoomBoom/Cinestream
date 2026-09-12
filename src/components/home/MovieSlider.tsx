import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { MediaItem } from '../../types/media';
import { MovieCard } from './MovieCard';
import { useSound } from '../../context/SoundContext';

interface MovieSliderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  items: MediaItem[];
  onPlay: (media: MediaItem) => void;
  onOpenDetails: (media: MediaItem) => void;
  onViewAll?: () => void;
}

export const MovieSlider: React.FC<MovieSliderProps> = ({
  title,
  subtitle,
  icon,
  items,
  onPlay,
  onOpenDetails,
  onViewAll,
}) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const { playClick, playHover } = useSound();

  const scroll = (direction: 'left' | 'right') => {
    playClick();
    if (!sliderRef.current) return;
    const { scrollLeft, clientWidth } = sliderRef.current;
    const scrollAmount = clientWidth * 0.75;
    sliderRef.current.scrollTo({
      left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
      behavior: 'smooth',
    });
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="relative my-8 sm:my-12 px-5 sm:px-10 max-w-[1600px] mx-auto">
      {/* Slider Section Header */}
      <div className="flex items-end justify-between gap-4 mb-4 sm:mb-6 border-b border-white/[0.05] pb-3">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-brand-champagne">
              {icon}
            </div>
          )}
          <div>
            <h3 className="text-base sm:text-xl font-display font-medium text-white tracking-[0.1em] uppercase">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-slate-400 font-light mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Action Controls & Navigation Arrows */}
        <div className="flex items-center gap-2">
          {onViewAll && (
            <button
              onClick={() => {
                playClick();
                onViewAll();
              }}
              onMouseEnter={playHover}
              className="text-xs font-medium tracking-wider uppercase text-brand-champagne hover:text-white transition-colors mr-3 hidden sm:inline-block"
            >
              Lihat Katalog &rarr;
            </button>
          )}

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => scroll('left')}
              onMouseEnter={playHover}
              aria-label="Scroll Kiri"
              className="p-2 rounded-full bg-white/[0.03] hover:bg-brand-gold hover:text-cinema-950 border border-white/[0.08] hover:border-brand-gold text-slate-400 transition-all active:scale-95"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => scroll('right')}
              onMouseEnter={playHover}
              aria-label="Scroll Kanan"
              className="p-2 rounded-full bg-white/[0.03] hover:bg-brand-gold hover:text-cinema-950 border border-white/[0.08] hover:border-brand-gold text-slate-400 transition-all active:scale-95"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Cards Slider Track */}
      <div
        ref={sliderRef}
        className="flex items-stretch gap-4 sm:gap-5 overflow-x-auto no-scrollbar scroll-smooth pb-2 pt-1"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="flex-shrink-0 w-38 sm:w-48 md:w-56"
            style={{ scrollSnapAlign: 'start' }}
          >
            <MovieCard
              media={item}
              onPlay={onPlay}
              onOpenDetails={onOpenDetails}
            />
          </div>
        ))}
      </div>
    </section>
  );
};
