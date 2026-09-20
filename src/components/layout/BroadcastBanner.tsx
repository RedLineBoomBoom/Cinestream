import React, { useState, useEffect } from 'react';
import { Megaphone, AlertTriangle, CheckCircle2, X, ExternalLink } from 'lucide-react';
import {
  getActiveAnnouncement,
  fetchActiveAnnouncementFromCloud,
  getAnnouncementChannel,
  BROADCAST_STORAGE_KEY,
  type BroadcastAnnouncement,
} from '../../utils/admin';
import { sanitizeUrl } from '../../utils/security';

export const BroadcastBanner: React.FC = () => {
  const [announcement, setAnnouncement] = useState<BroadcastAnnouncement | null>(() => {
    const local = getActiveAnnouncement();
    if (local && local.active) {
      if (typeof window !== 'undefined') {
        const dismissedKey = `cinestream_dismissed_announcement_${local.id}`;
        if (sessionStorage.getItem(dismissedKey) === 'true') {
          return null;
        }
      }
      return local;
    }
    return null;
  });
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkAnnouncement = async () => {
      try {
        // 1. Check local storage cache first for 0ms latency
        const local = getActiveAnnouncement();
        if (local && local.active && isMounted) {
          const dismissedKey = `cinestream_dismissed_announcement_${local.id}`;
          if (sessionStorage.getItem(dismissedKey) === 'true') {
            setIsDismissed(true);
          } else {
            setIsDismissed(false);
            setAnnouncement(local);
          }
        }

        // 2. Fetch latest from Supabase Cloud (ensures mobile, tablet, and PWAs see it)
        const cloud = await fetchActiveAnnouncementFromCloud();
        if (!isMounted) return;

        if (cloud && cloud.active) {
          const dismissedKey = `cinestream_dismissed_announcement_${cloud.id}`;
          if (sessionStorage.getItem(dismissedKey) === 'true') {
            setIsDismissed(true);
          } else {
            setIsDismissed(false);
            setAnnouncement(cloud);
          }
        } else if (!local || !local.active) {
          setAnnouncement(null);
        }
      } catch (err) {
        console.warn('Error syncing broadcast banner:', err);
      }
    };

    // Initial check on mount
    checkAnnouncement();

    // 3. Listen for real-time WebSocket push updates from Supabase channel
    const ch = getAnnouncementChannel();
    if (ch) {
      ch.on('broadcast', { event: 'announcement_sync' }, ({ payload }) => {
        if (!isMounted) return;
        const incoming = payload as BroadcastAnnouncement | null;
        if (incoming && incoming.active) {
          const dismissedKey = `cinestream_dismissed_announcement_${incoming.id}`;
          if (sessionStorage.getItem(dismissedKey) === 'true') {
            setIsDismissed(true);
          } else {
            setIsDismissed(false);
            setAnnouncement(incoming);
            try {
              localStorage.setItem(BROADCAST_STORAGE_KEY, JSON.stringify(incoming));
            } catch {}
          }
        } else {
          setAnnouncement(null);
          try {
            localStorage.removeItem(BROADCAST_STORAGE_KEY);
          } catch {}
        }
      });
    }

    // 4. Listen for real-time updates dispatched locally from AdminDashboard
    const handleLocalUpdate = (e: CustomEvent<BroadcastAnnouncement | null>) => {
      const active = e.detail;
      if (active && active.active) {
        setAnnouncement(active);
        setIsDismissed(false);
      } else {
        setAnnouncement(null);
      }
    };

    // 5. Check on window focus or visibility change (user reopens mobile browser / PWA)
    const handleFocus = () => {
      checkAnnouncement();
    };

    window.addEventListener('cinestream_announcement_updated' as any, handleLocalUpdate as any);
    window.addEventListener('storage', checkAnnouncement);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    // Periodic check every 30 seconds to keep all devices synchronized
    const interval = setInterval(checkAnnouncement, 30000);

    return () => {
      isMounted = false;
      window.removeEventListener('cinestream_announcement_updated' as any, handleLocalUpdate as any);
      window.removeEventListener('storage', checkAnnouncement);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      clearInterval(interval);
    };
  }, []);

  if (!announcement || !announcement.active || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem(`cinestream_dismissed_announcement_${announcement.id}`, 'true');
    } catch {}
  };

  const getStyle = () => {
    switch (announcement.type) {
      case 'alert':
        return {
          bg: 'bg-gradient-to-r from-red-950/90 via-rose-900/80 to-red-950/90 border-red-500/40 text-red-100',
          icon: <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 animate-pulse" />,
          badgeBg: 'bg-red-500/20 text-red-300 border-red-500/30',
        };
      case 'warning':
        return {
          bg: 'bg-gradient-to-r from-amber-950/90 via-orange-900/80 to-amber-950/90 border-amber-500/40 text-amber-100',
          icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
          badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        };
      case 'success':
        return {
          bg: 'bg-gradient-to-r from-emerald-950/90 via-teal-900/80 to-emerald-950/90 border-emerald-500/40 text-emerald-100',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
          badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        };
      case 'info':
      default:
        return {
          bg: 'bg-gradient-to-r from-cyan-950/90 via-blue-900/80 to-indigo-950/90 border-cyan-500/40 text-cyan-100',
          icon: <Megaphone className="w-4 h-4 text-cyan-400 shrink-0" />,
          badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        };
    }
  };

  const style = getStyle();

  return (
    <div
      role="alert"
      className={`relative z-40 w-full border-b backdrop-blur-md px-4 py-2 sm:py-2.5 shadow-lg animate-in fade-in slide-in-from-top-3 duration-300 ${style.bg}`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
          {style.icon}
          {announcement.title && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider border shrink-0 ${style.badgeBg}`}
            >
              {announcement.title}
            </span>
          )}
          <p className="truncate text-slate-100 font-medium leading-tight text-[11px] sm:text-xs md:text-sm">
            {announcement.message}
          </p>
          {announcement.linkUrl && announcement.linkText && sanitizeUrl(announcement.linkUrl) !== '#' && (
            <a
              href={sanitizeUrl(announcement.linkUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-bold underline underline-offset-2 hover:opacity-80 transition-opacity ml-1 shrink-0 text-xs"
            >
              <span>{announcement.linkText}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        <button
          onClick={handleDismiss}
          aria-label="Dismiss Announcement"
          className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
