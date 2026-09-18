import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  X,
  Star,
  Play,
  Film,
  Globe2,
  Sparkles,
  Loader2,
  Clapperboard,
  Tv,
  Flame,
  Layers,
  Database,
  ExternalLink,
  Bot,
  Key,
} from 'lucide-react';
import type { MediaItem } from '../../types/media';
import { useSound } from '../../context/SoundContext';
import { useLanguage } from '../../context/LanguageContext';
import { getAbsoluteWatchUrl } from '../../utils/navigation';
import {
  searchHybrid,
  resolveToPlayableMediaItem,
  type UnifiedSearchResult,
  type SearchDatabaseSource,
} from '../../services/hybridSearch';
import { searchWithAI, getStoredGeminiApiKey, setStoredGeminiApiKey } from '../../services/aiSearch';
import { getSeriesStatus, formatGenre, getMediaTitle, getMediaPoster, getMediaBackdrop, formatMediaDuration } from '../../utils/formatters';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: MediaItem[];
  onSelectMedia: (media: MediaItem) => void;
  initialSource?: ModalSearchSource;
}

export type ModalSearchSource = 'ai' | 'all' | 'tmdb' | 'anime' | 'tvmaze' | 'omdb' | 'local';

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  catalog,
  onSelectMedia,
  initialSource = 'all',
}) => {
  const [query, setQuery] = useState('');
  const [searchSource, setSearchSource] = useState<ModalSearchSource>(initialSource);
  const [showAiKeySettings, setShowAiKeySettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => getStoredGeminiApiKey());
  const [keySavedBadge, setKeySavedBadge] = useState(false);
  const [results, setResults] = useState<UnifiedSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingMediaId, setLoadingMediaId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { playClick, playHover, playSuccess } = useSound();
  const { t, language } = useLanguage();

  // Focus and sync source on open
  useEffect(() => {
    if (isOpen) {
      if (initialSource) {
        setSearchSource(initialSource);
      }
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
      setIsSearching(false);
      setLoadingMediaId(null);
      setShowAiKeySettings(false);
    }
  }, [isOpen, initialSource]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !isOpen)) {
        e.preventDefault();
        if (isOpen) onClose();
        else inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Live search handler with debouncing
  const performSearch = useCallback(
    async (searchQuery: string, source: ModalSearchSource) => {
      const trimmed = searchQuery.trim();
      if (!trimmed) {
        setResults([]);
        setIsSearching(false);
        return;
      }

      if (source === 'local') {
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        if (source === 'ai') {
          const aiResults = await searchWithAI(trimmed, language);
          setResults(aiResults);
        } else {
          const hybridResults = await searchHybrid(
            trimmed,
            source as 'all' | 'tmdb' | 'anime' | 'tvmaze' | 'omdb',
            language
          );
          setResults(hybridResults);
        }
      } catch (err) {
        console.error('Error during search:', err);
      } finally {
        setIsSearching(false);
      }
    },
    [language]
  );

  useEffect(() => {
    if (searchSource === 'local') return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (query.trim() === '') {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const delay = searchSource === 'ai' ? 650 : 350;
    debounceTimerRef.current = setTimeout(() => {
      performSearch(query, searchSource);
    }, delay);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, searchSource, performSearch]);

  // Filter local catalog sorted by latest release year
  const filteredLocal =
    query.trim() === ''
      ? []
      : catalog
          .filter((item) => {
            const q = query.toLowerCase();
            return (
              item.title.toLowerCase().includes(q) ||
              (item.originalTitle && item.originalTitle.toLowerCase().includes(q)) ||
              item.director.toLowerCase().includes(q) ||
              item.genres.some((g) => g.toLowerCase().includes(q)) ||
              item.cast.some((c) => c.name.toLowerCase().includes(q))
            );
          })
          .sort((a, b) => (b.year || 0) - (a.year || 0));

  // Handle click on unified search item
  const handleSelectUnifiedItem = async (item: UnifiedSearchResult) => {
    playClick();
    setLoadingMediaId(item.id);

    try {
      const fullMedia = await resolveToPlayableMediaItem(item);
      if (fullMedia) {
        playSuccess();
        onSelectMedia(fullMedia);
        onClose();
      }
    } catch (err) {
      console.error('Failed to resolve playable media:', err);
    } finally {
      setLoadingMediaId(null);
    }
  };

  const getSourceBadge = (source: SearchDatabaseSource, extraBadge?: string) => {
    switch (source) {
      case 'ai':
        return {
          label: 'AI CineFinder',
          className: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-pink-300 border-pink-500/40',
        };
      case 'anime':
        return {
          label: extraBadge || 'Anime (MAL)',
          className: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
        };
      case 'tvmaze':
        return {
          label: extraBadge || 'TVMaze',
          className: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
        };
      case 'omdb':
        return {
          label: extraBadge || 'IMDb',
          className: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        };
      case 'tmdb':
      default:
        return {
          label: 'TMDB',
          className: 'bg-brand-gold/15 text-brand-champagne border-brand-gold/30',
        };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-14 sm:pt-20 p-3 sm:p-4 bg-black/40 backdrop-blur-md animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-3xl bg-[#181818] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[88vh]">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-white/10 bg-[#141414]">
          {isSearching ? (
            <Loader2 className={`w-4 h-4 ${searchSource === 'ai' ? 'text-purple-400' : 'text-[#E50914]'} animate-spin flex-shrink-0`} />
          ) : searchSource === 'ai' ? (
            <Sparkles className="w-4 h-4 text-purple-400 animate-pulse flex-shrink-0" />
          ) : (
            <Search className="w-4 h-4 text-[#E50914] flex-shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim()) {
                e.preventDefault();
                performSearch(query, searchSource);
              }
            }}
            placeholder={
              searchSource === 'ai'
                ? t('aiSearchPlaceholder')
                : searchSource === 'anime'
                ? language === 'en'
                  ? 'Search Anime (Romaji/English)...'
                  : 'Cari Anime (Romaji/Jepang)...'
                : searchSource === 'tvmaze'
                ? language === 'en'
                  ? 'Search TV series & networks...'
                  : 'Cari serial TV & jaringan...'
                : searchSource === 'omdb'
                ? language === 'en'
                  ? 'Search IMDb titles or ID (tt...)...'
                  : 'Cari judul atau ID IMDb (tt...)...'
                : t('searchPlaceholderMulti')
            }
            className="w-full bg-transparent text-white placeholder:text-neutral-500 text-xs sm:text-sm focus:outline-none font-normal"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
                inputRef.current?.focus();
              }}
              aria-label={language === 'en' ? 'Clear search' : 'Hapus pencarian'}
              className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-colors shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* AI Settings Toggle Button */}
          <button
            onClick={() => {
              playClick();
              setShowAiKeySettings(!showAiKeySettings);
            }}
            aria-label={t('aiKeyConfig')}
            title={t('aiKeyConfig')}
            className={`p-1.5 rounded-lg border transition-all shrink-0 cursor-pointer ${
              showAiKeySettings
                ? 'bg-purple-600 border-purple-400 text-white shadow-sm'
                : 'bg-white/[0.05] border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClose}
            aria-label={language === 'en' ? 'Close search' : 'Tutup pencarian'}
            title={language === 'en' ? 'Close' : 'Tutup'}
            className="flex items-center justify-center p-1.5 md:px-2.5 md:py-1 rounded-full md:rounded bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 text-slate-300 hover:text-white transition-all shrink-0 cursor-pointer active:scale-95"
          >
            <X className="w-4 h-4 md:hidden" />
            <span className="hidden md:inline text-[10px] tracking-wider uppercase font-mono font-bold">ESC</span>
          </button>
        </div>

        {/* Optional Gemini API Key Settings Panel */}
        {showAiKeySettings && (
          <div className="p-3.5 bg-purple-950/40 border-b border-purple-500/25 text-xs text-slate-300 animate-in fade-in space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-purple-200 flex items-center gap-1.5 text-xs">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                {t('aiKeyConfig')}
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10.5px] text-purple-400 hover:text-purple-300 underline inline-flex items-center gap-1"
              >
                Get free Gemini Key <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder={t('aiKeyPlaceholder')}
                className="flex-1 bg-black/60 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-400 font-mono"
              />
              <button
                onClick={() => {
                  playSuccess();
                  setStoredGeminiApiKey(apiKeyInput);
                  setKeySavedBadge(true);
                  setTimeout(() => setKeySavedBadge(false), 2500);
                }}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors shrink-0 cursor-pointer shadow-sm active:scale-95"
              >
                {keySavedBadge ? t('aiKeySaved') : t('aiKeySave')}
              </button>
            </div>
            <p className="text-[10.5px] text-slate-400 font-light leading-relaxed">
              {t('aiKeyHint')}
            </p>
          </div>
        )}

        {/* Multi-Database Source Tabs */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 bg-[#141414] border-b border-white/10 text-xs overflow-x-auto no-scrollbar gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap">
            {/* AI CineFinder Tab */}
            <button
              onClick={() => {
                playClick();
                setSearchSource('ai');
                if (query.trim()) performSearch(query, 'ai');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-bold transition-all whitespace-nowrap text-[11px] sm:text-xs cursor-pointer ${
                searchSource === 'ai'
                  ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-[#E50914] text-white shadow-lg shadow-purple-600/30'
                  : 'text-purple-300 hover:text-white bg-purple-950/30 hover:bg-purple-900/40 border border-purple-500/30'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>{t('aiSearchTab')}</span>
            </button>
            {/* All / Hybrid */}
            <button
              onClick={() => {
                playClick();
                setSearchSource('all');
                if (query.trim()) performSearch(query, 'all');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-semibold transition-all whitespace-nowrap text-[11px] sm:text-xs ${
                searchSource === 'all'
                  ? 'bg-[#E50914] text-white shadow-glow-red'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{t('hybridAll')}</span>
            </button>

            {/* TMDB Global */}
            <button
              onClick={() => {
                playClick();
                setSearchSource('tmdb');
                if (query.trim()) performSearch(query, 'tmdb');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-semibold transition-all whitespace-nowrap text-[11px] sm:text-xs ${
                searchSource === 'tmdb'
                  ? 'bg-[#E50914] text-white shadow-glow-red'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              <Globe2 className="w-3.5 h-3.5" />
              <span>TMDB</span>
            </button>

            {/* Anime (Kitsu / MAL) */}
            <button
              onClick={() => {
                playClick();
                setSearchSource('anime');
                if (query.trim()) performSearch(query, 'anime');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-semibold transition-all whitespace-nowrap text-[11px] sm:text-xs ${
                searchSource === 'anime'
                  ? 'bg-fuchsia-600 text-white font-bold shadow-lg shadow-fuchsia-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>{t('animeDatabase')}</span>
            </button>

            {/* TVMaze */}
            <button
              onClick={() => {
                playClick();
                setSearchSource('tvmaze');
                if (query.trim()) performSearch(query, 'tvmaze');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-semibold transition-all whitespace-nowrap text-[11px] sm:text-xs ${
                searchSource === 'tvmaze'
                  ? 'bg-sky-500 text-white font-bold shadow-lg shadow-sky-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>{t('tvmazeDatabase')}</span>
            </button>

            {/* OMDb / IMDb */}
            <button
              onClick={() => {
                playClick();
                setSearchSource('omdb');
                if (query.trim()) performSearch(query, 'omdb');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-semibold transition-all whitespace-nowrap text-[11px] sm:text-xs ${
                searchSource === 'omdb'
                  ? 'bg-amber-500 text-black font-bold shadow-lg shadow-amber-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>{t('omdbDatabase')}</span>
            </button>

            {/* Curated Catalog */}
            <button
              onClick={() => {
                playClick();
                setSearchSource('local');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-semibold transition-all whitespace-nowrap text-[11px] sm:text-xs ${
                searchSource === 'local'
                  ? 'bg-[#E50914] text-white shadow-glow-red'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('catalogCurated')} ({catalog.length})</span>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 text-[10px] text-slate-400 font-mono whitespace-nowrap flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{t('multiDatabaseConnected')}</span>
          </div>
        </div>

        {/* Results Container */}
        <div className="overflow-y-auto p-3 sm:p-4 space-y-2 flex-1">
          {query.trim() === '' ? (
            searchSource === 'ai' ? (
              <div className="py-8 sm:py-12 text-center text-slate-300 space-y-4 max-w-xl mx-auto px-2 sm:px-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600/20 via-pink-600/20 to-red-600/20 border border-purple-500/40 flex items-center justify-center mx-auto text-purple-300 shadow-lg shadow-purple-600/20">
                  <Sparkles className="w-7 h-7 text-amber-300 animate-pulse" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[10px] font-mono font-semibold uppercase tracking-wider mb-2">
                    <Bot className="w-3.5 h-3.5" />
                    <span>{t('aiSearchBadge')}</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-display font-black text-white tracking-wide">
                    {t('aiSearchTab')}
                  </h3>
                  <p className="text-xs font-light text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                    {language === 'en'
                      ? 'Remember a scene, plot twist, or character trait but forgot the title? Describe it freely in your own words.'
                      : 'Ingat cuplikan adegan, plot cerita, karakter, atau kesan tapi lupa judul filmnya? Ceritakan apa saja yang kamu ingat, AI akan menganalisisnya.'}
                  </p>
                </div>

                {/* Interactive Quick Prompts */}
                <div className="pt-2 text-left w-full">
                  <div className="text-[10px] uppercase font-sans tracking-widest text-slate-500 mb-2.5 text-center">
                    {t('aiQuickPromptTitle')}
                  </div>
                  <div className="flex flex-col gap-2">
                    {[
                      t('aiPromptAstronaut'),
                      t('aiPromptMemory'),
                      t('aiPromptDeathNote'),
                      t('aiPromptMansion'),
                      t('aiPromptDreamSwap'),
                    ].map((promptText) => (
                      <button
                        key={promptText}
                        onClick={() => {
                          playClick();
                          setQuery(promptText);
                          performSearch(promptText, 'ai');
                        }}
                        onMouseEnter={playHover}
                        className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-purple-950/40 border border-white/[0.08] hover:border-purple-500/40 text-xs text-slate-300 hover:text-white transition-all text-left flex items-center justify-between group cursor-pointer"
                      >
                        <span className="truncate">{promptText}</span>
                        <span className="text-[10px] font-mono text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                          {language === 'en' ? 'Search ➔' : 'Cari ➔'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center mx-auto text-brand-champagne shadow-glow-gold">
                  <Globe2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{t('globalSearchTitle')}</p>
                  <p className="text-xs font-light text-slate-400 mt-1 max-w-md mx-auto">
                    {searchSource === 'anime'
                      ? 'Cari ratusan ribu serial anime, film bioskop Jepang, dan donghua dengan judul Romaji maupun Inggris.'
                      : searchSource === 'tvmaze'
                      ? 'Jelajahi ribuan serial televisi global dari HBO, Netflix, BBC, dan AMC lengkap dengan jadwal tayang.'
                      : searchSource === 'omdb'
                      ? 'Cari langsung menggunakan kode IMDb resmi (contoh: tt0816692) atau judul film klasik dunia.'
                      : t('globalSearchDesc')}
                  </p>
                </div>

                {/* Trending Quick Suggestions */}
                <div className="pt-2">
                  <div className="text-[10px] uppercase font-sans tracking-widest text-slate-500 mb-2.5">
                    {t('quickSearchSuggestions')}
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg mx-auto">
                    {(searchSource === 'anime'
                      ? [
                          'Sousou no Frieren',
                          'Kimetsu no Yaiba',
                          'Solo Leveling',
                          'Jujutsu Kaisen',
                          'Shingeki no Kyojin',
                          'One Piece',
                          'Naruto',
                          'Boku no Hero Academia',
                        ]
                      : searchSource === 'tvmaze'
                      ? [
                          'Breaking Bad',
                          'Game of Thrones',
                          'Stranger Things',
                          'The Last of Us',
                          'Shogun',
                          'Wednesday',
                          'Severance',
                          'The Boys',
                        ]
                      : searchSource === 'omdb'
                      ? [
                          'tt0816692', // Interstellar
                          'tt15239678', // Dune 2
                          'The Godfather',
                          'Pulp Fiction',
                          'Spirited Away',
                          'Inception',
                        ]
                      : [
                          'Siksa Kubur',
                          'Deadpool & Wolverine',
                          'Dune: Part Two',
                          'Sousou no Frieren',
                          'Breaking Bad',
                          'Wednesday',
                          'Queen of Tears',
                          'Solo Leveling',
                        ]
                    ).map((tag) => (
                      <button
                        key={tag}
                        onClick={() => {
                          playClick();
                          setQuery(tag);
                          if (searchSource !== 'local') {
                            performSearch(tag, searchSource);
                          }
                        }}
                        onMouseEnter={playHover}
                        className="px-3 py-1 rounded-full bg-white/[0.03] hover:bg-brand-gold/20 hover:border-brand-gold/40 text-xs text-slate-300 border border-white/[0.08] transition-all font-light cursor-pointer"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          ) : searchSource !== 'local' ? (
            /* Multi-Database Results */
            isSearching ? (
              <div className="py-16 text-center space-y-4">
                {searchSource === 'ai' ? (
                  <>
                    <div className="relative w-12 h-12 mx-auto flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full bg-purple-600/30 animate-ping" />
                      <div className="relative w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-600/50">
                        <Sparkles className="w-6 h-6 text-white animate-spin" />
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-purple-200 font-medium animate-pulse max-w-sm mx-auto">
                      {t('aiSearchSearching')}
                    </p>
                  </>
                ) : (
                  <>
                    <Loader2 className="w-8 h-8 mx-auto text-brand-champagne animate-spin" />
                    <p className="text-xs text-slate-400 font-light">
                      {t('scanningDatabases')}
                    </p>
                  </>
                )}
              </div>
            ) : results.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Clapperboard className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-xs text-white">{t('noDatabasesFound')} &ldquo;{query}&rdquo;</p>
                <p className="text-[11px] text-slate-500 font-light">
                  {t('noTmdbHint')}
                </p>
              </div>
            ) : (
              results.map((item) => {
                const isLoadingThis = loadingMediaId === item.id;
                const badge = getSourceBadge(item.source, item.extraBadge);
                const seriesStatus = getSeriesStatus(item);
                const itemTitle = getMediaTitle(item as any, language) || item.title;
                const itemPoster = getMediaPoster(item as any, language) || item.poster;
                const durationLabel = formatMediaDuration(item as any, language);

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (!isLoadingThis && !loadingMediaId) {
                        handleSelectUnifiedItem(item);
                      }
                    }}
                    onMouseEnter={playHover}
                    className="group relative flex items-center gap-3.5 p-2.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05] hover:border-brand-gold/30 cursor-pointer transition-all duration-300"
                  >
                    {/* Poster */}
                    <div className="relative w-12 h-16 sm:w-14 sm:h-20 rounded-xl overflow-hidden bg-cinema-850 flex-shrink-0 shadow-md">
                      {itemPoster ? (
                        <img
                          src={itemPoster}
                          alt={itemTitle}
                          loading="lazy"
                          onError={(e) => {
                            const fallback = getMediaBackdrop(item as any, language) || item.backdrop;
                            if (fallback) {
                              (e.target as HTMLImageElement).src = fallback;
                            }
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-cinema-800 text-slate-500">
                          <Film className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                        {/* Source Badge */}
                        <span
                          className={`text-[9px] uppercase font-sans tracking-wider px-2 py-0.5 rounded-full font-medium border ${badge.className}`}
                        >
                          {badge.label}
                        </span>

                        {/* Media Type Badge */}
                        <span className="text-[9px] uppercase font-sans tracking-wider px-2 py-0.5 rounded-full bg-white/[0.05] text-slate-300 border border-white/10">
                          {item.mediaType === 'movie'
                            ? t('badgeFilm')
                            : item.mediaType === 'anime'
                            ? t('badgeAnime')
                            : t('badgeSeries')}
                        </span>

                        {/* Series Status Badge (On Going / Complete) */}
                        {seriesStatus && (
                          seriesStatus.completedSeasonsLabel && seriesStatus.ongoingSeasonLabel ? (
                            <>
                              <span className="text-[8.5px] uppercase font-sans tracking-wider px-2 py-0.5 rounded-full font-semibold border flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm">
                                <span className="text-[9px] leading-none">✓</span>
                                <span>{seriesStatus.completedSeasonsLabel}</span>
                              </span>
                              <span className="text-[8.5px] uppercase font-sans tracking-wider px-2 py-0.5 rounded-full font-semibold border flex items-center gap-1 bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                <span>{seriesStatus.ongoingSeasonLabel}</span>
                                {seriesStatus.progressText && (
                                  <span className="text-[8px] opacity-75 font-mono">({seriesStatus.progressText})</span>
                                )}
                              </span>
                            </>
                          ) : (
                            <span
                              className={`text-[8.5px] uppercase font-sans tracking-wider px-2 py-0.5 rounded-full font-semibold border flex items-center gap-1 ${seriesStatus.badgeClass}`}
                            >
                              {seriesStatus.isOngoing ? (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                              ) : (
                                <span className="text-[9px] leading-none">✓</span>
                              )}
                              <span>
                                {seriesStatus.isOngoing
                                  ? (seriesStatus.ongoingSeasonLabel || seriesStatus.label)
                                  : (seriesStatus.completedSeasonsLabel || seriesStatus.label)}
                              </span>
                              {seriesStatus.progressText && (
                                <span className="text-[8px] opacity-75 font-mono">({seriesStatus.progressText})</span>
                              )}
                            </span>
                          )
                        )}

                        {/* AI Confidence Badge */}
                        {item.aiConfidence && (
                          <span className="text-[9px] uppercase font-sans tracking-wider px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-pink-300 border-pink-500/40 shadow-sm">
                            <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                            <span>{item.aiConfidence}% {t('aiMatchLabel')}</span>
                          </span>
                        )}

                        {/* Rating */}
                        {item.rating > 0 && (
                          <div className="flex items-center gap-1 text-[11px] font-medium text-brand-champagne">
                            <Star className="w-2.5 h-2.5 fill-brand-gold text-brand-gold" />
                            <span>{item.rating.toFixed(1)}</span>
                          </div>
                        )}

                        {item.year > 0 && (
                          <span className="text-[11px] text-slate-500 font-mono">{item.year}</span>
                        )}

                        {durationLabel && (
                          <span className="text-[10.5px] text-emerald-400 font-mono font-medium">
                            • {durationLabel}
                          </span>
                        )}
                      </div>

                      <h5 className="font-sans font-bold text-xs sm:text-sm text-white group-hover:text-red-400 transition-colors truncate">
                        {itemTitle}
                      </h5>

                      {/* Romaji or Original Title */}
                      {(item.romajiTitle || item.originalTitle) &&
                        (item.romajiTitle !== itemTitle || item.originalTitle !== itemTitle) && (
                          <p className="text-[10px] text-slate-400 italic truncate">
                            {item.romajiTitle || item.originalTitle}
                          </p>
                        )}

                      {item.aiMatchReason ? (
                        <div className="mt-1.5 p-2 rounded-xl bg-purple-950/40 border border-purple-500/30 text-[11px] text-purple-200/90 leading-snug">
                          <span className="font-bold text-amber-300 mr-1.5 inline-flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            {t('aiReasonLabel')}:
                          </span>
                          {item.aiMatchReason}
                        </div>
                      ) : item.synopsis ? (
                        <p className="text-[11px] text-slate-400 font-light line-clamp-1 mt-0.5">
                          {item.synopsis}
                        </p>
                      ) : null}
                    </div>

                    {/* Actions: Open in New Tab + Play Trigger */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a
                        href={getAbsoluteWatchUrl(item.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          e.stopPropagation();
                          playClick();
                        }}
                        className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-[#E50914] hover:text-white text-slate-400 hover:border-[#E50914] border border-white/10 flex items-center justify-center transition-all duration-200 cursor-pointer no-underline"
                        title={t('openInNewTabTooltip') || (language === 'en' ? 'Open in new tab' : 'Buka di tab baru')}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      {isLoadingThis ? (
                        <div className="w-9 h-9 rounded-full bg-[#E50914]/20 text-[#E50914] flex items-center justify-center">
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-white/[0.05] text-slate-300 group-hover:bg-[#E50914] group-hover:text-white group-hover:shadow-glow-red flex items-center justify-center transition-all duration-300">
                          <Play className="w-4 h-4 ml-0.5 fill-current" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )
          ) : (
            /* Local Curated Catalog Results */
            filteredLocal.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Film className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-xs text-white">{t('noLocalFound')} &ldquo;{query}&rdquo;</p>
                <p className="text-[11px] text-slate-500 font-light">
                  {t('noLocalHint')}
                </p>
              </div>
            ) : (
              filteredLocal.map((item) => {
                const seriesStatus = getSeriesStatus(item);
                const trendingTitle = getMediaTitle(item, language);
                const trendingPoster = getMediaPoster(item, language);
                const durationLabel = formatMediaDuration(item, language);

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      playClick();
                      onSelectMedia(item);
                      onClose();
                    }}
                    onMouseEnter={playHover}
                    className="group flex items-center gap-3.5 p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-[#E50914]/40 cursor-pointer transition-all duration-200"
                  >
                    <div className="relative w-12 h-16 sm:w-14 sm:h-20 rounded-lg overflow-hidden bg-neutral-900 flex-shrink-0 shadow-md">
                      <img
                        src={trendingPoster}
                        alt={trendingTitle}
                        loading="lazy"
                        onError={(e) => {
                          const fallback = getMediaBackdrop(item, language) || item.backdrop;
                          if (fallback) {
                            (e.target as HTMLImageElement).src = fallback;
                          }
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[9px] uppercase font-sans tracking-wider px-2 py-0.5 rounded-full bg-[#E50914]/20 text-white border border-[#E50914]/40 font-bold">
                          {item.type === 'movie'
                            ? t('badgeFilm')
                            : item.type === 'series'
                            ? t('badgeSeries')
                            : item.type === 'anime'
                            ? t('badgeAnime')
                            : t('badgeDrama')}
                        </span>

                        {seriesStatus && (
                          seriesStatus.completedSeasonsLabel && seriesStatus.ongoingSeasonLabel ? (
                            <>
                              <span className="text-[8.5px] uppercase font-sans tracking-wider px-2 py-0.5 rounded-full font-semibold border flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm">
                                <span className="text-[9px] leading-none">✓</span>
                                <span>{seriesStatus.completedSeasonsLabel}</span>
                              </span>
                              <span className="text-[8.5px] uppercase font-sans tracking-wider px-2 py-0.5 rounded-full font-semibold border flex items-center gap-1 bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                <span>{seriesStatus.ongoingSeasonLabel}</span>
                                {seriesStatus.progressText && (
                                  <span className="text-[8px] opacity-75 font-mono">({seriesStatus.progressText})</span>
                                )}
                              </span>
                            </>
                          ) : (
                            <span
                              className={`text-[8.5px] uppercase font-sans tracking-wider px-2 py-0.5 rounded-full font-semibold border flex items-center gap-1 ${seriesStatus.badgeClass}`}
                            >
                              {seriesStatus.isOngoing ? (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                              ) : (
                                <span className="text-[9px] leading-none">✓</span>
                              )}
                              <span>
                                {seriesStatus.isOngoing
                                  ? (seriesStatus.ongoingSeasonLabel || seriesStatus.label)
                                  : (seriesStatus.completedSeasonsLabel || seriesStatus.label)}
                              </span>
                              {seriesStatus.progressText && (
                                <span className="text-[8px] opacity-75 font-mono">({seriesStatus.progressText})</span>
                              )}
                            </span>
                          )
                        )}

                        <div className="flex items-center gap-1 text-[11px] font-medium text-amber-300">
                          <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                          <span>{item.rating.toFixed(1)}</span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">{item.year}</span>
                        {durationLabel && (
                          <span className="text-[10.5px] text-emerald-400 font-mono font-medium">
                            • {durationLabel}
                          </span>
                        )}
                      </div>

                    <h5 className="font-sans font-bold text-xs sm:text-sm text-white group-hover:text-red-400 transition-colors truncate">
                      {trendingTitle}
                    </h5>

                    <p className="text-[11px] text-slate-400 font-light truncate mt-0.5">
                      {item.genres.map((g) => formatGenre(g, language)).join(', ')} • {t('directorBy')}: {item.director}
                    </p>
                  </div>

                  {/* Actions: Open in New Tab + Play Trigger */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a
                      href={getAbsoluteWatchUrl(item.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        e.stopPropagation();
                        playClick();
                      }}
                      className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-[#E50914] hover:text-white text-slate-400 hover:border-[#E50914] border border-white/10 flex items-center justify-center transition-all duration-200 cursor-pointer no-underline"
                      title={t('openInNewTabTooltip') || (language === 'en' ? 'Open in new tab' : 'Buka di tab baru')}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <div className="w-9 h-9 rounded-full bg-white/[0.05] text-slate-300 group-hover:bg-[#E50914] group-hover:text-white group-hover:shadow-glow-red flex items-center justify-center transition-all duration-300 flex-shrink-0">
                      <Play className="w-4 h-4 ml-0.5 fill-current" />
                    </div>
                  </div>
                  </div>
                );
              })
            )
          )}
        </div>
      </div>
    </div>
  );
};
