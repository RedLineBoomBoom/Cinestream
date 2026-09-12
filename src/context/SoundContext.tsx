import React, { createContext, useContext, useState, useEffect } from 'react';
import { soundFX } from '../utils/soundEffects';

interface SoundContextType {
  soundEnabled: boolean;
  toggleSound: () => void;
  playHover: () => void;
  playClick: () => void;
  playSuccess: () => void;
  playWhoosh: () => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      localStorage.setItem('cinestream_sound', 'true');
      return true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    soundFX.enabled = true;
    try {
      localStorage.setItem('cinestream_sound', 'true');
    } catch {
      // ignore
    }
  }, [soundEnabled]);

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      soundFX.enabled = next;
      if (next) soundFX.click();
      return next;
    });
  };

  return (
    <SoundContext.Provider
      value={{
        soundEnabled,
        toggleSound,
        playHover: () => soundFX.hover(),
        playClick: () => soundFX.click(),
        playSuccess: () => soundFX.success(),
        playWhoosh: () => soundFX.whoosh(),
      }}
    >
      {children}
    </SoundContext.Provider>
  );
};

export const useSound = () => {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error('useSound must be used within a SoundProvider');
  }
  return context;
};
