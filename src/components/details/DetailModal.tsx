import React, { useState, useEffect } from 'react';
import {
  X,
  Star,
  Plus,
  Check,
  Share2,
  MessageSquare,
  Send,
  ThumbsUp,
  ExternalLink,
  Award,
  Globe,
  Clapperboard,
  Sparkles,
} from 'lucide-react';
import type { MediaItem, Server, Episode, Review } from '../../types/media';
import { FilmographyModal } from '../explore/FilmographyModal';
import { type CurationTarget, splitMultipleNames } from '../../services/curation';
import { CinematicPlayer } from '../player/CinematicPlayer';
import { ServerSelector } from '../player/ServerSelector';
import { EpisodeList } from '../player/EpisodeList';
import { MovieCard } from '../home/MovieCard';
import { useWatchlist } from '../../context/WatchlistContext';
import { useSound } from '../../context/SoundContext';
import { useLanguage } from '../../context/LanguageContext';
import { getImdbUrl } from '../../services/imdb';
import { getSeriesStatus, formatGenre, getMediaTitle, getMediaSynopsis, getDefaultServer } from '../../utils/formatters';
import { getAbsoluteWatchUrl } from '../../utils/navigation';
import { useAutoTranslateSynopsis } from '../../services/translator';

interface DetailModalProps {
  media: MediaItem | null;
  onClose: () => void;
  onPlayMedia: (media: MediaItem) => void;
  catalog: MediaItem[];
}

export const DetailModal: React.FC<DetailModalProps> = ({
  media,
  onClose,
  onPlayMedia,
  catalog,
}) => {
  if (!media) return null;

  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const { playClick, playHover, playSuccess } = useSound();
  const { language, t } = useLanguage();
  const displayTitle = getMediaTitle(media, language);
  const { synopsis: autoSynopsis } = useAutoTranslateSynopsis(media, language);
  const displaySynopsis = autoSynopsis || getMediaSynopsis(media, language);

  const [activeTab, setActiveTab] = useState<'info' | 'episodes' | 'reviews'>('info');
  const [activeServer, setActiveServer] = useState<Server>(() => getDefaultServer(media.servers));
  const [currentEpisode, setCurrentEpisode] = useState<Episode | undefined>(
    media.seasons?.[0]?.episodes?.[0]
  );
  const [copiedLink, setCopiedLink] = useState(false);

  // Reviews state
  const [reviewsList, setReviewsList] = useState<Review[]>(media.reviews || []);
  const [newReviewText, setNewReviewText] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [isTheaterMode, setIsTheaterMode] = useState(false);

  // Filmography / Country Curation Modal State
  const [curationTarget, setCurationTarget] = useState<CurationTarget | null>(null);
  const [isCurationOpen, setIsCurationOpen] = useState(false);

  const handleOpenCuration = (target: CurationTarget) => {
    playClick();
    setCurationTarget(target);
    setIsCurationOpen(true);
  };

  const isBookmarked = isInWatchlist(media.id);

  useEffect(() => {
    if (media.seasons && media.seasons.length > 0) {
      const firstEp = media.seasons[0].episodes[0];
      setCurrentEpisode(firstEp);
      setActiveServer(getDefaultServer(firstEp?.servers, media.servers));
      setActiveTab('episodes');
    } else {
      setActiveServer(getDefaultServer(media.servers));
      setCurrentEpisode(undefined);
      setActiveTab('info');
    }
    setReviewsList(media.reviews || []);
  }, [media.id]);

  // Flatten all episodes across seasons in chronological order
  const allEpisodes = React.useMemo(() => {
    if (media.type === 'movie' || !media.seasons || media.seasons.length === 0) {
      return [];
    }
    const eps: Episode[] = [];
    const sortedSeasons = [...media.seasons].sort(
      (a, b) => (a.seasonNumber ?? 0) - (b.seasonNumber ?? 0)
    );
    for (const season of sortedSeasons) {
      if (season.episodes && season.episodes.length > 0) {
        const sortedEpisodes = [...season.episodes].sort(
          (a, b) => (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0)
        );
        for (const ep of sortedEpisodes) {
          eps.push({
            ...ep,
            seasonNumber: ep.seasonNumber ?? season.seasonNumber ?? 1,
          });
        }
      }
    }
    return eps;
  }, [media.type, media.seasons]);

  const currentEpisodeIndex = React.useMemo(() => {
    if (!currentEpisode || allEpisodes.length === 0) return -1;
    const currentSeasonNum = currentEpisode.seasonNumber ?? 1;
    return allEpisodes.findIndex(
      (ep) =>
        ep.id === currentEpisode.id ||
        ((ep.seasonNumber ?? 1) === currentSeasonNum && ep.episodeNumber === currentEpisode.episodeNumber)
    );
  }, [allEpisodes, currentEpisode]);

  const prevEpisode = currentEpisodeIndex > 0 ? allEpisodes[currentEpisodeIndex - 1] : undefined;
  const nextEpisode =
    currentEpisodeIndex >= 0 && currentEpisodeIndex < allEpisodes.length - 1
      ? allEpisodes[currentEpisodeIndex + 1]
      : undefined;

  const handleSelectEpisode = (ep: Episode) => {
    const currentServers = currentEpisode?.servers || media.servers;
    const activeIndex = currentServers.findIndex((s) => s.id === activeServer.id);
    const targetServer =
      activeIndex >= 0 && ep.servers && ep.servers[activeIndex]
        ? ep.servers[activeIndex]
        : getDefaultServer(ep.servers, media.servers);
    setCurrentEpisode(ep);
    setActiveServer(targetServer);
  };

  const handleNextEpisode = () => {
    if (nextEpisode) {
      playClick();
      handleSelectEpisode(nextEpisode);
    }
  };

  const handlePrevEpisode = () => {
    if (prevEpisode) {
      playClick();
      handleSelectEpisode(prevEpisode);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isTheaterMode) {
          setIsTheaterMode(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isTheaterMode]);

  const handleShare = () => {
    playClick();
    const url = getAbsoluteWatchUrl(media.id, currentEpisode?.id);
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewText.trim()) return;
    playSuccess();

    const newRev: Review = {
      id: `rev-${Date.now()}`,
      author: language === 'en' ? 'Film Critic' : 'Kritikus Film',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=120&auto=format&fit=crop',
      rating: newRating,
      date: language === 'en' ? 'Just now' : 'Baru saja',
      content: newReviewText.trim(),
      likes: 0,
    };

    setReviewsList([newRev, ...reviewsList]);
    setNewReviewText('');
  };

  const recommendations = catalog
    .filter((item) => item.id !== media.id && (item.type === media.type || item.genres.some((g) => media.genres.includes(g))))
    .slice(0, 4);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto bg-black/90 backdrop-blur-2xl">
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Box */}
      <div
        className={`relative w-full transition-all duration-500 ${
          isTheaterMode ? 'max-w-[96vw] max-h-[98vh] bg-[#141414] border-white/20' : 'max-w-5xl max-h-[94vh] bg-[#181818] border-white/10'
        } border rounded-2xl shadow-2xl overflow-hidden my-auto z-10 flex flex-col`}
      >
        {/* Floating Open in New Tab Button */}
        <a
          href={getAbsoluteWatchUrl(media.id, currentEpisode?.id)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => playClick()}
          onMouseEnter={playHover}
          aria-label={language === 'en' ? 'Open in new tab' : 'Buka di tab baru'}
          title={t('openInNewTabTooltip') || (language === 'en' ? 'Open in new tab' : 'Buka di tab baru')}
          className="absolute top-4 right-16 z-40 p-2.5 rounded-full bg-black/70 hover:bg-[#E50914] hover:text-white border border-white/10 text-white transition-all shadow-xl backdrop-blur-md no-underline cursor-pointer flex items-center justify-center"
        >
          <ExternalLink className="w-4 h-4" />
        </a>

        {/* Floating Close Button */}
        <button
          onClick={() => {
            playClick();
            onClose();
          }}
          onMouseEnter={playHover}
          aria-label={language === 'en' ? 'Close' : 'Tutup'}
          className="absolute top-4 right-4 z-40 p-2.5 rounded-full bg-black/70 hover:bg-[#E50914] hover:text-white border border-white/10 text-white transition-all shadow-xl backdrop-blur-md"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 md:p-8 space-y-6">
          {/* Top Video Player Section */}
          <div className="space-y-3">
            <CinematicPlayer
              key={`${media.id}-${currentEpisode?.id || 'main'}`}
              media={media}
              currentEpisode={currentEpisode}
              activeServer={activeServer}
              autoPlay={false}
              isTheaterMode={isTheaterMode}
              onToggleTheaterMode={() => setIsTheaterMode((prev) => !prev)}
              onNextEpisode={handleNextEpisode}
              onPrevEpisode={handlePrevEpisode}
              nextEpisode={nextEpisode}
              prevEpisode={prevEpisode}
            />

            {/* Server Selector Bar */}
            <ServerSelector
              servers={currentEpisode?.servers || media.servers}
              activeServerId={activeServer.id}
              media={media}
              onSelectServer={(srv) => setActiveServer(srv)}
            />
          </div>

          {/* Title & Metadata Row */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-6 border-b border-white/[0.06]">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2.5 py-0.5 rounded-md bg-[#E50914] text-white text-[10px] font-sans font-bold uppercase tracking-wider shadow-sm">
                  {media.type.toUpperCase()}
                </span>
                {(() => {
                  const seriesStatus = getSeriesStatus(media);
                  if (!seriesStatus) return null;
                  if (seriesStatus.completedSeasonsLabel && seriesStatus.ongoingSeasonLabel) {
                    return (
                      <>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-sans uppercase tracking-wider font-semibold border flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm">
                          <span className="text-xs leading-none">✓</span>
                          <span>{seriesStatus.completedSeasonsLabel}</span>
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-sans uppercase tracking-wider font-semibold border flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          <span>{seriesStatus.ongoingSeasonLabel}</span>
                          {seriesStatus.progressText && (
                            <span className="text-[9px] opacity-80 font-mono">({seriesStatus.progressText})</span>
                          )}
                        </span>
                      </>
                    );
                  }
                  return (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-sans uppercase tracking-wider font-semibold border flex items-center gap-1.5 ${seriesStatus.badgeClass}`}
                    >
                      {seriesStatus.isOngoing ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      ) : (
                        <span className="text-xs leading-none">✓</span>
                      )}
                      <span>
                        {seriesStatus.isOngoing
                          ? (seriesStatus.ongoingSeasonLabel || seriesStatus.label)
                          : (seriesStatus.completedSeasonsLabel || seriesStatus.label)}
                      </span>
                      {seriesStatus.progressText && (
                        <span className="text-[9px] opacity-80 font-mono">({seriesStatus.progressText})</span>
                      )}
                    </span>
                  );
                })()}
                <span className="px-2.5 py-0.5 rounded-full bg-white/[0.04] text-slate-300 text-xs font-light">
                  {media.quality?.replace(/4K ULTRA HD/gi, '1080p Full HD').replace(/4K/gi, 'HD') || 'HD'}
                </span>
                {/* Official IMDb Pill Badge */}
                <a
                  href={media.imdbUrl || (media.imdbId ? getImdbUrl(media.imdbId) : 'https://www.imdb.com')}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={language === 'en' ? 'Open official data on IMDb.com' : 'Buka data resmi di IMDb.com'}
                  className="px-2.5 py-0.5 rounded-full bg-[#F5C518]/15 hover:bg-[#F5C518]/25 text-[#F5C518] border border-[#F5C518]/30 text-xs flex items-center gap-1.5 font-semibold transition-all hover:scale-105 group"
                >
                  <span className="bg-[#F5C518] text-black font-black text-[10px] px-1 py-0.2 rounded-sm leading-tight tracking-wider">
                    IMDb
                  </span>
                  <span>{(media.imdbRating || media.rating).toFixed(1)}</span>
                  <Star className="w-3 h-3 fill-[#F5C518] text-[#F5C518]" />
                  {media.imdbVotes && (
                    <span className="text-[10px] text-slate-300 font-normal hidden sm:inline">
                      ({media.imdbVotes})
                    </span>
                  )}
                  <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                </a>
                {media.rottenTomatoes && (
                  <span className="px-2 py-0.5 rounded bg-white/[0.03] text-slate-300 border border-white/10 text-xs font-light">
                    {media.rottenTomatoes}% RT
                  </span>
                )}
                <span className="text-xs text-slate-400 font-light tracking-wide">
                  {media.year} • {media.duration} • {language === 'en' ? `Rated ${media.ageRating}` : `Bimbingan ${media.ageRating}`}
                </span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-display font-black text-white tracking-wide uppercase">
                {displayTitle}
              </h2>

              {media.originalTitle && media.originalTitle !== displayTitle && (
                <p className="text-xs text-slate-400 font-sans">
                  {language === 'en' ? 'Original / Alternative Title' : 'Judul Asli / Alternatif'}: {media.originalTitle}
                </p>
              )}

              {/* Genre Pills */}
              {media.genres && media.genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {media.genres.map((g) => (
                    <button
                      key={g}
                      onClick={() => handleOpenCuration({ type: 'genre', name: g })}
                      onMouseEnter={playHover}
                      className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.05] hover:bg-[#E50914]/20 text-slate-300 hover:text-white text-xs border border-white/10 hover:border-[#E50914]/40 font-medium transition-all duration-200 cursor-pointer shadow-sm hover:shadow-glow-red/20"
                      title={language === 'en' ? `Explore all ${formatGenre(g, 'en')} titles` : `Jelajahi semua film & series ${formatGenre(g, 'id')}`}
                    >
                      <span>{formatGenre(g, language)}</span>
                      <Sparkles className="w-2.5 h-2.5 text-[#E50914] transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <button
                onClick={() => {
                  const added = toggleWatchlist(media.id, media);
                  if (added) playSuccess();
                  else playClick();
                }}
                onMouseEnter={playHover}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full border text-xs font-semibold tracking-wide transition-all ${
                  isBookmarked
                    ? 'bg-[#E50914] border-[#E50914] text-white shadow-glow-red'
                    : 'bg-white/[0.05] border-white/15 text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {isBookmarked ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>{language === 'en' ? 'In Watchlist' : 'Tersimpan'}</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>{language === 'en' ? 'My Watchlist' : 'Daftar Saya'}</span>
                  </>
                )}
              </button>

              <button
                onClick={handleShare}
                onMouseEnter={playHover}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/[0.05] border border-white/15 text-slate-300 hover:text-white hover:bg-white/10 text-xs font-medium transition-all"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-300" />
                <span>{copiedLink ? (language === 'en' ? 'Link Copied' : 'Tautan Disalin') : (language === 'en' ? 'Share' : 'Bagikan')}</span>
              </button>

              <button
                onClick={() => {
                  playClick();
                  const targetStream =
                    activeServer?.url ||
                    (currentEpisode ? currentEpisode.videoUrl : getDefaultServer(media.servers)?.url);
                  if (targetStream) {
                    window.open(targetStream, '_blank', 'noopener,noreferrer');
                  }
                }}
                onMouseEnter={playHover}
                title={t('openInFullTabTooltip')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-600/20 hover:from-amber-500 hover:to-red-600 text-amber-200 hover:text-black border border-amber-500/40 text-xs font-bold transition-all cursor-pointer group shadow-sm hover:shadow-glow-gold"
              >
                <ExternalLink className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                <span>{t('openInFullTab')} ↗</span>
              </button>

              <a
                href={getAbsoluteWatchUrl(media.id, currentEpisode?.id)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => playClick()}
                onMouseEnter={playHover}
                title={t('openInNewTabTooltip')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/[0.05] border border-white/15 text-slate-300 hover:text-white hover:bg-white/10 hover:border-[#E50914]/40 text-xs font-medium transition-all no-underline"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#E50914]" />
                <span>{t('openInNewTab')}</span>
              </a>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-white/[0.08] pb-2 overflow-x-auto no-scrollbar">
            {media.seasons && (
              <button
                onClick={() => {
                  playClick();
                  setActiveTab('episodes');
                }}
                onMouseEnter={playHover}
                className={`px-5 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
                  activeTab === 'episodes'
                    ? 'bg-[#E50914] text-white shadow-glow-red'
                    : 'text-slate-400 hover:text-white bg-white/[0.04]'
                }`}
              >
                {language === 'en' ? 'Episodes' : 'Episode'} ({media.seasons.reduce((acc, s) => acc + s.episodes.length, 0)})
              </button>
            )}

            <button
              onClick={() => {
                playClick();
                setActiveTab('info');
              }}
              onMouseEnter={playHover}
              className={`px-5 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'info'
                  ? 'bg-[#E50914] text-white shadow-glow-red'
                  : 'text-slate-400 hover:text-white bg-white/[0.04]'
              }`}
            >
              {language === 'en' ? 'Storyline & Cast' : 'Sinopsis & Pemeran'}
            </button>

            <button
              onClick={() => {
                playClick();
                setActiveTab('reviews');
              }}
              onMouseEnter={playHover}
              className={`px-5 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'reviews'
                  ? 'bg-[#E50914] text-white shadow-glow-red'
                  : 'text-slate-400 hover:text-white bg-white/[0.04]'
              }`}
            >
              {language === 'en' ? `Audience Reviews (${reviewsList.length})` : `Ulasan Penonton (${reviewsList.length})`}
            </button>
          </div>

          {/* Tab 1: Episode Hub */}
          {activeTab === 'episodes' && media.seasons && (
            <EpisodeList
              mediaId={media.id}
              seasons={media.seasons}
              activeEpisodeId={currentEpisode?.id}
              status={media.status}
              isOngoing={media.isOngoing}
              totalEpisodes={media.totalEpisodes}
              onSelectEpisode={handleSelectEpisode}
            />
          )}

          {/* Tab 2: Info & Synopsis */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* IMDb Official Verified Info Banner */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#F5C518]/10 via-black/40 to-white/[0.02] border border-[#F5C518]/20 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="bg-[#F5C518] text-black font-black text-xs px-1.5 py-0.5 rounded font-sans tracking-wide">
                      IMDb
                    </span>
                    <span className="text-xs font-semibold text-white">
                      {language === 'en' ? 'Official IMDb Data' : 'Data Resmi IMDb'}
                    </span>
                    {media.imdbId && (
                      <span className="text-[11px] text-slate-400 font-mono">
                        ({media.imdbId})
                      </span>
                    )}
                  </div>

                  <a
                    href={media.imdbUrl || (media.imdbId ? getImdbUrl(media.imdbId) : 'https://www.imdb.com')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5C518] hover:bg-[#e0b415] text-black font-semibold text-xs transition-all shadow-sm hover:scale-105"
                  >
                    <span>{language === 'en' ? 'Visit IMDb ↗' : 'Kunjungi IMDb ↗'}</span>
                  </a>
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-xs font-sans tracking-[0.2em] uppercase text-brand-champagne">
                    {language === 'en' ? 'Storyline & Synopsis' : 'Sinopsis & Alur Cerita'}
                  </h4>
                  <p className="text-sm sm:text-base text-slate-200 font-light leading-relaxed">
                    {displaySynopsis}
                  </p>
                  {media.imdbPlot && media.imdbPlot !== media.synopsis && (
                    <div className="pt-2 border-t border-white/[0.04]">
                      <span className="text-[11px] text-[#F5C518] font-medium block mb-0.5">
                        IMDb Official Storyline:
                      </span>
                      <p className="text-xs text-slate-300 italic font-serif leading-relaxed">
                        "{media.imdbPlot}"
                      </p>
                    </div>
                  )}
                </div>

                {(media.writer || media.awards) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-white/[0.06] text-xs">
                    {media.writer && (
                      <div className="p-2.5 rounded-lg bg-white/[0.02]">
                        <span className="text-slate-500 block text-[11px]">{language === 'en' ? 'Writer' : 'Penulis Skenario'}</span>
                        <span className="text-white font-medium">{media.writer}</span>
                      </div>
                    )}
                    {media.awards && (
                      <div className="p-2.5 rounded-lg bg-white/[0.02]">
                        <span className="text-slate-500 block text-[11px]">{language === 'en' ? 'Awards' : 'Penghargaan'}</span>
                        <span className="text-[#F5C518] font-medium flex items-center gap-1">
                          <Award className="w-3 h-3 shrink-0" />
                          {media.awards}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Technical Specifications */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-xs">
                <div>
                  <span className="text-slate-500 block mb-1">{language === 'en' ? 'Director' : 'Sutradara'}</span>
                  {media.director ? (
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-medium text-white">
                      {splitMultipleNames(media.director).map((dir, idx, arr) => (
                        <React.Fragment key={dir}>
                          <button
                            onClick={() => handleOpenCuration({ type: 'director', name: dir })}
                            onMouseEnter={playHover}
                            className="group inline-flex items-center gap-1 hover:text-brand-champagne transition-all cursor-pointer"
                            title={language === 'en' ? `View all films directed by ${dir}` : `Lihat semua film karya ${dir}`}
                          >
                            <span className="underline decoration-white/20 group-hover:decoration-brand-gold underline-offset-4 transition-colors">
                              {dir}
                            </span>
                            <Clapperboard className="w-3 h-3 text-brand-gold/70 group-hover:text-brand-gold transition-colors shrink-0" />
                          </button>
                          {idx < arr.length - 1 && <span className="text-slate-500 font-normal">,</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  ) : (
                    <span className="font-medium text-white">-</span>
                  )}
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">{language === 'en' ? 'Country' : 'Negara Produksi'}</span>
                  {media.country ? (
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-medium text-white">
                      {splitMultipleNames(media.country).map((cntry, idx, arr) => (
                        <React.Fragment key={cntry}>
                          <button
                            onClick={() => handleOpenCuration({ type: 'country', name: cntry })}
                            onMouseEnter={playHover}
                            className="group inline-flex items-center gap-1 hover:text-brand-champagne transition-all cursor-pointer"
                            title={language === 'en' ? `Explore all titles from ${cntry}` : `Jelajahi semua film dari ${cntry}`}
                          >
                            <span className="underline decoration-white/20 group-hover:decoration-brand-gold underline-offset-4 transition-colors">
                              {cntry}
                            </span>
                            <Globe className="w-3 h-3 text-brand-gold/70 group-hover:text-brand-gold transition-colors shrink-0" />
                          </button>
                          {idx < arr.length - 1 && <span className="text-slate-500 font-normal">,</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  ) : (
                    <span className="font-medium text-white">-</span>
                  )}
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">{language === 'en' ? 'Audio Format' : 'Format Audio'}</span>
                  <span className="font-medium text-white">{media.audioTracks.join(', ')}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">{language === 'en' ? 'Subtitles' : 'Takarir / Subtitle'}</span>
                  <span className="font-medium text-brand-champagne">{media.subtitles.join(', ')}</span>
                </div>
              </div>

              {/* Cast Members */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-sans tracking-[0.2em] uppercase text-slate-400">
                    {language === 'en' ? 'Top Cast' : 'Daftar Pemeran Utama'}
                  </h4>
                  <span className="text-[10px] font-mono text-slate-500">
                    {language === 'en' ? 'Click cast member to view filmography' : 'Klik pemeran untuk lihat filmografi'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {media.cast.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => handleOpenCuration({ type: 'cast', name: c.name, avatar: c.avatar, role: c.role })}
                      onMouseEnter={playHover}
                      className="group flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-brand-gold/50 hover:bg-white/[0.04] transition-all text-left cursor-pointer"
                      title={language === 'en' ? `View filmography of ${c.name}` : `Lihat filmografi ${c.name}`}
                    >
                      <img
                        src={c.avatar}
                        alt={c.name}
                        className="w-10 h-10 rounded-full object-cover border border-white/10 group-hover:border-brand-gold/70 group-hover:scale-105 transition-all"
                      />
                      <div className="min-w-0">
                        <div className="font-medium text-xs text-white group-hover:text-brand-champagne truncate transition-colors">
                          {c.name}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate font-light">
                          {c.role}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Reviews */}
          {activeTab === 'reviews' && (
            <div className="space-y-6">
              <form
                onSubmit={handleAddReview}
                className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-xs text-slate-300 flex items-center gap-2 uppercase tracking-wider">
                    <MessageSquare className="w-3.5 h-3.5 text-brand-champagne" />
                    {language === 'en' ? 'Write a Review or Curation Note' : 'Tulis Catatan Kurasi atau Ulasan'}
                  </h4>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setNewRating(star)}
                        className="text-brand-gold hover:scale-115 transition-transform"
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            star <= newRating ? 'fill-brand-gold' : 'text-slate-600'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newReviewText}
                    onChange={(e) => setNewReviewText(e.target.value)}
                    placeholder={language === 'en' ? 'Share your thoughts about this title...' : 'Bagikan apresiasi sinematik Anda tentang karya ini...'}
                    className="flex-1 bg-cinema-950/80 border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#E50914]"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#F40612] text-white font-bold text-xs flex items-center gap-1.5 shadow-glow-red transition-all cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{language === 'en' ? 'Publish' : 'Terbitkan'}</span>
                  </button>
                </div>
              </form>

              {/* Reviews List */}
              <div className="space-y-3">
                {reviewsList.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={rev.avatar}
                          alt={rev.author}
                          className="w-7 h-7 rounded-full object-cover border border-white/10"
                        />
                        <div>
                          <div className="font-medium text-xs text-slate-200">{rev.author}</div>
                          <div className="text-[10px] text-slate-500">{rev.date}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 text-brand-gold">
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-brand-gold" />
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 font-light leading-relaxed">{rev.content}</p>

                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <button
                        onClick={playClick}
                        className="flex items-center gap-1 hover:text-brand-champagne transition-colors"
                      >
                        <ThumbsUp className="w-3 h-3" />
                        <span>{rev.likes} {language === 'en' ? 'Likes' : 'Apresiasi'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Similar Recommendations */}
          {recommendations.length > 0 && (
            <div className="pt-6 border-t border-white/[0.06] space-y-4">
              <h4 className="text-sm font-display font-medium text-white uppercase tracking-wider">
                {language === 'en' ? 'More Like This' : 'Karya Terkait Pilihan'}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {recommendations.map((rec) => (
                  <MovieCard
                    key={rec.id}
                    media={rec}
                    onPlay={() => onPlayMedia(rec)}
                    onOpenDetails={() => onPlayMedia(rec)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filmography & Country Curation Modal */}
      <FilmographyModal
        isOpen={isCurationOpen}
        onClose={() => setIsCurationOpen(false)}
        target={curationTarget}
        catalog={media ? (catalog.some((c) => c.id === media.id) ? catalog : [media, ...catalog]) : catalog}
        onSelectMedia={(selected) => {
          setIsCurationOpen(false);
          onClose();
          onPlayMedia(selected);
        }}
      />
    </div>
  );
};
