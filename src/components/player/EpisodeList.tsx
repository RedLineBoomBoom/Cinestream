import React, { useState } from 'react';
import type { Season, Episode } from '../../types/media';
import { Play, Tv, Clock, ExternalLink } from 'lucide-react';
import { useSound } from '../../context/SoundContext';
import { useLanguage } from '../../context/LanguageContext';
import { getSeriesStatus } from '../../utils/formatters';
import { getAbsoluteWatchUrl, getMediaWatchUrl } from '../../utils/navigation';

interface EpisodeListProps {
  seasons: Season[];
  activeEpisodeId?: string;
  onSelectEpisode: (episode: Episode) => void;
  status?: string;
  isOngoing?: boolean;
  totalEpisodes?: number;
  mediaId?: string;
}

export const EpisodeList: React.FC<EpisodeListProps> = ({
  seasons,
  activeEpisodeId,
  onSelectEpisode,
  status,
  isOngoing,
  totalEpisodes,
  mediaId,
}) => {
  const [selectedSeasonIdx, setSelectedSeasonIdx] = useState(0);
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
  });

  return (
    <div className="bg-cinema-900/70 border border-white/[0.06] rounded-2xl p-4 sm:p-6 backdrop-blur-xl">
      {/* Header & Season Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-white/[0.05]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-brand-gold/10 text-brand-champagne">
            <Tv className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-display font-medium text-white text-xs sm:text-sm tracking-wider uppercase">
              {t('episodeListTitle')}
            </h4>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[11px] text-slate-400 font-light">
                {language === 'en'
                  ? `${currentSeason.episodes.length} Episodes available this season`
                  : `Tersedia ${currentSeason.episodes.length} Episode dalam musim ini`}
              </p>
              {seriesStatus && (
                seriesStatus.completedSeasonsLabel && seriesStatus.ongoingSeasonLabel ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[8.5px] uppercase font-sans tracking-wider px-2 py-0.5 rounded font-semibold border flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm">
                      <span className="text-[9px] leading-none">✓</span>
                      <span>{seriesStatus.completedSeasonsLabel}</span>
                    </span>
                    <span className="text-[8.5px] uppercase font-sans tracking-wider px-2 py-0.5 rounded font-semibold border flex items-center gap-1 bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      <span>{seriesStatus.ongoingSeasonLabel}</span>
                    </span>
                  </div>
                ) : (
                  <span
                    className={`text-[8.5px] uppercase font-sans tracking-wider px-2 py-0.5 rounded font-semibold border flex items-center gap-1 ${seriesStatus.badgeClass}`}
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
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
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
                  className={`px-3 py-1.5 rounded-full text-xs transition-all duration-300 flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-brand-gold text-cinema-950 font-semibold shadow-glow-gold'
                      : 'bg-white/[0.04] text-slate-300 hover:text-white border border-white/[0.06]'
                  }`}
                >
                  <span>{season.title}</span>
                  {isThisSeasonOngoing ? (
                    <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5 tracking-wider uppercase ${
                      isSelected ? 'bg-black/20 text-cinema-950' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
                      ON GOING
                    </span>
                  ) : (
                    <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5 tracking-wider uppercase ${
                      isSelected ? 'bg-black/20 text-cinema-950' : 'bg-emerald-500/20 text-emerald-300'
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                onSelectEpisode(ep);
              }}
              onMouseEnter={playHover}
              className={`group flex items-center gap-3.5 p-2.5 rounded-xl cursor-pointer border transition-all duration-300 no-underline block ${
                isCurrent
                  ? 'bg-brand-gold/10 border-brand-gold/40 shadow-glow-gold'
                  : 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.05] hover:border-white/10'
              }`}
            >
              {/* Thumbnail */}
              <div className="relative w-28 h-18 sm:w-32 sm:h-20 rounded-lg overflow-hidden flex-shrink-0 bg-cinema-850">
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
                    className={`w-7 h-7 rounded-full flex items-center justify-center ${
                      isCurrent ? 'bg-brand-gold text-cinema-950' : 'bg-white/90 text-black'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 ml-0.5 fill-current" />
                  </div>
                </div>

                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] text-slate-300 font-mono flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5 text-slate-400" />
                  {ep.duration}
                </div>
              </div>

              {/* Episode Info */}
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-sans font-medium tracking-[0.18em] uppercase text-brand-champagne">
                      {t('episode')} {ep.episodeNumber}
                    </span>
                    {mediaId && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          playClick();
                          const url = getAbsoluteWatchUrl(mediaId, ep.id);
                          window.open(url, '_blank', 'noopener,noreferrer');
                        }}
                        className="p-1 rounded-full text-slate-400 hover:text-brand-champagne hover:bg-white/10 transition-colors cursor-pointer"
                        title={t('openInNewTabTooltip') || (language === 'en' ? 'Open episode in new tab' : 'Buka episode di tab baru')}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {isCurrent && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-brand-gold text-cinema-950 font-semibold uppercase tracking-wider">
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

                <p className="text-[11px] text-slate-400 font-light line-clamp-2 mt-0.5 leading-relaxed">
                  {ep.synopsis}
                </p>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
};
