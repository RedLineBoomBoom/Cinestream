import React, { useState, useRef, useEffect } from 'react';
import {
  Dices,
  Check,
  Pencil,
  Bookmark,
  Clock,
  CheckCircle2,
  Tv,
  ChevronRight,
  Palette,
  Smile,
  Type,
  X,
  LogOut,
  Sparkles,
  Cloud,
  Shield,
  RefreshCw,
} from 'lucide-react';
import { useUserProfile } from '../../context/UserProfileContext';
import { useWatchlist } from '../../context/WatchlistContext';
import { useSound } from '../../context/SoundContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { isAdminUser } from '../../utils/admin';
import { APP_VERSION, checkForAppUpdate, forceHardRefresh } from '../../utils/pwaUpdate';

interface ProfileDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: string) => void;
}

export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  isOpen,
  onClose,
  onSelectTab,
}) => {
  const {
    profile,
    activePalette,
    updateProfile,
    randomizeProfile,
    allPalettes,
    allEmojis,
    allInitials,
  } = useUserProfile();

  const { user, openAuthModal, signOut } = useAuth();
  const { watchlist, historyItems } = useWatchlist();
  const { playClick, playHover, playSuccess, playWhoosh } = useSound();
  const { language, t } = useLanguage();

  const isAdmin = isAdminUser(user, profile as any);

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(profile.name);
  const [activeTab, setActiveTab] = useState<'overview' | 'customize'>('overview');
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateStatusMsg, setUpdateStatusMsg] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCheckUpdate = async () => {
    playClick();
    setIsCheckingUpdate(true);
    setUpdateStatusMsg(null);
    try {
      const res = await checkForAppUpdate();
      setUpdateStatusMsg(res.message);
    } catch {
      setUpdateStatusMsg(language === 'en' ? 'Update check failed' : 'Gagal memeriksa pembaruan');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  // Track viewport size to switch positioning strategy
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const completedCount = historyItems.filter((h) => h.completed).length;
  const inProgressCount = historyItems.filter((h) => !h.completed).length;

  useEffect(() => {
    setNameInput(profile.name);
  }, [profile.name]);

  useEffect(() => {
    if (isEditingName) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditingName]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSaveName = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (nameInput.trim()) {
      playSuccess();
      updateProfile({ name: nameInput.trim() });
    }
    setIsEditingName(false);
  };

  const handleRandomize = () => {
    playWhoosh();
    randomizeProfile();
  };

  return (
    <>
      {/* Mobile backdrop dimmer — tap outside to close */}
      {isMobile && (
        <div
          className="fixed inset-0 z-[9989] bg-black/70 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div
        ref={dropdownRef}
        className={`z-[9990] rounded-2xl bg-[#111111] backdrop-blur-xl border border-white/12 shadow-2xl shadow-black/90 text-slate-100 animate-in fade-in slide-in-from-top-2 duration-200 overflow-y-auto no-scrollbar ${
          isMobile
            // Mobile: fixed to viewport — never goes off-screen
            ? 'fixed left-2 right-2 top-[4.25rem] max-h-[calc(100dvh-5rem)]'
            // Desktop: absolute below the avatar button
            : 'absolute right-0 top-full mt-2 w-96 max-w-[380px] max-h-[calc(100dvh-5rem)]'
        }`}
      >
      {/* Header Banner with Profile Palette Gradient */}
      <div className={`relative h-28 bg-gradient-to-r ${activePalette.gradient} p-4 pt-3.5 flex items-start justify-between overflow-hidden`}>
        <div className="absolute inset-0 bg-black/25" />
        <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none" />

        {isAdmin ? (
          <div className="relative z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-950/80 backdrop-blur-md border border-red-500/50 text-red-200 text-[10px] sm:text-[11px] font-mono font-bold tracking-wider uppercase shadow-md shadow-red-950/50">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>Admin Verified</span>
          </div>
        ) : user ? (
          <div className="relative z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/70 backdrop-blur-md border border-emerald-500/35 text-emerald-300 text-[10px] sm:text-[11px] font-mono font-bold tracking-wider uppercase shadow-sm">
            <Cloud className="w-3.5 h-3.5 text-emerald-400" />
            <span>{language === 'en' ? 'Cloud Synced' : 'Cloud Sync'}</span>
          </div>
        ) : (
          <div className="relative z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/35 backdrop-blur-md border border-white/10 text-white/90 text-[10px] sm:text-[11px] font-mono font-bold tracking-wider uppercase shadow-sm">
            <Tv className="w-3.5 h-3.5 text-white/80" />
            <span>{language === 'en' ? 'Guest Profile' : 'Profil Tamu'}</span>
          </div>
        )}

        <button
          onClick={() => {
            playClick();
            onClose();
          }}
          className="relative z-10 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white/80 hover:text-white transition-all cursor-pointer border border-white/10 shadow-sm"
          title={language === 'en' ? 'Close' : 'Tutup'}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Profile Info */}
      <div className="p-5 pt-0 relative">
        {/* Floating Avatar & Actions Row */}
        <div className="flex items-end justify-between -mt-9 mb-4">
          <div
            className={`w-18 h-18 rounded-2xl bg-gradient-to-br ${activePalette.gradient} p-0.5 border-4 border-[#181818] shadow-2xl ${activePalette.shadow} flex items-center justify-center select-none relative z-20`}
          >
            <div className="w-full h-full rounded-[12px] flex items-center justify-center bg-black/20 backdrop-blur-xs">
              {profile.avatarType === 'monogram' ? (
                <span className="font-display font-black text-2xl text-white tracking-wider drop-shadow-md">
                  {profile.initials}
                </span>
              ) : (
                <span className="text-3xl filter drop-shadow-md">
                  {profile.emoji}
                </span>
              )}
            </div>
          </div>

          {/* Quick Action: Randomize */}
          <button
            onClick={handleRandomize}
            onMouseEnter={playHover}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold text-white transition-all cursor-pointer shadow-md active:scale-95 relative z-20"
            title={language === 'en' ? 'Randomize Avatar & Colors' : 'Acak Avatar & Warna'}
          >
            <Dices className="w-3.5 h-3.5 text-amber-400 animate-spin-once" />
            <span>{language === 'en' ? 'Shuffle' : 'Acak'}</span>
          </button>
        </div>

        {/* Profile Name (Editable) */}
        <div className="mb-4">
          {isEditingName ? (
            <form onSubmit={handleSaveName} className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={24}
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-2.5 py-1 text-sm font-bold text-white focus:outline-none focus:border-[#E50914]"
              />
              <button
                type="submit"
                className="p-1.5 rounded-lg bg-[#E50914] text-white hover:bg-red-600 transition-colors cursor-pointer"
              >
                <Check className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-between group">
              <div>
                <h3 className="text-base sm:text-lg font-display font-black text-white tracking-wide truncate max-w-[240px]">
                  {profile.name}
                </h3>
                {user?.email ? (
                  <p className="text-[11px] font-mono text-emerald-400 truncate max-w-[220px]">
                    {user.email}
                  </p>
                ) : (
                  <p className="text-[11px] font-mono text-slate-400">
                    {activePalette.name} · {profile.avatarType === 'monogram' ? `Initials (${profile.initials})` : 'Emoji Persona'}
                  </p>
                )}
              </div>

              <button
                onClick={() => {
                  playClick();
                  setIsEditingName(true);
                }}
                onMouseEnter={playHover}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors opacity-80 group-hover:opacity-100 cursor-pointer"
                title={language === 'en' ? 'Edit Profile Name' : 'Ubah Nama Profil'}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* View Switcher Tabs: Overview vs Customize */}
        <div className="flex rounded-xl bg-white/[0.05] p-1 border border-white/[0.08] mb-4 text-xs font-semibold">
          <button
            onClick={() => {
              playClick();
              setActiveTab('overview');
            }}
            className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-white/15 text-white shadow-sm font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {language === 'en' ? 'My Activity' : 'Aktivitas Saya'}
          </button>
          <button
            onClick={() => {
              playClick();
              setActiveTab('customize');
            }}
            className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer ${
              activeTab === 'customize'
                ? 'bg-white/15 text-white shadow-sm font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {language === 'en' ? 'Customize Avatar' : 'Kustom Avatar'}
          </button>
        </div>

        {/* TAB 1: OVERVIEW & STATS */}
        {activeTab === 'overview' && (
          <div className="space-y-3">
            {/* Cloud Sync Account Banner (If Guest) */}
            {!user && (
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-red-600/20 via-rose-600/15 to-transparent border border-red-500/30 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-red-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{language === 'en' ? 'Sync Across Devices' : 'Sinkronkan Antar Perangkat'}</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {language === 'en'
                    ? 'Sign in with Google or Email to sync your Watchlist & History across mobile, tablet, and PC.'
                    : 'Masuk dengan Google atau Email agar Watchlist & Riwayat Anda tersambung di HP, Tab, dan Laptop.'}
                </p>
                <button
                  onClick={() => {
                    playClick();
                    onClose();
                    openAuthModal('signin');
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-[#E50914] hover:bg-red-600 text-white text-xs font-bold tracking-wide shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  {language === 'en' ? 'Sign In / Register' : 'Masuk / Daftar Akun'}
                </button>
              </div>
            )}

            {/* Exclusive Admin Dashboard Button (ONLY for Verified Admins) */}
            {isAdmin && (
              <button
                onClick={() => {
                  playClick();
                  onSelectTab('admin');
                  onClose();
                }}
                onMouseEnter={playHover}
                className="w-full p-3 rounded-xl bg-gradient-to-r from-red-950/70 via-rose-950/50 to-black/80 hover:from-red-900/80 hover:via-rose-900/60 hover:to-black/90 border border-red-500/40 hover:border-red-500/70 shadow-lg shadow-red-950/40 transition-all cursor-pointer group flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-600/30 border border-red-500/40 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                    <Shield className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Admin Command Center</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-black bg-[#E50914] text-white">PRO</span>
                    </div>
                    <div className="text-[10px] text-red-200/80 font-mono">
                      {language === 'en' ? 'Exclusive Admin Dashboard' : 'Panel Khusus Administrator'}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-red-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>
            )}

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  playClick();
                  onSelectTab('watchlist');
                  onClose();
                }}
                className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <Bookmark className="w-3.5 h-3.5 text-[#E50914]" />
                  <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-base font-mono font-black text-white">{watchlist.length}</div>
                <div className="text-[10px] text-slate-400 truncate">{t('navWatchlist')}</div>
              </button>

              <button
                onClick={() => {
                  playClick();
                  onSelectTab('history');
                  onClose();
                }}
                className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-base font-mono font-black text-white">{inProgressCount}</div>
                <div className="text-[10px] text-slate-400 truncate">{t('navHistory')}</div>
              </button>

              <button
                onClick={() => {
                  playClick();
                  onSelectTab('watched');
                  onClose();
                }}
                className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-base font-mono font-black text-white">{completedCount}</div>
                <div className="text-[10px] text-slate-400 truncate">{t('navWatched')}</div>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 font-light leading-relaxed border-t border-white/[0.06] pt-3">
              {user
                ? language === 'en'
                  ? 'Your Watchlist and History are securely backed up to the cloud.'
                  : 'Daftar tontonan dan riwayat Anda tersinkronisasi aman ke cloud.'
                : language === 'en'
                ? 'Your data is saved locally. Sign in to backup and sync across devices.'
                : 'Data Anda tersimpan di perangkat ini. Masuk untuk mencadangkan ke cloud.'}
            </p>

            {/* App Version & PWA Update Section */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-white tracking-wide">
                    Cinestream v{APP_VERSION}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  PWA / Web
                </span>
              </div>

              {updateStatusMsg && (
                <p className="text-[11px] text-emerald-400 font-medium leading-tight">
                  {updateStatusMsg}
                </p>
              )}

              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={handleCheckUpdate}
                  disabled={isCheckingUpdate}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-slate-200 text-[11px] font-semibold transition-all disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isCheckingUpdate ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
                  <span>{isCheckingUpdate ? (language === 'en' ? 'Checking...' : 'Memeriksa...') : (language === 'en' ? 'Check Update' : 'Cek Update')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    forceHardRefresh();
                  }}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-slate-300 hover:text-white text-[11px] font-semibold transition-all cursor-pointer"
                  title={language === 'en' ? 'Hard reload and clear local caches' : 'Muat ulang paksa dan bersihkan cache'}
                >
                  <span>{language === 'en' ? 'Hard Reload' : 'Muat Ulang'}</span>
                </button>
              </div>
            </div>

            {/* Sign Out Button if Logged In */}
            {user && (
              <button
                onClick={async () => {
                  playClick();
                  await signOut();
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/[0.05] hover:bg-red-500/20 border border-white/[0.1] hover:border-red-500/30 text-slate-300 hover:text-red-300 text-xs font-semibold transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{language === 'en' ? 'Sign Out' : 'Keluar Akun'}</span>
              </button>
            )}
          </div>
        )}

        {/* TAB 2: CUSTOMIZE AVATAR & COLORS */}
        {activeTab === 'customize' && (
          <div className="space-y-4 pr-1 no-scrollbar">
            {/* Avatar Style Choice (Monogram vs Emoji) */}
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-2">
                {language === 'en' ? 'Avatar Style' : 'Gaya Avatar'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    updateProfile({ avatarType: 'monogram' });
                  }}
                  className={`flex items-center justify-center gap-2 p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    profile.avatarType === 'monogram'
                      ? 'bg-white/20 border-white text-white shadow-sm'
                      : 'bg-white/[0.04] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <Type className="w-3.5 h-3.5" />
                  <span>Monogram ({profile.initials})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    updateProfile({ avatarType: 'emoji' });
                  }}
                  className={`flex items-center justify-center gap-2 p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    profile.avatarType === 'emoji'
                      ? 'bg-white/20 border-white text-white shadow-sm'
                      : 'bg-white/[0.04] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <Smile className="w-3.5 h-3.5" />
                  <span>Icon / Emoji ({profile.emoji})</span>
                </button>
              </div>
            </div>

            {/* Color Palette Selector */}
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                <Palette className="w-3 h-3 text-amber-400" />
                <span>{language === 'en' ? 'Color Palette' : 'Warna Profil'}</span>
              </label>
              <div className="grid grid-cols-5 gap-2">
                {allPalettes.map((p) => {
                  const isSelected = profile.paletteId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        playClick();
                        updateProfile({ paletteId: p.id });
                      }}
                      className={`h-8 rounded-xl bg-gradient-to-br ${p.gradient} flex items-center justify-center transition-all cursor-pointer hover:scale-105 ${
                        isSelected
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-[#181818] scale-105'
                          : 'opacity-75 hover:opacity-100'
                      }`}
                      title={p.name}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Emoji Selector (if emoji avatarType) */}
            {profile.avatarType === 'emoji' ? (
              <div>
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-2">
                  {language === 'en' ? 'Choose Emoji' : 'Pilih Emoji'}
                </label>
                <div className="grid grid-cols-8 gap-1.5">
                  {allEmojis.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => {
                        playClick();
                        updateProfile({ emoji: em });
                      }}
                      className={`h-8 rounded-lg flex items-center justify-center text-lg hover:bg-white/15 transition-all cursor-pointer ${
                        profile.emoji === em ? 'bg-white/20 scale-110' : 'bg-white/[0.04]'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Initials Selector */
              <div>
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-2">
                  {language === 'en' ? 'Choose Initials' : 'Pilih Inisial'}
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {allInitials.slice(0, 15).map((init) => (
                    <button
                      key={init}
                      type="button"
                      onClick={() => {
                        playClick();
                        updateProfile({ initials: init });
                      }}
                      className={`py-1 rounded-lg text-xs font-mono font-bold hover:bg-white/15 transition-all cursor-pointer ${
                        profile.initials === init ? 'bg-white/20 text-white border border-white/30' : 'bg-white/[0.04] text-slate-400'
                      }`}
                    >
                      {init}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </>
  );
};
