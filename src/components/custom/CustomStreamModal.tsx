import React, { useState } from 'react';
import { X, Play, Link } from 'lucide-react';
import type { MediaItem, Server } from '../../types/media';
import { useSound } from '../../context/SoundContext';

interface CustomStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayCustomMedia: (media: MediaItem) => void;
}

export const CustomStreamModal: React.FC<CustomStreamModalProps> = ({
  isOpen,
  onClose,
  onPlayCustomMedia,
}) => {
  const [streamUrl, setStreamUrl] = useState('');
  const [title, setTitle] = useState('');
  const [isEmbed, setIsEmbed] = useState(false);
  const [posterUrl, setPosterUrl] = useState('');
  const { playClick, playSuccess } = useSound();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!streamUrl.trim()) return;

    playSuccess();

    const cleanTitle = title.trim() || 'Pemutaran Aliran Kustom';
    const isEmbedUrl =
      isEmbed ||
      streamUrl.includes('/embed/') ||
      streamUrl.includes('iframe') ||
      streamUrl.includes('player') ||
      streamUrl.includes('vidsrc');

    const customServer: Server = {
      id: `custom-srv-${Date.now()}`,
      name: isEmbedUrl ? 'Jalur Embed Web' : 'Jalur Aliran Kustom',
      speed: '18 ms',
      quality: '1080p FHD',
      url: streamUrl.trim(),
      status: 'online',
      isEmbed: isEmbedUrl,
    };

    const customMedia: MediaItem = {
      id: `custom-${Date.now()}`,
      title: cleanTitle,
      type: 'movie',
      poster:
        posterUrl.trim() ||
        'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=800&auto=format&fit=crop',
      backdrop:
        posterUrl.trim() ||
        'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1920&auto=format&fit=crop',
      synopsis: `Pemutaran media kustom yang dimuat dari tautan eksternal: ${streamUrl.trim()}`,
      rating: 9.0,
      year: new Date().getFullYear(),
      releaseDate: 'Pemutaran Langsung',
      duration: 'Aliran Berjalan',
      quality: '1080p FHD',
      ageRating: '13+',
      genres: ['Streaming Kustom', 'Web Stream'],
      country: 'Sumber Eksternal',
      director: 'Koleksi Pengguna',
      cast: [],
      audioTracks: ['Default Audio'],
      subtitles: ['Indonesia', 'English'],
      servers: [customServer],
    };

    onPlayCustomMedia(customMedia);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-cinema-900 border border-white/[0.1] rounded-3xl shadow-2xl p-6 sm:p-8 z-10 space-y-5">
        <button
          onClick={() => {
            playClick();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/[0.04] text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-brand-champagne text-xs font-sans tracking-widest uppercase font-medium">
            <Link className="w-3.5 h-3.5" />
            <span>Integrasi Aliran Bebas</span>
          </div>
          <h3 className="text-xl font-display font-medium text-white tracking-wide">
            Putar Tautan Film dari Sumber Eksternal
          </h3>
          <p className="text-xs text-slate-400 font-light">
            Tempelkan tautan video (.mp4, .m3u8) atau URL iframe/embed pemutar video untuk diputar langsung di antarmuka sinematik.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-wider text-slate-400 font-medium block">
              URL Video / Embed Pemutar *
            </label>
            <input
              type="url"
              required
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              placeholder="https://... (mp4, m3u8, atau embed URL)"
              className="w-full bg-cinema-950 border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-gold/60"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-wider text-slate-400 font-medium block">
              Judul Film / Serial (Opsional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Misal: Dune Part Two (Aliran Kustom)"
              className="w-full bg-cinema-950 border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-gold/60"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-wider text-slate-400 font-medium block">
              URL Poster / Sampul (Opsional)
            </label>
            <input
              type="url"
              value={posterUrl}
              onChange={(e) => setPosterUrl(e.target.value)}
              placeholder="https://... (URL gambar poster)"
              className="w-full bg-cinema-950 border border-white/[0.08] rounded-xl px-4 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-gold/60"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="embedMode"
              checked={isEmbed}
              onChange={(e) => setIsEmbed(e.target.checked)}
              className="rounded accent-[#E50914] cursor-pointer"
            />
            <label htmlFor="embedMode" className="text-xs text-slate-300 font-light cursor-pointer select-none">
              Tautan merupakan Iframe Embed (seperti pemutar Hydrax/Doodstream)
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-full bg-[#E50914] hover:bg-[#F40612] text-white font-bold text-xs tracking-wider uppercase shadow-glow-red flex items-center justify-center gap-2 hover:brightness-105 active:scale-98 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Mulai Pemutaran di Player</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
