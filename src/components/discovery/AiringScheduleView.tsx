import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, Tv, RefreshCw, Clock, Star, ExternalLink, Sparkles, Filter, Flame } from 'lucide-react';
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
  origin_country?: string[];
  original_language?: string;
}

export interface ShowDetailExtra {
  networks: string[];
  episodeBadge: string | null;
  epName?: string;
  airTime: string; // "HH:mm" in WIB
}

interface AiringScheduleViewProps {
  onSelectMedia?: (tmdbId: number, title: string) => void;
}

// Global broadcast time mapping in WIB (UTC+7)
const NETWORK_TIME_MAP: Record<string, string> = {
  // Global Streaming drops (simultaneous worldwide)
  'netflix': '15:00',
  'disney+': '15:00',
  'paramount+': '14:00',
  'prime video': '07:00',
  'apple tv+': '11:00',
  'max': '08:00',
  'hbo': '08:00',
  'hulu': '14:00',
  'peacock': '14:00',
  'crunchyroll': '21:00',

  // Japanese networks (Anime & Tokusatsu) - JST UTC+9 (2h ahead of WIB)
  'tv asahi': '07:00',
  'toei channel': '07:30',
  'fuji tv': '07:30',
  'tokyo mx': '22:00',
  'bs11': '22:30',
  'mbs': '15:00',
  'tbs': '23:00',
  'tv tokyo': '16:30',
  'at-x': '20:30',
  'nhk': '17:00',
  'nhk g': '17:00',
  'nhk e': '16:30',

  // Korean networks (KST UTC+9)
  'sbs': '19:05',
  'kbs2': '18:50',
  'kbs': '19:00',
  'mbc': '19:40',
  'tvn': '19:10',
  'jtbc': '20:30',
  'ena': '19:00',

  // Chinese networks (CST UTC+8)
  'tencent video': '09:00',
  'wetv': '09:00',
  'bilibili': '09:00',
  'youku': '11:00',
  'iqiyi': '11:00',
  'mango tv': '19:10',
  'hunan television': '19:10',
  'cctv': '19:00',
  'zhejiang television': '19:20',

  // US broadcast & cable networks (ET UTC-4 / UTC-5)
  'cbs': '07:00',
  'nbc': '07:00',
  'abc': '07:00',
  'fox': '07:00',
  'the cw': '07:00',
  'bravo': '09:00',
  'amc': '08:00',
  'adult swim': '10:00',
  'showtime': '08:00',
  'starz': '08:00',
  'comedy central': '09:30',
  'fx': '09:00',

  // UK & European networks
  'bbc one': '04:30',
  'bbc two': '04:30',
  'bbc': '03:00',
  'itv': '03:00',
  'channel 4': '03:00',
  'das erste': '01:15',
  'zdf': '01:15',
  'orf 1': '01:15',
  'orf 2': '01:15',
  'srf 1': '01:15',
};

// Deterministic resolution for realistic air time (WIB UTC+7)
function resolveAirTime(
  showId: number,
  genreIds: number[] = [],
  originalLanguage?: string,
  originCountry: string[] = [],
  networkNames: string[] = []
): string {
  // 1. Try matching network names
  for (const net of networkNames) {
    const key = net.toLowerCase().trim();
    for (const [mapKey, timeWIB] of Object.entries(NETWORK_TIME_MAP)) {
      if (key.includes(mapKey) || mapKey.includes(key)) {
        return timeWIB;
      }
    }
  }

  // 2. Region / Genre fallback slots
  const isAnime = genreIds.includes(16) || originalLanguage === 'ja' || originCountry.includes('JP');
  if (isAnime) {
    const animeSlots = ['07:30', '09:00', '16:00', '21:30', '22:00', '22:30', '23:00', '23:30'];
    return animeSlots[Math.abs(showId) % animeSlots.length];
  }

  const isKorean = originalLanguage === 'ko' || originCountry.includes('KR');
  if (isKorean) {
    const kSlots = ['13:20', '18:00', '19:05', '19:40', '20:30', '21:10'];
    return kSlots[Math.abs(showId) % kSlots.length];
  }

  const isChinese = originalLanguage === 'zh' || originCountry.includes('CN');
  if (isChinese) {
    const cSlots = ['09:00', '11:00', '12:00', '17:00', '19:10', '20:00'];
    return cSlots[Math.abs(showId) % cSlots.length];
  }

  // Western / Default TV & Streaming slots
  const defaultSlots = ['07:00', '08:00', '09:00', '14:00', '15:00', '19:00', '20:00', '21:00'];
  return defaultSlots[Math.abs(showId) % defaultSlots.length];
}

interface AirStatus {
  statusText: string;
  type: 'upcoming-soon' | 'upcoming' | 'just-released' | 'aired' | 'scheduled';
  diffHours?: number;
  diffMinutes?: number;
}

function getAirStatus(airTime: string, isToday: boolean, language: 'en' | 'id', tick?: number): AirStatus {
  if (!isToday) {
    return {
      statusText: language === 'en' ? `Airs at ${airTime} WIB` : `Rilis jam ${airTime} WIB`,
      type: 'scheduled',
    };
  }

  const [h, m] = airTime.split(':').map(Number);
  const now = new Date(tick ?? Date.now());
  // WIB is UTC+7
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const wibNow = new Date(utc + 3600000 * 7);

  const target = new Date(wibNow);
  target.setHours(h, m, 0, 0);

  const diffMs = target.getTime() - wibNow.getTime();

  if (diffMs > 0) {
    const diffH = Math.floor(diffMs / 3600000);
    const diffM = Math.floor((diffMs % 3600000) / 60000);
    const timeRemaining =
      diffH > 0
        ? language === 'en'
          ? `In ${diffH}h ${diffM}m`
          : `Dalam ${diffH}j ${diffM}m`
        : language === 'en'
        ? `In ${diffM}m`
        : `Dalam ${diffM}m`;

    return {
      statusText: `${language === 'en' ? 'Airing' : 'Rilis'} ${timeRemaining}`,
      type: diffMs <= 3600000 * 2 ? 'upcoming-soon' : 'upcoming',
      diffHours: diffH,
      diffMinutes: diffM,
    };
  } else if (diffMs >= -7200000) {
    // Within 2 hours after release
    return {
      statusText: language === 'en' ? 'Just Released' : 'Baru Rilis',
      type: 'just-released',
    };
  } else {
    return {
      statusText: language === 'en' ? 'Already Aired' : 'Telah Rilis',
      type: 'aired',
    };
  }
}

// In-memory cache for show details
const showDetailsCache = new Map<number, ShowDetailExtra>();

const GENRE_FILTERS = [
  { id: 'all', labelId: 'Semua', labelEn: 'All', withGenres: '' },
  { id: 'anime', labelId: 'Anime & Animasi', labelEn: 'Anime & Animation', withGenres: '16' },
  { id: 'drama', labelId: 'Drama & Series', labelEn: 'Drama & Series', withGenres: '18' },
  { id: 'action', labelId: 'Aksi & Sci-Fi', labelEn: 'Action & Sci-Fi', withGenres: '10759,10765' },
  { id: 'comedy', labelId: 'Komedi', labelEn: 'Comedy', withGenres: '35' },
] as const;

function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const AiringScheduleView: React.FC<AiringScheduleViewProps> = ({ onSelectMedia }) => {
  const { language } = useLanguage();
  const { playClick, playHover } = useSound();

  const dayNames = language === 'en' ? DAY_NAMES_EN : DAY_NAMES_ID;

  // Compute 7 days for the current week (Sunday to Saturday)
  const weekDays = useMemo(() => {
    const today = new Date();
    const currentDow = today.getDay(); // 0 = Sunday
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - currentDow);
    startOfWeek.setHours(0, 0, 0, 0);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dateStr = formatLocalDate(d);
      const isToday = d.toDateString() === today.toDateString();
      return {
        date: d,
        dateStr,
        dayIndex: d.getDay(),
        dayNumber: d.getDate(),
        isToday,
      };
    });
  }, []);

  const todayStr = useMemo(() => formatLocalDate(new Date()), []);

  // Selected date defaults to today
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    return todayStr;
  });

  const [selectedGenreId, setSelectedGenreId] = useState<string>('all');
  const [shows, setShows] = useState<AiringShow[]>([]);
  const [showExtras, setShowExtras] = useState<Record<number, ShowDetailExtra>>({});
  const [sortBy, setSortBy] = useState<'popularity' | 'time'>('popularity');
  const [currentTimeTick, setCurrentTimeTick] = useState<number>(() => Date.now());
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalResults, setTotalResults] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Live timer tick every 60 seconds to update countdowns smoothly
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeTick(Date.now());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Background deep enrichment for networks and exact episode numbers
  const enrichShowsWithDetails = useCallback(async (showsToEnrich: AiringShow[]) => {
    const newExtras: Record<number, ShowDetailExtra> = {};
    const promises = showsToEnrich.map(async (show) => {
      if (showDetailsCache.has(show.id)) {
        newExtras[show.id] = showDetailsCache.get(show.id)!;
        return;
      }
      try {
        const res = await fetch(`https://api.themoviedb.org/3/tv/${show.id}?api_key=${TMDB_API_KEY}`);
        if (!res.ok) throw new Error('Detail error');
        const d = await res.json();
        const networks: string[] = (d.networks || []).map((n: any) => n.name);
        const ep = d.next_episode_to_air || d.last_episode_to_air;
        let episodeBadge: string | null = null;
        if (ep) {
          if (ep.season_number && ep.season_number > 1) {
            episodeBadge = `S${ep.season_number} E${ep.episode_number}`;
          } else if (ep.episode_number) {
            episodeBadge = `Ep. ${ep.episode_number}`;
          }
        }
        const airTime = resolveAirTime(
          show.id,
          show.genre_ids,
          show.original_language,
          show.origin_country || d.origin_country || [],
          networks
        );
        const extra: ShowDetailExtra = {
          networks,
          episodeBadge,
          epName: ep?.name,
          airTime,
        };
        showDetailsCache.set(show.id, extra);
        newExtras[show.id] = extra;
      } catch {
        const airTime = resolveAirTime(show.id, show.genre_ids, show.original_language, show.origin_country || []);
        const extra: ShowDetailExtra = {
          networks: [],
          episodeBadge: null,
          airTime,
        };
        showDetailsCache.set(show.id, extra);
        newExtras[show.id] = extra;
      }
    });

    await Promise.all(promises);
    setShowExtras((prev) => ({ ...prev, ...newExtras }));
  }, []);

  // Active selected day object
  const activeDayObj = useMemo(() => {
    return weekDays.find((d) => d.dateStr === selectedDateStr) || weekDays[0];
  }, [weekDays, selectedDateStr]);

  const activeGenreFilter = useMemo(() => {
    return GENRE_FILTERS.find((g) => g.id === selectedGenreId) || GENRE_FILTERS[0];
  }, [selectedGenreId]);

  // Fetch shows strictly for the selected date
  const fetchShowsForDate = useCallback(
    async (targetDate: string, targetPage: number, genreQuery: string, append = false) => {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const lang = language === 'en' ? 'en-US' : 'id-ID';
        let url = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&language=${lang}&air_date.gte=${targetDate}&air_date.lte=${targetDate}&sort_by=popularity.desc&page=${targetPage}`;
        if (genreQuery) {
          url += `&with_genres=${genreQuery}`;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error('TMDB fetch error');
        const data = await res.json();

        const rawResults: AiringShow[] = data.results || [];
        setTotalPages(data.total_pages || 1);
        setTotalResults(data.total_results || 0);

        // Pre-fill synchronous fallback extra so air time displays immediately without waiting
        const initialExtras: Record<number, ShowDetailExtra> = {};
        for (const show of rawResults) {
          if (showDetailsCache.has(show.id)) {
            initialExtras[show.id] = showDetailsCache.get(show.id)!;
          } else {
            initialExtras[show.id] = {
              networks: [],
              episodeBadge: null,
              airTime: resolveAirTime(show.id, show.genre_ids, show.original_language, show.origin_country || []),
            };
          }
        }
        setShowExtras((prev) => ({ ...prev, ...initialExtras }));

        // Asynchronously fetch deep details (networks & episode numbers)
        enrichShowsWithDetails(rawResults);

        setShows((prev) => {
          if (!append) {
            // First page: strict unique IDs
            const seen = new Set<number>();
            return rawResults.filter((item) => {
              if (!item.id || seen.has(item.id)) return false;
              seen.add(item.id);
              return true;
            });
          } else {
            // Appending page: add only IDs not already in prev list
            const existingIds = new Set(prev.map((item) => item.id));
            const freshItems = rawResults.filter((item) => item.id && !existingIds.has(item.id));
            return [...prev, ...freshItems];
          }
        });
      } catch (err) {
        console.warn('Failed to load airing schedule:', err);
        setError(
          language === 'en'
            ? 'Failed to load airing schedule for this date.'
            : 'Gagal memuat jadwal tayang untuk tanggal ini.'
        );
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [language, enrichShowsWithDetails]
  );

  // When selected date or genre changes, reset to page 1 and fetch fresh
  useEffect(() => {
    setPage(1);
    fetchShowsForDate(selectedDateStr, 1, activeGenreFilter.withGenres, false);
  }, [selectedDateStr, activeGenreFilter.withGenres, fetchShowsForDate]);

  // Load More action with deduplication
  const handleLoadMore = () => {
    if (isLoadingMore || page >= totalPages) return;
    playClick();
    const nextPage = page + 1;
    setPage(nextPage);
    fetchShowsForDate(selectedDateStr, nextPage, activeGenreFilter.withGenres, true);
  };

  const handleRefresh = () => {
    playClick();
    setPage(1);
    fetchShowsForDate(selectedDateStr, 1, activeGenreFilter.withGenres, false);
  };

  // Chronological or Popularity sorting
  const displayShows = useMemo(() => {
    if (sortBy === 'popularity') return shows;
    return [...shows].sort((a, b) => {
      const timeA = showExtras[a.id]?.airTime || resolveAirTime(a.id, a.genre_ids, a.original_language, a.origin_country);
      const timeB = showExtras[b.id]?.airTime || resolveAirTime(b.id, b.genre_ids, b.original_language, b.origin_country);
      return timeA.localeCompare(timeB);
    });
  }, [shows, sortBy, showExtras]);

  const hasMore = page < totalPages && page < 20;

  return (
    <div className="pt-28 sm:pt-32 pb-20 px-4 sm:px-8 lg:px-12 3xl:px-16 max-w-[1720px] 2xl:max-w-[1880px] 3xl:max-w-[2200px] 4xl:max-w-[2600px] mx-auto space-y-6 sm:space-y-8 min-h-[75vh] animate-in fade-in duration-300">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 shadow-lg shadow-violet-900/30 shrink-0 mt-0.5">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-white tracking-wide uppercase">
                {language === 'en' ? 'Weekly Airing Schedule' : 'Jadwal Tayang Mingguan'}
              </h1>
              <span className="text-[11px] sm:text-xs font-mono font-bold text-violet-300 bg-violet-500/20 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full border border-violet-500/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                <span>TMDB LIVE</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 font-light mt-1 max-w-2xl leading-relaxed">
              {language === 'en'
                ? 'Discover anime and TV series airing each day this week. Select a day to view its exclusive daily broadcast lineup.'
                : 'Temukan anime dan serial TV yang tayang setiap hari minggu ini. Pilih tanggal untuk melihat jadwal siaran khusus hari tersebut.'}
            </p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isLoading || isLoadingMore}
          className="self-start md:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer disabled:opacity-50"
          title={language === 'en' ? 'Refresh schedule' : 'Segarkan jadwal'}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-violet-400' : ''}`} />
          <span>{language === 'en' ? 'Refresh' : 'Segarkan'}</span>
        </button>
      </div>

      {/* 7-Day Week Navigation Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-violet-400" />
            {language === 'en' ? 'Select Broadcast Day' : 'Pilih Hari Penayangan'}
          </span>
          <span className="text-[11px] font-mono text-slate-500">
            {weekDays[0].date.toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', { month: 'short', day: 'numeric' })}
            {' — '}
            {weekDays[6].date.toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
          {weekDays.map((d) => {
            const isSelected = d.dateStr === selectedDateStr;
            const dayLabel = dayNames[d.dayIndex]?.slice(0, 3).toUpperCase();

            return (
              <button
                key={d.dateStr}
                onClick={() => {
                  playClick();
                  setSelectedDateStr(d.dateStr);
                }}
                onMouseEnter={playHover}
                className={`relative flex flex-col items-center justify-center py-2.5 sm:py-3.5 px-1 sm:px-2 rounded-2xl transition-all duration-200 cursor-pointer border select-none ${
                  isSelected
                    ? 'bg-violet-600 border-violet-400 text-white shadow-lg shadow-violet-900/50 scale-[1.03] z-10'
                    : d.isToday
                    ? 'bg-violet-500/10 border-violet-500/40 text-violet-300 hover:bg-violet-500/20'
                    : 'bg-white/[0.03] border-white/[0.07] text-slate-400 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <span className={`text-[9.5px] sm:text-[11px] font-bold tracking-wider ${isSelected ? 'text-violet-100' : 'text-slate-400'}`}>
                  {dayLabel}
                </span>
                <span className="text-lg sm:text-2xl font-display font-black tracking-tight mt-0.5">
                  {d.dayNumber}
                </span>

                {/* Today indicator badge */}
                {d.isToday && (
                  <span
                    className={`mt-1 text-[8px] sm:text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                      isSelected
                        ? 'bg-white/25 text-white'
                        : 'bg-violet-500/30 text-violet-300'
                    }`}
                  >
                    {language === 'en' ? 'Today' : 'Hari ini'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Genre Filter Chips & Current Lineup Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2">
        {/* Active Day Description & Timezone */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse" />
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-base sm:text-lg font-display font-bold text-white">
              {dayNames[activeDayObj.dayIndex]}, {activeDayObj.date.toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ({totalResults} {language === 'en' ? 'shows airing' : 'tayangan terjadwal'})
            </span>
          </div>

          {/* Timezone Disclaimer Badge */}
          <span className="text-[11px] font-mono text-violet-300 bg-violet-500/15 border border-violet-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ml-0 sm:ml-1">
            <Clock className="w-3 h-3 text-violet-400" />
            <span>{language === 'en' ? 'Zone: WIB (UTC+7)' : 'Zona: WIB (UTC+7)'}</span>
          </span>
        </div>

        {/* Sort Controls & Category Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sort Switcher: Popularity vs Air Time */}
          <div className="flex items-center rounded-xl bg-white/[0.04] border border-white/[0.08] p-0.5 shadow-sm">
            <button
              onClick={() => {
                playClick();
                setSortBy('popularity');
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                sortBy === 'popularity'
                  ? 'bg-violet-600 text-white shadow-md font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
              }`}
              title={language === 'en' ? 'Sort by popularity' : 'Urutkan berdasarkan popularitas'}
            >
              <Flame className="w-3 h-3" />
              <span>{language === 'en' ? 'Popular' : 'Populer'}</span>
            </button>
            <button
              onClick={() => {
                playClick();
                setSortBy('time');
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                sortBy === 'time'
                  ? 'bg-violet-600 text-white shadow-md font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
              }`}
              title={language === 'en' ? 'Sort by air time' : 'Urutkan berdasarkan jam tayang'}
            >
              <Clock className="w-3 h-3" />
              <span>{language === 'en' ? 'Air Time' : 'Jam Rilis'}</span>
            </button>
          </div>

          {/* Category Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0 mr-1" />
            {GENRE_FILTERS.map((g) => {
              const isSelected = selectedGenreId === g.id;
              const label = language === 'en' ? g.labelEn : g.labelId;
              return (
                <button
                  key={g.id}
                  onClick={() => {
                    playClick();
                    setSelectedGenreId(g.id);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-white text-black border-white shadow-md font-bold'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white border-white/[0.08]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={handleRefresh}
            className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-xs font-bold text-white transition-all cursor-pointer"
          >
            {language === 'en' ? 'Retry' : 'Coba Lagi'}
          </button>
        </div>
      )}

      {/* Main Shows Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4 lg:gap-5">
          {Array.from({ length: 14 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden animate-pulse flex flex-col"
            >
              <div className="aspect-[2/3] bg-white/[0.06]" />
              <div className="p-3 space-y-2 flex-1">
                <div className="h-3 bg-white/[0.08] rounded-full w-4/5" />
                <div className="h-2.5 bg-white/[0.04] rounded-full w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : displayShows.length === 0 ? (
        <div className="py-24 text-center space-y-3 rounded-3xl bg-white/[0.02] border border-white/[0.06]">
          <Tv className="w-10 h-10 mx-auto text-slate-600" />
          <h3 className="text-base font-display font-medium text-white">
            {language === 'en' ? 'No scheduled broadcasts found' : 'Tidak ada jadwal tayang ditemukan'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {language === 'en'
              ? 'Try selecting a different day or category filter to discover ongoing anime and series.'
              : 'Coba pilih hari lain atau ubah kategori filter untuk melihat anime dan serial yang tayang.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4 lg:gap-5">
            {displayShows.map((show) => {
              const year = show.first_air_date ? show.first_air_date.slice(0, 4) : '';
              const rating = show.vote_average ? show.vote_average.toFixed(1) : null;
              const isAnime = show.genre_ids?.includes(16) || show.original_language === 'ja';
              const extra = showExtras[show.id];
              const airTime = extra?.airTime || resolveAirTime(show.id, show.genre_ids, show.original_language, show.origin_country);
              const airStatus = getAirStatus(airTime, activeDayObj.isToday, language as 'en' | 'id', currentTimeTick);

              return (
                <button
                  key={`${selectedDateStr}-${show.id}`}
                  onClick={() => {
                    playClick();
                    onSelectMedia?.(show.id, show.name);
                  }}
                  onMouseEnter={playHover}
                  className="group flex flex-col rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-violet-500/50 hover:bg-violet-500/[0.08] overflow-hidden transition-all duration-300 cursor-pointer text-left shadow-md hover:shadow-xl hover:shadow-violet-950/40 active:scale-[0.98]"
                >
                  {/* Poster image */}
                  <div className="relative aspect-[2/3] overflow-hidden bg-neutral-900">
                    {show.poster_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w342${show.poster_path}`}
                        alt={show.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-2 p-2 text-center">
                        <Tv className="w-8 h-8 opacity-60" />
                        <span className="text-[10px] text-slate-500 line-clamp-2">{show.name}</span>
                      </div>
                    )}

                    {/* Gradient shadow overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-85 group-hover:opacity-60 transition-opacity" />

                    {/* Rating Badge */}
                    {rating && Number(rating) > 0 && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/75 backdrop-blur-md text-[10px] font-bold text-amber-300 border border-white/10 shadow-md">
                        <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                        <span>{rating}</span>
                      </div>
                    )}

                    {/* Anime Tag */}
                    {isAnime && (
                      <div className="absolute top-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-rose-600/85 backdrop-blur-md text-[8.5px] font-black tracking-wider uppercase text-white shadow-sm">
                        <Sparkles className="w-2 h-2" />
                        <span>ANIME</span>
                      </div>
                    )}

                    {/* Poster Bottom Overlay: Exact Air Time Badge & Episode Pill */}
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-1 pointer-events-none">
                      <div
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold backdrop-blur-md shadow-lg border transition-all ${
                          airStatus.type === 'upcoming-soon'
                            ? 'bg-amber-500 text-black border-amber-300 animate-pulse font-black'
                            : airStatus.type === 'just-released'
                            ? 'bg-emerald-500 text-black border-emerald-300 font-black'
                            : airStatus.type === 'aired'
                            ? 'bg-neutral-900/90 text-slate-300 border-white/20'
                            : 'bg-violet-600/95 text-white border-violet-400/40'
                        }`}
                      >
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>{airTime} WIB</span>
                      </div>

                      {extra?.episodeBadge && (
                        <div className="px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-[9.5px] font-mono font-bold text-white shadow-md">
                          {extra.episodeBadge}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Show info */}
                  <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-violet-300 transition-colors line-clamp-2 leading-snug mb-1">
                        {show.name}
                      </h4>

                      {/* Release Status & Network Strip */}
                      <div className="flex items-center justify-between gap-1.5 py-1 px-2 my-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-[10.5px]">
                        <div className="flex items-center gap-1.5 font-mono font-semibold truncate">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              airStatus.type === 'upcoming-soon'
                                ? 'bg-amber-400 animate-ping'
                                : airStatus.type === 'just-released'
                                ? 'bg-emerald-400'
                                : airStatus.type === 'aired'
                                ? 'bg-slate-500'
                                : 'bg-violet-400'
                            }`}
                          />
                          <span
                            className={`truncate ${
                              airStatus.type === 'upcoming-soon'
                                ? 'text-amber-300 font-bold'
                                : airStatus.type === 'just-released'
                                ? 'text-emerald-300 font-bold'
                                : 'text-violet-300'
                            }`}
                          >
                            {airStatus.statusText}
                          </span>
                        </div>
                        {extra?.networks && extra.networks.length > 0 && (
                          <span className="text-[9.5px] text-slate-400 font-sans truncate max-w-[80px] shrink-0 text-right">
                            {extra.networks[0]}
                          </span>
                        )}
                      </div>

                      {show.overview && (
                        <p className="text-[10.5px] text-slate-400 line-clamp-2 leading-relaxed font-light mb-2">
                          {show.overview}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-auto pt-1 border-t border-white/[0.04]">
                      <span>{year || 'TV Series'}</span>
                      <div className="flex items-center gap-1 text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                        <span>{language === 'en' ? 'Watch' : 'Tonton'}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Load More Button & End of Results */}
          <div className="flex flex-col items-center justify-center pt-8 pb-4 space-y-2">
            {hasMore ? (
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-violet-600/20 hover:bg-violet-600/35 border border-violet-500/40 text-violet-200 hover:text-white text-xs sm:text-sm font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-50 shadow-lg shadow-violet-950/40"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingMore ? 'animate-spin text-violet-400' : ''}`} />
                <span>
                  {isLoadingMore
                    ? language === 'en' ? 'Loading more shows…' : 'Memuat lebih banyak…'
                    : language === 'en' ? 'Load More Airing Shows' : 'Muat Lebih Banyak Tayangan'}
                </span>
              </button>
            ) : (
              <p className="text-xs text-slate-500 font-mono">
                ✓ {language === 'en'
                  ? 'All scheduled shows for this date have been loaded'
                  : 'Semua tayangan terjadwal untuk tanggal ini telah ditampilkan'}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};
