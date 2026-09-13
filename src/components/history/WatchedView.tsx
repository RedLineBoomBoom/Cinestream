import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  RotateCcw,
  Play,
  Star,
  Calendar,
  Film,
  Tv,
  ExternalLink,
  ChevronDown,
  ListVideo,
} from 'lucide-react';
import type { MediaItem, WatchHistoryItem } from '../../types/media';
import { useWatchlist } from '../../context/WatchlistContext';
import { useSound } from '../../context/SoundContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatRelativeDate, getMediaTitle, getMediaPoster, getMediaBackdrop } from '../../utils/formatters';
import { getAbsoluteWatchUrl } from '../../utils/navigation';

interface WatchedViewProps {
  onPlayMedia: (media: MediaItem, resumeTime?: number, episodeId?: string) => void;
  onGoHistory: () => void;
  onGoHome: () => void;
}

interface GroupedWatchedItem {
  type: 'movie' | 'series';
  mediaId: string;
  media: MediaItem;
  movieItem?: WatchHistoryItem;
  episodes: WatchHistoryItem[];
  latestItem: WatchHistoryItem;
  lastWatched: number;
}

export const WatchedView: React.FC<WatchedViewProps> = ({
  onPlayMedia,
  onGoHistory,
  onGoHome,
}) => {
  const { historyItems, toggleCompleted } = useWatchlist();
  const { playClick, playHover, playSuccess } = useSound();
  const { t, language } = useLanguage();

  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'movie' | 'series'>('all');
  const [expandedSeries, setExpandedSeries] = useState<Record<string, boolean>>({});

  const watchedItems = historyItems.filter((h) => h.completed && Boolean(h.media || h.mediaId));

  // Group items by series so multiple episodes are combined into a single card per series
  const groupedItems = useMemo<GroupedWatchedItem[]>(() => {
    const map = new Map<string, GroupedWatchedItem>();

    for (const item of watchedItems) {
      const isSeries = item.media?.type !== 'movie' || Boolean(item.episodeId || item.episodeNumber);
      const mediaKey = item.mediaId || item.media?.id || 'unknown';
      const groupKey = isSeries ? `series_${mediaKey}` : `movie_${mediaKey}`;

      const existing = map.get(groupKey);
      if (existing) {
        if (isSeries) {
          existing.episodes.push(item);
        }
        if ((item.lastWatched || 0) > (existing.latestItem.lastWatched || 0)) {
          existing.latestItem = item;
          existing.lastWatched = item.lastWatched || 0;
          if (item.media) existing.media = item.media;
        }
      } else {
        map.set(groupKey, {
          type: isSeries ? 'series' : 'movie',
          mediaId: mediaKey,
          media: item.media,
          movieItem: isSeries ? undefined : item,
          episodes: isSeries ? [item] : [],
          latestItem: item,
          lastWatched: item.lastWatched || 0,
        });
      }
    }

    // Sort episodes in each series group:
    // First by seasonNumber ascending, then episodeNumber ascending
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

    // Sort all cards by most recently watched timestamp descending
    return Array.from(map.values()).sort(
      (a, b) => (b.lastWatched || 0) - (a.lastWatched || 0)
    );
  }, [watchedItems]);

  const movieCount = groupedItems.filter((g) => g.type === 'movie').length;
  const seriesCount = groupedItems.filter((g) => g.type === 'series').length;
  const totalEpisodesWatched = watchedItems.filter(
    (h) => h.media?.type !== 'movie' || Boolean(h.episodeId || h.episodeNumber)
  ).length;

  const displayedGroups = groupedItems.filter((g) => {
    if (filter === 'movie') return g.type === 'movie';
    if (filter === 'series') return g.type === 'series';
    return true;
  });

  const toggleSeriesDropdown = (mediaId: string) => {
    playClick();
    setExpandedSeries((prev) => ({
      ...prev,
      [mediaId]: !prev[mediaId],
    }));
  };

  const handleUnmarkItem = (item: WatchHistoryItem) => {
    playClick();
    const itemKey = item.historyId || (item.episodeId ? `${item.mediaId}__ep_${item.episodeId}` : item.mediaId);
    setRevertingId(itemKey);
    setTimeout(() => {
      toggleCompleted(item.historyId || item.mediaId, item.episodeId, item.media);
      setRevertingId(null);
    }, 300);
  };

  const handleUnmarkAllEpisodes = (group: GroupedWatchedItem) => {
    playClick();
    setRevertingId(group.mediaId);
    setTimeout(() => {
      if (group.type === 'movie' && group.movieItem) {
        toggleCompleted(group.movieItem.historyId || group.movieItem.mediaId, undefined, group.movieItem.media);
      } else if (group.type === 'series') {
        group.episodes.forEach((ep) => {
          toggleCompleted(ep.historyId || ep.mediaId, ep.episodeId, ep.media || group.media);
        });
      }
      setRevertingId(null);
    }, 300);
  };

  const handlePlayGroup = (group: GroupedWatchedItem) => {
    playSuccess();
    if (group.type === 'movie') {
      onPlayMedia(group.media, 0);
    } else {
      onPlayMedia(group.media, 0, group.latestItem.episodeId);
    }
  };

  const handlePlayEpisode = (media: MediaItem, ep: WatchHistoryItem) => {
    playSuccess();
    onPlayMedia(media, 0, ep.episodeId);
  };

  return (
    <div className="pt-28 pb-20 px-4 sm:px-8 lg:px-12 3xl:px-16 max-w-[1720px] 2xl:max-w-[1880px] 3xl:max-w-[2200px] 4xl:max-w-[2600px] mx-auto space-y-8 min-h-[75vh]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.07] pb-6">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-400/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-display font-medium text-white tracking-wide uppercase">
                {t('watchedTitle')}
              </h1>
              <span className="text-xs font-mono text-emerald-300 bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/25 font-bold flex items-center gap-1.5">
                <span>
                  {groupedItems.length} {t('watchedCount')}
                </span>
                {totalEpisodesWatched > 0 && (
                  <span className="text-emerald-400/80 font-normal">
                    · {totalEpisodesWatched} {language === 'en' ? 'episodes' : 'episode'}
                  </span>
                )}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 font-light mt-1 max-w-2xl leading-relaxed">
              {t('watchedSubtitle')}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            playClick();
            onGoHistory();
          }}
          onMouseEnter={playHover}
          className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white text-xs font-medium transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {language === 'en' ? 'Watch History' : 'Riwayat Tonton'}
        </button>
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
            <span>
              {t('filterMovies')} ({movieCount})
            </span>
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
            <span>
              {t('filterSeries')} ({seriesCount})
            </span>
          </button>
        </div>
      )}

      {/* Empty State */}
      {groupedItems.length === 0 ? (
        <div className="py-24 text-center text-slate-400 space-y-4 max-w-md mx-auto">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500/50" />
          </div>
          <h3 className="text-base font-display font-medium text-white tracking-wide">
            {t('emptyWatchedTitle')}
          </h3>
          <p className="text-xs text-slate-400 font-light leading-relaxed">
            {t('emptyWatchedDesc')}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                playClick();
                onGoHistory();
              }}
              onMouseEnter={playHover}
              className="px-5 py-2.5 rounded-full bg-white/[0.05] border border-white/10 text-slate-200 text-xs font-semibold hover:bg-white/[0.1] transition-all cursor-pointer"
            >
              {language === 'en' ? 'Go to History' : 'Ke Riwayat Tonton'}
            </button>
            <button
              onClick={() => {
                playClick();
                onGoHome();
              }}
              onMouseEnter={playHover}
              className="px-5 py-2.5 rounded-full bg-[#E50914] hover:bg-[#F40612] text-white text-xs font-bold shadow-glow-red transition-all cursor-pointer"
            >
              {t('exploreMovies')}
            </button>
          </div>
        </div>
      ) : displayedGroups.length === 0 ? (
        <div className="py-20 text-center text-slate-400 space-y-3">
          <p className="text-sm text-slate-300">
            {language === 'en'
              ? `No completed ${filter === 'movie' ? 'movies' : 'series'} found.`
              : `Tidak ada ${filter === 'movie' ? 'film' : 'series'} yang telah selesai ditonton.`}
          </p>
          <button
            onClick={() => {
              playClick();
              setFilter('all');
            }}
            className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/10 text-white text-xs font-semibold transition-all cursor-pointer"
          >
            {language === 'en' ? 'Show All' : 'Tampilkan Semua'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-7 4xl:grid-cols-8 items-start gap-4 sm:gap-6">
          {displayedGroups.map((group) => {
            const media = group.media;
            if (!media) return null;

            const isSeries = group.type === 'series';
            const isExpanded = Boolean(expandedSeries[group.mediaId]);
            const isReverting = revertingId === group.mediaId;

            // Group episodes by seasonNumber for clean organized dropdown display
            const seasonMap = new Map<number, WatchHistoryItem[]>();
            if (isSeries) {
              group.episodes.forEach((ep) => {
                const sNum = ep.seasonNumber ?? 1;
                if (!seasonMap.has(sNum)) seasonMap.set(sNum, []);
                seasonMap.get(sNum)!.push(ep);
              });
            }
            const sortedSeasons = Array.from(seasonMap.keys()).sort((a, b) => a - b);

            const displayPoster =
              group.latestItem?.episodeThumbnail ||
              getMediaPoster(media, language) ||
              getMediaBackdrop(media, language) ||
              media.poster ||
              media.backdrop;

            return (
              <div
                key={isSeries ? `series_${group.mediaId}` : `movie_${group.mediaId}`}
                className={`group relative flex flex-col rounded-lg sm:rounded-xl overflow-hidden bg-[#181818] border border-emerald-500/30 hover:border-emerald-400/70 transition-all duration-300 shadow-netflix-card hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-950/25 ${
                  isReverting ? 'opacity-40 scale-95' : ''
                }`}
              >
                {/* Poster & Badges Container */}
                <div className="relative aspect-[2/3] overflow-hidden bg-[#1f1f1f]">
                  <img
                    src={displayPoster}
                    alt={getMediaTitle(media, language)}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        getMediaBackdrop(media, language) ||
                        media.backdrop ||
                        'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=500&auto=format&fit=crop';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-black/20 to-transparent group-hover:from-black/80 transition-all" />

                  {/* Top Right: Completed Badge */}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-md sm:rounded-lg font-bold bg-emerald-600/90 text-white border border-emerald-400/40 backdrop-blur-md text-[10px] sm:text-[11px] uppercase tracking-wider shadow-md">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{t('completed')}</span>
                  </div>

                  {/* Top Left: Series Episode Count Badge or Movie Rating */}
                  {isSeries ? (
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-md sm:rounded-lg bg-black/80 backdrop-blur-md border border-emerald-400/40 text-[11px] sm:text-xs font-mono font-bold text-emerald-300 shadow-md">
                      <Tv className="w-3.5 h-3.5 text-emerald-400" />
                      <span>
                        {group.episodes.length}{' '}
                        {language === 'en'
                          ? group.episodes.length > 1
                            ? 'Eps'
                            : 'Ep'
                          : 'Ep'}
                      </span>
                    </div>
                  ) : media.rating > 0 ? (
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-md sm:rounded-lg bg-black/80 backdrop-blur-md border border-white/20 text-[11px] sm:text-xs font-bold text-white shadow-md">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{media.rating.toFixed(1)}</span>
                    </div>
                  ) : null}

                  {/* Hover Overlay Action Buttons */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 p-3 sm:p-4 opacity-0 group-hover:opacity-100 transition-opacity bg-black/65 backdrop-blur-[2px]">
                    <button
                      onClick={() => handlePlayGroup(group)}
                      onMouseEnter={playHover}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-white hover:bg-white/90 text-black font-bold text-xs sm:text-sm shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-black text-black" />
                      <span>
                        {isSeries
                          ? language === 'en'
                            ? 'Play Latest'
                            : 'Putar Terakhir'
                          : language === 'en'
                          ? 'Play Again'
                          : 'Tonton Ulang'}
                      </span>
                    </button>

                    <button
                      onClick={() => handleUnmarkAllEpisodes(group)}
                      onMouseEnter={playHover}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium text-xs sm:text-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{t('markAsUnwatched')}</span>
                    </button>

                    <a
                      href={getAbsoluteWatchUrl(
                        media.id,
                        isSeries ? group.latestItem?.episodeId : undefined
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        e.stopPropagation();
                        playClick();
                      }}
                      onMouseEnter={playHover}
                      title={t('openInNewTabTooltip')}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-black/50 hover:bg-brand-gold/20 hover:border-brand-gold/40 border border-white/15 text-slate-200 hover:text-brand-gold font-medium text-xs sm:text-sm transition-all hover:scale-105 active:scale-95 no-underline cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-brand-gold" />
                      <span>{t('openInNewTab')}</span>
                    </a>
                  </div>
                </div>

                {/* Card Info Footer */}
                <div className="p-3.5 sm:p-4 space-y-2 flex-1 flex flex-col justify-between bg-[#181818]">
                  <div>
                    {/* Media Title */}
                    <h4 className="font-sans font-bold text-white text-sm sm:text-base line-clamp-1 leading-snug group-hover:text-emerald-300 transition-colors">
                      {getMediaTitle(media, language)}
                    </h4>

                    {/* Series Latest Episode Subtitle */}
                    {isSeries && group.latestItem && (
                      <div className="mt-1.5 flex items-center gap-1.5 min-w-0">
                        <span className="text-[10.5px] sm:text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                          S{group.latestItem.seasonNumber ?? 1}:E{group.latestItem.episodeNumber ?? 1}
                        </span>
                        <p className="text-xs sm:text-[13px] text-emerald-400/95 font-medium truncate">
                          {group.latestItem.episodeTitle ||
                            `${t('episodeProgress')} ${group.latestItem.episodeNumber ?? 1}`}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Metadata Row: Media Type, Year & Relative Timestamp */}
                  <div className="flex items-center gap-2.5 text-xs sm:text-[12.5px] text-slate-400 font-normal pt-1.5 border-t border-white/[0.06]">
                    <span className="flex items-center gap-1.5 text-slate-300 font-medium shrink-0">
                      {media.type === 'movie' ? (
                        <Film className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <Tv className="w-3.5 h-3.5 text-emerald-400/80" />
                      )}
                      <span>{media.year}</span>
                    </span>

                    {group.lastWatched > 0 && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-white/25 shrink-0" />
                        <span className="flex items-center gap-1.5 text-slate-400 truncate">
                          <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{formatRelativeDate(group.lastWatched, language)}</span>
                        </span>
                      </>
                    )}
                  </div>

                  {/* Series Episode Dropdown Menu Toggle */}
                  {isSeries && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => toggleSeriesDropdown(group.mediaId)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-semibold transition-all duration-200 cursor-pointer ${
                          isExpanded
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-md'
                            : 'bg-white/[0.05] hover:bg-white/[0.1] active:bg-white/[0.15] border-white/10 text-slate-200 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <ListVideo className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>
                            {group.episodes.length}{' '}
                            {language === 'en'
                              ? group.episodes.length > 1
                                ? 'Episodes Watched'
                                : 'Episode Watched'
                              : 'Episode Ditonton'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-emerald-400">
                          <span>
                            {isExpanded
                              ? language === 'en'
                                ? 'Hide'
                                : 'Tutup'
                              : language === 'en'
                              ? 'Episodes'
                              : 'Lihat'}
                          </span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform duration-300 ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </div>
                      </button>

                      {/* Dropdown Content: Watched Episodes List */}
                      {isExpanded && (
                        <div className="mt-2.5 pt-2.5 border-t border-white/[0.08] space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                          <div className="text-[10px] font-sans font-bold tracking-wider text-slate-400 uppercase px-1 flex items-center justify-between">
                            <span>{t('watchedEpisodesDropdown')}</span>
                            <span className="text-emerald-400 font-mono font-bold">
                              {group.episodes.length} ep
                            </span>
                          </div>

                          {/* Scrollable list of episodes organized by season */}
                          <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5 custom-scrollbar">
                            {sortedSeasons.map((sNum) => {
                              const seasonEpisodes = seasonMap.get(sNum) || [];
                              return (
                                <div key={`s_${group.mediaId}_${sNum}`} className="space-y-1.5">
                                  {sortedSeasons.length > 1 && (
                                    <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono font-bold text-emerald-400">
                                      <span>Season {sNum}</span>
                                      <span className="text-slate-400 font-normal">
                                        {seasonEpisodes.length}{' '}
                                        {language === 'en'
                                          ? seasonEpisodes.length > 1
                                            ? 'episodes'
                                            : 'episode'
                                          : 'episode'}
                                      </span>
                                    </div>
                                  )}

                                  <div className="space-y-1.5">
                                    {seasonEpisodes.map((ep) => {
                                      const epKey =
                                        ep.historyId ||
                                        (ep.episodeId
                                          ? `${group.mediaId}__ep_${ep.episodeId}`
                                          : `${group.mediaId}_s${ep.seasonNumber}e${ep.episodeNumber}`);
                                      const isEpReverting = revertingId === epKey;
                                      const epTitle =
                                        ep.episodeTitle ||
                                        `${language === 'en' ? 'Episode' : 'Episode'} ${
                                          ep.episodeNumber ?? 1
                                        }`;

                                      return (
                                        <div
                                          key={epKey}
                                          className={`p-2 rounded-lg bg-black/40 border border-white/[0.08] hover:border-emerald-500/40 flex flex-col gap-1.5 transition-all ${
                                            isEpReverting ? 'opacity-30 scale-95' : ''
                                          }`}
                                        >
                                          <div className="flex items-start justify-between gap-2 min-w-0">
                                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                                                S{ep.seasonNumber ?? 1}:E{ep.episodeNumber ?? 1}
                                              </span>
                                              <p
                                                className="text-xs font-semibold text-white truncate"
                                                title={epTitle}
                                              >
                                                {epTitle}
                                              </p>
                                            </div>
                                            {ep.lastWatched && (
                                              <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                                {formatRelativeDate(ep.lastWatched, language)}
                                              </span>
                                            )}
                                          </div>

                                          {/* Episode Quick Action Buttons */}
                                          <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-white/[0.06]">
                                            <button
                                              type="button"
                                              onClick={() => handlePlayEpisode(group.media, ep)}
                                              className="flex-1 py-1 px-2.5 rounded-md bg-white hover:bg-emerald-400 active:scale-95 text-black text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow"
                                            >
                                              <Play className="w-3 h-3 fill-current shrink-0" />
                                              <span>{language === 'en' ? 'Play' : 'Putar'}</span>
                                            </button>

                                            <a
                                              href={getAbsoluteWatchUrl(group.media.id, ep.episodeId)}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                playClick();
                                              }}
                                              title={t('openInNewTabTooltip')}
                                              className="p-1.5 rounded-md bg-white/[0.06] hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 transition-all flex items-center justify-center cursor-pointer no-underline"
                                            >
                                              <ExternalLink className="w-3 h-3 text-brand-gold" />
                                            </a>

                                            <button
                                              type="button"
                                              onClick={() => handleUnmarkItem(ep)}
                                              title={
                                                language === 'en'
                                                  ? 'Mark episode as unwatched'
                                                  : 'Tandai episode belum selesai'
                                              }
                                              className="p-1.5 rounded-md bg-white/[0.06] hover:bg-red-500/20 hover:border-red-500/40 text-slate-400 hover:text-red-400 border border-white/10 transition-all cursor-pointer"
                                            >
                                              <RotateCcw className="w-3 h-3" />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Unmark All Button for this series */}
                          {group.episodes.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleUnmarkAllEpisodes(group)}
                              className="w-full py-1.5 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 hover:text-red-200 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3 text-red-400" />
                              <span>{t('unmarkAllEpisodes')}</span>
                            </button>
                          )}
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
