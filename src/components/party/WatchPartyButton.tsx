import React from 'react';
import { Users } from 'lucide-react';
import { useWatchParty } from '../../context/WatchPartyContext';
import { useSound } from '../../context/SoundContext';

interface WatchPartyButtonProps {
  onClick: () => void;
  variant?: 'pill' | 'compact';
}

export const WatchPartyButton: React.FC<WatchPartyButtonProps> = ({ onClick, variant = 'pill' }) => {
  const { status, members } = useWatchParty();
  const { playClick, playHover } = useSound();
  const isConnected = status === 'connected';
  const activeCount = members.filter((m) => m.isActive).length;

  const handleClick = () => { playClick(); onClick(); };

  if (variant === 'compact') {
    return (
      <button
        onClick={handleClick}
        onMouseEnter={playHover}
        className={`flex items-center gap-1.5 backdrop-blur-md px-2.5 sm:px-3 py-1 rounded-full border text-[10px] sm:text-[11px] font-medium transition-all shadow-lg cursor-pointer ${
          isConnected
            ? 'bg-violet-500/90 text-white border-violet-400/50 shadow-violet-500/25'
            : 'bg-cinema-950/85 hover:bg-violet-500/20 hover:text-violet-300 text-slate-300 border-white/10 hover:border-violet-500/30'
        }`}
        title="Watch Party"
      >
        <Users className="w-3 h-3" />
        <span className="hidden sm:inline">Party</span>
        {isConnected && activeCount > 0 && (
          <span className="w-4 h-4 rounded-full bg-white/20 text-white text-[9px] font-bold flex items-center justify-center">
            {activeCount}
          </span>
        )}
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
          : 'bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border-violet-500/25 hover:border-violet-500/50'
      }`}
    >
      <Users className="w-4 h-4" />
      {isConnected ? `Party (${activeCount})` : 'Watch Party'}
    </button>
  );
};
