import React, { useState, useEffect } from 'react';
import {
  Play,
  Search,
  Menu,
  X,
  Globe,
  SlidersHorizontal,
} from 'lucide-react';
import { useWatchlist } from '../../context/WatchlistContext';
import { useSound } from '../../context/SoundContext';
import { useLanguage } from '../../context/LanguageContext';

interface NavbarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenSearch: () => void;
  isTheaterMode?: boolean;
  watchlistCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenSearch,
  isTheaterMode = false,
  watchlistCount,
}) => {
  const { watchlist, historyItems } = useWatchlist();
  const { playClick, playHover } = useSound();
  const { language, toggleLanguage, t } = useLanguage();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const completedCount = historyItems.filter((h) => h.completed).length;
  const inProgressCount = historyItems.filter((h) => !h.completed).length;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { id: 'home', label: t('navHome') },
    { id: 'advanced-search', label: t('navAdvancedSearch') },
    { id: 'watchlist', label: t('navWatchlist'), count: watchlistCount !== undefined ? watchlistCount : watchlist.length },
    { id: 'watched', label: t('navWatched'), count: completedCount },
    { id: 'history', label: t('navHistory'), count: inProgressCount },
  ];

  return (
    <header
      className={`fixed top-0 inset-x-0 z-40 transition-all duration-500 ${
        isScrolled
          ? 'bg-[#141414]/95 backdrop-blur-xl border-b border-white/[0.08] py-3 shadow-2xl'
          : 'bg-gradient-to-b from-black/95 via-black/60 to-transparent py-4 sm:py-5'
      } ${
        isTheaterMode
          ? 'opacity-20 blur-sm hover:opacity-100 hover:blur-none pointer-events-none hover:pointer-events-auto'
          : 'opacity-100 blur-none'
      }`}
    >
      <div className="max-w-[1720px] 2xl:max-w-[1880px] 3xl:max-w-[2200px] 4xl:max-w-[2600px] mx-auto px-4 sm:px-8 lg:px-12 3xl:px-16 flex items-center justify-between gap-4 xl:gap-6">
        {/* Brand Logo - Modern Netflix-Style Streaming Identity */}
        <div
          onClick={() => {
            playClick();
            onSelectTab('home');
          }}
          onMouseEnter={playHover}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div className="w-8 h-8 rounded bg-[#E50914] flex items-center justify-center shadow-lg shadow-red-900/50 group-hover:scale-105 transition-transform duration-200">
            <Play className="w-4 h-4 text-white fill-white ml-0.5" />
          </div>

          <span className="font-display font-black text-2xl sm:text-3xl tracking-tight text-[#E50914] leading-none uppercase drop-shadow-[0_2px_10px_rgba(229,9,20,0.4)]">
            CINESTREAM
          </span>
        </div>

        {/* Desktop Navigation Links - Modern Minimalist Streaming Menu */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => {
                  playClick();
                  onSelectTab(link.id);
                }}
                onMouseEnter={playHover}
                className={`relative px-3.5 py-1.5 rounded text-[13px] tracking-normal transition-all duration-200 flex items-center gap-1.5 ${
                  isActive
                    ? 'text-white font-bold bg-white/10 shadow-sm'
                    : 'text-slate-300 hover:text-white font-normal hover:bg-white/[0.05]'
                }`}
              >
                {link.id === 'advanced-search' && (
                  <SlidersHorizontal className={`w-3.5 h-3.5 ${isActive ? 'text-[#E50914]' : 'text-slate-400'}`} />
                )}
                <span>{link.label}</span>
                {link.count !== undefined && link.count > 0 && (
                  <span
                    className={`text-[9.5px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
                      isActive ? 'bg-[#E50914] text-white' : 'bg-white/20 text-white'
                    }`}
                  >
                    {link.count}
                  </span>
                )}
                {isActive && (
                  <span className="absolute bottom-0 inset-x-3.5 h-[2px] bg-[#E50914] rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Quick Search */}
          <button
            onClick={() => {
              playClick();
              onOpenSearch();
            }}
            onMouseEnter={playHover}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 text-white transition-all text-xs"
          >
            <Search className="w-3.5 h-3.5 text-white" />
            <span className="hidden sm:inline font-normal text-slate-200">{t('searchQuick')}</span>
            <kbd className="hidden md:inline-block px-1.5 py-0.5 rounded bg-black/50 text-[9px] text-slate-400 font-mono border border-white/10">
              ⌘K
            </kbd>
          </button>

          {/* Language Selector Toggle (ID / EN) */}
          <button
            onClick={() => {
              playClick();
              toggleLanguage();
            }}
            onMouseEnter={playHover}
            aria-label={t('switchLang')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 text-xs transition-all text-white group"
            title={language === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
          >
            <Globe className="w-3.5 h-3.5 text-white/90 group-hover:rotate-12 transition-transform duration-300" />
            <span className="font-mono text-[11px] font-black tracking-wider text-white">
              {language.toUpperCase()}
            </span>
          </button>

          {/* Profile Monogram - Netflix Style Red Square Avatar */}
          <div className="w-8 h-8 rounded bg-[#E50914] flex items-center justify-center text-white text-xs font-black shadow-md select-none">
            CN
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="lg:hidden p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-300"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-white/[0.08] bg-[#141414]/98 backdrop-blur-3xl px-6 py-5 space-y-2 mt-2">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => {
                playClick();
                onSelectTab(link.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-md text-sm transition-all ${
                activeTab === link.id
                  ? 'bg-[#E50914] text-white font-bold shadow-md'
                  : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {link.id === 'advanced-search' && (
                  <SlidersHorizontal className="w-4 h-4 text-white" />
                )}
                <span>{link.label}</span>
              </div>
              {link.count !== undefined && link.count > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-brand-crimson text-white">
                  {link.count}
                </span>
              )}
            </button>
          ))}

          {/* Mobile Language Switcher */}
          <button
            onClick={() => {
              playClick();
              toggleLanguage();
            }}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all text-slate-300 hover:bg-white/5 border border-white/5 mt-1"
          >
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-brand-champagne" />
              <span>{language === 'id' ? 'Bahasa Indonesia (ID)' : 'English (EN)'}</span>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-brand-gold/15 text-brand-gold font-bold">
              {language === 'id' ? 'Ganti ke EN' : 'Switch to ID'}
            </span>
          </button>
        </div>
      )}
    </header>
  );
};
