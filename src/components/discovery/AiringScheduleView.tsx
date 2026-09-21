import React, { useState, useEffect } from 'react';
import { Calendar, Tv, RefreshCw, Clock, Star, ExternalLink } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useSound } from '../../context/SoundContext';

const TMDB_API_KEY = '4e44d9029b1270a757cddc766a1bcb63';
const DAY_NAMES_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const DAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface AiringShow {
  id: number;
  name: string;
  poster_path: string | null;
  first_air_date: string;
  vote_average: number;
  overview: string;
  genre_ids: number[];
  next_episode_to_air?: {
    air_date: string;
    episode_number: number;
    season_number: number;
    name: string;
  };
}

interface AiringScheduleViewProps {
  onSelectMedia?: (tmdbId: number, title: string) => void;
}

export const AiringScheduleView: React.FC<AiringScheduleViewProps> = ({ onSelectMedia }) => {
  const { language } = useLanguage();
  const { playClick, playHover } = useSound();
  const [shows, setShows] = useState<AiringShow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [page, setPage] = useState(1);

  const today = new Date();
  const dayNames = language === 'en' ? DAY_NAMES_EN : DAY_NAMES_ID;

  // Build a week of dates
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - today.getDay() + i);
    return d;
  });

  const fetchAiring = async (pageNum = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      // TMDB on_the_air returns shows airing in the next 7 days
      const res = await fetch(
        `https://api.themoviedb.org/3/tv/on_the_air?api_key=${TMDB_API_KEY}&language=${language === 'en' ? 'en-US' : 'id-ID'}&page=${pageNum}&region=ID`
      );
      if (!res.ok) throw new Error('TMDB fetch failed');
      const data = await res.json();
      const results: AiringShow[] = data.results || [];
      setShows(pageNum === 1 ? results : (prev) => [...prev, ...results]);
    } catch (err) {
      setError(language === 'en' ? 'Failed to load airing schedule.' : 'Gagal memuat jadwal tayang.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    setShows([]);
    fetchAiring(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const handleLoadMore = () => {
    playClick();
    const nextPage = page + 1;
    setPage(nextPage);
    fetchAiring(nextPage);
  };

  // Filter shows loosely by selected day (air date day of week)
  const filteredShows = shows.filter((show) => {
    if (!show.first_air_date) return true;
    const airDow = new Date(show.first_air_date).getDay();
    return airDow === selectedDay;
  });

  // If no shows match the exact day, show all (TMDB on_the_air doesn't always have perfect day data)
  const displayShows = filteredShows.length > 0 ? filteredShows : shows;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
          <Calendar className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h1 className="text-xl font-display font-bold text-white">
            {language === 'en' ? 'Weekly Airing Schedule' : 'Jadwal Tayang Mingguan'}
          </h1>
          <p className="text-xs text-slate-400">
            {language === 'en' ? 'Anime & series currently airing — powered by TMDB' : 'Anime & series yang sedang tayang — dari TMDB'}
          </p>
        </div>

        <button
          onClick={() => { playClick(); setPage(1); setShows([]); fetchAiring(1); }}
          disabled={isLoading}
          className="ml-auto p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
          title={language === 'en' ? 'Refresh' : 'Segarkan'}
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-violet-400' : ''}`} />
        </button>
      </div>

      {/* Day Selector */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-white/10">
        {weekDays.map((d, i) => {
          const isToday = d.toDateString() === today.toDateString();
          const isSelected = i === selectedDay;
          return (
            <button
              key={i}
              onClick={() => { playClick(); setSelectedDay(i); }}
              onMouseEnter={playHover}
              className={`flex flex-col items-center px-3 py-2.5 rounded-2xl min-w-[56px] transition-all cursor-pointer shrink-0 border ${
                isSelected
                  ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-900/30'
                  : isToday
                  ? 'bg-violet-500/15 border-violet-500/30 text-violet-300 hover:bg-violet-500/25'
                  : 'bg-white/[0.04] border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {dayNames[i].slice(0, 3)}
              </span>
              <span className="text-base font-display font-black mt-0.5">{d.getDate()}</span>
              {isToday && (
                <span className="w-1 h-1 rounded-full bg-violet-300 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Day label */}
      <div className="flex items-center gap-2">
        <Tv className="w-4 h-4 text-violet-400" />
        <span className="text-sm font-semibold text-slate-300">
          {dayNames[selectedDay]}, {weekDays[selectedDay]?.toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', { day: 'numeric', month: 'long' })}
        </span>
        {filteredShows.length === 0 && !isLoading && (
          <span className="text-xs text-slate-500 ml-2">
            ({language === 'en' ? 'Showing all airing shows' : 'Menampilkan semua yang sedang tayang'})
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Show Grid */}
      {isLoading && shows.length === 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-white/[0.04] border border-white/[0.06] overflow-hidden animate-pulse">
              <div className="aspect-[2/3] bg-white/[0.06]" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-white/[0.06] rounded-full w-3/4" />
                <div className="h-2.5 bg-white/[0.04] rounded-full w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {displayShows.map((show) => (
              <button
                key={show.id}
                onClick={() => { playClick(); onSelectMedia?.(show.id, show.name); }}
                onMouseEnter={playHover}
                className="group flex flex-col rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-violet-500/40 hover:bg-violet-500/[0.07] overflow-hidden transition-all cursor-pointer text-left shadow-sm hover:shadow-lg hover:shadow-violet-900/20 active:scale-[0.98]"
              >
                {/* Poster */}
                <div className="relative aspect-[2/3] overflow-hidden bg-white/[0.04]">
                  {show.poster_path ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w300${show.poster_path}`}
                      alt={show.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Tv className="w-8 h-8 text-slate-600" />
                    </div>
                  )}
                  {/* Rating badge */}
                  {show.vote_average > 0 && (
                    <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/70 backdrop-blur-sm text-[9px] font-bold text-amber-300">
                      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                      {show.vote_average.toFixed(1)}
                    </div>
                  )}
                  {/* Airing badge */}
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-violet-600/85 backdrop-blur-sm text-[9px] font-bold text-white">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    {language === 'en' ? 'AIRING' : 'TAYANG'}
                  </div>
                </div>

                {/* Info */}
                <div className="p-2.5 flex-1 flex flex-col">
                  <p className="text-xs font-semibold text-white leading-tight line-clamp-2 mb-1">{show.name}</p>
                  <div className="flex items-center gap-1 text-[9px] text-slate-500 mt-auto">
                    <Clock className="w-2.5 h-2.5" />
                    <span>{show.first_air_date?.slice(0, 4) || '—'}</span>
                    <ExternalLink className="w-2.5 h-2.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Load More */}
          {!isLoading && displayShows.length > 0 && (
            <div className="flex justify-center pt-4">
              <button
                onClick={handleLoadMore}
                disabled={isLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 text-sm font-semibold transition-all cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                {language === 'en' ? 'Load More' : 'Muat Lebih Banyak'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
