import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';

export interface UserColorPalette {
  id: string;
  name: string;
  gradient: string;
  border: string;
  shadow: string;
  accent: string;
}

export const PROFILE_PALETTES: UserColorPalette[] = [
  {
    id: 'netflix-crimson',
    name: 'Netflix Crimson',
    gradient: 'from-[#E50914] to-[#99060E]',
    border: 'border-[#E50914]/60',
    shadow: 'shadow-red-900/40',
    accent: '#E50914',
  },
  {
    id: 'cyber-cyan',
    name: 'Cyber Neon',
    gradient: 'from-cyan-500 to-blue-600',
    border: 'border-cyan-500/60',
    shadow: 'shadow-cyan-900/40',
    accent: '#06b6d4',
  },
  {
    id: 'galactic-violet',
    name: 'Galactic Violet',
    gradient: 'from-violet-600 to-indigo-700',
    border: 'border-violet-500/60',
    shadow: 'shadow-violet-900/40',
    accent: '#8b5cf6',
  },
  {
    id: 'emerald-dragon',
    name: 'Emerald Dragon',
    gradient: 'from-emerald-500 to-teal-700',
    border: 'border-emerald-500/60',
    shadow: 'shadow-emerald-900/40',
    accent: '#10b981',
  },
  {
    id: 'solar-amber',
    name: 'Solar Amber',
    gradient: 'from-amber-500 to-orange-600',
    border: 'border-amber-500/60',
    shadow: 'shadow-amber-900/40',
    accent: '#f59e0b',
  },
  {
    id: 'sakura-rose',
    name: 'Sakura Rose',
    gradient: 'from-rose-500 to-pink-600',
    border: 'border-rose-500/60',
    shadow: 'shadow-rose-900/40',
    accent: '#f43f5e',
  },
  {
    id: 'synthwave-fuchsia',
    name: 'Synthwave Neon',
    gradient: 'from-fuchsia-600 to-purple-800',
    border: 'border-fuchsia-500/60',
    shadow: 'shadow-fuchsia-900/40',
    accent: '#d946ef',
  },
  {
    id: 'midnight-navy',
    name: 'Midnight Navy',
    gradient: 'from-blue-600 to-slate-900',
    border: 'border-blue-500/60',
    shadow: 'shadow-blue-900/40',
    accent: '#3b82f6',
  },
  {
    id: 'sunset-blaze',
    name: 'Sunset Blaze',
    gradient: 'from-orange-500 to-red-600',
    border: 'border-orange-500/60',
    shadow: 'shadow-orange-900/40',
    accent: '#ea580c',
  },
  {
    id: 'matrix-lime',
    name: 'Matrix Lime',
    gradient: 'from-lime-500 to-emerald-700',
    border: 'border-lime-500/60',
    shadow: 'shadow-lime-900/40',
    accent: '#84cc16',
  },
];

export const PROFILE_EMOJIS = [
  '🍿', '🎬', '👑', '⚡', '🎭', '🔥', '💎', '🚀', '⭐', '🕶️', '🐺', '🦊', '🦁', '👾', '🎮', '🪐',
];

export const PROFILE_INITIALS = [
  'NX', 'CS', 'VK', 'SL', 'AP', 'MK', 'DX', 'FX', 'ZX', 'RV',
  'BX', 'TX', 'LX', 'PX', 'QX', 'KX', 'WX', 'JX', 'GX', 'HX',
];

const NAME_PREFIXES = [
  'Cine', 'Neon', 'Cyber', 'Shadow', 'Cosmic', 'Solar', 'Velox',
  'Hyper', 'Nova', 'Viper', 'Aero', 'Quantum', 'Pixel', 'Echo', 'Vortex',
];

const NAME_SUFFIXES = [
  'Viewer', 'Streamer', 'Explorer', 'Spectator', 'Pilot', 'Watcher',
  'Voyager', 'Knight', 'Buff', 'Fan', 'Nomad', 'Ranger', 'Captain',
];

export interface UserProfile {
  id: string;
  name: string;
  initials: string;
  emoji: string;
  avatarType: 'monogram' | 'emoji';
  paletteId: string;
  createdAt: number;
}

const STORAGE_KEY = 'cinestream_user_profile_v1';

/**
 * Deterministically or pseudo-randomly generate a unique profile for this device.
 */
function generateUniqueProfile(): UserProfile {
  const randomSeed = Math.floor(Math.random() * 10000);
  const paletteIndex = randomSeed % PROFILE_PALETTES.length;
  const initialsIndex = (randomSeed + 3) % PROFILE_INITIALS.length;
  const emojiIndex = (randomSeed + 7) % PROFILE_EMOJIS.length;
  const prefixIndex = (randomSeed + 5) % NAME_PREFIXES.length;
  const suffixIndex = (randomSeed + 11) % NAME_SUFFIXES.length;
  const userTag = Math.floor(100 + Math.random() * 900);

  const prefix = NAME_PREFIXES[prefixIndex];
  const suffix = NAME_SUFFIXES[suffixIndex];
  const initial = PROFILE_INITIALS[initialsIndex];
  const emoji = PROFILE_EMOJIS[emojiIndex];
  const palette = PROFILE_PALETTES[paletteIndex];

  const avatarType: 'monogram' | 'emoji' = Math.random() > 0.4 ? 'monogram' : 'emoji';

  return {
    id: `cinestream_usr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`,
    name: `${prefix}${suffix} #${userTag}`,
    initials: initial,
    emoji,
    avatarType,
    paletteId: palette.id,
    createdAt: Date.now(),
  };
}

interface UserProfileContextType {
  profile: UserProfile;
  activePalette: UserColorPalette;
  isCloudSynced: boolean;
  updateProfile: (partial: Partial<UserProfile>) => void;
  randomizeProfile: () => void;
  allPalettes: UserColorPalette[];
  allEmojis: string[];
  allInitials: string[];
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export const UserProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCloudSynced, setIsCloudSynced] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && parsed.id && parsed.name) {
          if (!PROFILE_PALETTES.some((p) => p.id === parsed.paletteId)) {
            parsed.paletteId = PROFILE_PALETTES[0].id;
          }
          return parsed;
        }
      }
    } catch {
      // ignore
    }

    const generated = generateUniqueProfile();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(generated));
    } catch {}
    return generated;
  });

  // Cross-tab synchronization on the same device
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.id && parsed.name) {
            setProfile(parsed);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Supabase Cloud Profile Sync
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const loadCloudProfile = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (!error && data) {
          setIsCloudSynced(true);
          setProfile((prev) => {
            const updated: UserProfile = {
              ...prev,
              id: data.id,
              name: data.name || prev.name,
              avatarType: (data.avatar_type as 'monogram' | 'emoji') || prev.avatarType,
              initials: data.initials || prev.initials,
              emoji: data.emoji || prev.emoji,
              paletteId: data.theme_palette || prev.paletteId,
            };
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            } catch {}
            return updated;
          });
        }
      } catch (err) {
        console.warn('Error loading cloud profile:', err);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadCloudProfile(session.user.id);
      } else {
        setIsCloudSynced(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadCloudProfile(session.user.id);
      } else {
        setIsCloudSynced(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const updateProfile = (partial: Partial<UserProfile>) => {
    setProfile((prev) => {
      const updated: UserProfile = { ...prev, ...partial };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.warn('Failed to save profile to localStorage:', err);
      }

      // Sync to cloud if user is logged in
      if (isSupabaseConfigured && isCloudSynced) {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) {
            supabase
              .from('profiles')
              .update({
                name: updated.name,
                avatar_type: updated.avatarType,
                initials: updated.initials,
                emoji: updated.emoji,
                theme_palette: updated.paletteId,
                updated_at: new Date().toISOString(),
              })
              .eq('id', user.id)
              .then();
          }
        });
      }

      return updated;
    });
  };

  const randomizeProfile = () => {
    const newProfile = generateUniqueProfile();
    newProfile.id = profile.id;
    newProfile.createdAt = profile.createdAt;
    setProfile(newProfile);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
    } catch {}

    if (isSupabaseConfigured && isCloudSynced) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          supabase
            .from('profiles')
            .update({
              name: newProfile.name,
              avatar_type: newProfile.avatarType,
              initials: newProfile.initials,
              emoji: newProfile.emoji,
              theme_palette: newProfile.paletteId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id)
            .then();
        }
      });
    }
  };

  const activePalette =
    PROFILE_PALETTES.find((p) => p.id === profile.paletteId) || PROFILE_PALETTES[0];

  return (
    <UserProfileContext.Provider
      value={{
        profile,
        activePalette,
        isCloudSynced,
        updateProfile,
        randomizeProfile,
        allPalettes: PROFILE_PALETTES,
        allEmojis: PROFILE_EMOJIS,
        allInitials: PROFILE_INITIALS,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
};


export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
};
