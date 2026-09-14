import { useState, useEffect, useMemo } from 'react';

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
}

/**
 * Calculates remaining time until a given air date (YYYY-MM-DD or ISO string).
 * Updates every 1 second reactively.
 */
export function useReleaseCountdown(airDate?: string, language: 'id' | 'en' = 'id'): CountdownData {
  const targetTime = useMemo(() => {
    if (!airDate) return null;
    try {
      // Check if YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(airDate)) {
        // Target 00:00:00 local time
        const [year, month, day] = airDate.split('-').map(Number);
        return new Date(year, month - 1, day, 0, 0, 0).getTime();
      }
      const parsed = new Date(airDate).getTime();
      return isNaN(parsed) ? null : parsed;
    } catch {
      return null;
    }
  }, [airDate]);

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

    if (isSameDay) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalMs: 0,
        isToday: true,
        isPassed: false,
        isValid: true,
        formattedDate,
        countdownText: language === 'id' ? 'Tayang Hari Ini' : 'Airing Today',
      };
    }

    const diff = targetTime - now;

    if (diff <= 0) {
      // Past the date
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalMs: 0,
        isToday: false,
        isPassed: true,
        isValid: true,
        formattedDate,
        countdownText: language === 'id' ? 'Segera Hadir' : 'Coming Soon',
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
      isToday: false,
      isPassed: false,
      isValid: true,
      formattedDate,
      countdownText,
    };
  }, [targetTime, now, airDate, language]);
}
