import React from 'react';
import { useWatchParty } from '../../context/WatchPartyContext';

interface PartyReactionsOverlayProps {
  className?: string;
}

export const PartyReactionsOverlay: React.FC<PartyReactionsOverlayProps> = ({ className = '' }) => {
  const { reactions } = useWatchParty();

  if (!reactions || reactions.length === 0) return null;

  return (
    <div className={`pointer-events-none overflow-hidden absolute inset-0 z-[120] ${className}`}>
      {reactions.map((r) => (
        <div
          key={r.id}
          className="absolute bottom-6 flex flex-col items-center animate-reaction-float select-none drop-shadow-2xl pointer-events-none"
          style={{
            left: `${r.xOffset}%`,
            transform: 'translateX(-50%)',
          }}
        >
          {/* Main Floating Emoji */}
          <span className="text-3xl sm:text-4xl filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
            {r.emoji}
          </span>
          {/* Subtitle Sender Badge */}
          {r.senderName && (
            <span className="mt-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-black/75 text-white/90 border border-white/15 backdrop-blur-md whitespace-nowrap shadow-lg">
              {r.senderName}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};
