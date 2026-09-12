import React from 'react';
import { Home, Bookmark, History, CheckCircle2, SlidersHorizontal } from 'lucide-react';
import { useWatchlist } from '../../context/WatchlistContext';
import { useSound } from '../../context/SoundContext';
import { useLanguage } from '../../context/LanguageContext';
import { getTabUrl } from '../../utils/navigation';

interface MobileNavProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  isTheaterMode?: boolean;
  watchlistCount?: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  onSelectTab,
  isTheaterMode = false,
  watchlistCount,
}) => {
  const { watchlist, historyItems } = useWatchlist();
  const { playClick, playHover } = useSound();
  const { t } = useLanguage();

  const completedCount = historyItems.filter((h) => h.completed).length;
  const inProgressCount = historyItems.filter((h) => !h.completed).length;

  const items = [
    { id: 'home', label: t('navHome'), icon: Home },
    { id: 'advanced-search', label: t('navAdvancedSearch'), icon: SlidersHorizontal },
    { id: 'watchlist', label: t('navWatchlist'), icon: Bookmark, badge: watchlistCount !== undefined ? watchlistCount : watchlist.length },
    { id: 'watched', label: t('navWatched'), icon: CheckCircle2, badge: completedCount },
    { id: 'history', label: t('navHistory'), icon: History, badge: inProgressCount },
  ];

  return (
    <nav className={`lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#141414]/95 backdrop-blur-2xl border-t border-white/10 px-3 py-2.5 flex items-center justify-around shadow-2xl safe-area-bottom transition-all duration-500 ${
      isTheaterMode ? 'opacity-20 blur-sm pointer-events-none hover:opacity-100 hover:blur-none hover:pointer-events-auto' : 'opacity-100 blur-none'
    }`}>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        const targetUrl = getTabUrl(item.id);

        return (
          <a
            key={item.id}
            href={targetUrl}
            onClick={(e) => {
              if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;
              e.preventDefault();
              playClick();
              onSelectTab(item.id);
            }}
            onMouseEnter={playHover}
            className={`relative flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all duration-200 no-underline cursor-pointer ${
              isActive ? 'text-white font-bold scale-105' : 'text-neutral-400 hover:text-white font-medium'
            }`}
          >
            <div className="relative">
              <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-[#E50914]' : ''}`} />
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[14px] h-3.5 px-1 rounded-full bg-[#E50914] text-white text-[8px] font-black flex items-center justify-center shadow-md shadow-[#E50914]/40">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-wide">{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
};
