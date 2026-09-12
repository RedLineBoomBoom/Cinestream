import { useState, useEffect } from 'react';
import type { MediaItem } from '../types/media';

// In-memory translation cache
const memoryCache: Record<string, string> = {};

// LocalStorage cache key
const CACHE_STORAGE_KEY = 'cinestream_translations_v1';

// Load stored translations from localStorage on init
try {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(CACHE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      Object.assign(memoryCache, parsed);
    }
  }
} catch {
  // ignore storage error
}

/**
 * Generate a short hash key for text
 */
function hashKey(text: string, targetLang: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return `${targetLang}_${Math.abs(hash)}_${text.length}`;
}

/**
 * Persist translation cache to localStorage with size throttling
 */
function persistCache(key: string, value: string) {
  memoryCache[key] = value;
  try {
    if (typeof window !== 'undefined') {
      const keys = Object.keys(memoryCache);
      // Keep cache at reasonable size (max 400 entries)
      if (keys.length > 400) {
        keys.slice(0, 100).forEach((k) => delete memoryCache[k]);
      }
      localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(memoryCache));
    }
  } catch {
    // ignore quota errors
  }
}

/**
 * Translates arbitrary text into the target language ('id' | 'en')
 */
export async function translateText(text: string, targetLang: 'id' | 'en'): Promise<string> {
  const clean = text?.trim();
  if (!clean) return '';

  const cacheId = hashKey(clean, targetLang);
  if (memoryCache[cacheId]) {
    return memoryCache[cacheId];
  }

  // 1. Primary Engine: Google Translate Free Endpoint
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(
      clean
    )}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const translated = data[0].map((part: any) => part[0] || '').join('');
        if (translated && translated.trim().length > 0) {
          persistCache(cacheId, translated.trim());
          return translated.trim();
        }
      }
    }
  } catch {
    // try fallback
  }

  // 2. Secondary Fallback: MyMemory API (capped at first 450 chars)
  try {
    const pair = targetLang === 'id' ? 'en|id' : 'id|en';
    const fallbackUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      clean.slice(0, 450)
    )}&langpair=${pair}`;
    const res = await fetch(fallbackUrl);
    if (res.ok) {
      const data = await res.json();
      if (data?.responseData?.translatedText) {
        const translated = data.responseData.translatedText;
        persistCache(cacheId, translated);
        return translated;
      }
    }
  } catch {
    // ignore
  }

  // Graceful fallback to original text if offline
  return clean;
}

/**
 * Custom React Hook that automatically delivers translated synopsis based on active language
 */
export function useAutoTranslateSynopsis(
  media?: MediaItem | null,
  targetLang: 'id' | 'en' = 'id'
) {
  const [activeLang, setActiveLang] = useState<'id' | 'en'>(targetLang);
  const [synopsis, setSynopsis] = useState<string>(() => {
    if (!media) return '';
    if (targetLang === 'id' && media.synopsisId) return media.synopsisId;
    if (targetLang === 'en' && media.synopsisEn) return media.synopsisEn;
    if (targetLang === 'en' && media.imdbPlot) return media.imdbPlot;
    return media.synopsis || '';
  });
  const [isTranslating, setIsTranslating] = useState<boolean>(false);

  // Sync activeLang with targetLang whenever the global website language changes
  useEffect(() => {
    setActiveLang(targetLang);
  }, [targetLang]);

  // Translate / load appropriate synopsis when media or activeLang changes
  useEffect(() => {
    if (!media) {
      setSynopsis('');
      setIsTranslating(false);
      return;
    }

    let isMounted = true;

    // Fast path: Check direct pre-translated fields
    if (activeLang === 'id' && media.synopsisId) {
      setSynopsis(media.synopsisId);
      setIsTranslating(false);
      return;
    }

    if (activeLang === 'en') {
      if (media.synopsisEn) {
        setSynopsis(media.synopsisEn);
        setIsTranslating(false);
        return;
      }
      if (media.imdbPlot) {
        setSynopsis(media.imdbPlot);
        setIsTranslating(false);
        return;
      }
    }

    // Determine the best source text to translate from
    const sourceText =
      (activeLang === 'id'
        ? media.synopsisEn || media.imdbPlot || media.synopsis
        : media.synopsisId || media.synopsis) || '';

    if (!sourceText) {
      setSynopsis('');
      setIsTranslating(false);
      return;
    }

    const cId = hashKey(sourceText, activeLang);
    if (memoryCache[cId]) {
      setSynopsis(memoryCache[cId]);
      setIsTranslating(false);
      return;
    }

    // Set immediate initial text while translating in background
    setSynopsis(media.synopsis || sourceText);
    setIsTranslating(true);

    translateText(sourceText, activeLang)
      .then((translated) => {
        if (isMounted && translated) {
          setSynopsis(translated);
          setIsTranslating(false);
          if (activeLang === 'id') {
            media.synopsisId = translated;
          } else {
            media.synopsisEn = translated;
          }
        }
      })
      .catch(() => {
        if (isMounted) setIsTranslating(false);
      });

    return () => {
      isMounted = false;
    };
  }, [media?.id, media?.synopsis, media?.synopsisId, media?.synopsisEn, media?.imdbPlot, activeLang]);

  return {
    synopsis,
    isTranslating,
    activeLang,
    setActiveLang,
  };
}
