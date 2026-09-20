import React, { useState, useEffect } from 'react';
import {
  Play,
  Search,
  Menu,
  X,
  Globe,
  SlidersHorizontal,
  Sparkles,
  Shield,
} from 'lucide-react';
import { useWatchlist } from '../../context/WatchlistContext';
import { useUserProfile } from '../../context/UserProfileContext';
import { useAuth } from '../../context/AuthContext';
import { useSound } from '../../context/SoundContext';
import { useLanguage } from '../../context/LanguageContext';
import { ProfileDropdown } from '../profile/ProfileDropdown';
import { BroadcastBanner } from './BroadcastBanner';
import { getTabUrl } from '../../utils/navigation';
import { isAdminUser } from '../../utils/admin';
import type { ModalSearchSource } from '../search/SearchModal';

interface NavbarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenSearch: (source?: ModalSearchSource) => void;
  isTheaterMode?: boolean;
  watchlistCount?: number;
  isHidden?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenSearch,
  isTheaterMode = false,
  watchlistCount,
  isHidden = false,
}) => {
  const { watchlist, historyItems } = useWatchlist();
  const { profile, activePalette } = useUserProfile();
  const { user } = useAuth();
  const { playClick, playHover } = useSound();
  const { language, toggleLanguage, t } = useLanguage();
  const isAdmin = isAdminUser(user, profile as any);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const completedCount = historyItems.filter((h) => h.completed).length;
  const inProgressCount = historyItems.filter((h) => !h.completed).length;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Track active overlay to hide background floating search bars
  useEffect(() => {
    if (mobileMenuOpen || isProfileOpen) {
      document.body.setAttribute('data-nav-overlay-open', 'true');
    } else {
      document.body.removeAttribute('data-nav-overlay-open');
    }
    return () => {
      document.body.removeAttribute('data-nav-overlay-open');
    };
  }, [mobileMenuOpen, isProfileOpen]);

  const navLinks = [
    { id: 'home', label: t('navHome') },
    { id: 'advanced-search', label: t('navAdvancedSearch') },
    { id: 'watchlist', label: t('navWatchlist'), count: watchlistCount !== undefined ? watchlistCount : watchlist.length },
    { id: 'watched', label: t('navWatched'), count: completedCount },
    { id: 'history', label: t('navHistory'), count: inProgressCount },
  ];

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        isScrolled
          ? 'bg-[#141414]/95 backdrop-blur-xl border-b border-white/[0.08] pb-3 shadow-2xl'
          : 'bg-gradient-to-b from-black/95 via-black/60 to-transparent pb-4 sm:pb-5'
      } ${
        isHidden
          ? 'opacity-0 -translate-y-full pointer-events-none'
          : isTheaterMode
          ? 'opacity-20 blur-sm hover:opacity-100 hover:blur-none pointer-events-none hover:pointer-events-auto'
          : 'opacity-100 blur-none'
      }`}
      style={{
        paddingTop: isScrolled
          ? 'calc(env(safe-area-inset-top, 0px) + 12px)'
          : 'calc(env(safe-area-inset-top, 0px) + 16px)',
      }}
    >
      <div className="max-w-[1720px] 2xl:max-w-[1880px] 3xl:max-w-[2200px] 4xl:max-w-[2600px] mx-auto px-4 sm:px-8 lg:px-12 3xl:px-16 flex items-center justify-between gap-4 xl:gap-6">
        {/* Brand Logo - Modern Netflix-Style Streaming Identity */}
        <a
          href="/"
          onClick={(e) => {
            if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;
            e.preventDefault();
            playClick();
            onSelectTab('home');
          }}
          onMouseEnter={playHover}
          className="flex items-center gap-2.5 cursor-pointer select-none group no-underline text-inherit"
        >
          <div className="w-8 h-8 rounded bg-[#E50914] flex items-center justify-center shadow-lg shadow-red-900/50 group-hover:scale-105 transition-transform duration-200">
            <Play className="w-4 h-4 text-white fill-white ml-0.5" />
          </div>

          <span className="font-display font-black text-xl lg:text-xl xl:text-3xl tracking-tight text-[#E50914] leading-none uppercase drop-shadow-[0_2px_10px_rgba(229,9,20,0.4)]">
            CINESTREAM
          </span>
        </a>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 min-w-0 overflow-hidden">
          {navLinks.map((link) => {
            const isActive = activeTab === link.id;
            const targetUrl = getTabUrl(link.id);
            return (
              <a
                key={link.id}
                href={targetUrl}
                onClick={(e) => {
                  if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;
                  e.preventDefault();
                  playClick();
                  onSelectTab(link.id);
                }}
                onMouseEnter={playHover}
                className={`relative px-2 xl:px-3 py-1.5 rounded text-[11.5px] xl:text-[13px] tracking-normal transition-all duration-200 flex items-center gap-1 no-underline cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'text-white font-bold bg-white/10 shadow-sm'
                    : 'text-slate-300 hover:text-white font-normal hover:bg-white/[0.05]'
                }`}
              >
                {link.id === 'advanced-search' && (
                  <SlidersHorizontal className={`w-3 h-3 xl:w-3.5 xl:h-3.5 ${isActive ? 'text-[#E50914]' : 'text-slate-400'}`} />
                )}
                <span>{link.label}</span>
                {link.count !== undefined && link.count > 0 && (
                  <span
                    className={`text-[9px] px-1 py-0.5 rounded-full font-bold leading-none ${
                      isActive ? 'bg-[#E50914] text-white' : 'bg-white/20 text-white'
                    }`}
                  >
                    {link.count}
                  </span>
                )}
                {isActive && (
                  <span className="absolute bottom-0 inset-x-2 xl:inset-x-3 h-[2px] bg-[#E50914] rounded-full" />
                )}
              </a>
            );
          })}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-1 lg:gap-1.5 xl:gap-2">
          {/* AI Search Quick Button */}
          <button
            onClick={() => {
              playClick();
              onOpenSearch('ai');
            }}
            onMouseEnter={playHover}
            aria-label={t('aiSearchTab')}
            title={t('aiSearchTab')}
            className="flex items-center justify-center gap-1.5 h-8 px-2 lg:px-2.5 xl:px-3 rounded-full bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-red-600/20 hover:from-purple-600/35 hover:via-pink-600/35 hover:to-red-600/35 border border-purple-500/35 hover:border-purple-400 text-purple-200 hover:text-white transition-all text-xs font-semibold shadow-sm cursor-pointer active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span className="hidden xl:inline bg-gradient-to-r from-purple-200 via-pink-200 to-amber-200 bg-clip-text text-transparent font-bold whitespace-nowrap">
              {t('aiSearchTab')}
            </span>
          </button>

          {/* Quick Search */}
          <button
            onClick={() => {
              playClick();
              onOpenSearch('all');
            }}
            onMouseEnter={playHover}
            aria-label={t('searchQuick')}
            className="flex items-center justify-center gap-1.5 w-8 h-8 lg:w-auto lg:h-auto lg:px-2.5 lg:py-1.5 xl:px-3 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 text-white transition-all text-xs"
          >
            <Search className="w-3.5 h-3.5 text-white" />
            <span className="hidden xl:inline font-normal text-slate-200 whitespace-nowrap">{t('searchQuick')}</span>
            <kbd className="hidden 2xl:inline-block px-1.5 py-0.5 rounded bg-black/50 text-[9px] text-slate-400 font-mono border border-white/10">
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
            className="flex items-center justify-center gap-1 h-8 px-2 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 text-xs transition-all text-white group"
            title={language === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
          >
            <Globe className="w-3.5 h-3.5 text-white/90 group-hover:rotate-12 transition-transform duration-300" />
            <span className="font-mono text-[11px] font-black tracking-wider text-white">
              {language.toUpperCase()}
            </span>
          </button>

          {/* Exclusive Admin Quick Access (ONLY for Verified Admins) */}
          {isAdmin && (
            <button
              onClick={() => {
                playClick();
                onSelectTab('admin');
              }}
              onMouseEnter={playHover}
              className={`flex items-center gap-1.5 h-8 px-2.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-[#E50914] text-white border-[#E50914] shadow-lg shadow-red-950/40'
                  : 'bg-red-950/40 hover:bg-red-900/60 text-red-200 border-red-500/40 hover:border-red-500/70'
              }`}
              title="Admin Command Center"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xl:inline text-[11px] uppercase tracking-wider font-mono">Admin</span>
            </button>
          )}

          {/* Unique Per-Device Profile Avatar Button */}
          <div className="relative">
            <button
              onClick={() => {
                playClick();
                setMobileMenuOpen(false);
                setIsProfileOpen((prev) => !prev);
              }}
              onMouseEnter={playHover}
              className={`w-8 h-8 rounded-lg bg-gradient-to-br ${activePalette.gradient} p-0.5 shadow-md ${activePalette.shadow} hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center select-none border ${activePalette.border}`}
              title={`${profile.name} (${language === 'en' ? 'Click to customize profile' : 'Klik untuk kelola profil'})`}
            >
              <div className="w-full h-full rounded-[6px] flex items-center justify-center bg-black/15 backdrop-blur-xs text-white">
                {profile.avatarType === 'monogram' ? (
                  <span className="font-display font-black text-[11px] tracking-wider drop-shadow-xs">
                    {profile.initials}
                  </span>
                ) : (
                  <span className="text-sm leading-none drop-shadow-xs">
                    {profile.emoji}
                  </span>
                )}
              </div>
            </button>

            {/* Profile Dropdown Card */}
            <ProfileDropdown
              isOpen={isProfileOpen}
              onClose={() => setIsProfileOpen(false)}
              onSelectTab={onSelectTab}
            />
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => {
              setIsProfileOpen(false);
              setMobileMenuOpen((prev) => !prev);
            }}
            aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Menu'}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-300 hover:text-white transition-colors"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Global Broadcast Announcement Banner */}
      <BroadcastBanner />

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-white/[0.08] bg-[#141414]/98 backdrop-blur-3xl px-6 py-5 space-y-2 mt-2">
          {/* Mobile Profile Card Header */}
          <div
            onClick={() => {
              playClick();
              setMobileMenuOpen(false);
              setIsProfileOpen(true);
            }}
            className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] cursor-pointer transition-all mb-3"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${activePalette.gradient} p-0.5 shadow-md ${activePalette.shadow} flex items-center justify-center shrink-0 border ${activePalette.border}`}
              >
                <div className="w-full h-full rounded-[10px] flex items-center justify-center bg-black/20 text-white">
                  {profile.avatarType === 'monogram' ? (
                    <span className="font-display font-black text-xs tracking-wider">
                      {profile.initials}
                    </span>
                  ) : (
                    <span className="text-base leading-none">
                      {profile.emoji}
                    </span>
                  )}
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate max-w-[180px]">{profile.name}</div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {language === 'en' ? 'Device Profile' : 'Profil Perangkat Ini'}
                </div>
              </div>
            </div>
            <span className="text-[10px] font-bold text-white/80 bg-white/10 px-2.5 py-1 rounded-full border border-white/10">
              {language === 'en' ? 'Manage' : 'Kelola'}
            </span>
          </div>
          {navLinks.map((link) => {
            const targetUrl = getTabUrl(link.id);
            return (
              <a
                key={link.id}
                href={targetUrl}
                onClick={(e) => {
                  if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;
                  e.preventDefault();
                  playClick();
                  onSelectTab(link.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-md text-sm transition-all no-underline cursor-pointer ${
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
              </a>
            );
          })}

          {/* Exclusive Admin Quick Access (Mobile Drawer, ONLY for Admins) */}
          {isAdmin && (
            <a
              href="/admin"
              onClick={(e) => {
                e.preventDefault();
                playClick();
                onSelectTab('admin');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-md text-sm transition-all no-underline cursor-pointer border ${
                activeTab === 'admin'
                  ? 'bg-[#E50914] text-white font-bold shadow-md border-red-600'
                  : 'bg-red-950/30 text-red-200 border-red-500/30 hover:bg-red-900/40'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-amber-400" />
                <span className="font-bold">Admin Command Center</span>
              </div>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-red-500/20 text-red-300">
                PRO
              </span>
            </a>
          )}

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
