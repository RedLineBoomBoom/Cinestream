import React, { useState, useEffect, useRef } from 'react';
import { Play } from 'lucide-react';

interface CinestreamIntroProps {
  onComplete: () => void;
}

// Spectrum ribbon colors inspired by Netflix's prism light beams
const RIBBON_COLORS = [
  '#E50914', '#FF1E27', '#B81D24', '#FF3B47', '#E50914',
  '#990000', '#FF5A6B', '#D4AF37', '#E50914', '#FF0055',
  '#C40812', '#FF2A36', '#E50914', '#800000', '#FF4D5A',
  '#E50914', '#FF1E27', '#B81D24', '#D4AF37', '#E50914',
  '#990000', '#FF3B47', '#E50914', '#FF0055', '#C40812',
];

export const CinestreamIntro: React.FC<CinestreamIntroProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'appear' | 'impact' | 'zoom' | 'fade' | 'done'>('appear');
  const hasFinishedRef = useRef(false);
  const hasPlayedAudioRef = useRef(false);

  // Synthesize authentic cinematic "TA-DUM" sound via Web Audio API
  const playTaDumSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return () => {};
      const ctx = new AudioCtx();

      const executeSound = () => {
        if (hasPlayedAudioRef.current) return;
        hasPlayedAudioRef.current = true;

        try {
          const now = ctx.currentTime;

          // Master volume gain
          const masterGain = ctx.createGain();
          masterGain.gain.setValueAtTime(0.95, now);
          masterGain.connect(ctx.destination);

          // 1. "TA" - Punchy sub-bass transient
          const oscTa = ctx.createOscillator();
          const gainTa = ctx.createGain();
          oscTa.type = 'sine';
          oscTa.frequency.setValueAtTime(86, now);
          oscTa.frequency.exponentialRampToValueAtTime(42, now + 0.22);
          gainTa.gain.setValueAtTime(0.9, now);
          gainTa.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          oscTa.connect(gainTa);
          gainTa.connect(masterGain);
          oscTa.start(now);
          oscTa.stop(now + 0.32);

          // 2. "DUM" - Heavy cinematic orchestral impact & resonant swell
          const dumStart = now + 0.16;

          // Deep cinematic drum boom
          const boomOsc = ctx.createOscillator();
          const boomGain = ctx.createGain();
          boomOsc.type = 'triangle';
          boomOsc.frequency.setValueAtTime(105, dumStart);
          boomOsc.frequency.exponentialRampToValueAtTime(32, dumStart + 1.25);
          boomGain.gain.setValueAtTime(1.0, dumStart);
          boomGain.gain.exponentialRampToValueAtTime(0.001, dumStart + 1.4);
          boomOsc.connect(boomGain);
          boomGain.connect(masterGain);
          boomOsc.start(dumStart);
          boomOsc.stop(dumStart + 1.4);

          // Harmonized cinematic chord (D minor / F / A / D octaves with low-pass warmth)
          const chordFrequencies = [146.83, 220.0, 261.63, 329.63, 440.0, 587.33];
          chordFrequencies.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
            osc.frequency.setValueAtTime(freq, dumStart);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(550 + idx * 220, dumStart);
            filter.frequency.exponentialRampToValueAtTime(160, dumStart + 2.2);

            const targetVol = 0.3 / (idx + 1);
            gain.gain.setValueAtTime(0.001, dumStart);
            gain.gain.linearRampToValueAtTime(targetVol, dumStart + 0.08);
            gain.gain.exponentialRampToValueAtTime(0.0001, dumStart + 2.3);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(masterGain);

            osc.start(dumStart);
            osc.stop(dumStart + 2.35);
          });
        } catch {
          // Fallback
        }
      };

      const tryPlay = () => {
        if (ctx.state === 'running') {
          executeSound();
        } else {
          ctx.resume().then(() => {
            if (ctx.state === 'running') {
              executeSound();
            }
          }).catch(() => {});
        }
      };

      // Try playing immediately
      tryPlay();

      // In case browser autoplay policy blocks unprompted audio, unlock on first interaction
      const unlockEvents = ['pointerdown', 'touchstart', 'click', 'keydown', 'mousedown'];
      const onUserGesture = () => {
        tryPlay();
        unlockEvents.forEach((evt) => window.removeEventListener(evt, onUserGesture));
      };

      unlockEvents.forEach((evt) => window.addEventListener(evt, onUserGesture, { once: true }));

      return () => {
        unlockEvents.forEach((evt) => window.removeEventListener(evt, onUserGesture));
      };
    } catch {
      return () => {};
    }
  };

  const finishIntro = () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    setPhase('fade');
    setTimeout(() => {
      setPhase('done');
      onComplete();
    }, 700);
  };

  useEffect(() => {
    // Lock scrolling completely on html & body during intro
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevTouchAction = document.body.style.touchAction;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    window.scrollTo(0, 0);

    // Start "TA-DUM" sound immediately on mount & setup gesture listener if needed
    const cleanupAudio = playTaDumSound();

    // Stage 1: Impact & Light Spectrum Explosion at 1.0s
    const timer1 = setTimeout(() => {
      setPhase('impact');
    }, 1000);

    // Stage 2: Hyperspace Zoom through at 2.0s
    const timer2 = setTimeout(() => {
      setPhase('zoom');
    }, 2000);

    // Stage 3: Smooth Fade out at 2.7s
    const timer3 = setTimeout(() => {
      finishIntro();
    }, 2700);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      if (cleanupAudio) cleanupAudio();
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.touchAction = prevTouchAction;
    };
  }, []);

  if (phase === 'done') return null;

  return (
    <div
      onWheel={(e) => e.preventDefault()}
      onTouchMove={(e) => e.preventDefault()}
      className={`fixed inset-0 z-[99999] w-screen h-[100dvh] min-h-[100dvh] flex items-center justify-center overflow-hidden overscroll-none touch-none select-none transition-opacity duration-700 bg-black/65 backdrop-blur-3xl px-4 ${
        phase === 'fade' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        backdropFilter: 'blur(36px)',
        WebkitBackdropFilter: 'blur(36px)',
        background: 'radial-gradient(circle at center, rgba(12, 12, 12, 0.55) 0%, rgba(0, 0, 0, 0.82) 100%)',
      }}
    >
      {/* Dynamic Central Ambient Glow over Frosted Glass Canvas */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div
          className={`w-[280px] h-[280px] sm:w-[500px] sm:h-[500px] md:w-[650px] md:h-[650px] rounded-full bg-[#E50914]/20 blur-[80px] sm:blur-[120px] transition-all duration-1000 ${
            phase === 'impact' || phase === 'zoom' ? 'scale-125 sm:scale-150 opacity-90' : 'scale-90 opacity-40'
          }`}
        />
      </div>

      {/* Prismatic Light Spectrum Ribbons (Netflix Style - Responsive Column) */}
      {(phase === 'impact' || phase === 'zoom') && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden"
          style={{
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
          }}
        >
          <div
            className={`relative w-full max-w-[240px] sm:max-w-xl md:max-w-3xl lg:max-w-4xl h-[70vh] sm:h-full flex items-center justify-between px-2 sm:px-8 transition-transform duration-1000 ${
              phase === 'zoom' ? 'scale-[3.2] opacity-0 blur-md' : 'scale-100 opacity-100'
            }`}
          >
            {RIBBON_COLORS.map((color, i) => {
              const heightMultiplier = 55 + ((i * 17) % 40);
              const delay = (i % 5) * 40;
              const width = 2 + ((i * 2) % 6);
              const isEven = i % 2 === 0;

              return (
                <div
                  key={i}
                  className={`h-full items-center justify-center ${isEven ? 'flex' : 'hidden sm:flex'}`}
                  style={{
                    animation: `cinestream-ribbon 1.2s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms forwards`,
                  }}
                >
                  <div
                    className="rounded-full blur-[0.5px] opacity-80 sm:opacity-85"
                    style={{
                      width: `${width}px`,
                      height: `${heightMultiplier}%`,
                      backgroundColor: color,
                      boxShadow: `0 0 12px ${color}, 0 0 24px ${color}`,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Brand Logo & Typography */}
      <div
        className={`relative z-10 flex flex-col items-center justify-center gap-3 sm:gap-4 transition-all duration-1000 ${
          phase === 'appear'
            ? 'scale-100 opacity-100'
            : phase === 'impact'
            ? 'scale-105 opacity-100 filter brightness-125'
            : 'scale-[4.2] opacity-0 blur-lg filter brightness-150'
        }`}
      >
        {/* Iconic Red Play Emblem */}
        <div className="w-13 h-13 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl sm:rounded-2xl bg-[#E50914] flex items-center justify-center shadow-[0_0_35px_rgba(229,9,20,0.8)] sm:shadow-[0_0_60px_rgba(229,9,20,0.85)] border border-red-500/40 transform transition-transform duration-700 p-3 sm:p-4">
          <Play className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-white fill-white ml-0.5 sm:ml-1 filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]" />
        </div>

        {/* Cinematic Wordmark with Expanding Letter Spacing */}
        <div className="relative text-center max-w-full px-2">
          <h1
            className="font-display font-black text-3xl sm:text-5xl md:text-7xl lg:text-8xl tracking-[0.15em] sm:tracking-[0.22em] md:tracking-[0.28em] text-[#E50914] uppercase select-none leading-none"
            style={{
              textShadow: '0 0 22px rgba(229, 9, 20, 0.9), 0 0 45px rgba(229, 9, 20, 0.5), 0 4px 10px rgba(0, 0, 0, 0.9)',
            }}
          >
            CINESTREAM
          </h1>

          {/* Subtitle Accent */}
          <p className="text-center font-sans font-semibold tracking-[0.22em] sm:tracking-[0.38em] md:tracking-[0.55em] text-white/70 text-[8px] sm:text-[10px] md:text-xs uppercase mt-2 sm:mt-3 filter drop-shadow-md whitespace-nowrap">
            Next-Gen Cinematic Streaming
          </p>
        </div>
      </div>
    </div>
  );
};
