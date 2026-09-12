import React, { createContext, useContext, useState, useEffect } from 'react';
import type { MediaItem, PlayProgress, WatchHistoryItem, Episode } from '../types/media';
import { MOCK_CATALOG, createTvServers } from '../data/mockCatalog';
import { parseDurationToSeconds } from '../utils/formatters';

export const getHistoryItemKey = (
  mediaId: string,
  episodeId?: string,
  episodeNumber?: number,
  seasonNumber?: number
): string => {
  if (episodeId) return `${mediaId}__ep_${episodeId}`;
  if (episodeNumber !== undefined) return `${mediaId}__s${seasonNumber ?? 1}e${episodeNumber}`;
  return mediaId;
};

interface WatchlistContextType {
  watchlist: string[];
  watchlistMediaMap: Record<string, MediaItem>;
  toggleWatchlist: (id: string, mediaItem?: MediaItem) => boolean;
  isInWatchlist: (id: string) => boolean;
  continueWatching: PlayProgress[];
  updateProgress: (progress: PlayProgress, media?: MediaItem) => void;
  removeProgress: (mediaId: string, episodeId?: string) => void;
  history: string[];
  addToHistory: (id: string, media?: MediaItem) => void;
  // Enhanced History & Continue Watching System
  historyItems: WatchHistoryItem[];
  recordWatch: (
    media: MediaItem,
    progress?: {
      currentTime?: number;
      duration?: number;
      episode?: Episode;
      seasonNumber?: number;
    }
  ) => void;
  toggleCompleted: (targetId: string, episodeId?: string, mediaItem?: MediaItem) => void;
  removeHistoryItem: (targetId: string, episodeId?: string) => void;
  clearAllHistory: () => void;
}

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

const WATCHLIST_STORAGE_KEY = 'cinestream_watchlist';
const WATCHLIST_MEDIA_MAP_KEY = 'cinestream_watchlist_media_map_v1';
const PROGRESS_STORAGE_KEY = 'cinestream_continue_watching';
const HISTORY_STORAGE_KEY = 'cinestream_history';
const HISTORY_ITEMS_KEY = 'cinestream_watch_history_v3';

export const WatchlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(WATCHLIST_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Clear mock defaults if left over from initial template
        if (
          Array.isArray(parsed) &&
          parsed.length === 2 &&
          parsed.includes('dune-part-2') &&
          parsed.includes('the-last-of-us')
        ) {
          localStorage.removeItem(WATCHLIST_STORAGE_KEY);
          return [];
        }
        return Array.isArray(parsed) ? parsed : [];
      }
      return [];
    } catch {
      return [];
    }
  });

  // Full media snapshots for items in watchlist so they load synchronously on refresh
  const [watchlistMediaMap, setWatchlistMediaMap] = useState<Record<string, MediaItem>>(() => {
    try {
      const saved = localStorage.getItem(WATCHLIST_MEDIA_MAP_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return {};
  });

  // Comprehensive Watch History items with full media snapshots
  const [historyItems, setHistoryItems] = useState<WatchHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(HISTORY_ITEMS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If the only items in history are the old mock seeds (Dune 42% + Agak Laen completed), clean them up
          const isOnlyMockPlaceholders =
            parsed.length === 2 &&
            parsed.some((it) => it.mediaId === 'dune-part-2' && it.currentTime === 4260) &&
            parsed.some((it) => it.mediaId === 'agak-laen' && it.completed === true);

          if (isOnlyMockPlaceholders) {
            localStorage.removeItem(HISTORY_ITEMS_KEY);
            return [];
          }

          // Heal any items with missing historyId, duration, or cross-contamination
          const healedList = parsed.map((item: WatchHistoryItem) => {
            // Case 1: Reacher episode attached to Sore or wrong media title
            const isReacherEp =
              (typeof item.episodeId === 'string' && item.episodeId.includes('108978')) ||
              (typeof item.episodeTitle === 'string' && /margrave/i.test(item.episodeTitle)) ||
              (typeof item.episodeThumbnail === 'string' && item.episodeThumbnail.includes('15xLLZN3LLAdvoiHnYL5DcXlsYu'));

            const isTaggedAsSore =
              (typeof item.media?.title === 'string' && /sore/i.test(item.media.title)) ||
              (typeof item.mediaId === 'string' && (item.mediaId.includes('71938') || item.mediaId.includes('1385536')));

            if (isReacherEp && isTaggedAsSore) {
              const healedMedia: MediaItem = {
                ...(item.media || {}),
                id: 'tmdb-tv-108978',
                tmdbId: 108978,
                title: 'Reacher',
                titleId: 'Reacher',
                titleEn: 'Reacher',
                type: 'series',
                year: 2022,
                poster: 'https://image.tmdb.org/t/p/w500/f1VCQIG2iCyOookdgOzwtUpwWC0.jpg',
                backdrop: 'https://image.tmdb.org/t/p/original/pF0qkRsrHkdYadPWY9AMeFZfcwk.jpg',
                duration: '49m / ep',
                rating: 8.1,
                genres: ['Aksi & Petualangan', 'Kriminal', 'Drama'],
                servers: item.media?.servers || createTvServers(108978, 1, 1),
              };

              try {
                const customRaw = localStorage.getItem('cinestream_custom_catalog');
                const customList: MediaItem[] = customRaw ? JSON.parse(customRaw) : [];
                if (!customList.some((m) => m.id === 'tmdb-tv-108978')) {
                  customList.unshift(healedMedia);
                  localStorage.setItem('cinestream_custom_catalog', JSON.stringify(customList));
                  window.dispatchEvent(new Event('custom-catalog-updated'));
                }
              } catch {
                // ignore
              }

              const epId = item.episodeId || 'tmdb-tv-108978-s1-e1';
              const epNum = item.episodeNumber || 1;
              const sNum = item.seasonNumber || 1;
              const newKey = getHistoryItemKey('tmdb-tv-108978', epId, epNum, sNum);

              return {
                ...item,
                historyId: newKey,
                mediaId: 'tmdb-tv-108978',
                media: healedMedia,
                episodeId: epId,
                episodeTitle: item.episodeTitle || 'Welcome to Margrave',
                episodeThumbnail: item.episodeThumbnail || 'https://image.tmdb.org/t/p/w500/15xLLZN3LLAdvoiHnYL5DcXlsYu.jpg',
                seasonNumber: sNum,
                episodeNumber: epNum,
                duration: item.duration > 0 ? item.duration : 3240,
              };
            }

            // Case 2: Movie that accidentally retained episode metadata
            if (item.media?.type === 'movie' && (item.episodeId || item.episodeTitle)) {
              return {
                ...item,
                episodeId: undefined,
                episodeTitle: undefined,
                episodeThumbnail: undefined,
                seasonNumber: undefined,
                episodeNumber: undefined,
                historyId: item.mediaId,
                duration: item.duration > 0 ? item.duration : parseDurationToSeconds(item.media?.duration),
              };
            }

            const hId = item.historyId || getHistoryItemKey(item.mediaId, item.episodeId, item.episodeNumber, item.seasonNumber);
            const validDur = item.duration > 0 ? item.duration : parseDurationToSeconds(item.media?.duration);
            return {
              ...item,
              historyId: hId,
              duration: validDur,
            };
          });

          // Deduplicate by historyId
          const seen = new Set<string>();
          const deduped: WatchHistoryItem[] = [];
          for (const it of healedList) {
            const key = it.historyId || getHistoryItemKey(it.mediaId, it.episodeId, it.episodeNumber, it.seasonNumber);
            if (!seen.has(key)) {
              seen.add(key);
              deduped.push({ ...it, historyId: key });
            }
          }
          return deduped;
        }
      }
    } catch {
      // ignore
    }

    // Default for fresh users: completely clean and empty history
    return [];
  });

  // Continue watching progress for player synchronization
  const [continueWatching, setContinueWatching] = useState<PlayProgress[]>(() => {
    try {
      const saved = localStorage.getItem(PROGRESS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          Array.isArray(parsed) &&
          parsed.length === 1 &&
          parsed[0].mediaId === 'dune-part-2' &&
          parsed[0].currentTime === 4260
        ) {
          localStorage.removeItem(PROGRESS_STORAGE_KEY);
          return [];
        }
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [history, setHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          Array.isArray(parsed) &&
          parsed.length === 2 &&
          parsed.includes('dune-part-2') &&
          parsed.includes('agak-laen')
        ) {
          localStorage.removeItem(HISTORY_STORAGE_KEY);
          return [];
        }
        return Array.isArray(parsed) ? parsed : [];
      }
      return [];
    } catch {
      return [];
    }
  });

  // Auto backfill watchlistMediaMap for any items missing from local map
  useEffect(() => {
    if (watchlist.length === 0) return;
    setWatchlistMediaMap((prev) => {
      let changed = false;
      const nextMap = { ...prev };

      let customCatalog: MediaItem[] = [];
      try {
        const raw = localStorage.getItem('cinestream_custom_catalog');
        if (raw) customCatalog = JSON.parse(raw);
      } catch {}

      for (const id of watchlist) {
        const lower = id.toLowerCase();
        if (!nextMap[lower]) {
          const found =
            MOCK_CATALOG.find((m) => m.id.toLowerCase() === lower) ||
            customCatalog.find((m) => m.id.toLowerCase() === lower) ||
            historyItems.find((h) => h.mediaId.toLowerCase() === lower)?.media;
          if (found) {
            nextMap[lower] = found;
            changed = true;
          }
        }
      }

      if (changed) {
        try {
          localStorage.setItem(WATCHLIST_MEDIA_MAP_KEY, JSON.stringify(nextMap));
        } catch {}
        return nextMap;
      }
      return prev;
    });
  }, [watchlist, historyItems]);

  // Real-time multi-tab / multi-window synchronization on the same device
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === WATCHLIST_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setWatchlist(parsed);
        } catch {}
      } else if (e.key === WATCHLIST_MEDIA_MAP_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && typeof parsed === 'object') setWatchlistMediaMap(parsed);
        } catch {}
      } else if (e.key === HISTORY_ITEMS_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setHistoryItems(parsed);
        } catch {}
      } else if (e.key === PROGRESS_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setContinueWatching(parsed);
        } catch {}
      } else if (e.key === HISTORY_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setHistory(parsed);
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
    } catch {
      // ignore
    }
  }, [watchlist]);

  useEffect(() => {
    try {
      localStorage.setItem(WATCHLIST_MEDIA_MAP_KEY, JSON.stringify(watchlistMediaMap));
    } catch {
      // ignore
    }
  }, [watchlistMediaMap]);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_ITEMS_KEY, JSON.stringify(historyItems));
    } catch {
      // ignore
    }
  }, [historyItems]);

  useEffect(() => {
    try {
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(continueWatching));
    } catch {
      // ignore
    }
  }, [continueWatching]);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch {
      // ignore
    }
  }, [history]);

  const toggleWatchlist = (id: string, mediaItem?: MediaItem): boolean => {
    let isAdded = false;
    const lowerId = id.toLowerCase();

    // 1. Resolve media item if adding
    const targetMedia =
      mediaItem ||
      MOCK_CATALOG.find((m) => m.id.toLowerCase() === lowerId) ||
      watchlistMediaMap[lowerId] ||
      historyItems.find((h) => h.mediaId.toLowerCase() === lowerId)?.media;

    // 2. Compute next watchlist array
    let nextWatchlist: string[];
    const exists = watchlist.some((item) => item.toLowerCase() === lowerId);
    if (exists) {
      isAdded = false;
      nextWatchlist = watchlist.filter((item) => item.toLowerCase() !== lowerId);
    } else {
      isAdded = true;
      nextWatchlist = [...watchlist, id];
    }

    // Synchronous write to localStorage so refresh never loses it
    try {
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(nextWatchlist));
    } catch (err) {
      console.warn('Failed to persist watchlist to localStorage:', err);
    }
    setWatchlist(nextWatchlist);

    // 3. Synchronous update for watchlistMediaMap
    setWatchlistMediaMap((prevMap) => {
      const nextMap = { ...prevMap };
      if (!isAdded) {
        delete nextMap[lowerId];
      } else if (targetMedia) {
        nextMap[lowerId] = targetMedia;
      }
      try {
        localStorage.setItem(WATCHLIST_MEDIA_MAP_KEY, JSON.stringify(nextMap));
      } catch (err) {
        console.warn('Failed to persist watchlist media map:', err);
      }
      return nextMap;
    });

    // 4. Ensure targetMedia is in cinestream_custom_catalog
    if (targetMedia && isAdded) {
      try {
        const saved = localStorage.getItem('cinestream_custom_catalog');
        const list: MediaItem[] = saved ? JSON.parse(saved) : [];
        if (!list.some((m) => m.id.toLowerCase() === targetMedia.id.toLowerCase())) {
          const updated = [targetMedia, ...list].slice(0, 100);
          localStorage.setItem('cinestream_custom_catalog', JSON.stringify(updated));
          window.dispatchEvent(new Event('custom-catalog-updated'));
        }
      } catch (err) {
        console.warn('Failed to persist watchlist media to custom catalog:', err);
      }
    }

    window.dispatchEvent(new Event('cinestream-watchlist-updated'));
    return isAdded;
  };

  const isInWatchlist = (id: string) => {
    const lower = id.toLowerCase();
    return watchlist.some((item) => item.toLowerCase() === lower);
  };

  /**
   * Records or updates a title/episode in the watch history
   */
  const recordWatch = (
    media: MediaItem,
    progress?: {
      currentTime?: number;
      duration?: number;
      episode?: Episode;
      seasonNumber?: number;
    }
  ) => {
    if (!media || !media.id) return;

    // Strict validation: movies never have episodes
    const isMovie = media.type === 'movie';
    const rawEp = isMovie ? undefined : progress?.episode;

    // Strict validation: verify episode belongs to media if media has seasons
    let validatedEp: Episode | undefined = rawEp;
    if (rawEp && media.seasons && media.seasons.length > 0) {
      const belongs = media.seasons.some((s) => s.episodes?.some((e) => e.id === rawEp.id));
      if (!belongs) {
        validatedEp = undefined;
      }
    }

    const epId = validatedEp?.id;
    const epNum = validatedEp?.episodeNumber;
    const sNum = isMovie ? undefined : (progress?.seasonNumber ?? validatedEp?.seasonNumber);
    const targetKey = getHistoryItemKey(media.id, epId, epNum, sNum);

    setHistoryItems((prev) => {
      const existing = prev.find((item) => {
        const itemKey = item.historyId || getHistoryItemKey(item.mediaId, item.episodeId, item.episodeNumber, item.seasonNumber);
        return itemKey === targetKey;
      });

      const totalDur =
        progress?.duration && progress.duration > 0
          ? progress.duration
          : existing?.duration ||
            (validatedEp?.duration ? parseDurationToSeconds(validatedEp.duration) : parseDurationToSeconds(media.duration));

      const currTime =
        progress?.currentTime !== undefined && progress.currentTime > 0
          ? progress.currentTime
          : existing?.currentTime !== undefined && existing.currentTime > 0
          ? existing.currentTime
          : progress?.currentTime !== undefined
          ? progress.currentTime
          : 0;

      const isCompleted =
        currTime >= totalDur * 0.9 || (totalDur > 120 && totalDur - currTime <= 90);

      const updatedItem: WatchHistoryItem = {
        historyId: targetKey,
        mediaId: media.id,
        media,
        episodeId: isMovie ? undefined : epId,
        episodeTitle: isMovie ? undefined : (validatedEp?.title || (existing?.episodeId === epId ? existing?.episodeTitle : undefined)),
        episodeThumbnail: isMovie ? undefined : (validatedEp?.thumbnail || (existing?.episodeId === epId ? existing?.episodeThumbnail : undefined)),
        seasonNumber: isMovie ? undefined : (sNum || existing?.seasonNumber),
        episodeNumber: isMovie ? undefined : (epNum || existing?.episodeNumber),
        currentTime: currTime,
        duration: totalDur,
        lastWatched: Date.now(),
        completed: isCompleted,
      };

      const filtered = prev.filter((item) => {
        const itemKey = item.historyId || getHistoryItemKey(item.mediaId, item.episodeId, item.episodeNumber, item.seasonNumber);
        return itemKey !== targetKey;
      });

      const nextList = [updatedItem, ...filtered].slice(0, 100);
      try {
        localStorage.setItem(HISTORY_ITEMS_KEY, JSON.stringify(nextList));
      } catch (err) {
        console.warn('Failed to persist historyItems synchronously:', err);
      }
      return nextList;
    });

    // Sync continueWatching synchronously
    setContinueWatching((prev) => {
      const existingCw = prev.find((item) => {
        if (!isMovie && epId && item.episodeId) return item.mediaId === media.id && item.episodeId === epId;
        return item.mediaId === media.id;
      });

      const dur =
        progress?.duration && progress.duration > 0
          ? progress.duration
          : existingCw?.duration || (validatedEp?.duration ? parseDurationToSeconds(validatedEp.duration) : parseDurationToSeconds(media.duration));
      const curr =
        progress?.currentTime !== undefined && progress.currentTime > 0
          ? progress.currentTime
          : existingCw?.currentTime !== undefined && existingCw.currentTime > 0
          ? existingCw.currentTime
          : progress?.currentTime !== undefined
          ? progress.currentTime
          : 0;

      const filtered = prev.filter((item) => {
        if (!isMovie && epId && item.episodeId) return !(item.mediaId === media.id && item.episodeId === epId);
        return item.mediaId !== media.id;
      });

      const nextCw = [
        {
          mediaId: media.id,
          episodeId: isMovie ? undefined : epId,
          currentTime: curr,
          duration: dur,
          lastWatched: Date.now(),
        },
        ...filtered,
      ].slice(0, 30);

      try {
        localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(nextCw));
      } catch {}
      return nextCw;
    });

    // Sync history IDs
    setHistory((prev) => {
      const nextH = [media.id, ...prev.filter((id) => id !== media.id)].slice(0, 50);
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextH));
      } catch {}
      return nextH;
    });

    // Save to custom catalog
    try {
      const saved = localStorage.getItem('cinestream_custom_catalog');
      const list: MediaItem[] = saved ? JSON.parse(saved) : [];
      if (!list.some((m) => m.id.toLowerCase() === media.id.toLowerCase())) {
        const updated = [media, ...list].slice(0, 100);
        localStorage.setItem('cinestream_custom_catalog', JSON.stringify(updated));
        window.dispatchEvent(new Event('custom-catalog-updated'));
      }
    } catch {}

    window.dispatchEvent(new Event('cinestream-history-updated'));
  };

  const removeHistoryItem = (targetId: string, episodeId?: string) => {
    setHistoryItems((prev) => {
      const nextList = prev.filter((item) => {
        const itemKey = item.historyId || getHistoryItemKey(item.mediaId, item.episodeId, item.episodeNumber, item.seasonNumber);
        const isMatch =
          itemKey === targetId ||
          item.historyId === targetId ||
          (item.mediaId === targetId && (!episodeId || item.episodeId === episodeId));
        return !isMatch;
      });
      try {
        localStorage.setItem(HISTORY_ITEMS_KEY, JSON.stringify(nextList));
      } catch {}
      return nextList;
    });

    setContinueWatching((prev) => {
      const nextCw = prev.filter((p) => {
        if (episodeId && p.episodeId) {
          return !(p.mediaId === targetId && p.episodeId === episodeId);
        }
        return p.mediaId !== targetId;
      });
      try {
        localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(nextCw));
      } catch {}
      return nextCw;
    });

    setHistory((prev) => {
      const nextH = prev.filter((id) => id !== targetId);
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextH));
      } catch {}
      return nextH;
    });

    window.dispatchEvent(new Event('cinestream-history-updated'));
  };

  const clearAllHistory = () => {
    setHistoryItems([]);
    setContinueWatching([]);
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_ITEMS_KEY);
      localStorage.removeItem(PROGRESS_STORAGE_KEY);
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch {}
    window.dispatchEvent(new Event('cinestream-history-updated'));
  };

  const updateProgress = (newProgress: PlayProgress, media?: MediaItem) => {
    const targetMedia = media || historyItems.find((h) => h.mediaId === newProgress.mediaId)?.media;
    if (targetMedia) {
      let epObj: Episode | undefined;
      if (newProgress.episodeId && targetMedia.seasons) {
        for (const s of targetMedia.seasons) {
          const found = s.episodes?.find((e) => e.id === newProgress.episodeId);
          if (found) {
            epObj = found;
            break;
          }
        }
      }

      recordWatch(targetMedia, {
        currentTime: newProgress.currentTime,
        duration: newProgress.duration,
        episode: epObj || (newProgress.episodeId ? ({ id: newProgress.episodeId } as any) : undefined),
      });
    } else {
      setContinueWatching((prev) => {
        const filtered = prev.filter((item) => {
          if (newProgress.episodeId && item.episodeId) {
            return !(item.mediaId === newProgress.mediaId && item.episodeId === newProgress.episodeId);
          }
          return item.mediaId !== newProgress.mediaId;
        });
        const nextCw = [newProgress, ...filtered].slice(0, 30);
        try {
          localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(nextCw));
        } catch {}
        return nextCw;
      });
    }
  };

  const removeProgress = (mediaId: string, episodeId?: string) => {
    removeHistoryItem(mediaId, episodeId);
  };

  const addToHistory = (id: string, media?: MediaItem) => {
    if (media) {
      recordWatch(media);
    } else {
      setHistory((prev) => {
        const nextH = [id, ...prev.filter((item) => item !== id)].slice(0, 50);
        try {
          localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextH));
        } catch {}
        return nextH;
      });
    }
  };

  const toggleCompleted = (targetId: string, episodeId?: string, mediaItem?: MediaItem) => {
    setHistoryItems((prev) => {
      const existingIndex = prev.findIndex((item) => {
        const itemKey = item.historyId || getHistoryItemKey(item.mediaId, item.episodeId, item.episodeNumber, item.seasonNumber);
        return (
          itemKey === targetId ||
          item.historyId === targetId ||
          (item.mediaId === targetId && (!episodeId || item.episodeId === episodeId))
        );
      });

      let nextList: WatchHistoryItem[];

      if (existingIndex >= 0) {
        nextList = prev.map((item, idx) => {
          if (idx === existingIndex) {
            const nextCompleted = !item.completed;
            return {
              ...item,
              completed: nextCompleted,
              currentTime: nextCompleted ? item.duration : 0,
              lastWatched: Date.now(),
            };
          }
          return item;
        });
      } else {
        // Item is not yet in historyItems: auto create it with completed: true
        let targetMedia = mediaItem;
        if (!targetMedia) {
          targetMedia =
            MOCK_CATALOG.find((m) => m.id.toLowerCase() === targetId.toLowerCase()) ||
            watchlistMediaMap[targetId.toLowerCase()];
        }
        if (!targetMedia) {
          try {
            const raw = localStorage.getItem('cinestream_custom_catalog');
            if (raw) {
              const list: MediaItem[] = JSON.parse(raw);
              targetMedia = list.find((m) => m.id.toLowerCase() === targetId.toLowerCase());
            }
          } catch {}
        }

        if (targetMedia) {
          const totalDur = parseDurationToSeconds(targetMedia.duration) || 5400;
          const newItem: WatchHistoryItem = {
            historyId: targetId,
            mediaId: targetMedia.id,
            media: targetMedia,
            currentTime: totalDur,
            duration: totalDur,
            lastWatched: Date.now(),
            completed: true,
          };
          nextList = [newItem, ...prev].slice(0, 100);
        } else {
          nextList = prev;
        }
      }

      try {
        localStorage.setItem(HISTORY_ITEMS_KEY, JSON.stringify(nextList));
      } catch (err) {
        console.warn('Failed to persist historyItems synchronously:', err);
      }

      return nextList;
    });

    // If completed, remove from continueWatching row
    setContinueWatching((prev) => {
      const nextCw = prev.filter((p) => {
        if (episodeId && p.episodeId) {
          return !(p.mediaId === targetId && p.episodeId === episodeId);
        }
        return p.mediaId !== targetId;
      });
      try {
        localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(nextCw));
      } catch {}
      return nextCw;
    });

    window.dispatchEvent(new Event('cinestream-history-updated'));
  };

  return (
    <WatchlistContext.Provider
      value={{
        watchlist,
        watchlistMediaMap,
        toggleWatchlist,
        isInWatchlist,
        continueWatching,
        updateProgress,
        removeProgress,
        history,
        addToHistory,
        historyItems,
        recordWatch,
        toggleCompleted,
        removeHistoryItem,
        clearAllHistory,
      }}
    >
      {children}
    </WatchlistContext.Provider>
  );
};

export const useWatchlist = () => {
  const context = useContext(WatchlistContext);
  if (!context) {
    throw new Error('useWatchlist must be used within a WatchlistProvider');
  }
  return context;
};
