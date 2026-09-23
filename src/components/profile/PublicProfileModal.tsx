import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, Share2, Film, Bookmark, Clock, ExternalLink } from 'lucide-react';
import { useUserProfile, PROFILE_PALETTES } from '../../context/UserProfileContext';
import { useWatchlist } from '../../context/WatchlistContext';
import { useLanguage } from '../../context/LanguageContext';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useSound } from '../../context/SoundContext';
import { supabase, isSupabaseConfigured } from '../../services/supabase';

interface PublicProfileModalProps {
  onClose: () => void;
  targetUsername?: string;
}

export const PublicProfileModal: React.FC<PublicProfileModalProps> = ({ onClose, targetUsername }) => {
  useBodyScrollLock(true);

  const { profile: myProfile, activePalette: myPalette } = useUserProfile();
  const { watchlist: myWatchlist, historyItems: myHistoryItems } = useWatchlist();
  const { language } = useLanguage();
  const { playClick } = useSound();
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const isOtherUser = Boolean(
    targetUsername &&
    targetUsername.trim().toLowerCase() !== (myProfile.name || '').trim().toLowerCase()
  );

  const [remoteProfile, setRemoteProfile] = useState<{
    name: string;
    emoji?: string;
    initials?: string;
    paletteId?: string;
  } | null>(null);
  const [remoteWatchlistCount, setRemoteWatchlistCount] = useState<number | null>(null);

  useEffect(() => {
    if (!isOtherUser || !targetUsername) return;
    let isMounted = true;

    async function loadUser() {
      if (!isSupabaseConfigured) return;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .ilike('name', targetUsername!)
          .maybeSingle();

        if (data && isMounted) {
          setRemoteProfile({
            name: data.name,
            emoji: data.emoji,
            initials: data.initials,
            paletteId: data.theme_palette,
          });

          const { count } = await supabase
            .from('watchlist')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', data.id);

          if (count !== null && isMounted) {
            setRemoteWatchlistCount(count);
          }
        }
      } catch (err) {
        console.warn('Error fetching remote public profile:', err);
      }
    }

    loadUser();
    return () => {
      isMounted = false;
    };
  }, [isOtherUser, targetUsername]);

  const displayProfile = isOtherUser
    ? {
        name: remoteProfile?.name || targetUsername || 'Cinephile',
        emoji: remoteProfile?.emoji || '🍿',
        initials: remoteProfile?.initials || (targetUsername ? targetUsername.slice(0, 2).toUpperCase() : 'CS'),
        paletteId: remoteProfile?.paletteId || 'netflix-crimson',
      }
    : myProfile;

  const displayPalette = isOtherUser
    ? PROFILE_PALETTES.find((p) => p.id === displayProfile.paletteId) || myPalette
    : myPalette;

  const displayWatchlistCount = isOtherUser
    ? (remoteWatchlistCount ?? 0)
    : myWatchlist.length;

  const completedCount = isOtherUser ? 0 : myHistoryItems.filter((h) => h.completed).length;
  const totalWatched = isOtherUser ? 0 : myHistoryItems.length;

  const profileUrl = `${window.location.origin}/u/${encodeURIComponent(displayProfile.name || 'user')}`;
  const displayUrlText = `${typeof window !== 'undefined' ? window.location.host : 'cinestream'}/u/${displayProfile.name || 'user'}`;

  const handleCopyLink = async () => {
    playClick();
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleShare = async () => {
    playClick();
    const title = `${displayProfile.name || 'Cinephile'} on Cinestream`;
    const text =
      language === 'en'
        ? `Check out my Cinestream profile — ${displayWatchlistCount} watchlisted, ${completedCount} completed!`
        : `Lihat profil Cinestream-ku — ${displayWatchlistCount} ditambahkan, ${completedCount} selesai ditonton!`;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: profileUrl });
        return;
      } catch {
        /* fallback */
      }
    }
    handleCopyLink();
  };

  const stats = [
    {
      icon: <Bookmark className="w-4 h-4 text-violet-400" />,
      label: language === 'en' ? 'Watchlist' : 'Watchlist',
      value: displayWatchlistCount,
      sub: language === 'en' ? 'saved' : 'disimpan',
    },
    {
      icon: <Clock className="w-4 h-4 text-sky-400" />,
      label: language === 'en' ? 'History' : 'Riwayat',
      value: totalWatched,
      sub: language === 'en' ? 'in history' : 'riwayat',
    },
    {
      icon: <Film className="w-4 h-4 text-emerald-400" />,
      label: language === 'en' ? 'Watched' : 'Selesai',
      value: completedCount,
      sub: language === 'en' ? 'completed' : 'ditonton',
    },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    const handlePopState = () => {
      onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onClose]);

  const accentColor = displayPalette?.accent || '#E50914';

  return createPortal(
    <div
      className="fixed inset-0 z-[10005] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200 cursor-pointer select-none overscroll-contain"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          playClick();
          onClose();
        }
      }}
      onTouchEnd={(e) => {
        if (e.target === e.currentTarget) {
          playClick();
          onClose();
        }
      }}
    >
      <div
        ref={cardRef}
        className="relative w-full max-w-sm bg-[#121212] border border-white/15 rounded-3xl overflow-hidden shadow-2xl shadow-black/90 animate-in zoom-in-95 duration-200 cursor-default select-text"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header gradient band with cinematic vignette */}
        <div className={`h-28 w-full bg-gradient-to-br ${displayPalette.gradient} relative overflow-hidden`}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_70%)]" />

          {/* Close button with frosted glass circle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              playClick();
              onClose();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              playClick();
              onClose();
            }}
            className="absolute top-3 right-3 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-white transition-all cursor-pointer z-30 active:scale-95 touch-manipulation shadow-lg"
            title={language === 'en' ? 'Close' : 'Tutup'}
            aria-label={language === 'en' ? 'Close profile card' : 'Tutup kartu profil'}
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Card Body */}
        <div className="px-6 pb-6">
          {/* Avatar and Action Buttons Row */}
          <div className="flex items-start justify-between mb-4 relative z-10">
            {/* Elevated Dual-Ring Avatar Box (prevents any color blending or clipping) */}
            <div
              className="-mt-12 w-20 h-20 rounded-2xl p-1 bg-gradient-to-br from-white/30 to-white/5 shadow-2xl ring-4 ring-[#121212] shrink-0"
              style={{
                boxShadow: `0 10px 25px -5px ${accentColor}40`,
              }}
            >
              <div className="w-full h-full rounded-[12px] bg-[#1a1a1a] flex items-center justify-center border border-white/10 relative overflow-hidden">
                {/* Accent glow behind avatar */}
                <div
                  className="absolute inset-0 opacity-25 pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at center, ${accentColor}, transparent 70%)`,
                  }}
                />
                <span className="text-3xl filter drop-shadow-md select-none relative z-10 leading-none">
                  {displayProfile.emoji || displayProfile.initials || (displayProfile.name?.[0]?.toUpperCase() ?? '?')}
                </span>
              </div>
            </div>

            {/* Action Buttons - cleanly on dark background below banner */}
            <div className="flex items-center gap-2 pt-3">
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 text-white text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>
                  {copied
                    ? (language === 'en' ? 'Copied!' : 'Disalin!')
                    : (language === 'en' ? 'Copy Link' : 'Salin Link')}
                </span>
              </button>
              <button
                onClick={handleShare}
                className="p-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 text-white transition-all cursor-pointer shadow-sm active:scale-95"
                title={language === 'en' ? 'Share Profile' : 'Bagikan Profil'}
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Name & Tagline */}
          <div className="mb-5 space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wide font-sans leading-tight break-words">
              {displayProfile.name || (language === 'en' ? 'Cinephile' : 'Cinephile')}
            </h2>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[11px] text-slate-300 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{language === 'en' ? 'Cinestream Member' : 'Anggota Cinestream'}</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {displayPalette.name}
              </span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {stats.map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/[0.04] border border-white/[0.07] text-center"
              >
                <div className="mb-1.5">{s.icon}</div>
                <span className="text-2xl font-black text-white font-display leading-none">
                  {s.value}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 leading-tight">
                  {s.sub}
                </span>
              </div>
            ))}
          </div>

          {/* Profile URL Preview Bar (Clean display without raw %20) */}
          <div
            onClick={handleCopyLink}
            className="group flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer active:scale-[0.99]"
            title={language === 'en' ? 'Click to copy link' : 'Klik untuk salin link'}
          >
            <div className="flex items-center gap-2 min-w-0">
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-white shrink-0 transition-colors" />
              <span className="text-[11px] text-slate-400 group-hover:text-slate-200 font-mono truncate transition-colors">
                {displayUrlText}
              </span>
            </div>
            <span className="text-[10px] font-bold text-slate-300 group-hover:text-white font-sans shrink-0 px-2 py-0.5 rounded-md bg-white/[0.06]">
              {copied ? (language === 'en' ? '✓ Copied' : '✓ Tersalin') : (language === 'en' ? 'Copy' : 'Salin')}
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
