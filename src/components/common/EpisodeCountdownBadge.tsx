import React from 'react';
import type { NextEpisodeAirInfo } from '../../types/media';
import { useReleaseCountdown } from '../../hooks/useReleaseCountdown';
import { useLanguage } from '../../context/LanguageContext';
import { Clock } from 'lucide-react';

interface EpisodeCountdownBadgeProps {
  airDate?: string;
  episodeInfo?: NextEpisodeAirInfo;
  className?: string;
}

export const EpisodeCountdownBadge: React.FC<EpisodeCountdownBadgeProps> = ({
  airDate,
  episodeInfo,
  className = '',
}) => {
  const { language, t } = useLanguage();
  const effectiveAirDate = episodeInfo?.airDate || airDate;
  const countdown = useReleaseCountdown(effectiveAirDate, language);

  if (!effectiveAirDate || !countdown.isValid || countdown.isPassed) return null;

  const epNumber = episodeInfo?.episodeNumber;
  const epPrefix = epNumber ? `Ep ${epNumber}` : '';

  if (countdown.isToday) {
    return (
      <span
        className={`px-2.5 py-0.5 rounded-full text-[10px] font-sans font-bold uppercase tracking-wider border flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm ${className}`}
        title={`${t('airDateLabel')}: ${countdown.formattedDate}${countdown.releaseTimeStr ? ` (${countdown.releaseTimeStr} WIB)` : ''}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
        <span>
          {epPrefix ? `${epPrefix}: ` : ''}
          {language === 'id' ? `Hari ini • ${countdown.countdownText}` : `Today • in ${countdown.countdownText}`}
        </span>
      </span>
    );
  }

  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-[10px] font-sans font-semibold tracking-wider border flex items-center gap-1.5 bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-sm ${className}`}
      title={`${t('airDateLabel')}: ${countdown.formattedDate}`}
    >
      <Clock className="w-3 h-3 text-amber-400 shrink-0" />
      <span>{epPrefix ? `${epPrefix} ` : ''}{language === 'id' ? `rilis ${countdown.countdownText}` : `in ${countdown.countdownText}`}</span>
    </span>
  );
};
