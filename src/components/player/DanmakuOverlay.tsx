import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Eye, EyeOff, X } from 'lucide-react';
import {
  fetchTimedComments,
  postTimedComment,
  type TimedComment,
} from '../../services/timedCommentsService';
import { useUserProfile } from '../../context/UserProfileContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatTime } from '../../utils/formatters';

interface ActiveDanmakuItem {
  id: string;
  commentId: string;
  text: string;
  author: string;
  color: string;
  trackIndex: number;
}

interface DanmakuOverlayProps {
  mediaId: string;
  seasonEpisodeKey?: string;
  currentTime: number;
  isPlaying: boolean;
  isFullscreen?: boolean;
}

const TRACKS_COUNT = 4; // 4 vertical lanes

export const DanmakuOverlay: React.FC<DanmakuOverlayProps> = ({
  mediaId,
  seasonEpisodeKey = 'movie',
  currentTime,
  isPlaying,
}) => {
  const { profile } = useUserProfile();
  const { language } = useLanguage();

  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('cinestream_danmaku_enabled') !== 'false';
  });
  const [comments, setComments] = useState<TimedComment[]>([]);
  const [activeItems, setActiveItems] = useState<ActiveDanmakuItem[]>([]);
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const firedCommentIdsRef = useRef<Set<string>>(new Set());
  const trackAssignmentRef = useRef<number>(0);

  // Load comments
  useEffect(() => {
    let isMounted = true;
    fetchTimedComments(mediaId, seasonEpisodeKey).then((data) => {
      if (isMounted) setComments(data);
    });
    firedCommentIdsRef.current.clear();
    setActiveItems([]);
    return () => {
      isMounted = false;
    };
  }, [mediaId, seasonEpisodeKey]);

  // Reset fired cache on seek backwards
  const lastTimeRef = useRef<number>(currentTime);
  useEffect(() => {
    if (Math.abs(currentTime - lastTimeRef.current) > 3) {
      // User seeked
      firedCommentIdsRef.current.clear();
      setActiveItems([]);
    }
    lastTimeRef.current = currentTime;
  }, [currentTime]);

  // Check and spawn danmaku items
  useEffect(() => {
    if (!isEnabled || !isPlaying) return;

    const rounded = Math.floor(currentTime);
    const toFire = comments.filter(
      (c) =>
        Math.abs(c.timeSeconds - rounded) <= 1 && !firedCommentIdsRef.current.has(c.id)
    );

    if (toFire.length > 0) {
      const newActive: ActiveDanmakuItem[] = toFire.map((c) => {
        firedCommentIdsRef.current.add(c.id);
        const trackIndex = trackAssignmentRef.current % TRACKS_COUNT;
        trackAssignmentRef.current += 1;

        return {
          id: `${c.id}_${Date.now()}_${Math.random()}`,
          commentId: c.id,
          text: c.text,
          author: c.authorName,
          color: c.authorColor || '#38bdf8',
          trackIndex,
        };
      });

      setActiveItems((prev) => [...prev, ...newActive]);

      // Automatically remove from active after 9 seconds (duration of fly-across animation)
      setTimeout(() => {
        setActiveItems((prev) =>
          prev.filter((item) => !newActive.some((na) => na.id === item.id))
        );
      }, 9500);
    }
  }, [currentTime, isPlaying, isEnabled, comments]);

  const toggleEnabled = () => {
    setIsEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('cinestream_danmaku_enabled', String(next));
      } catch {}
      if (!next) setActiveItems([]);
      return next;
    });
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const newComment = await postTimedComment({
        mediaId,
        seasonEpisodeKey,
        timeSeconds: Math.floor(currentTime),
        text: commentText.trim(),
        authorName: profile.name || 'Penonton',
        authorColor: '#34d399',
      });

      // Prevent the auto-fire useEffect from spawning a duplicate comment
      firedCommentIdsRef.current.add(newComment.id);

      setComments((prev) => {
        if (prev.some((c) => c.id === newComment.id)) return prev;
        return [...prev, newComment];
      });

      // Immediately display user's own comment flying across
      const trackIndex = trackAssignmentRef.current % TRACKS_COUNT;
      trackAssignmentRef.current += 1;
      const userItem: ActiveDanmakuItem = {
        id: `self_${newComment.id}`,
        commentId: newComment.id,
        text: newComment.text,
        author: newComment.authorName,
        color: '#34d399',
        trackIndex,
      };
      setActiveItems((prev) => [...prev, userItem]);

      // Automatically remove user's comment after 9.5s (animation duration)
      setTimeout(() => {
        setActiveItems((prev) => prev.filter((item) => item.id !== userItem.id));
      }, 9500);

      setCommentText('');
      setIsInputOpen(false);
    } catch (err) {
      console.warn('Failed to post timed comment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* ── Floating Danmaku Screen Track ── */}
      {isEnabled && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-20 select-none">
          {activeItems.map((item) => {
            const topPercent = 8 + item.trackIndex * 14; // e.g. 8%, 22%, 36%, 50%
            return (
              <div
                key={item.id}
                className="absolute whitespace-nowrap will-change-transform animate-danmaku-fly pointer-events-none"
                style={{ top: `${topPercent}%` }}
              >
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 border border-white/15 backdrop-blur-md shadow-lg shadow-black/40 text-xs sm:text-sm font-semibold">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-white/80 font-normal text-[11px] sm:text-xs">
                    {item.author}:
                  </span>
                  <span className="text-white font-medium drop-shadow-md">
                    {item.text}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Danmaku Quick Controls Pill (Top Right under player toolbar) ── */}
      <div className="absolute top-16 right-4 z-30 flex items-center gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={toggleEnabled}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold backdrop-blur-md border transition-all cursor-pointer ${
            isEnabled
              ? 'bg-cyan-500/25 border-cyan-400/50 text-cyan-300 shadow-lg shadow-cyan-950/40'
              : 'bg-black/50 border-white/10 text-slate-400 hover:text-white'
          }`}
          title={isEnabled ? 'Danmaku ON' : 'Danmaku OFF'}
        >
          {isEnabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span>{isEnabled ? 'Danmaku' : 'Danmaku Off'}</span>
        </button>

        {isEnabled && (
          <button
            type="button"
            onClick={() => setIsInputOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-black/60 hover:bg-white/15 border border-white/15 text-slate-200 hover:text-white backdrop-blur-md transition-all cursor-pointer shadow-lg"
            title="Tulis Komentar di Menit Ini"
          >
            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Komentar</span>
          </button>
        )}
      </div>

      {/* ── Timed Comment Input Modal ── */}
      {isInputOpen && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md pointer-events-auto"
          onClick={() => setIsInputOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#13141f] border border-cyan-500/30 p-5 shadow-2xl text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-cyan-400">
                <MessageSquare className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  {language === 'en' ? 'Timed Comment' : 'Komentar Bertanda Waktu'}
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                  {formatTime(currentTime)}
                </span>
              </div>
              <button
                onClick={() => setIsInputOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePost} className="mt-4 space-y-3">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                maxLength={80}
                placeholder={
                  language === 'en'
                    ? 'Write your reaction at this timestamp...'
                    : 'Tulis reaksimu di menit ini (maks 80 karakter)...'
                }
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400/60"
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-400">
                  Komentar akan melayang saat penonton lain mencapai {formatTime(currentTime)}
                </span>
                <button
                  type="submit"
                  disabled={!commentText.trim() || isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg shadow-cyan-900/30 transition-all cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  <span>{isSubmitting ? 'Mengirim...' : 'Kirim'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
