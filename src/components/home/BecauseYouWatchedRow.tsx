import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  Play,
  Info,
  Plus,
  Check,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Star,
  X,
  Compass,
  Clapperboard,
} from 'lucide-react';
import type { MediaItem } from '../../types/media';
import { useWatchlist } from '../../context/WatchlistContext';
import { useSound } from '../../context/SoundContext';
import { useLanguage } from '../../context/LanguageContext';
import { getAbsoluteWatchUrl } from '../../utils/navigation';
import { getMediaTitle, getMediaPoster, getMediaBackdrop } from '../../utils/formatters';
import { MOCK_CATALOG } from '../../data/mockCatalog';
import {
  fetchBecauseYouWatchedFeed,
  getAvailableAnchors,
  clearRecommendationCache,
  type RecommendedMediaItem,
  type RecommendationFeedData,
} from '../../services/recommendationService';

interface BecauseYouWatchedRowProps {
  onPlayMedia: (media: MediaItem) => void;
  onOpenDetails: (media: MediaItem) => void;
  fullCatalog?: MediaItem[];
}

export const BecauseYouWatchedRow: React.FC<BecauseYouWatchedRowProps> = ({
  onPlayMedia,
  onOpenDetails,
  fullCatalog = MOCK_CATALOG,
}) => {
  const { historyItems, toggleWatchlist, isInWatchlist } = useWatchlist();
  const { playClick, playHover, playWhoosh, playSuccess } = useSound();
  const { t, language } = useLanguage();
  const sliderRef = useRef<HTMLDivElement>(null);

  const [feedData, setFeedData] = useState<RecommendationFeedData | null>(null);
  const [activeAnchor, setActiveAnchor] = useState<MediaItem | null>(null);
  const [isAnchorDropdownOpen, setIsAnchorDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeAiModalItem, setActiveAiModalItem] = useState<RecommendedMediaItem | null>(null);

  // Cari seluruh acuan (anchor) yang tersedia dari riwayat tontonan
  const availableAnchors = useMemo(() => {
    return getAvailableAnchors(historyItems, fullCatalog);
  }, [historyItems, fullCatalog]);

  // Set initial anchor — hanya dari riwayat tontonan nyata
  useEffect(() => {
    if (availableAnchors.length > 0) {
      if (!activeAnchor || !availableAnchors.some((a) => a.id === activeAnchor.id)) {
        setActiveAnchor(availableAnchors[0]);
      }
    } else {
      setActiveAnchor(null);
      setFeedData(null);
      setIsLoading(false);
    }
  }, [availableAnchors]);

  // Fetch feed saat activeAnchor atau bahasa berubah
  useEffect(() => {
    if (!activeAnchor) return; // Tidak ada history → tidak load apapun

    let isCancelled = false;
    const loadFeed = async () => {
      setIsLoading(true);
      try {
        const res = await fetchBecauseYouWatchedFeed(
          activeAnchor,
          availableAnchors,
          fullCatalog,
          language
        );
        if (!isCancelled) {
          setFeedData(res);
        }
      } catch (err) {
        console.warn('Gagal memuat feed rekomendasi:', err);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadFeed();
    return () => {
      isCancelled = true;
    };
  }, [activeAnchor, language, fullCatalog]);

  const scroll = (direction: 'left' | 'right') => {
    playClick();
    if (!sliderRef.current) return;
    const { scrollLeft, clientWidth } = sliderRef.current;
    const scrollAmount = clientWidth * 0.75;
    sliderRef.current.scrollTo({
      left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
      behavior: 'smooth',
    });
  };

  const handleRefresh = async () => {
    playClick();
    if (activeAnchor) {
      setIsLoading(true);
      clearRecommendationCache(activeAnchor.id, language);
      const res = await fetchBecauseYouWatchedFeed(
        activeAnchor,
        availableAnchors,
        fullCatalog,
        language
      );
      setFeedData(res);
      setIsLoading(false);
    }
  };

  const handleBookmarkToggle = (e: React.MouseEvent, media: MediaItem) => {
    e.preventDefault();
    e.stopPropagation();
    const added = toggleWatchlist(media.id, media);
    if (added) {
      playSuccess();
    } else {
      playClick();
    }
  };

  const items = feedData?.items || [];

  // Jika belum ada riwayat tontonan sama sekali → sembunyikan section ini
  if (!isLoading && availableAnchors.length === 0) {
    return null;
  }

  // Jika sudah ada history tapi rekomendasi masih kosong (dan tidak loading) → sembunyikan
  if (!isLoading && items.length === 0) {
    return null;
  }

  const anchorTitle = activeAnchor ? getMediaTitle(activeAnchor, language) : '';

  return (
    <section className="relative z-10 max-w-[1720px] 2xl:max-w-[1880px] 3xl:max-w-[2200px] 4xl:max-w-[2600px] mx-auto px-4 sm:px-8 lg:px-12 3xl:px-16 my-8 sm:my-10 space-y-4">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/[0.06]">
        <div className="flex items-start sm:items-center gap-3">
          {/* Glowing AI Sparkle Icon Badge */}
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E50914] via-rose-600 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-red-600/30 shrink-0 mt-0.5 sm:mt-0 ring-1 ring-white/20">
            <Sparkles className="w-4 h-4 text-amber-100 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>
                  {t('recBecauseYouWatched')}{' '}
                  {activeAnchor && (
                    <button
                      type="button"
                      onClick={() => onOpenDetails(activeAnchor)}
                      className="text-[#E50914] hover:underline underline-offset-4 font-black transition-colors inline-block"
                      title={language === 'en' ? 'View details of this title' : 'Lihat rincian film acuan ini'}
                    >
                      "{anchorTitle}"
                    </button>
                  )}
                </span>
              </h2>

              {/* AI Badge */}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-red-500/20 via-amber-500/20 to-purple-500/20 text-red-300 border border-red-500/30 backdrop-blur-sm shadow-sm">
                <Compass className="w-3 h-3 text-amber-300" />
                <span>{t('recAiBadge')}</span>
              </span>
            </div>

            <p className="text-xs text-slate-400 font-light mt-0.5">
              {t('recBecauseYouWatchedDesc')}
            </p>
          </div>
        </div>

        {/* RIGHT CONTROLS: ANCHOR SWITCHER + REFRESH + CAROUSEL NAVIGATION */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          {/* Anchor Switcher Dropdown (jika memiliki lebih dari 1 tayangan di riwayat) */}
          {availableAnchors.length > 1 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsAnchorDropdownOpen(!isAnchorDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/10 text-xs text-slate-300 hover:text-white border border-white/10 transition-colors"
                title={t('recSwitchAnchor')}
              >
                <Clapperboard className="w-3.5 h-3.5 text-red-400" />
                <span className="hidden md:inline font-medium">{t('recSwitchAnchor')}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-600/30 text-red-300 font-mono">
                  {availableAnchors.length}
                </span>
              </button>

              {/* Dropdown Menu */}
              {isAnchorDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 max-h-80 overflow-y-auto bg-[#181818] border border-white/15 rounded-xl shadow-2xl z-50 p-2 space-y-1 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 no-scrollbar">
                  <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-white/10">
                    {language === 'en' ? 'Picks based on your history:' : 'Rekomendasi berdasarkan tontonan:'}
                  </div>
                  {availableAnchors.map((anchor) => {
                    const isSelected = activeAnchor?.id === anchor.id;
                    const aTitle = getMediaTitle(anchor, language);
                    return (
                      <button
                        key={anchor.id}
                        type="button"
                        onClick={() => {
                          setActiveAnchor(anchor);
                          setIsAnchorDropdownOpen(false);
                          playClick();
                        }}
                        className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-left transition-colors ${
                          isSelected
                            ? 'bg-red-600/20 text-red-300 border border-red-500/30'
                            : 'hover:bg-white/5 text-slate-300 hover:text-white'
                        }`}
                      >
                        <img
                          src={getMediaPoster(anchor, language)}
                          alt={aTitle}
                          className="w-8 h-11 object-cover rounded shrink-0 shadow-sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{aTitle}</p>
                          <p className="text-[10px] text-slate-400">{anchor.year} • {anchor.genres?.[0] || 'Sinema'}</p>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 rounded-full bg-white/[0.04] hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            title={t('recRefresh')}
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-red-400' : ''}`} />
          </button>

          {/* Carousel Left/Right Buttons */}
          <div className="flex items-center gap-1 ml-1">
            <button
              type="button"
              onClick={() => scroll('left')}
              className="p-2 rounded-full bg-white/[0.04] hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 active:scale-95 transition-all cursor-pointer"
              title={language === 'en' ? 'Previous' : 'Sebelumnya'}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              className="p-2 rounded-full bg-white/[0.04] hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 active:scale-95 transition-all cursor-pointer"
              title={language === 'en' ? 'Next' : 'Berikutnya'}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* SKELETON LOADING STATE */}
      {isLoading && items.length === 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] rounded-xl bg-white/[0.04] animate-pulse border border-white/5 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            </div>
          ))}
        </div>
      )}

      {/* CAROUSEL SHELF ROW */}
      <div
        ref={sliderRef}
        className="flex gap-3.5 sm:gap-4.5 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0 pb-4 pt-1"
      >
        {items.map((recItem) => {
          const media = recItem.media;
          const displayTitle = getMediaTitle(media, language);
          const displayPoster = getMediaPoster(media, language);
          const isBookmarked = isInWatchlist(media.id);
          const matchPercent = recItem.matchPercentage;

          return (
            <div
              key={media.id}
              onMouseEnter={playHover}
              className="w-[44vw] xs:w-[40vw] sm:w-[220px] lg:w-[230px] xl:w-[245px] shrink-0 snap-start group relative flex flex-col rounded-xl overflow-hidden bg-[#161616] border border-white/[0.08] hover:border-red-500/40 transition-all duration-300 sm:hover:scale-[1.03] shadow-lg hover:shadow-2xl hover:shadow-red-950/20"
            >
              {/* POSTER & THUMBNAIL CONTAINER */}
              <div
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  if (e.ctrlKey || e.metaKey || e.shiftKey) {
                    window.open(getAbsoluteWatchUrl(media.id), '_blank', 'noopener,noreferrer');
                    return;
                  }
                  playClick();
                  onOpenDetails(media);
                }}
                onAuxClick={(e) => {
                  if (e.button === 1) {
                    e.preventDefault();
                    window.open(getAbsoluteWatchUrl(media.id), '_blank', 'noopener,noreferrer');
                  }
                }}
                className="relative aspect-[2/3] w-full overflow-hidden bg-[#121212] cursor-pointer"
              >
                <img
                  src={displayPoster}
                  alt={displayTitle}
                  loading="lazy"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 brightness-95 group-hover:brightness-105"
                  onError={(e) => {
                    // Fallback to backdrop or standard placeholder
                    const target = e.currentTarget;
                    const backdrop = getMediaBackdrop(media, language);
                    if (backdrop && target.src !== backdrop) {
                      target.src = backdrop;
                    }
                  }}
                />

                {/* Top Overlay Badges */}
                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
                  {/* Match Percentage Pill */}
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-black tracking-wide bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 shadow-md backdrop-blur-md flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                    <span>{matchPercent}% {t('recMatchScore')}</span>
                  </span>

                  {/* AI Rationale Trigger Pill */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      playClick();
                      setActiveAiModalItem(recItem);
                    }}
                    className="pointer-events-auto p-1 rounded-md bg-black/60 hover:bg-red-600/80 text-amber-300 hover:text-white border border-white/20 hover:border-red-400/50 shadow-md backdrop-blur-md transition-all active:scale-95"
                    title={t('recWhyRecommended')}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Dark Vignette Overlay on Hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-80 sm:opacity-60 group-hover:opacity-90 transition-opacity duration-300" />

                {/* Quick Action Center Play Icon on Hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      playWhoosh();
                      onPlayMedia(media);
                    }}
                    className="pointer-events-auto w-12 h-12 rounded-full bg-[#E50914] text-white flex items-center justify-center shadow-xl shadow-red-950/80 transform scale-75 group-hover:scale-100 transition-all duration-300 hover:bg-red-600 active:scale-90 cursor-pointer"
                  >
                    <Play className="w-6 h-6 fill-current ml-0.5" />
                  </div>
                </div>

                {/* Bottom Content within Image */}
                <div className="absolute bottom-0 inset-x-0 p-3 z-10 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-300 font-medium">
                    <span className="flex items-center gap-0.5 text-amber-400 font-bold">
                      <Star className="w-3 h-3 fill-current" />
                      {media.rating}
                    </span>
                    <span>•</span>
                    <span>{media.year}</span>
                    <span>•</span>
                    <span className="uppercase text-[9px] px-1 py-0.2 rounded bg-white/10 text-white font-mono">
                      {media.type}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-red-400 transition-colors drop-shadow-md">
                    {displayTitle}
                  </h3>

                  {/* Primary Match Reason Tag */}
                  {recItem.matchReasons && recItem.matchReasons.length > 0 && (
                    <p className="text-[10px] text-emerald-300/90 font-medium truncate flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-emerald-400 shrink-0" />
                      <span>{language === 'en' ? recItem.matchReasons[0].en : recItem.matchReasons[0].id}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* CARD FOOTER & QUICK BUTTONS */}
              <div className="p-2.5 bg-[#141414] border-t border-white/[0.06] flex items-center justify-between gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    playWhoosh();
                    onPlayMedia(media);
                  }}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-[#E50914] hover:bg-red-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{language === 'en' ? 'Play' : 'Putar'}</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => handleBookmarkToggle(e, media)}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    isBookmarked
                      ? 'bg-red-600/20 text-red-400 border-red-500/40 hover:bg-red-600/30'
                      : 'bg-white/[0.06] text-slate-300 border-white/10 hover:bg-white/10 hover:text-white'
                  }`}
                  title={isBookmarked ? 'Di Daftar Saya' : 'Tambah ke Daftar Saya'}
                >
                  {isBookmarked ? <Check className="w-3.5 h-3.5 text-red-400" /> : <Plus className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    onOpenDetails(media);
                  }}
                  className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                  title={language === 'en' ? 'View Details' : 'Rincian Film'}
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* AI RATIONALE MODAL / POPOVER */}
      {activeAiModalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setActiveAiModalItem(null)}
        >
          <div
            className="relative w-full max-w-lg bg-[#181818] border border-white/20 rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center text-white shadow-lg">
                  <Sparkles className="w-5 h-5 text-amber-100" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>{t('recWhyRecommended')}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-mono font-bold">
                      {activeAiModalItem.matchPercentage}% {t('recMatchScore')}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    {t('recBasedOn')}: <span className="text-red-400 font-semibold">{activeAiModalItem.anchorTitle}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveAiModalItem(null)}
                className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Media Snippet Card */}
            <div className="flex gap-3.5 p-3 rounded-xl bg-white/[0.04] border border-white/10">
              <img
                src={getMediaPoster(activeAiModalItem.media, language)}
                alt={getMediaTitle(activeAiModalItem.media, language)}
                className="w-16 h-24 object-cover rounded-lg shrink-0 shadow-md"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <h4 className="text-base font-bold text-white truncate">
                  {getMediaTitle(activeAiModalItem.media, language)}
                </h4>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="text-amber-400 font-bold flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-current" /> {activeAiModalItem.media.rating}
                  </span>
                  <span>•</span>
                  <span>{activeAiModalItem.media.year}</span>
                  <span>•</span>
                  <span className="uppercase text-[10px] px-1 py-0.5 rounded bg-white/10 text-white font-mono">
                    {activeAiModalItem.media.type}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {(activeAiModalItem.media.genres || []).slice(0, 3).map((g) => (
                    <span
                      key={g}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.08] text-slate-300"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Insight Box */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-red-950/40 via-amber-950/20 to-black/60 border border-red-500/20 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300 uppercase tracking-wider">
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('recAiReasonBadge')}</span>
              </div>
              <p className="text-sm text-slate-200 leading-relaxed font-light italic">
                "{language === 'en' ? activeAiModalItem.aiRationaleEn : activeAiModalItem.aiRationaleId}"
              </p>
            </div>

            {/* Match Breakdown Factors */}
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-slate-400">
                {language === 'en' ? 'Key Match Factors:' : 'Faktor Kesamaan Utama:'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {activeAiModalItem.matchReasons.map((reason, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 text-xs font-medium"
                  >
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>{language === 'en' ? reason.en : reason.id}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setActiveAiModalItem(null);
                  playWhoosh();
                  onPlayMedia(activeAiModalItem.media);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#E50914] hover:bg-red-600 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-red-950/50"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{language === 'en' ? 'Play Now' : 'Putar Sekarang'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const item = activeAiModalItem.media;
                  setActiveAiModalItem(null);
                  playClick();
                  onOpenDetails(item);
                }}
                className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Info className="w-4 h-4" />
                <span>{language === 'en' ? 'Full Details' : 'Rincian Lengkap'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
