import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, Share2, Film, Bookmark, Clock, ExternalLink } from 'lucide-react';
import { useUserProfile, PROFILE_PALETTES } from '../../context/UserProfileContext';
import { useWatchlist } from '../../context/WatchlistContext';
import { useLanguage } from '../../context/LanguageContext';
import { useSound } from '../../context/SoundContext';
import { supabase, isSupabaseConfigured } from '../../services/supabase';

interface PublicProfileModalProps {
  onClose: () => void;
  targetUsername?: string;
}

export const PublicProfileModal: React.FC<PublicProfileModalProps> = ({ onClose, targetUsername }) => {
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
      sub: language === 'en' ? 'titles saved' : 'film tersimpan',
    },
    {
      icon: <Clock className="w-4 h-4 text-sky-400" />,
      label: language === 'en' ? 'Watched' : 'Ditonton',
      value: totalWatched,
      sub: language === 'en' ? 'items in history' : 'total riwayat',
    },
    {
      icon: <Film className="w-4 h-4 text-emerald-400" />,
      label: language === 'en' ? 'Completed' : 'Selesai',
      value: completedCount,
      sub: language === 'en' ? 'fully watched' : 'ditonton tuntas',
    },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        ref={cardRef}
        className="relative w-full max-w-sm bg-cinema-950/95 border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header gradient band */}
        <div className={`h-24 w-full bg-gradient-to-br ${displayPalette.gradient} relative`}>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-xl bg-black/30 hover:bg-black/50 text-white/80 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Avatar overlapping the header */}
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-10 mb-4">
            {/* Avatar */}
            <div
              className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${displayPalette.gradient} border-4 border-cinema-950 flex items-center justify-center shadow-2xl`}
            >
              <span className="text-3xl font-bold text-white select-none">
                {displayProfile.emoji || displayProfile.initials || (displayProfile.name?.[0]?.toUpperCase() ?? '?')}
              </span>
            </div>

            {/* Share actions */}
            <div className="flex gap-2 mb-1">
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.07] border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 text-xs font-medium transition-all cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied
                  ? (language === 'en' ? 'Copied!' : 'Disalin!')
                  : (language === 'en' ? 'Copy Link' : 'Salin Link')}
              </button>
              <button
                onClick={handleShare}
                className="p-1.5 rounded-xl bg-white/[0.07] border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                title={language === 'en' ? 'Share Profile' : 'Bagikan Profil'}
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Name & tagline */}
          <div className="mb-5">
            <h2 className="text-xl font-display font-bold text-white leading-tight">
              {displayProfile.name || (language === 'en' ? 'Cinephile' : 'Cinephile')}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {language === 'en' ? 'Cinestream Member' : 'Anggota Cinestream'}
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {stats.map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center gap-1 px-2 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]"
              >
                {s.icon}
                <span className="text-xl font-bold text-white font-display">{s.value}</span>
                <span className="text-[9px] text-slate-400 text-center leading-tight">{s.sub}</span>
              </div>
            ))}
          </div>

          {/* Profile link preview */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.07]">
            <ExternalLink className="w-3 h-3 text-slate-500 shrink-0" />
            <span className="text-[10px] text-slate-500 truncate flex-1">{profileUrl}</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
