import React, { useState, useMemo } from 'react';
import {
  History as HistoryIcon,
  Play,
  Trash2,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  Tv,
} from 'lucide-react';
import type { MediaItem, WatchHistoryItem } from '../../types/media';
import { useWatchlist } from '../../context/WatchlistContext';
import { useSound } from '../../context/SoundContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  formatRemainingTime,
  formatRelativeDate,
  formatGenre,
  getMediaTitle,
  getMediaPoster,
  getMediaBackdrop,
} from '../../utils/formatters';

interface HistoryViewProps {
  onPlayMedia: (media: MediaItem, resumeTime?: number, episodeId?: string) => void;
  onOpenDetails: (media: MediaItem) => void;
  onGoHome: () => void;
}

interface GroupedHistoryItem {
  type: 'movie' | 'series';
  mediaId: string;
  media: MediaItem;
  movieItem?: WatchHistoryItem;
  episodes: WatchHistoryItem[];
  latestItem: WatchHistoryItem;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  onPlayMedia,
  onOpenDetails,
  onGoHome,
}) => {
  const { historyItems, removeHistoryItem, clearAllHistory, toggleCompleted } = useWatchlist();
  const { playClick, playHover, playWhoosh } = useSound();
  const { t, language } = useLanguage();

  // Watch History only displays titles/episodes currently in progress
  const inProgressItems = historyItems.filter((h) => !h.completed && Boolean(h.media || h.mediaId));

  const [filter, setFilter] = useState<'all' | 'movie' | 'series'>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [expandedSeries, setExpandedSeries] = useState<Record<string, boolean>>({});

  const toggleSeriesDropdown = (mediaId: string) => {
    playClick();
    setExpandedSeries((prev) => ({
      ...prev,
      [mediaId]: !prev[mediaId],
    }));
  };

  // Group items by series so multiple episodes don't clutter into endless scroll cards
  const groupedItems = useMemo<GroupedHistoryItem[]>(() => {
    const map = new Map<string, GroupedHistoryItem>();

    for (const item of inProgressItems) {
      const isSeries = (item.media?.type !== 'movie') || Boolean(item.episodeId || item.episodeNumber);
      const key = isSeries ? `series_${item.mediaId}` : `movie_${item.mediaId}`;

      const existing = map.get(key);
      if (existing) {
        existing.episodes.push(item);
        if (item.lastWatched > existing.latestItem.lastWatched) {
          existing.latestItem = item;
        }
      } else {
        map.set(key, {
          type: isSeries ? 'series' : 'movie',
          mediaId: item.mediaId,
          media: item.media,
          movieItem: isSeries ? undefined : item,
          episodes: isSeries ? [item] : [],
          latestItem: item,
        });
      }
    }

    // Sort episodes in each series group by seasonNumber and episodeNumber ascending
    map.forEach((grp) => {
      if (grp.type === 'series') {
        grp.episodes.sort((a, b) => {
          const sA = a.seasonNumber ?? 1;
          const sB = b.seasonNumber ?? 1;
          if (sA !== sB) return sA - sB;
          const eA = a.episodeNumber ?? 1;
          const eB = b.episodeNumber ?? 1;
          return eA - eB;
        });
      }
    });

    // Sort all groups by their most recent lastWatched timestamp descending
    return Array.from(map.values()).sort(
      (a, b) => b.latestItem.lastWatched - a.latestItem.lastWatched
    );
  }, [inProgressItems]);

  const movieCount = groupedItems.filter((g) => g.type === 'movie').length;
  const seriesCount = groupedItems.filter((g) => g.type === 'series').length;

  const displayedGroups = groupedItems.filter((g) => {
    if (filter === 'movie') return g.type === 'movie';
    if (filter === 'series') return g.type === 'series';
    return true;
  });

  const handleClear = () => {
    playClick();
    clearAllHistory();
    setShowClearConfirm(false);
  };

  return (
    <div className="pt-24 sm:pt-28 pb-20 px-3 sm:px-8 lg:px-12 3xl:px-16 max-w-[1720px] 2xl:max-w-[1880px] 3xl:max-w-[2200px] 4xl:max-w-[2600px] mx-auto space-y-6 sm:space-y-8 min-h-[75vh]">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.07] pb-6">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#E50914]/15 border border-[#E50914]/30 flex items-center justify-center text-[#E50914] shadow-glow-red shrink-0 mt-0.5">
            <HistoryIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-medium text-white tracking-wide uppercase">
                {t('historyTitle')}
              </h1>
              <span className="text-[11px] sm:text-xs font-mono font-bold text-white bg-[#E50914]/20 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full border border-[#E50914]/35">
                {groupedItems.length} {language === 'en' ? (groupedItems.length > 1 ? 'Titles' : 'Title') : 'Judul'} · {inProgressItems.length} {language === 'en' ? 'Items' : 'Tayangan'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 font-light mt-1 max-w-2xl leading-relaxed">
              {language === 'en'
                ? 'Movies and series in progress. For series, view watched episodes in the dropdown menu.'
                : 'Film dan series yang sedang Anda tonton. Untuk series, episode yang ditonton dikelompokkan dalam menu dropdown.'}
            </p>
          </div>
        </div>

        {/* Clear History Button */}
        {inProgressItems.length > 0 && (
          <div className="relative shrink-0">
            {!showClearConfirm ? (
              <button
                type="button"
                onClick={() => {
                  playClick();
                  setShowClearConfirm(true);
                }}
                className="flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white/[0.03] hover:bg-red-600/20 text-slate-300 hover:text-red-400 border border-white/[0.08] hover:border-red-500/30 text-xs font-medium transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('clearAllHistory')}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 p-1.5 rounded-full bg-cinema-900 border border-red-500/40 shadow-xl">
                <span className="text-[11px] text-red-300 pl-2 font-light">
                  {language === 'en' ? 'Delete all history?' : 'Hapus semua riwayat?'}
                </span>
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-3 py-1 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow cursor-pointer"
                >
                  {language === 'en' ? 'Yes, clear' : 'Ya, hapus'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setShowClearConfirm(false);
                  }}
                  className="px-2.5 py-1 rounded-full text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  {language === 'en' ? 'Cancel' : 'Batal'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      {groupedItems.length > 0 && (
        <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => {
              playClick();
              setFilter('all');
            }}
            className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
              filter === 'all'
                ? 'bg-white text-black font-bold shadow-md'
                : 'bg-white/[0.04] text-neutral-300 hover:text-white hover:bg-white/10'
            }`}
          >
            {language === 'en' ? 'All' : 'Semua'} ({groupedItems.length})
          </button>
          <button
            type="button"
            onClick={() => {
              playClick();
              setFilter('movie');
            }}
            className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
              filter === 'movie'
                ? 'bg-[#E50914] text-white font-bold shadow-glow-red'
                : 'bg-white/[0.04] text-neutral-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <span>{t('filterMovies')} ({movieCount})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              playClick();
              setFilter('series');
            }}
            className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
              filter === 'series'
                ? 'bg-[#E50914] text-white font-bold shadow-glow-red'
                : 'bg-white/[0.04] text-neutral-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <span>{t('filterSeries')} ({seriesCount})</span>
          </button>
        </div>
      )}

      {/* Empty State */}
      {displayedGroups.length === 0 && (
        <div className="py-24 text-center text-slate-400 space-y-5 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mx-auto text-slate-500 shadow-inner">
            <HistoryIcon className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-display font-medium text-white tracking-wide">
              {t('emptyHistoryTitle')}
            </h3>
            <p className="text-xs text-slate-400 font-light leading-relaxed mt-1">
              {language === 'en'
                ? 'No movies or series currently in progress. All completed titles are stored in the Watched tab.'
                : 'Tidak ada film atau episode yang sedang ditonton. Semua tayangan yang telah selesai tersimpan di tab Watched.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              playClick();
              onGoHome();
            }}
            className="px-6 py-2.5 rounded-full bg-[#E50914] hover:bg-[#F40612] text-white text-xs font-bold shadow-glow-red hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            {t('exploreMovies')}
          </button>
        </div>
      )}

      {/* Grid of Grouped History Cards */}
      {displayedGroups.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 4xl:grid-cols-7 gap-4 sm:gap-5">
          {displayedGroups.map((group) => {
            const isSeries = group.type === 'series';
            const activeItem = group.latestItem;
            const itemKey = group.mediaId;
            const isExpanded = Boolean(expandedSeries[group.mediaId]);

            const rawPercent = activeItem.duration > 0 ? (activeItem.currentTime / activeItem.duration) * 100 : 0;
            const displayPercent = Math.min(100, Math.max(0, Math.round(rawPercent)));
            const barWidthPercent = Math.min(100, Math.max(1, rawPercent));
            const remainingText = formatRemainingTime(activeItem.currentTime, activeItem.duration, language);
            const relativeDate = formatRelativeDate(activeItem.lastWatched, language);
            const displayTitle = getMediaTitle(group.media, language);
            const displayBackdrop = getMediaBackdrop(group.media, language);
            const displayPoster = getMediaPoster(group.media, language);

            return (
              <div
                key={itemKey}
                onMouseEnter={playHover}
                className="group relative flex flex-col rounded-xl overflow-hidden bg-[#181818] border border-white/10 hover:border-white/30 transition-all duration-300 shadow-netflix-card sm:hover:-translate-y-1"
              >
                {/* Visual Thumbnail */}
                <div
                  onClick={() => {
                    playWhoosh();
                    onPlayMedia(group.media, activeItem.currentTime, activeItem.episodeId);
                  }}
                  className="relative aspect-video w-full overflow-hidden bg-black cursor-pointer"
                >
                  <img
                    src={activeItem.episodeThumbnail || displayBackdrop || displayPoster || group.media.backdrop || group.media.poster}
                    alt={displayTitle}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 brightness-85 group-hover:brightness-95"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-cinema-950 via-black/30 to-black/20" />

                  {/* Center Action Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/60 border-2 border-white text-white flex items-center justify-center group-hover:bg-white group-hover:text-black group-hover:scale-110 transition-all duration-200 shadow-xl">
                      <Play className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5 fill-current" />
                    </div>
                  </div>

                  {/* Top Badges */}
                  <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-auto">
                    <span className="text-[10px] font-sans uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md text-white border border-white/10 font-bold flex items-center gap-1 pointer-events-none">
                      <span>{isSeries ? t('badgeSeries') : t('badgeFilm')}</span>
                      {isSeries && (
                        <span className="text-emerald-400 font-mono font-bold">
                          • S{activeItem.seasonNumber ?? 1}:E{activeItem.episodeNumber ?? 1}
                        </span>
                      )}
                    </span>

                    {/* Actions: Open in New Tab & Delete Group */}
                    <div className="flex items-center gap-1.5 pointer-events-auto">
                      <a
                        href={`${window.location.origin}${window.location.pathname}#/watch/${group.media.id}${activeItem.episodeId ? `?ep=${activeItem.episodeId}` : ''}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          e.stopPropagation();
                          playClick();
                        }}
                        title={t('openInNewTabTooltip')}
                        className="p-1.5 rounded-full bg-black/60 hover:bg-brand-gold hover:text-cinema-950 text-slate-300 transition-all border border-white/10 no-underline flex items-center justify-center cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playClick();
                          // Removes all history entries for this media/series
                          removeHistoryItem(group.mediaId);
                        }}
                        title={isSeries ? (language === 'en' ? 'Remove series from history' : 'Hapus series dari riwayat') : t('removeFromHistory')}
                        className="p-1.5 rounded-full bg-black/60 hover:bg-red-600/80 text-slate-400 hover:text-white transition-colors border border-white/10 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Bottom Status Badge on Image */}
                  <div className="absolute bottom-2 inset-x-2.5 flex items-center justify-between pointer-events-none text-[10px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-black/75 text-slate-300 backdrop-blur-md border border-white/10">
                      <span>{remainingText}</span>
                    </span>

                    <span className="px-2 py-0.5 rounded bg-black/75 text-slate-400 backdrop-blur-md border border-white/10">
                      {relativeDate}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="absolute bottom-0 inset-x-0 h-1.5 bg-white/20">
                    <div
                      className="h-full bg-[#E50914] shadow-glow-red transition-all duration-300"
                      style={{ width: `${barWidthPercent}%` }}
                    />
                  </div>
                </div>

                {/* Card Content & CTAs */}
                <div className="p-3 sm:p-4 flex flex-col justify-between gap-2.5 flex-1">
                  <div>
                    <h3
                      onClick={() => {
                        playClick();
                        onOpenDetails(group.media);
                      }}
                      className="font-display font-medium text-white text-sm sm:text-base truncate group-hover:text-brand-champagne transition-colors cursor-pointer"
                    >
                      {displayTitle}
                    </h3>

                    {isSeries ? (
                      <div className="mt-1 flex items-center gap-1.5 text-xs">
                        <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shrink-0">
                          S{activeItem.seasonNumber ?? 1}:E{activeItem.episodeNumber ?? 1}
                        </span>
                        <p className="text-xs text-brand-champagne/90 truncate font-light">
                          {activeItem.episodeTitle || `${t('episodeProgress')} ${activeItem.episodeNumber ?? 1}`}
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-slate-400 font-light mt-0.5">
                        <span>{group.media.year}</span>
                        <span>•</span>
                        <span className="truncate">{group.media.genres.slice(0, 2).map((g) => formatGenre(g, language)).join(', ')}</span>
                      </div>
                    )}
                  </div>

                  {/* Main Action Row */}
                  <div className="pt-2 border-t border-white/[0.06] flex items-center gap-2">
                    {/* Primary Resume Button */}
                    <button
                      type="button"
                      onClick={() => {
                        playWhoosh();
                        onPlayMedia(group.media, activeItem.currentTime, activeItem.episodeId);
                      }}
                      className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-150 bg-[#E50914] hover:bg-[#F40612] text-white shadow-md active:scale-95 min-w-0 cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-current shrink-0" />
                      <span className="truncate">{language === 'en' ? 'Continue' : 'Lanjutkan'} · {displayPercent}%</span>
                    </button>

                    {/* Toggle Completed */}
                    <button
                      type="button"
                      onClick={() => {
                        playClick();
                        toggleCompleted(activeItem.historyId || activeItem.mediaId, activeItem.episodeId, activeItem.media);
                      }}
                      title={language === 'en' ? 'Mark as Completed (Move to Watched)' : 'Tandai Selesai (Pindahkan ke Watched)'}
                      className="p-2 rounded-xl border transition-all bg-white/[0.03] hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/40 text-slate-400 border-white/[0.06] cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Open in New Tab Button */}
                    <a
                      href={`${window.location.origin}${window.location.pathname}#/watch/${group.media.id}${activeItem.episodeId ? `?ep=${activeItem.episodeId}` : ''}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => playClick()}
                      title={t('openInNewTabTooltip')}
                      className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] hover:text-brand-gold text-slate-400 border border-white/[0.06] transition-all no-underline flex items-center justify-center cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    {/* Info Button */}
                    <button
                      type="button"
                      onClick={() => {
                        playClick();
                        onOpenDetails(group.media);
                      }}
                      title={t('detailsReviews')}
                      className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.06] transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-brand-champagne" />
                    </button>
                  </div>

                  {/* Series Episode Dropdown Menu Toggle */}
                  {isSeries && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => toggleSeriesDropdown(group.mediaId)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium transition-all duration-200 cursor-pointer ${
                          isExpanded
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-sm'
                            : 'bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.12] border-white/10 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Tv className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="font-semibold">
                            {group.episodes.length} {language === 'en' ? (group.episodes.length > 1 ? 'Episodes Watched' : 'Episode Watched') : 'Episode Ditonton'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] opacity-85">
                          <span>{isExpanded ? (language === 'en' ? 'Hide' : 'Tutup') : (language === 'en' ? 'View list' : 'Lihat daftar')}</span>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </button>

                      {/* Dropdown Content: Watched Episodes List */}
                      {isExpanded && (
                        <div className="mt-2 pt-2 border-t border-white/[0.08] space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                          <div className="text-[10px] font-sans font-bold tracking-wider text-slate-400 uppercase px-1 flex items-center justify-between">
                            <span>{language === 'en' ? 'Episodes in Progress' : 'Daftar Episode Ditonton'}</span>
                            <span className="text-emerald-400 font-mono">{group.episodes.length} ep</span>
                          </div>

                          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5 custom-scrollbar">
                            {group.episodes.map((ep) => {
                              const epRawPercent = ep.duration > 0 ? (ep.currentTime / ep.duration) * 100 : 0;
                              const epPercent = Math.min(100, Math.max(0, Math.round(epRawPercent)));
                              const epRemaining = formatRemainingTime(ep.currentTime, ep.duration, language);
                              const isLatest = ep.episodeId === activeItem.episodeId;

                              return (
                                <div
                                  key={ep.historyId || ep.episodeId || `${group.mediaId}_${ep.episodeNumber}`}
                                  className={`p-2 rounded-lg border flex flex-col gap-1.5 transition-all ${
                                    isLatest
                                      ? 'bg-white/[0.06] border-emerald-500/30 shadow-sm'
                                      : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2 min-w-0">
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                      <span className="font-mono font-bold text-[9.5px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shrink-0">
                                        S{ep.seasonNumber ?? 1}:E{ep.episodeNumber ?? 1}
                                      </span>
                                      <span className="text-xs text-white font-medium truncate">
                                        {ep.episodeTitle || `${language === 'en' ? 'Episode' : 'Episode'} ${ep.episodeNumber ?? 1}`}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                      {epRemaining}
                                    </span>
                                  </div>

                                  {/* Progress bar */}
                                  <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-[#E50914] shadow-glow-red transition-all duration-300"
                                      style={{ width: `${Math.min(100, Math.max(1, epRawPercent))}%` }}
                                    />
                                  </div>

                                  {/* Episode Quick Actions */}
                                  <div className="flex items-center justify-between gap-2 pt-0.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        playWhoosh();
                                        onPlayMedia(group.media, ep.currentTime, ep.episodeId);
                                      }}
                                      className="flex-1 py-1 px-2.5 rounded-md bg-[#E50914]/25 hover:bg-[#E50914] active:scale-95 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                    >
                                      <Play className="w-2.5 h-2.5 fill-current shrink-0" />
                                      <span>{language === 'en' ? 'Play' : 'Putar'} · {epPercent}%</span>
                                    </button>

                                    <div className="flex items-center gap-1 shrink-0">
                                      {/* Mark Completed */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          playClick();
                                          toggleCompleted(ep.historyId || ep.mediaId, ep.episodeId, ep.media || group.media);
                                        }}
                                        title={language === 'en' ? 'Mark as Completed' : 'Tandai Selesai'}
                                        className="p-1.5 rounded-md bg-white/[0.04] hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 border border-white/10 transition-colors cursor-pointer"
                                      >
                                        <CheckCircle2 className="w-3 h-3" />
                                      </button>

                                      {/* Open in new tab */}
                                      <a
                                        href={`${window.location.origin}${window.location.pathname}#/watch/${group.media.id}${ep.episodeId ? `?ep=${ep.episodeId}` : ''}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => playClick()}
                                        title={t('openInNewTabTooltip')}
                                        className="p-1.5 rounded-md bg-white/[0.04] hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors flex items-center justify-center cursor-pointer no-underline"
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                      </a>

                                      {/* Delete Episode */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          playClick();
                                          removeHistoryItem(ep.historyId || ep.mediaId, ep.episodeId);
                                        }}
                                        title={t('removeFromHistory')}
                                        className="p-1.5 rounded-md bg-white/[0.04] hover:bg-red-600/25 text-slate-400 hover:text-red-400 border border-white/10 transition-colors cursor-pointer"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
