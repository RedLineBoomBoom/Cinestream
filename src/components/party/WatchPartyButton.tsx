import React from 'react';
import { Users } from 'lucide-react';
import { useWatchParty } from '../../context/WatchPartyContext';
import { useSound } from '../../context/SoundContext';
import { useLanguage } from '../../context/LanguageContext';

interface WatchPartyButtonProps {
  onClick: () => void;
  variant?: 'pill' | 'compact' | 'nav';
  isActive?: boolean;
}

export const WatchPartyButton: React.FC<WatchPartyButtonProps> = ({ onClick, variant = 'pill', isActive = false }) => {
  const { status, members, publicRooms } = useWatchParty();
  const { t } = useLanguage();
  const { playClick, playHover } = useSound();
  const isConnected = status === 'connected';
  const activeCount = members.filter((m) => m.isActive).length;
  const liveRoomsCount = publicRooms?.length || 0;

  const handleClick = () => { playClick(); onClick(); };

  if (variant === 'nav') {
    return (
      <a
        href="/watch-party"
        onClick={(e) => {
          if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;
          e.preventDefault();
          handleClick();
        }}
        onMouseEnter={playHover}
        className={`relative px-2 xl:px-3 py-1.5 rounded text-[11.5px] xl:text-[13px] tracking-normal transition-all duration-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 group no-underline ${
          isActive
            ? 'bg-white/10 text-white font-bold shadow-sm'
            : isConnected
            ? 'bg-violet-600/30 text-white font-bold shadow-sm'
            : liveRoomsCount > 0
            ? 'text-emerald-300 font-semibold hover:bg-emerald-950/40'
            : 'text-slate-300 hover:text-white font-normal hover:bg-white/[0.05]'
        }`}
        title={isConnected ? `${t('partyTitle')} (${activeCount})` : liveRoomsCount > 0 ? `${liveRoomsCount} ${t('partyLobbyTab')} Live` : t('partyTitle')}
      >
        <Users className={`w-3.5 h-3.5 shrink-0 transition-transform group-hover:scale-110 ${
          isActive
            ? 'text-[#E50914]'
            : isConnected
            ? 'text-violet-300'
            : liveRoomsCount > 0
            ? 'text-emerald-400'
            : 'text-slate-400 group-hover:text-white'
        }`} />
        <span>{t('partyTitle')}</span>
        {isConnected && activeCount > 0 ? (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold leading-none bg-violet-500 text-white shadow-xs">
            {activeCount}
          </span>
        ) : !isConnected && liveRoomsCount > 0 ? (
          <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-bold leading-none bg-emerald-500/25 text-emerald-300 border border-emerald-400/40">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
            </span>
            {liveRoomsCount} Live
          </span>
        ) : null}
        {isActive && (
          <span className="absolute bottom-0 inset-x-2 xl:inset-x-3 h-[2px] bg-[#E50914] rounded-full" />
        )}
      </a>
    );
  }

  if (variant === 'compact') {
    return (
      <button
        onClick={handleClick}
        onMouseEnter={playHover}
        className={`flex items-center gap-1.5 backdrop-blur-md px-2.5 sm:px-3 py-1 rounded-full border text-[10px] sm:text-[11px] font-medium transition-all shadow-lg cursor-pointer ${
          isConnected
            ? 'bg-violet-500/90 text-white border-violet-400/50 shadow-violet-500/25'
            : liveRoomsCount > 0
            ? 'bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-300 border-emerald-500/40 shadow-emerald-950/40'
            : 'bg-cinema-950/85 hover:bg-violet-500/20 hover:text-violet-300 text-slate-300 border-white/10 hover:border-violet-500/30'
        }`}
        title={isConnected ? t('partyTitle') : liveRoomsCount > 0 ? `${liveRoomsCount} ${t('partyLobbyTab')} Live` : t('partyTitle')}
      >
        <Users className="w-3 h-3" />
        <span className="hidden sm:inline">{t('partyTitle')}</span>
        {isConnected && activeCount > 0 ? (
          <span className="w-4 h-4 rounded-full bg-white/20 text-white text-[9px] font-bold flex items-center justify-center">
            {activeCount}
          </span>
        ) : !isConnected && liveRoomsCount > 0 ? (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 text-[9px] font-bold border border-emerald-400/30">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
            </span>
            {liveRoomsCount}
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      onMouseEnter={playHover}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
        isConnected
          ? 'bg-violet-500 text-white border-violet-400 shadow-lg shadow-violet-500/30'
          : liveRoomsCount > 0
          ? 'bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border-emerald-500/35 hover:border-emerald-400 shadow-md shadow-emerald-950/50'
          : 'bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border-violet-500/25 hover:border-violet-500/50'
      }`}
    >
      <Users className="w-4 h-4" />
      {isConnected ? (
        `${t('partyTitle')} (${activeCount})`
      ) : liveRoomsCount > 0 ? (
        <span className="flex items-center gap-2">
          <span>{t('partyTitle')}</span>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            {liveRoomsCount} Live
          </span>
        </span>
      ) : (
        t('partyTitle')
      )}
    </button>
  );
};
