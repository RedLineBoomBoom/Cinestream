import React, { memo } from 'react';

interface CinematicAtmosphereProps {
  activeBackdrop?: string;
  showWallpaper?: boolean;
}

export const CinematicAtmosphere: React.FC<CinematicAtmosphereProps> = memo(({ activeBackdrop, showWallpaper = true }) => {
  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden -z-10 select-none"
      aria-hidden="true"
    >
      {/* 1. Deep Obsidian Base Canvas (Solid #141414) */}
      <div className="absolute inset-0 bg-[#141414]" />

      {/* Atmospheric Effects & Wallpaper (Only active when NOT on Home tab, keeping Home tab completely solid black #141414) */}
      {showWallpaper && (
        <>
          {/* 1b. Cinematic Wallpaper Base */}
          <div
            className="absolute inset-0 transition-opacity duration-700"
            style={{
              backgroundImage: 'url(/wallpaper.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center center',
              backgroundAttachment: 'fixed',
            }}
          />
          {/* Dark overlay for readability */}
          <div className="absolute inset-0 bg-[#06070a]/60" />

          {/* 2. Dynamic Ambilight Backdrop (if available) */}
          {activeBackdrop && (
            <div
              className="absolute inset-0 transition-opacity duration-1000 ease-in-out opacity-25 mix-blend-screen scale-125"
              style={{
                backgroundImage: `url(${activeBackdrop})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center 20%',
                filter: 'blur(140px) saturate(1.4)',
              }}
            />
          )}

          {/* 3. Overhead Cinema Projector Spotlight */}
          <div
            className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[1100px] h-[650px] rounded-full opacity-60 animate-aurora-pulse"
            style={{
              background: 'radial-gradient(ellipse at top, rgba(233, 213, 158, 0.14) 0%, rgba(212, 175, 55, 0.06) 45%, transparent 75%)',
              filter: 'blur(100px)',
            }}
          />

          {/* 4. Cosmic Nebula Orbs (Indigo, Cyan Aurora, Velvet Crimson) */}
          {/* Orb A: Mystic Indigo/Violet - Top Right */}
          <div
            className="absolute top-[8%] -right-[10%] w-[750px] h-[750px] rounded-full opacity-45 animate-aurora-float"
            style={{
              background: 'radial-gradient(circle, rgba(99, 102, 241, 0.18) 0%, rgba(139, 92, 246, 0.08) 50%, transparent 75%)',
              filter: 'blur(130px)',
            }}
          />

          {/* Orb B: Emerald / Teal Aurora Bloom - Mid Left */}
          <div
            className="absolute top-[35%] -left-[12%] w-[800px] h-[800px] rounded-full opacity-40 animate-aurora-reverse"
            style={{
              background: 'radial-gradient(circle, rgba(16, 185, 129, 0.16) 0%, rgba(20, 184, 166, 0.07) 50%, transparent 75%)',
              filter: 'blur(140px)',
            }}
          />

          {/* Orb C: Theatrical Velvet Crimson - Lower Right */}
          <div
            className="absolute bottom-[10%] right-[15%] w-[650px] h-[650px] rounded-full opacity-35 animate-aurora-pulse"
            style={{
              background: 'radial-gradient(circle, rgba(163, 29, 36, 0.15) 0%, rgba(103, 20, 25, 0.06) 50%, transparent 75%)',
              filter: 'blur(120px)',
            }}
          />

          {/* 5. Modern Architectural Dot-Matrix Pattern with Radial Mask */}
          <div
            className="absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
              backgroundSize: '36px 36px',
              maskImage: 'radial-gradient(ellipse at 50% 30%, black 25%, transparent 80%)',
              WebkitMaskImage: 'radial-gradient(ellipse at 50% 30%, black 25%, transparent 80%)',
            }}
          />

          {/* 6. Subtle Horizontal Scanline Grid */}
          <div
            className="absolute inset-0 opacity-[0.02] pointer-events-none"
            style={{
              backgroundImage: 'linear-gradient(to bottom, transparent 50%, rgba(0, 0, 0, 0.5) 51%)',
              backgroundSize: '100% 4px',
            }}
          />

          {/* 7. Cinema Perimeter Vignette */}
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 40%, rgba(4, 5, 7, 0.65) 100%)',
            }}
          />

          {/* 8. Bottom Grounding Shadow Gradient */}
          <div className="absolute inset-x-0 bottom-0 h-96 bg-gradient-to-t from-[#06070a] via-[#06070a]/80 to-transparent" />
        </>
      )}
    </div>
  );
});

CinematicAtmosphere.displayName = 'CinematicAtmosphere';
