/**
 * Timed Comments (Danmaku) Service for Cinestream
 * Allows users to view and post timestamp-pinned floating comments.
 */

import { supabase, isSupabaseConfigured } from './supabase';

export interface TimedComment {
  id: string;
  mediaId: string;
  seasonEpisodeKey?: string; // e.g. "s1e1" or "movie"
  timeSeconds: number;
  text: string;
  authorName: string;
  authorColor?: string;
  createdAt: number;
}

const STORAGE_PREFIX = 'cinestream_timed_comments_';

// Initial starter comments to make playback lively right away
const SEED_COMMENTS: Record<string, Array<{ time: number; text: string; author: string }>> = {
  default: [
    { time: 12, text: 'Opening cinematicnya keren parah! 🔥', author: 'CineFan' },
    { time: 45, text: 'Visual effect di scene ini gila bener 👏', author: 'MovieNerd' },
    { time: 120, text: 'Plot twist mulai kelihatan nih haha', author: 'NontonYuk' },
    { time: 240, text: 'Soundtracknya merinding banget 🎶', author: 'Alex' },
    { time: 480, text: 'Akting aktornya top tier banget disini!', author: 'Siti' },
    { time: 900, text: 'Wait... jangan bilang dia yang jahat?! 😱', author: 'Budi' },
    { time: 1500, text: 'Scene favorit gua sejauh ini! Peak cinema!', author: 'Rizky' },
  ],
};

export async function fetchTimedComments(
  mediaId: string,
  seasonEpisodeKey = 'movie'
): Promise<TimedComment[]> {
  const cacheKey = `${STORAGE_PREFIX}${mediaId}_${seasonEpisodeKey}`;
  let localComments: TimedComment[] = [];

  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      localComments = JSON.parse(raw);
    }
  } catch {}

  // If Supabase is connected, fetch cloud comments
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('timed_comments')
        .select('*')
        .eq('media_id', mediaId)
        .eq('episode_key', seasonEpisodeKey)
        .order('time_seconds', { ascending: true })
        .limit(200);

      if (!error && data && data.length > 0) {
        const cloudComments: TimedComment[] = data.map((d: any) => ({
          id: d.id,
          mediaId: d.media_id,
          seasonEpisodeKey: d.episode_key,
          timeSeconds: Number(d.time_seconds),
          text: d.text,
          authorName: d.author_name || 'Anon',
          authorColor: d.author_color || '#38bdf8',
          createdAt: new Date(d.created_at).getTime(),
        }));

        // Merge unique
        const mergedMap = new Map<string, TimedComment>();
        [...cloudComments, ...localComments].forEach((c) => mergedMap.set(c.id, c));
        return Array.from(mergedMap.values()).sort((a, b) => a.timeSeconds - b.timeSeconds);
      }
    } catch {}
  }

  // If local comments exist, return them
  if (localComments.length > 0) {
    return localComments.sort((a, b) => a.timeSeconds - b.timeSeconds);
  }

  // Fallback to generated seed comments if nothing exists yet
  const seeds = SEED_COMMENTS.default.map((s, idx) => ({
    id: `seed-${idx}`,
    mediaId,
    seasonEpisodeKey,
    timeSeconds: s.time,
    text: s.text,
    authorName: s.author,
    authorColor: ['#38bdf8', '#34d399', '#f43f5e', '#fbbf24', '#a855f7'][idx % 5],
    createdAt: Date.now() - 3600000 * idx,
  }));

  try {
    localStorage.setItem(cacheKey, JSON.stringify(seeds));
  } catch {}

  return seeds;
}

export async function postTimedComment(
  comment: Omit<TimedComment, 'id' | 'createdAt'>
): Promise<TimedComment> {
  const newComment: TimedComment = {
    ...comment,
    id: `tc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
  };

  const key = comment.seasonEpisodeKey || 'movie';
  const cacheKey = `${STORAGE_PREFIX}${comment.mediaId}_${key}`;

  // Save to localStorage immediately
  try {
    const raw = localStorage.getItem(cacheKey);
    const list: TimedComment[] = raw ? JSON.parse(raw) : [];
    list.push(newComment);
    localStorage.setItem(cacheKey, JSON.stringify(list));
  } catch {}

  // Attempt Supabase insert
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('timed_comments').insert([
        {
          id: newComment.id,
          media_id: newComment.mediaId,
          episode_key: key,
          time_seconds: newComment.timeSeconds,
          text: newComment.text,
          author_name: newComment.authorName,
          author_color: newComment.authorColor,
        },
      ]);
    } catch (err) {
      console.warn('Timed comment cloud save error (local saved):', err);
    }
  }

  return newComment;
}
