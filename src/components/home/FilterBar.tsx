import React from 'react';
import { RotateCcw } from 'lucide-react';
import { GENRE_LIST, COUNTRY_LIST, YEAR_LIST } from '../../data/mockCatalog';
import { useSound } from '../../context/SoundContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatGenre, formatCountry, formatYearFilter } from '../../utils/formatters';
import { getTabUrl } from '../../utils/navigation';

interface FilterBarProps {
  activeType: string;
  onSelectType: (type: string) => void;
  selectedGenre: string;
  onSelectGenre: (genre: string) => void;
  selectedCountry: string;
  onSelectCountry: (country: string) => void;
  selectedYear: string;
  onSelectYear: (year: string) => void;
  sortBy: string;
  onSelectSort: (sort: string) => void;
  onReset: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  activeType,
  onSelectType,
  selectedGenre,
  onSelectGenre,
  selectedCountry,
  onSelectCountry,
  selectedYear,
  onSelectYear,
  sortBy,
  onSelectSort,
  onReset,
}) => {
  const { playClick, playHover } = useSound();
  const { t, language } = useLanguage();

  const typeTabs = [
    { id: 'all', label: t('allCollections') },
    { id: 'movie', label: t('cinemaFilms') },
    { id: 'series', label: t('tvSeries') },
    { id: 'anime', label: t('animeCollection') },
    { id: 'drama', label: t('asianDrama') },
  ];

  const hasActiveFilters =
    activeType !== 'all' ||
    selectedGenre !== 'Semua Genre' ||
    selectedCountry !== 'Semua Negara' ||
    selectedYear !== 'Semua Tahun' ||
    sortBy !== 'popular';

  return (
    <div className="max-w-[1720px] 2xl:max-w-[1880px] 3xl:max-w-[2200px] 4xl:max-w-[2600px] mx-auto px-4 sm:px-8 lg:px-12 3xl:px-16 my-4 sm:my-6">
      <div className="space-y-4">
        {/* Top Type Tabs (Seamless Floating Pills) */}
        <div className="flex items-center justify-between gap-4 overflow-x-auto no-scrollbar pb-1">
          <div className="flex items-center gap-2">
            {typeTabs.map((tab) => {
              const targetUrl = getTabUrl(tab.id === 'all' ? 'home' : tab.id);
              return (
                <a
                  key={tab.id}
                  href={targetUrl}
                  onClick={(e) => {
                    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;
                    e.preventDefault();
                    playClick();
                    onSelectType(tab.id);
                  }}
                  onMouseEnter={playHover}
                  className={`px-4 sm:px-5 py-2 rounded-full text-xs sm:text-[13px] tracking-wide whitespace-nowrap transition-all duration-200 no-underline cursor-pointer ${
                    activeType === tab.id
                      ? 'bg-white text-black font-bold shadow-lg shadow-white/20 scale-[1.02]'
                      : 'bg-white/[0.06] text-slate-300 hover:bg-white/12 hover:text-white font-medium border border-white/[0.06] hover:border-white/15'
                  }`}
                >
                  {tab.label}
                </a>
              );
            })}
          </div>

          {hasActiveFilters && (
            <button
              onClick={() => {
                playClick();
                onReset();
              }}
              onMouseEnter={playHover}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-white font-medium whitespace-nowrap px-3.5 py-2 rounded-full bg-[#E50914]/15 hover:bg-[#E50914] border border-[#E50914]/30 transition-all duration-200 shadow-sm"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{t('resetFilter')}</span>
            </button>
          )}
        </div>

        {/* Dropdowns Row (Seamlessly Blended, No Harsh Border Line) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          {/* Genre */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-sans font-semibold tracking-wider uppercase text-slate-400 block">
              {t('genreLabel')}
            </label>
            <select
              value={selectedGenre}
              onChange={(e) => {
                playClick();
                onSelectGenre(e.target.value);
              }}
              className="w-full bg-[#181818]/90 hover:bg-[#202020] border border-white/10 hover:border-white/25 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914]/40 cursor-pointer transition-all shadow-sm"
            >
              {GENRE_LIST.map((g) => (
                <option key={g} value={g} className="bg-[#181818] text-white">
                  {formatGenre(g, language)}
                </option>
              ))}
            </select>
          </div>

          {/* Country */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-sans font-semibold tracking-wider uppercase text-slate-400 block">
              {t('countryLabel')}
            </label>
            <select
              value={selectedCountry}
              onChange={(e) => {
                playClick();
                onSelectCountry(e.target.value);
              }}
              className="w-full bg-[#181818]/90 hover:bg-[#202020] border border-white/10 hover:border-white/25 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914]/40 cursor-pointer transition-all shadow-sm"
            >
              {COUNTRY_LIST.map((c) => (
                <option key={c} value={c} className="bg-[#181818] text-white">
                  {formatCountry(c, language)}
                </option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-sans font-semibold tracking-wider uppercase text-slate-400 block">
              {t('releaseYear')}
            </label>
            <select
              value={selectedYear}
              onChange={(e) => {
                playClick();
                onSelectYear(e.target.value);
              }}
              className="w-full bg-[#181818]/90 hover:bg-[#202020] border border-white/10 hover:border-white/25 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914]/40 cursor-pointer transition-all shadow-sm"
            >
              {YEAR_LIST.map((y) => (
                <option key={y} value={y} className="bg-[#181818] text-white">
                  {formatYearFilter(y, language)}
                </option>
              ))}
            </select>
          </div>

          {/* Sorting */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-sans font-semibold tracking-wider uppercase text-slate-400 block">
              {t('sortByLabel')}
            </label>
            <select
              value={sortBy}
              onChange={(e) => {
                playClick();
                onSelectSort(e.target.value);
              }}
              className="w-full bg-[#181818]/90 hover:bg-[#202020] border border-white/10 hover:border-white/25 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914]/40 cursor-pointer transition-all shadow-sm"
            >
              <option value="popular" className="bg-[#181818] text-white">{t('sortCurated')}</option>
              <option value="rating" className="bg-[#181818] text-white">{t('sortRating')}</option>
              <option value="latest" className="bg-[#181818] text-white">{t('sortLatest')}</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
