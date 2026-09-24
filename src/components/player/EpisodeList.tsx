import React, { useState, useEffect } from 'react';
import type { Season, Episode, NextEpisodeAirInfo } from '../../types/media';
import { Play, Tv, Clock, ExternalLink, Lock, Calendar, Sparkles } from 'lucide-react';
import { useSound } from '../../context/SoundContext';
import { useLanguage } from '../../context/LanguageContext';
import { getSeriesStatus } from '../../utils/formatters';
import { getAbsoluteWatchUrl, getMediaWatchUrl } from '../../utils/navigation';
import { isEpisodeUnreleased as checkEpisodeUnreleased } from '../../utils/seriesNavigation';
import { useReleaseCountdown } from '../../hooks/useReleaseCountdown';
import { translateText } from '../../services/translator';

export function isDefaultOrEmptySynopsis(text?: string): boolean {
  if (!text) return true;
  const clean = text.trim().toLowerCase();
  return (
    clean === '' ||
    clean.includes('belum tersedia') ||
    clean.includes('not yet available') ||
    clean.includes('not available') ||
    clean.includes('no overview') ||
    clean.includes('tba') ||
    /^episode\s+\d+\s+dari\s+serial/i.test(clean) ||
    /^episode\s+\d+\s+of\s+series/i.test(clean)
  );
}

export function formatEpisodeDuration(durationStr?: string, lang: 'id' | 'en' = 'id'): string {
  if (!durationStr) return lang === 'en' ? '45 Mins' : '45 Menit';
  const numMatch = durationStr.match(/(\d+)/);
  if (!numMatch) return durationStr;
  const mins = numMatch[1];
  return lang === 'en' ? `${mins} Mins` : `${mins} Menit`;
}

interface EpisodeSynopsisProps {
  synopsis?: string;
  language: 'id' | 'en';
  className?: string;
}

const EpisodeSynopsis: React.FC<EpisodeSynopsisProps> = ({ synopsis, language, className }) => {
  const { t } = useLanguage();
  const [translatedText, setTranslatedText] = useState<string>('');

  const isDefault = isDefaultOrEmptySynopsis(synopsis);

  useEffect(() => {
    if (isDefault || !synopsis?.trim()) {
      setTranslatedText('');
      return;
    }

    const clean = synopsis.trim();
    let isMounted = true;

    translateText(clean, language)
      .then((res) => {
        if (isMounted && res) {
          setTranslatedText(res);
        }
      })
      .catch(() => {
        // keep original text on error
      });

    return () => {
      isMounted = false;
    };
  }, [synopsis, language, isDefault]);

  if (isDefault || !synopsis?.trim()) {
    return (
      <p className={className}>
        {t('episodeSynopsisNotAvailable')}
      </p>
    );
  }

  return (
    <p className={className}>
      {translatedText || synopsis}
    </p>
  );
};

interface UpcomingEpisodeCardProps {
  airDate?: string;
  episodeInfo?: NextEpisodeAirInfo;
  episodeNumber?: number;
  fallbackEpisodeNumber?: number;
  title?: string;
  synopsis?: string;
  thumbnail?: string;
  language: 'id' | 'en';
  onPlayEpisode?: () => void;
}

const UpcomingEpisodeCard: React.FC<UpcomingEpisodeCardProps> = ({
  airDate,
  episodeInfo,
  episodeNumber,
  fallbackEpisodeNumber = 1,
  title,
  synopsis,
  thumbnail,
  language,
  onPlayEpisode,
}) => {
  const { t } = useLanguage();
  const countdown = useReleaseCountdown(airDate, language);
  const epNumber = episodeNumber ?? episodeInfo?.episodeNumber ?? fallbackEpisodeNumber;
  const epTitle =
    (title && title !== `${t('episode')} ${epNumber}` && title !== `Episode ${epNumber}` ? title : undefined) ||
    episodeInfo?.title ||
    title ||
    `${t('episode')} ${epNumber}`;
  const epThumbnail = thumbnail || episodeInfo?.stillPath;
  const epSynopsis =
    (synopsis && !isDefaultOrEmptySynopsis(synopsis) ? synopsis : undefined) ||
    (episodeInfo?.overview && !isDefaultOrEmptySynopsis(episodeInfo.overview) ? episodeInfo.overview : undefined) ||
    synopsis;

  const isPlayable = Boolean(onPlayEpisode) && (countdown.isToday || countdown.isPassed);

  return (
    <div
      onClick={isPlayable ? onPlayEpisode : undefined}
      className={`relative flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-3.5 p-2.5 sm:p-3 rounded-xl border transition-all duration-300 overflow-hidden col-span-1 md:col-span-2 ${
        isPlayable
          ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-500/[0.08] via-cinema-900/90 to-cinema-950/95 shadow-md shadow-emerald-950/20 cursor-pointer hover:border-emerald-500/60 group'
          : 'border-amber-500/30 bg-gradient-to-br from-amber-500/[0.08] via-cinema-900/90 to-cinema-950/95 shadow-md shadow-amber-950/20 select-none hover:border-amber-500/50'
      }`}
      title={isPlayable ? (language === 'id' ? 'Klik untuk memutar episode' : 'Click to play episode') : t('episodeLockedHint')}
    >
      {/* Ambient background glow */}
      <div className={`absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full blur-2xl pointer-events-none ${
        isPlayable ? 'bg-emerald-500/15' : 'bg-amber-500/10'
      }`} />

      {/* Thumbnail or Locked Placeholder */}
      <div className={`relative w-full sm:w-32 h-28 sm:h-20 rounded-lg overflow-hidden flex-shrink-0 bg-cinema-850 border flex items-center justify-center ${
        isPlayable ? 'border-emerald-500/30' : 'border-amber-500/20'
      }`}>
        {epThumbnail ? (
          <img
            src={epThumbnail}
            alt={epTitle}
            className={`w-full h-full object-cover ${isPlayable ? 'group-hover:scale-105 transition-transform duration-300' : 'filter brightness-75 contrast-110'}`}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-cinema-800 to-cinema-900 flex items-center justify-center">
            <Calendar className="w-7 h-7 text-amber-400/40" />
          </div>
        )}

        {/* Lock Overlay or Play Icon */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center">
          {isPlayable ? (
            <div className="w-9 h-9 rounded-full bg-emerald-600/90 border border-emerald-400/50 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
              <Play className="w-4 h-4 ml-0.5 fill-current" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-md">
              <Lock className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Floating status on thumbnail */}
        <div className={`absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/85 text-[8.5px] font-mono flex items-center gap-1 border ${
          countdown.isToday || countdown.isPassed ? 'text-emerald-300 border-emerald-500/40' : 'text-amber-300 border-amber-500/30'
        }`}>
          <Sparkles className="w-2.5 h-2.5 text-current" />
          <span>{countdown.isToday ? t('airingToday') : countdown.isPassed ? (language === 'id' ? 'Telah Rilis' : 'Released') : t('upcomingRelease')}</span>
        </div>
      </div>

      {/* Episode Info & Live Countdown */}
      <div className="flex-1 min-w-0 w-full pr-1">
        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
          <div className="flex items-center gap-1.5">
            <span className={`text-[10.5px] sm:text-[11px] font-sans font-bold tracking-wider uppercase flex items-center gap-1 ${
              isPlayable ? 'text-emerald-300' : 'text-amber-300'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isPlayable ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              {t('episode')} {epNumber} • {isPlayable ? (language === 'id' ? 'Rilis Hari Ini' : 'Airing Today') : t('upcomingEpisode')}
            </span>
          </div>

          <span className={`text-[9px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider flex items-center gap-1 ${
            isPlayable
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
          }`}>
            {isPlayable ? <Play className="w-2.5 h-2.5 fill-current" /> : <Lock className="w-2.5 h-2.5" />}
            <span>{countdown.isToday ? t('airingToday') : countdown.countdownText || t('upcomingRelease')}</span>
          </span>
        </div>

        <h5 className="text-xs sm:text-sm font-display font-medium text-white/95 truncate">
          {epTitle}
        </h5>

        <EpisodeSynopsis
          synopsis={epSynopsis}
          language={language}
          className="text-[10px] sm:text-[10.5px] text-slate-400 font-light line-clamp-2 mt-0.5 leading-relaxed"
        />

        {/* Countdown display or Play button */}
        {countdown.isValid && !countdown.isPassed && !countdown.isToday ? (
          <div className="mt-2 flex flex-wrap items-center gap-1 sm:gap-1.5">
            <div className="px-2 py-1 rounded-md bg-black/60 border border-amber-500/20 min-w-[38px] text-center shadow-inner">
              <span className="block text-xs font-mono font-black text-amber-200">
                {String(countdown.days).padStart(2, '0')}
              </span>
              <span className="block text-[7.5px] text-slate-400 uppercase font-semibold tracking-wider">
                {t('daysLabel')}
              </span>
            </div>
            <span className="text-amber-400/60 font-mono font-bold text-xs">:</span>
            <div className="px-2 py-1 rounded-md bg-black/60 border border-amber-500/20 min-w-[38px] text-center shadow-inner">
              <span className="block text-xs font-mono font-black text-amber-200">
                {String(countdown.hours).padStart(2, '0')}
              </span>
              <span className="block text-[7.5px] text-slate-400 uppercase font-semibold tracking-wider">
                {t('hoursLabel')}
              </span>
            </div>
            <span className="text-amber-400/60 font-mono font-bold text-xs">:</span>
            <div className="px-2 py-1 rounded-md bg-black/60 border border-amber-500/20 min-w-[38px] text-center shadow-inner">
              <span className="block text-xs font-mono font-black text-amber-200">
                {String(countdown.minutes).padStart(2, '0')}
              </span>
              <span className="block text-[7.5px] text-slate-400 uppercase font-semibold tracking-wider">
                {t('minsLabel')}
              </span>
            </div>
            <span className="text-amber-400/60 font-mono font-bold text-xs">:</span>
            <div className="px-2 py-1 rounded-md bg-black/60 border border-amber-500/20 min-w-[38px] text-center shadow-inner">
              <span className="block text-xs font-mono font-black text-amber-400 animate-pulse">
                {String(countdown.seconds).padStart(2, '0')}
              </span>
              <span className="block text-[7.5px] text-slate-400 uppercase font-semibold tracking-wider">
                {t('secsLabel')}
              </span>
            </div>

            {countdown.formattedDate && (
              <div className="ml-1.5 sm:ml-3 flex items-center gap-1.5 text-[10px] text-slate-300">
                <Calendar className="w-3 h-3 text-amber-400/80 shrink-0" />
                <span>{t('airDateLabel')}: <strong className="text-amber-300 font-medium">{countdown.formattedDate}</strong></span>
              </div>
            )}
          </div>
        ) : isPlayable ? (
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlayEpisode?.();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{language === 'id' ? 'Putar Episode Sekarang' : 'Play Episode Now'}</span>
            </button>
            <span className="text-[10px] text-emerald-400/90 font-medium">
              ✓ {t('airingToday')} ({countdown.formattedDate})
            </span>
          </div>
        ) : countdown.isToday ? (
          <div className="mt-1.5 flex items-center gap-2 p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className="text-[10.5px] font-semibold">{t('airingToday')} — {countdown.formattedDate}</span>
          </div>
        ) : (
          <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>{countdown.formattedDate ? `${t('airDateLabel')}: ${countdown.formattedDate}` : t('scheduleTba')}</span>
          </div>
        )}

        {!isPlayable && (
          <p className="text-[9px] sm:text-[9.5px] text-amber-400/80 font-light mt-1.5 italic flex items-center gap-1">
            <span>🔒 {t('episodeLockedHint')}</span>
          </p>
        )}
      </div>
    </div>
  );
};

interface LockedEpisodeCardProps {
  episode: Episode;
  language: 'id' | 'en';
  onSelectEpisode?: (ep: Episode) => void;
}

const LockedEpisodeCard: React.FC<LockedEpisodeCardProps> = ({ episode, language, onSelectEpisode }) => {
  const { t } = useLanguage();
  const countdown = useReleaseCountdown(episode.airDate, language);
  const isPlayable = Boolean(onSelectEpisode) && (countdown.isToday || countdown.isPassed);

  return (
    <div
      onClick={isPlayable && onSelectEpisode ? () => onSelectEpisode(episode) : undefined}
      className={`flex items-start sm:items-center gap-2.5 sm:gap-3.5 p-2 sm:p-2.5 rounded-xl border transition-all duration-300 ${
        isPlayable
          ? 'border-emerald-500/30 bg-emerald-500/[0.04] cursor-pointer hover:border-emerald-500/50 group'
          : 'border-white/[0.04] bg-white/[0.01] opacity-75 select-none cursor-not-allowed'
      }`}
      title={isPlayable ? (language === 'id' ? 'Klik untuk memutar episode' : 'Click to play episode') : t('episodeLockedHint')}
    >
      {/* Thumbnail with Lock / Play */}
      <div className="relative w-24 h-16 sm:w-32 sm:h-20 rounded-lg overflow-hidden flex-shrink-0 bg-cinema-850">
        <img
          src={episode.thumbnail}
          alt={episode.title}
          className={`w-full h-full object-cover ${isPlayable ? 'group-hover:scale-105 transition-transform duration-300' : 'filter grayscale contrast-90 brightness-75'}`}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center">
          {isPlayable ? (
            <div className="w-8 h-8 rounded-full bg-emerald-600/90 border border-emerald-400/50 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
              <Play className="w-3.5 h-3.5 ml-0.5 fill-current" />
            </div>
          ) : (
            <div className="w-7 h-7 rounded-full bg-black/70 border border-amber-400/30 flex items-center justify-center text-amber-300/80">
              <Lock className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 pr-0.5 sm:pr-1">
        <div className="flex flex-wrap items-center justify-between gap-1 sm:gap-2 mb-1">
          <span className="text-[10px] sm:text-[11px] font-sans font-bold tracking-wider uppercase text-slate-400 whitespace-nowrap">
            {t('episode')} {episode.episodeNumber}
          </span>
          <span className={`text-[8.5px] sm:text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider flex items-center gap-1 ${
            isPlayable
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
          }`}>
            {isPlayable ? <Play className="w-2.5 h-2.5 fill-current" /> : <Lock className="w-2.5 h-2.5" />}
            <span>{countdown.isToday ? t('airingToday') : countdown.formattedDate || t('upcomingRelease')}</span>
          </span>
        </div>

        <h5 className="text-xs sm:text-sm font-display font-medium text-slate-300 truncate">
          {episode.title}
        </h5>

        <EpisodeSynopsis
          synopsis={episode.synopsis}
          language={language}
          className="text-[10.5px] sm:text-[11px] text-slate-500 font-light line-clamp-2 mt-0.5 leading-relaxed"
        />

        {isPlayable && (
          <div className="mt-1 flex items-center gap-1.5 text-[10px] text-emerald-400">
            <Play className="w-3 h-3 fill-current" />
            <span className="font-medium">{language === 'id' ? 'Telah rilis — Putar Sekarang' : 'Released — Play Now'}</span>
          </div>
        )}
      </div>
    </div>
  );
};

interface EpisodeListProps {
  seasons: Season[];
  activeEpisodeId?: string;
  onSelectEpisode: (episode: Episode) => void;
  status?: string;
  isOngoing?: boolean;
  totalEpisodes?: number;
  releasedEpisodes?: number;
  currentSeasonTotalEpisodes?: number;
  currentSeasonReleasedEpisodes?: number;
  completedSeasons?: number[];
  ongoingSeason?: number;
  mediaId?: string;
  nextEpisodeToAir?: string;
  nextEpisodeInfo?: NextEpisodeAirInfo;
}

export const EpisodeList: React.FC<EpisodeListProps> = ({
  seasons,
  activeEpisodeId,
  onSelectEpisode,
  status,
  isOngoing,
  totalEpisodes,
  releasedEpisodes,
  currentSeasonTotalEpisodes,
  currentSeasonReleasedEpisodes,
  completedSeasons,
  ongoingSeason,
  mediaId,
  nextEpisodeToAir,
  nextEpisodeInfo,
}) => {
  const initialSeasonIdx = (() => {
    if (activeEpisodeId && seasons && seasons.length > 0) {
      const idx = seasons.findIndex((s) =>
        s.episodes?.some(
          (e) => e.id === activeEpisodeId || (Boolean(e.id) && e.id.toLowerCase() === activeEpisodeId.toLowerCase())
        )
      );
      if (idx >= 0) return idx;

      const match = activeEpisodeId.match(/s(\d+)/i) || activeEpisodeId.match(/season[_-]?(\d+)/i);
      if (match) {
        const sNum = parseInt(match[1], 10);
        const sIdx = seasons.findIndex((s) => Number(s.seasonNumber || (s as any).season_number) === sNum);
        if (sIdx >= 0) return sIdx;
      }
    }
    return 0;
  })();

  const [selectedSeasonIdx, setSelectedSeasonIdx] = useState(initialSeasonIdx);

  useEffect(() => {
    if (activeEpisodeId && seasons && seasons.length > 0) {
      let idx = seasons.findIndex((s) =>
        s.episodes?.some(
          (e) => e.id === activeEpisodeId || (Boolean(e.id) && e.id.toLowerCase() === activeEpisodeId.toLowerCase())
        )
      );
      if (idx === -1) {
        const match = activeEpisodeId.match(/s(\d+)/i) || activeEpisodeId.match(/season[_-]?(\d+)/i);
        if (match) {
          const sNum = parseInt(match[1], 10);
          idx = seasons.findIndex((s) => Number(s.seasonNumber || (s as any).season_number) === sNum);
        }
      }
      if (idx >= 0) {
        setSelectedSeasonIdx(idx);
      }
    }
  }, [activeEpisodeId, seasons]);
  const { playClick, playHover } = useSound();
  const { t, language } = useLanguage();

  const currentSeason = seasons[selectedSeasonIdx] || seasons[0];
  if (!currentSeason) return null;

  const sNum = Number(currentSeason.seasonNumber || (currentSeason as any).season_number || (selectedSeasonIdx + 1));

  const seriesStatus = getSeriesStatus({
    status,
    isOngoing,
    totalEpisodes,
    currentSeasonTotalEpisodes: currentSeasonTotalEpisodes || currentSeason.episodes.length || totalEpisodes,
    currentSeasonReleasedEpisodes: currentSeasonReleasedEpisodes,
    completedSeasons,
    ongoingSeason,
    seasons,
    nextEpisodeToAir,
    nextEpisodeInfo,
  });

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const isEpisodeUnreleased = (ep: Episode): boolean => {
    return checkEpisodeUnreleased(ep, {
      status,
      isOngoing,
      totalEpisodes,
      releasedEpisodes,
      currentSeasonTotalEpisodes,
      currentSeasonReleasedEpisodes,
      nextEpisodeToAir,
      nextEpisodeInfo,
      seasons,
      currentSeason: sNum,
      completedSeasons,
      ongoingSeason: ongoingSeason || seriesStatus?.ongoingSeason,
    });
  };

  const isThisSeasonOngoing = Boolean(
    currentSeason.episodes?.some(isEpisodeUnreleased) ||
    (seriesStatus?.isOngoing &&
      (seriesStatus.ongoingSeason ? sNum === seriesStatus.ongoingSeason : sNum === (seriesStatus?.currentSeason || seasons.length)))
  );

  const unreleasedEps = currentSeason.episodes.filter(isEpisodeUnreleased);
  const firstUnreleasedEp = unreleasedEps.length > 0 ? unreleasedEps[0] : undefined;
  const releasedCount = currentSeason.episodes.length - unreleasedEps.length;

  const maxSeasonEpisodes =
    (typeof currentSeasonTotalEpisodes === 'number' && currentSeasonTotalEpisodes > 0 ? currentSeasonTotalEpisodes : undefined) ??
    (typeof totalEpisodes === 'number' && totalEpisodes > 0 ? totalEpisodes : undefined);

  const hasReachedMax =
    typeof maxSeasonEpisodes === 'number' &&
    maxSeasonEpisodes > 0 &&
    currentSeason.episodes.length >= maxSeasonEpisodes;

  const nextAirDate = nextEpisodeInfo?.airDate || nextEpisodeToAir;
  const hasFutureNextAirDate = Boolean(nextAirDate && nextAirDate > todayStr);

  const shouldAppendUpcomingCard =
    isThisSeasonOngoing &&
    unreleasedEps.length === 0 &&
    !hasReachedMax &&
    hasFutureNextAirDate;

  return (
    <div className="bg-cinema-900/70 border border-white/[0.06] rounded-2xl p-3 sm:p-6 backdrop-blur-xl">
      {/* Header & Season Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-5 pb-3 sm:pb-4 border-b border-white/[0.05]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-brand-gold/10 text-brand-champagne shrink-0">
            <Tv className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-display font-medium text-white text-xs sm:text-sm tracking-wider uppercase">
              {t('episodeListTitle')}
            </h4>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5 mt-1">
              <p className="text-[11px] text-slate-400 font-light">
                {releasedCount < currentSeason.episodes.length
                  ? (language === 'en'
                      ? `${releasedCount} of ${currentSeason.episodes.length} Episodes released`
                      : `${releasedCount} dari ${currentSeason.episodes.length} Episode telah tayang`)
                  : (language === 'en'
                      ? `${currentSeason.episodes.length} Episodes available this season`
                      : `Tersedia ${currentSeason.episodes.length} Episode dalam musim ini`)}
              </p>
              {seriesStatus && (
                seriesStatus.completedSeasonsLabel && seriesStatus.ongoingSeasonLabel ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[8.5px] uppercase font-sans tracking-wider px-2 py-0.5 rounded font-semibold border flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm whitespace-nowrap">
                      <span className="text-[9px] leading-none">✓</span>
                      <span>{seriesStatus.completedSeasonsLabel}</span>
                    </span>
                    <span className="text-[8.5px] uppercase font-sans tracking-wider px-2 py-0.5 rounded font-semibold border flex items-center gap-1 bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm whitespace-nowrap">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      <span>{seriesStatus.ongoingSeasonLabel}</span>
                    </span>
                  </div>
                ) : (
                  <span
                    className={`text-[8.5px] uppercase font-sans tracking-wider px-2 py-0.5 rounded font-semibold border flex items-center gap-1 whitespace-nowrap ${seriesStatus.badgeClass}`}
                  >
                    {seriesStatus.isOngoing ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    ) : (
                      <span className="text-[9px] leading-none">✓</span>
                    )}
                    <span>{seriesStatus.seasonBreakdown || seriesStatus.label}</span>
                  </span>
                )
              )}
            </div>
          </div>
        </div>

        {/* Season Pill Buttons with Complete / On Going Indicators */}
        {seasons.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 -mx-1 px-1 sm:mx-0 sm:px-0 scroll-smooth">
            {seasons.map((season, idx) => {
              const sNum = season.seasonNumber;
              const hasSeasonUnreleased = season.episodes?.some(isEpisodeUnreleased);
              const isThisSeasonOngoing = Boolean(
                hasSeasonUnreleased ||
                (seriesStatus?.isOngoing &&
                  (seriesStatus.ongoingSeason ? sNum === seriesStatus.ongoingSeason : sNum === (seriesStatus?.currentSeason || seasons.length)))
              );
              const isSelected = selectedSeasonIdx === idx;

              return (
                <button
                  key={season.seasonNumber}
                  onClick={() => {
                    playClick();
                    setSelectedSeasonIdx(idx);
                  }}
                  onMouseEnter={playHover}
                  className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs transition-all duration-300 flex items-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-[#E50914] text-white font-bold shadow-glow-red'
                      : 'bg-white/[0.04] text-slate-300 hover:text-white border border-white/[0.06]'
                  }`}
                >
                  <span>{season.title}</span>
                  {isThisSeasonOngoing ? (
                    <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5 tracking-wider uppercase ${
                      isSelected ? 'bg-black/30 text-amber-200' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
                      ON GOING
                    </span>
                  ) : (
                    <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5 tracking-wider uppercase ${
                      isSelected ? 'bg-black/30 text-emerald-200' : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      ✓ COMPLETE
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Episode Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
        {currentSeason.episodes.map((ep) => {
          const isUnreleased = isEpisodeUnreleased(ep);
          const isFirstUnreleased = firstUnreleasedEp && ep.id === firstUnreleasedEp.id;

          if (isFirstUnreleased) {
            const resolvedAirDate =
              ep.airDate ||
              (nextEpisodeInfo?.seasonNumber === sNum ? nextEpisodeInfo.airDate : undefined) ||
              nextEpisodeToAir;

            return (
              <UpcomingEpisodeCard
                key={ep.id}
                airDate={resolvedAirDate}
                episodeInfo={
                  nextEpisodeInfo?.seasonNumber === sNum && nextEpisodeInfo.episodeNumber === ep.episodeNumber
                    ? nextEpisodeInfo
                    : undefined
                }
                episodeNumber={ep.episodeNumber}
                title={ep.title}
                synopsis={ep.synopsis}
                thumbnail={ep.thumbnail}
                language={language}
                onPlayEpisode={() => {
                  const resolvedSNum = Number(
                    ep.seasonNumber || currentSeason.seasonNumber || (currentSeason as any).season_number || (selectedSeasonIdx + 1)
                  );
                  onSelectEpisode({
                    ...ep,
                    seasonNumber: resolvedSNum,
                    episodeNumber: Number(ep.episodeNumber || 1),
                  });
                }}
              />
            );
          }

          if (isUnreleased) {
            return (
              <LockedEpisodeCard
                key={ep.id}
                episode={ep}
                language={language}
                onSelectEpisode={(selectedEp) => {
                  const resolvedSNum = Number(
                    selectedEp.seasonNumber || currentSeason.seasonNumber || (currentSeason as any).season_number || (selectedSeasonIdx + 1)
                  );
                  onSelectEpisode({
                    ...selectedEp,
                    seasonNumber: resolvedSNum,
                    episodeNumber: Number(selectedEp.episodeNumber || 1),
                  });
                }}
              />
            );
          }

          const isCurrent = ep.id === activeEpisodeId;

          return (
            <a
              key={ep.id}
              href={mediaId ? getMediaWatchUrl(mediaId, ep.id) : '#'}
              onClick={(e) => {
                if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) {
                  return;
                }
                e.preventDefault();
                playClick();
                const resolvedSNum = Number(
                  ep.seasonNumber || currentSeason.seasonNumber || (currentSeason as any).season_number || (selectedSeasonIdx + 1)
                );
                onSelectEpisode({
                  ...ep,
                  seasonNumber: resolvedSNum,
                  episodeNumber: Number(ep.episodeNumber || 1),
                });
              }}
              onMouseEnter={playHover}
              className={`group flex items-start sm:items-center gap-2.5 sm:gap-3.5 p-2 sm:p-2.5 rounded-xl cursor-pointer border transition-all duration-300 no-underline block ${
                isCurrent
                  ? 'bg-brand-gold/10 border-brand-gold/40 shadow-glow-gold'
                  : 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.05] hover:border-white/10'
              }`}
            >
              {/* Thumbnail */}
              <div className="relative w-24 h-16 sm:w-32 sm:h-20 rounded-lg overflow-hidden flex-shrink-0 bg-cinema-850">
                <img
                  src={ep.thumbnail}
                  alt={ep.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div
                  className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
                    isCurrent ? 'bg-black/40 opacity-100' : 'bg-black/50 opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <div
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center ${
                      isCurrent ? 'bg-[#E50914] text-white shadow-md' : 'bg-white/90 text-black'
                    }`}
                  >
                    <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 ml-0.5 fill-current" />
                  </div>
                </div>

                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[8.5px] sm:text-[9px] text-slate-300 font-mono flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5 text-slate-400" />
                  {formatEpisodeDuration(ep.duration, language)}
                </div>
              </div>

              {/* Episode Info */}
              <div className="flex-1 min-w-0 pr-0.5 sm:pr-1">
                <div className="flex flex-wrap items-center justify-between gap-1 sm:gap-2 mb-1">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] sm:text-[11px] font-sans font-bold tracking-wider uppercase text-brand-champagne whitespace-nowrap">
                      {t('episode')} {ep.episodeNumber}
                    </span>
                    {mediaId && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          playClick();
                          const stream = ep.videoUrl || ep.servers?.[0]?.url;
                          if (stream) {
                            window.open(stream, '_blank', 'noopener,noreferrer');
                          } else {
                            const url = getAbsoluteWatchUrl(mediaId, ep.id);
                            window.open(url, '_blank', 'noopener,noreferrer');
                          }
                        }}
                        className="px-1.5 py-0.5 rounded-full bg-white/[0.05] hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-white/10 hover:border-amber-400/40 text-[9px] font-medium transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                        title={t('openInFullTabTooltip')}
                      >
                        <ExternalLink className="w-2.5 h-2.5 text-amber-300 shrink-0" />
                        <span>{language === 'en' ? 'Full Tab ↗' : 'Tab Penuh ↗'}</span>
                      </button>
                    )}
                  </div>
                  {isCurrent && (
                    <span className="text-[8.5px] sm:text-[9px] px-2 py-0.5 rounded-full bg-[#E50914] text-white font-bold uppercase tracking-wider shadow-sm shrink-0 whitespace-nowrap">
                      {t('nowPlaying')}
                    </span>
                  )}
                </div>

                <h5
                  className={`text-xs sm:text-sm font-display font-medium truncate ${
                    isCurrent ? 'text-brand-champagne' : 'text-slate-200 group-hover:text-brand-champagne'
                  } transition-colors`}
                >
                  {ep.title}
                </h5>

                <EpisodeSynopsis
                  synopsis={ep.synopsis}
                  language={language}
                  className="text-[10.5px] sm:text-[11px] text-slate-400 font-light line-clamp-2 mt-0.5 leading-relaxed"
                />
              </div>
            </a>
          );
        })}

        {/* Upcoming Episode Countdown Card (only if the upcoming episode is not already in currentSeason.episodes) */}
        {shouldAppendUpcomingCard && (
          <UpcomingEpisodeCard
            airDate={nextEpisodeInfo?.airDate || nextEpisodeToAir}
            episodeInfo={nextEpisodeInfo}
            fallbackEpisodeNumber={currentSeason.episodes.length + 1}
            language={language}
          />
        )}
      </div>
    </div>
  );
};
