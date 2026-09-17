import React, { useState } from 'react';
import {
  ChevronDown,
  HelpCircle,
  Play,
  Sparkles,
  Server,
  Zap,
  Users,
  Languages,
  Tv,
  ShieldAlert,
  Compass,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useSound } from '../../context/SoundContext';

interface FaqItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  questionEn: string;
  questionId: string;
  answerEn: string;
  answerId: string;
  tagsEn: string[];
  tagsId: string[];
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'what-is-cinestream',
    icon: Sparkles,
    questionEn: 'What is Cinestream?',
    questionId: 'Apa itu Cinestream?',
    answerEn:
      'Cinestream is a premier digital cinema and global streaming platform that delivers captivating stories across the world. Explore the highest quality in blockbuster movies, award-winning series, trending anime, Asian dramas, and acclaimed documentaries. Stream seamlessly across multiple ultra-fast servers with crisp streaming up to 1080p Full HD, smart multi-language subtitles, and real-time Watch Party with friends.',
    answerId:
      'Cinestream adalah platform penayangan sinema digital generasi terdepan yang menyajikan ribuan film layar lebar blockbuster, serial televisi pemenang penghargaan, anime terpopuler, drama Asia, dan dokumenter terbaik dunia. Tonton secara lancar melalui jaringan multi-server berkecepatan tinggi dengan kualitas jernih hingga 1080p Full HD, subtitle multibahasa otomatis, serta fitur nonton bareng (Watch Party) bersama teman.',
    tagsEn: ['Free Cinema', 'Multi-Server', 'Watch Party', '1080p Full HD'],
    tagsId: ['Sinema Gratis', 'Multi-Server', 'Nonton Bareng', '1080p Full HD'],
  },
  {
    id: 'servers-quality',
    icon: Server,
    questionEn: 'What servers and video qualities are available on Cinestream?',
    questionId: 'Server dan kualitas video apa saja yang tersedia di Cinestream?',
    answerEn:
      'Cinestream provides multiple dedicated high-speed streaming servers (Server 1, Server 2, Server 3) offering adaptive bitrates from 720p HD up to 1080p Full HD. If one server experiences buffering or slowdowns, you can switch instantly to an alternative server with zero downtime.',
    answerId:
      'Cinestream menyediakan berbagai server berkecepatan tinggi (Server 1, Server 2, Server 3) dengan kualitas adaptif mulai dari 720p HD hingga 1080p Full HD. Jika satu server mengalami kendala atau buffering, Anda dapat beralih ke server cadangan secara instan tanpa jeda.',
    tagsEn: ['Server 1 (VIP)', 'Server 2 (Backup)', 'Server 3 (Direct)', 'Adaptive Bitrate'],
    tagsId: ['Server 1 (VIP)', 'Server 2 (Cadangan)', 'Server 3 (Direct)', 'Bitrate Adaptif'],
  },
  {
    id: 'is-it-free',
    icon: Zap,
    questionEn: 'Is Cinestream free to watch?',
    questionId: 'Apakah Cinestream gratis untuk ditonton?',
    answerEn:
      'Yes! Cinestream is completely free to explore and watch with zero mandatory subscriptions. You can instantly start streaming any movie, anime, or series directly from your web browser anytime without hidden costs.',
    answerId:
      'Ya! Cinestream dapat diakses dan ditonton secara 100% gratis tanpa biaya langganan bulanan. Anda dapat langsung memutar film, anime, maupun serial favorit langsung dari peramban Anda kapan saja tanpa biaya tersembunyi.',
    tagsEn: ['Zero Subscription', 'Instant Access', '100% Free'],
    tagsId: ['Tanpa Biaya Langganan', 'Putar Instan', '100% Gratis'],
  },
  {
    id: 'watch-party',
    icon: Users,
    questionEn: 'How does the Watch Party feature work?',
    questionId: 'Bagaimana cara kerja fitur Nonton Bareng (Watch Party)?',
    answerEn:
      'Cinestream includes an integrated Watch Party system! You can create a room, share the unique invite link or room code with friends, and enjoy synchronized video playback with real-time live chat and play/pause synchronization across any device.',
    answerId:
      'Cinestream dilengkapi fitur Watch Party bawaan! Anda cukup membuat ruang tonton, membagikan kode ruangan atau tautan undangan kepada teman, dan menikmati pemutaran video yang tersinkronisasi otomatis lengkap dengan obrolan langsung (live chat) di perangkat apa pun.',
    tagsEn: ['Synchronized Playback', 'Live Chat', 'Room Codes', 'Cross-Device'],
    tagsId: ['Sinkronisasi Otomatis', 'Obrolan Langsung', 'Kode Ruangan', 'Semua Perangkat'],
  },
  {
    id: 'subtitles-audio',
    icon: Languages,
    questionEn: 'Are subtitles and multiple audio tracks supported?',
    questionId: 'Apakah tersedia subtitle dan pilihan audio bahasa?',
    answerEn:
      'Cinestream features extensive subtitle support including Indonesian, English, Spanish, French, and Japanese. You can easily adjust subtitle font size, text color, and background opacity directly in the player settings.',
    answerId:
      'Cinestream mendukung subtitle lengkap dalam Bahasa Indonesia, Inggris, dan berbagai bahasa dunia lainnya. Anda juga dapat menyesuaikan ukuran font, warna teks, dan transparansi latar belakang subtitle langsung di panel pengaturan pemutar video.',
    tagsEn: ['Multi-Language', 'Indonesian & English', 'Custom Styling'],
    tagsId: ['Multi-Bahasa', 'Bahasa Indonesia & Inggris', 'Kustomisasi Tampilan'],
  },
  {
    id: 'which-devices',
    icon: Tv,
    questionEn: 'Which devices work with Cinestream?',
    questionId: 'Perangkat apa saja yang kompatibel dengan Cinestream?',
    answerEn:
      'Cinestream is optimized as a modern web application that runs smoothly across desktop PCs & laptops (Windows, macOS, Linux), smartphones and tablets (Android & iOS), Smart TVs (Android TV, Google TV, Samsung, LG), and streaming cast devices.',
    answerId:
      'Cinestream dioptimalkan sebagai aplikasi web modern yang berjalan lancar di berbagai perangkat: PC & laptop (Windows, macOS, Linux), smartphone dan tablet (Android & iOS), Smart TV (Android TV, Google TV, Samsung, LG), hingga perangkat casting Chromecast.',
    tagsEn: ['PC & Laptop', 'Android & iPhone', 'Smart TV & Android TV', 'Chromecast'],
    tagsId: ['PC & Laptop', 'Android & iPhone', 'Smart TV', 'Chromecast'],
  },
  {
    id: 'playback-tips',
    icon: ShieldAlert,
    questionEn: 'What should I do if a video buffers or fails to load?',
    questionId: 'Apa yang harus dilakukan jika video buffering atau gagal dimuat?',
    answerEn:
      'If a stream experiences buffering or is throttled by your ISP, try switching to Server 2 or Server 3, disable restrictive adblock extensions on stream URLs, or activate free Cloudflare 1.1.1.1 DNS for uninterrupted high-speed streaming.',
    answerId:
      'Jika pemutaran video lambat atau terhalang oleh penyedia internet Anda, silakan beralih ke Server 2 atau Server 3, nonaktifkan adblocker agresif pada player, atau gunakan DNS Cloudflare 1.1.1.1 gratis untuk streaming lancar berkecepatan tinggi.',
    tagsEn: ['Alternative Servers', 'Cloudflare 1.1.1.1 DNS', 'Smooth Streaming'],
    tagsId: ['Server Alternatif', 'DNS Cloudflare 1.1.1.1', 'Bebas Buffering'],
  },
];

export const HomeFaqSection: React.FC = () => {
  const { language } = useLanguage();
  const { playClick, playHover } = useSound();

  // Item 0 ("What is Cinestream?") is open by default
  const [openIndices, setOpenIndices] = useState<number[]>([0]);

  const toggleAccordion = (index: number) => {
    playClick();
    setOpenIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  return (
    <section className="relative w-full bg-gradient-to-b from-[#141414] via-[#111111] to-[#0c0c0c] py-16 sm:py-24 lg:py-28 px-4 sm:px-8 lg:px-12 3xl:px-16 overflow-hidden">
      {/* Ambient Crimson Glow Lights */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[#E50914]/10 blur-[150px] pointer-events-none rounded-full -z-10" />
      <div className="absolute bottom-16 right-1/4 w-[600px] h-[300px] bg-red-950/20 blur-[170px] pointer-events-none rounded-full -z-10" />


      <div className="relative max-w-4xl lg:max-w-5xl mx-auto space-y-10 sm:space-y-12 z-10">
        {/* Centered CINESTREAM Brand Header */}
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          {/* Badge Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E50914]/15 border border-[#E50914]/30 text-[#E50914] text-xs font-semibold tracking-wider uppercase shadow-sm shadow-[#E50914]/20">
            <Sparkles className="w-3.5 h-3.5 text-[#E50914]" />
            <span>{language === 'en' ? 'Help Center & FAQ' : 'Pusat Bantuan & FAQ'}</span>
          </div>

          {/* Cinematic Brand Logo */}
          <div className="flex items-center gap-3.5 sm:gap-4 select-none group cursor-pointer">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#E50914] via-[#cc0000] to-[#880000] flex items-center justify-center shadow-[0_0_40px_rgba(229,9,20,0.5)] border border-red-500/40 group-hover:scale-105 transition-transform duration-300">
              <Play className="w-6 h-6 sm:w-8 sm:h-8 text-white fill-white ml-1 filter drop-shadow-md" />
            </div>

            <span className="font-display font-black text-3xl sm:text-5xl md:text-6xl tracking-wider text-white uppercase drop-shadow-[0_4px_30px_rgba(229,9,20,0.35)]">
              CINE<span className="text-[#E50914]">STREAM</span>
            </span>
          </div>

          {/* Section Heading & Subtitle */}
          <div className="space-y-1 max-w-2xl">
            <h2 className="text-xl sm:text-3xl md:text-4xl font-display font-black text-white tracking-wide uppercase">
              {language === 'en' ? 'Frequently Asked Questions' : 'Pertanyaan yang Sering Diajukan'}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 font-light leading-relaxed">
              {language === 'en'
                ? 'Everything you need to know about streaming movies, series, and anime on Cinestream.'
                : 'Semua informasi yang Anda butuhkan seputar menonton film, serial, dan anime di Cinestream.'}
            </p>
          </div>
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-3 sm:space-y-3.5">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndices.includes(index);
            const questionText = language === 'en' ? item.questionEn : item.questionId;
            const answerText = language === 'en' ? item.answerEn : item.answerId;
            const tags = language === 'en' ? item.tagsEn : item.tagsId;
            const Icon = item.icon;

            return (
              <div
                key={item.id}
                className={`transition-all duration-300 rounded-2xl border overflow-hidden ${
                  isOpen
                    ? 'bg-[#1a1a1a]/95 border-[#E50914]/40 shadow-[0_0_30px_rgba(229,9,20,0.12)] border-l-4 border-l-[#E50914]'
                    : 'bg-[#161616]/80 hover:bg-[#1c1c1c] border-white/10 hover:border-white/20 shadow-md shadow-black/40'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleAccordion(index)}
                  onMouseEnter={playHover}
                  className="w-full px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-3 text-left cursor-pointer group select-none"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    {/* Topic Icon Container */}
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                        isOpen
                          ? 'bg-[#E50914] text-white shadow-md shadow-[#E50914]/40 scale-105'
                          : 'bg-white/[0.06] text-neutral-300 border border-white/10 group-hover:bg-[#E50914]/20 group-hover:text-[#E50914] group-hover:border-[#E50914]/30'
                      }`}
                    >
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>

                    {/* Question Title */}
                    <span
                      className={`text-sm sm:text-base md:text-lg font-display tracking-wide transition-colors duration-200 ${
                        isOpen
                          ? 'font-bold text-white'
                          : 'font-medium text-slate-200 group-hover:text-white'
                      }`}
                    >
                      {questionText}
                    </span>
                  </div>

                  {/* Circular Chevron Arrow Indicator */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                      isOpen
                        ? 'bg-[#E50914]/20 text-[#E50914] rotate-180'
                        : 'bg-white/[0.05] text-neutral-400 group-hover:bg-white/10 group-hover:text-white'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {/* Expanded Answer Content */}
                {isOpen && (
                  <div className="px-4 sm:px-6 pb-5 sm:pb-6 pt-1 text-xs sm:text-sm md:text-[14.5px] text-slate-300 font-light leading-relaxed border-t border-white/[0.06] animate-fadeIn space-y-4">
                    <p>{answerText}</p>

                    {/* Key Highlight Badges */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/10 text-[11px] font-mono text-neutral-300 tracking-wide"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Quick Action Assistance Banner */}
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-white/[0.03] via-white/[0.06] to-white/[0.03] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left shadow-lg">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#E50914]/20 border border-[#E50914]/30 flex items-center justify-center text-[#E50914] shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-semibold text-white">
                {language === 'en'
                  ? 'Ready to watch your favorite movies?'
                  : 'Siap menonton tayangan favorit Anda?'}
              </h4>
              <p className="text-xs text-neutral-400 font-light">
                {language === 'en'
                  ? 'Explore our full collection or jump directly into the cinema catalog.'
                  : 'Jelajahi koleksi lengkap kami atau lompat langsung ke katalog sinema.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              playClick();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onMouseEnter={playHover}
            className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#ff1a25] text-white text-xs font-semibold shadow-lg shadow-[#E50914]/30 hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'Back to Top & Explore' : 'Kembali ke Atas & Eksplor'}</span>
          </button>
        </div>
      </div>
    </section>
  );
};
