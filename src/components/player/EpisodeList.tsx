import React, { useState, useEffect } from 'react';
import type { Season, Episode, NextEpisodeAirInfo } from '../../types/media';
import { Play, Tv, Clock, ExternalLink, Lock, Calendar, Sparkles } from 'lucide-react';
import { useSound } from '../../context/SoundContext';
import { useLanguage } from '../../context/LanguageContext';
import { getSeriesStatus } from '../../utils/formatters';
import { getAbsoluteWatchUrl, getMediaWatchUrl } from '../../utils/navigation';
import { useReleaseCountdown } from '../../hooks/useReleaseCountdown';

interface UpcomingEpisodeCardProps {
  airDate?: string;
  episodeInfo?: NextEpisodeAirInfo;
  fallbackEpisodeNumber: number;
  language: 'id' | 'en';
}

const UpcomingEpisodeCard: React.FC<UpcomingEpisodeCardProps> = ({
  airDate,
  episodeInfo,
  fallbackEpisodeNumber,
  language,
}) => {
  const { t } = useLanguage();
  const countdown = useReleaseCountdown(airDate, language);
  const epNumber = episodeInfo?.episodeNumber || fallbackEpisodeNumber;
  const epTitle = episodeInfo?.title || `${t('episode')} ${epNumber}`;

  return (
    <div
      className="relative flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-3.5 p-2.5 sm:p-3 rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/[0.08] via-cinema-900/90 to-cinema-950/95 shadow-md shadow-amber-950/20 select-none overflow-hidden col-span-1 md:col-span-2 transition-all duration-300 hover:border-amber-500/50"
      title={t('episodeLockedHint')}
    >
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Thumbnail or Locked Placeholder */}
      <div className="relative w-full sm:w-32 h-28 sm:h-20 rounded-lg overflow-hidden flex-shrink-0 bg-cinema-850 border border-amber-500/20 flex items-center justify-center">
        {episodeInfo?.stillPath ? (
          <img
            src={episodeInfo.stillPath}
            alt={epTitle}
            className="w-full h-full object-cover filter brightness-75 contrast-110"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-cinema-800 to-cinema-900 flex items-center justify-center">
            <Calendar className="w-7 h-7 text-amber-400/40" />
          </div>
        )}

        {/* Lock Overlay */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-md">
            <Lock className="w-4 h-4" />
          </div>
        </div>

        {/* Floating status on thumbnail */}
        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/85 text-[8.5px] text-amber-300 font-mono flex items-center gap-1 border border-amber-500/30">
          <Sparkles className="w-2.5 h-2.5 text-amber-400" />
          <span>{countdown.isToday ? t('airingToday') : t('upcomingRelease')}</span>
        </div>
      </div>

      {/* Episode Info & Live Countdown */}
      <div className="flex-1 min-w-0 w-full pr-1">
        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10.5px] sm:text-[11px] font-sans font-bold tracking-wider uppercase text-amber-300 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              {t('episode')} {epNumber} • {t('upcomingEpisode')}
            </span>
          </div>

          <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold uppercase tracking-wider flex items-center gap-1">
            <Lock className="w-2.5 h-2.5" />
            <span>{countdown.isToday ? t('airingToday') : countdown.countdownText || t('upcomingRelease')}</span>
          </span>
        </div>

        <h5 className="text-xs sm:text-sm font-display font-medium text-white/95 truncate">
          {epTitle}
        </h5>

        {/* Countdown display */}
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

        <p className="text-[9.5px] sm:text-[10px] text-slate-400/90 font-light mt-1 italic flex items-center gap-1">
          <span>ℹ️ {t('episodeLockedHint')}</span>
        </p>
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

  const seriesStatus = getSeriesStatus({
    status,
    isOngoing,
    totalEpisodes,
    currentSeasonTotalEpisodes: totalEpisodes,
    currentSeasonReleasedEpisodes: currentSeason.episodes.length,
    seasons,
    nextEpisodeToAir,
    nextEpisodeInfo,
  });

  const sNum = Number(currentSeason.seasonNumber || (currentSeason as any).season_number || (selectedSeasonIdx + 1));
  const isThisSeasonOngoing = Boolean(
    seriesStatus?.isOngoing &&
    (seriesStatus.ongoingSeason ? sNum === seriesStatus.ongoingSeason : sNum === (seriesStatus?.currentSeason || seasons.length))
  );
  const showUpcomingCard = isThisSeasonOngoing && (
    !nextEpisodeInfo?.seasonNumber || nextEpisodeInfo.seasonNumber === sNum
  );

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
                {language === 'en'
                  ? `${currentSeason.episodes.length} Episodes available this season`
                  : `Tersedia ${currentSeason.episodes.length} Episode dalam musim ini`}
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
              const isThisSeasonOngoing = Boolean(
                seriesStatus?.isOngoing &&
                (seriesStatus.ongoingSeason ? sNum === seriesStatus.ongoingSeason : sNum === (seriesStatus?.currentSeason || seasons.length))
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
                  {ep.duration}
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

                <p className="text-[10.5px] sm:text-[11px] text-slate-400 font-light line-clamp-2 mt-0.5 leading-relaxed">
                  {ep.synopsis}
                </p>
              </div>
            </a>
          );
        })}

        {/* Upcoming Episode Countdown Card */}
        {showUpcomingCard && (
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
