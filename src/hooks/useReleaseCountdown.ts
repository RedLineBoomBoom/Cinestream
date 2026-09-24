import { useState, useEffect, useMemo } from 'react';
import { getAirDateTimestamp, resolveAirTimeWIB, type AirTimeOptions } from '../utils/releaseTime';

export interface CountdownData {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  isToday: boolean;
  isPassed: boolean;
  isValid: boolean;
  formattedDate: string;
  countdownText: string;
  releaseTimeStr?: string;
}

/**
 * Calculates remaining time until a given air date (YYYY-MM-DD or ISO string)
 * with exact broadcast/streaming release hour synchronization.
 * Updates every 1 second reactively.
 */
export function useReleaseCountdown(
  airDate?: string,
  language: 'id' | 'en' = 'id',
  options?: AirTimeOptions
): CountdownData {
  const targetTime = useMemo(() => {
    return getAirDateTimestamp(airDate, options);
  }, [airDate, options?.showId, options?.originalLanguage, JSON.stringify(options?.networks || []), JSON.stringify(options?.originCountry || [])]);

  const releaseTimeStr = useMemo(() => {
    if (!airDate) return undefined;
    return resolveAirTimeWIB(options);
  }, [airDate, options?.showId, options?.originalLanguage, JSON.stringify(options?.networks || []), JSON.stringify(options?.originCountry || [])]);

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!targetTime) return;

    // Tick every 1 second
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTime]);

  return useMemo(() => {
    if (!targetTime || !airDate) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalMs: 0,
        isToday: false,
        isPassed: false,
        isValid: false,
        formattedDate: '',
        countdownText: '',
        releaseTimeStr: undefined,
      };
    }

    const targetDateObj = new Date(targetTime);
    const nowDateObj = new Date(now);

    const isSameDay =
      targetDateObj.getFullYear() === nowDateObj.getFullYear() &&
      targetDateObj.getMonth() === nowDateObj.getMonth() &&
      targetDateObj.getDate() === nowDateObj.getDate();

    // Human-formatted date
    let formattedDate = '';
    try {
      formattedDate = targetDateObj.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      formattedDate = airDate;
    }

    const diff = targetTime - now;

    if (diff <= 0) {
      // Past the release time
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalMs: 0,
        isToday: isSameDay,
        isPassed: true,
        isValid: true,
        formattedDate,
        countdownText: isSameDay
          ? (language === 'id' ? 'Telah Rilis Hari Ini' : 'Released Today')
          : (language === 'id' ? 'Telah Rilis' : 'Released'),
        releaseTimeStr,
      };
    }

    const totalSeconds = Math.floor(diff / 1000);
    const seconds = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const minutes = totalMinutes % 60;
    const totalHours = Math.floor(totalMinutes / 60);
    const hours = totalHours % 24;
    const days = Math.floor(totalHours / 24);

    let countdownText = '';
    if (days > 0) {
      countdownText = language === 'id'
        ? `${days} Hari ${hours} Jam`
        : `${days}d ${hours}h`;
    } else if (hours > 0) {
      countdownText = language === 'id'
        ? `${hours} Jam ${minutes} Menit`
        : `${hours}h ${minutes}m`;
    } else {
      countdownText = language === 'id'
        ? `${minutes} Menit ${seconds} Detik`
        : `${minutes}m ${seconds}s`;
    }

    return {
      days,
      hours,
      minutes,
      seconds,
      totalMs: diff,
      isToday: isSameDay,
      isPassed: false,
      isValid: true,
      formattedDate,
      countdownText,
      releaseTimeStr,
    };
  }, [targetTime, now, airDate, language, releaseTimeStr]);
}
