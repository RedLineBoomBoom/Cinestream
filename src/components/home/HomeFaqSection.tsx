import React, { useState } from 'react';
import { ChevronDown, HelpCircle, Play } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useSound } from '../../context/SoundContext';

interface FaqItem {
  id: string;
  questionEn: string;
  questionId: string;
  answerEn: string;
  answerId: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'what-is-cinestream',
    questionEn: 'What is Cinestream?',
    questionId: 'Apa itu Cinestream?',
    answerEn:
      'Cinestream is a premier digital cinema and global streaming platform that delivers captivating stories across the world. Explore the highest quality in blockbuster movies, award-winning series, trending anime, Asian dramas, and acclaimed documentaries. Stream seamlessly across multiple ultra-fast servers with 4K UHD support, smart multi-language subtitles, and real-time Watch Party with friends.',
    answerId:
      'Cinestream adalah platform penayangan sinema digital generasi terdepan yang menyajikan ribuan film layar lebar blockbuster, serial televisi pemenang penghargaan, anime terpopuler, drama Asia, dan dokumenter terbaik dunia. Tonton secara lancar melalui jaringan multi-server berkecepatan tinggi dengan dukungan 4K UHD, subtitle multibahasa otomatis, serta fitur nonton bareng (Watch Party) bersama teman.',
  },
  {
    id: 'servers-quality',
    questionEn: 'What servers and video qualities are available on Cinestream?',
    questionId: 'Server dan kualitas video apa saja yang tersedia di Cinestream?',
    answerEn:
      'Cinestream provides multiple dedicated high-speed streaming servers (Server 1, Server 2, Server 3) offering adaptive bitrates from 720p HD, 1080p Full HD up to 4K UHD. If one server experiences buffering or slowdowns, you can switch instantly to an alternative server with zero downtime.',
    answerId:
      'Cinestream menyediakan berbagai server berkecepatan tinggi (Server 1, Server 2, Server 3) dengan kualitas adaptif mulai dari 720p HD, 1080p Full HD hingga 4K UHD. Jika satu server mengalami kendala atau buffering, Anda dapat beralih ke server cadangan secara instan tanpa jeda.',
  },
  {
    id: 'is-it-free',
    questionEn: 'Is Cinestream free to watch?',
    questionId: 'Apakah Cinestream gratis untuk ditonton?',
    answerEn:
      'Yes! Cinestream is completely free to explore and watch with zero mandatory subscriptions. You can instantly start streaming any movie, anime, or series directly from your web browser.',
    answerId:
      'Ya! Cinestream dapat diakses dan ditonton secara gratis tanpa biaya langganan bulanan. Anda dapat langsung memutar film, anime, maupun serial favorit langsung dari peramban Anda kapan saja.',
  },
  {
    id: 'watch-party',
    questionEn: 'How does the Watch Party feature work?',
    questionId: 'Bagaimana cara kerja fitur Nonton Bareng (Watch Party)?',
    answerEn:
      'Cinestream includes an integrated Watch Party system! You can create a room, share the unique invite link or room code with friends, and enjoy synchronized video playback with live chat and synchronized play/pause controls across any device.',
    answerId:
      'Cinestream dilengkapi fitur Watch Party bawaan! Anda cukup membuat ruang tonton, membagikan kode ruangan atau link undangan kepada teman, dan menikmati pemutaran video yang tersinkronisasi otomatis lengkap dengan obrolan langsung (live chat) di perangkat apa pun.',
  },
  {
    id: 'subtitles-audio',
    questionEn: 'Are subtitles and multiple audio tracks supported?',
    questionId: 'Apakah tersedia subtitle dan pilihan audio bahasa?',
    answerEn:
      'Cinestream features extensive subtitle support including Indonesian, English, Spanish, French, and Japanese, with customizable size, font styling, and background opacity inside the player settings.',
    answerId:
      'Cinestream mendukung subtitle lengkap dalam Bahasa Indonesia, Inggris, dan berbagai bahasa lainnya. Anda juga dapat menyesuaikan ukuran teks, warna font, dan transparansi latar belakang subtitle langsung di pemutar video.',
  },
  {
    id: 'access-4k',
    questionEn: 'How can I access 4K UHD content on Cinestream?',
    questionId: 'Bagaimana cara mengakses konten 4K UHD di Cinestream?',
    answerEn:
      'Titles with 4K UHD or Full HD source availability are automatically highlighted with resolution badges. When playing, the player intelligently adapts to your display and bandwidth, or you can manually select the maximum quality from the player settings.',
    answerId:
      'Judul dengan dukungan 4K UHD atau Full HD otomatis ditandai dengan lencana kualitas. Pemutar video akan menyesuaikan resolusi terbaik sesuai kecepatan internet dan layar perangkat Anda.',
  },
  {
    id: 'which-devices',
    questionEn: 'Which devices work with Cinestream?',
    questionId: 'Perangkat apa saja yang kompatibel dengan Cinestream?',
    answerEn:
      'Cinestream is optimized as a progressive web platform that runs flawlessly on desktop PCs & laptops (Windows, macOS, Linux), smartphones and tablets (Android & iOS), Smart TVs (Android TV, Google TV, Samsung, LG), and streaming devices like Chromecast.',
    answerId:
      'Cinestream dioptimalkan agar berjalan lancar di berbagai perangkat: PC & laptop (Windows, macOS, Linux), smartphone dan tablet (Android & iOS), Smart TV (Android TV, Google TV, Samsung, LG), hingga Chromecast.',
  },
  {
    id: 'playback-tips',
    questionEn: 'What should I do if a video buffers or fails to load?',
    questionId: 'Apa yang harus dilakukan jika video buffering atau gagal dimuat?',
    answerEn:
      'If a stream is slow or restricted by your ISP, switch to Server 2 or Server 3, disable aggressive ad-blockers for video streams, or enable free Cloudflare 1.1.1.1 DNS for smooth, unrestricted video loading.',
    answerId:
      'Jika video lambat atau terhalang oleh penyedia internet Anda, coba ganti ke Server 2 atau Server 3, atau gunakan DNS Cloudflare 1.1.1.1 gratis agar pemutaran video berjalan lancar tanpa hambatan.',
  },
];

export const HomeFaqSection: React.FC = () => {
  const { language } = useLanguage();
  const { playClick, playHover } = useSound();

  // Item 0 ("What is Cinestream?") is open by default just like the reference screenshot layout
  const [openIndices, setOpenIndices] = useState<number[]>([0]);

  const toggleAccordion = (index: number) => {
    playClick();
    setOpenIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const firstItem = FAQ_ITEMS[0];
  const isFirstOpen = openIndices.includes(0);

  return (
    <section className="relative w-full bg-black py-16 sm:py-24 lg:py-28 px-4 sm:px-8 lg:px-12 border-t border-white/[0.06] overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#E50914]/10 blur-[150px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[800px] h-[200px] bg-red-950/15 blur-[160px] pointer-events-none rounded-full" />

      <div className="relative max-w-3xl lg:max-w-4xl mx-auto space-y-10 sm:space-y-14 z-10">
        {/* Centered CINESTREAM Brand Header (HBO Max Layout Style) */}
        <div className="flex flex-col items-center justify-center text-center space-y-3">
          <div className="flex items-center gap-3.5 sm:gap-4 select-none group cursor-pointer">
            {/* Iconic Glowing Play Emblem */}
            <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#E50914] via-[#cc0000] to-[#880000] flex items-center justify-center shadow-[0_0_50px_rgba(229,9,20,0.55)] border border-red-500/40 group-hover:scale-105 transition-transform duration-300">
              <Play className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-white fill-white ml-1 filter drop-shadow-md" />
            </div>

            {/* Cinematic Typography */}
            <span className="font-display font-black text-3xl sm:text-5xl md:text-6xl tracking-wider text-white uppercase drop-shadow-[0_4px_30px_rgba(229,9,20,0.35)]">
              CINE<span className="text-[#E50914]">STREAM</span>
            </span>
          </div>

          <p className="text-[11px] sm:text-xs uppercase tracking-widest text-slate-400 font-mono flex items-center gap-1.5 pt-1">
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>{language === 'en' ? 'Frequently Asked Questions' : 'Pertanyaan yang Sering Diajukan'}</span>
          </p>
        </div>

        {/* FAQ Container */}
        <div className="space-y-6 sm:space-y-8">
          {/* ───────────────────────────────────────────────────────── */}
          {/* FEATURED ITEM 1: CIRCULAR NUMBERED BADGE + ACCORDION      */}
          {/* (Exact match to user reference screenshot)                */}
          {/* ───────────────────────────────────────────────────────── */}
          <div className="space-y-3 sm:space-y-4">
            <button
              type="button"
              onClick={() => toggleAccordion(0)}
              onMouseEnter={playHover}
              className="w-full flex items-center justify-between gap-3.5 sm:gap-4 text-left cursor-pointer group select-none"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#1e293b] border border-white/20 text-white font-display font-bold text-sm sm:text-base flex items-center justify-center shrink-0 shadow-lg shadow-black group-hover:border-white/40 transition-colors">
                  1
                </div>
                <h3 className="text-base sm:text-xl md:text-2xl font-display font-bold text-white group-hover:text-amber-300 transition-colors tracking-wide">
                  {language === 'en' ? firstItem.questionEn : firstItem.questionId}
                </h3>
              </div>

              <ChevronDown
                className={`w-5 h-5 text-slate-400 group-hover:text-white shrink-0 transition-transform duration-300 ${
                  isFirstOpen ? 'rotate-180 text-amber-400' : ''
                }`}
              />
            </button>

            {isFirstOpen && (
              <div className="pl-11 sm:pl-13 pr-2 animate-fadeIn transition-all duration-300">
                <p className="text-xs sm:text-sm md:text-base text-slate-300/95 font-light leading-relaxed">
                  {language === 'en' ? firstItem.answerEn : firstItem.answerId}
                </p>
              </div>
            )}
          </div>

          {/* ───────────────────────────────────────────────────────── */}
          {/* ACCORDION LIST: ITEMS 2 - 8                               */}
          {/* ───────────────────────────────────────────────────────── */}
          <div className="space-y-2.5 sm:space-y-3 pt-2">
            {FAQ_ITEMS.slice(1).map((item, idx) => {
              const itemIndex = idx + 1;
              const isOpen = openIndices.includes(itemIndex);
              const questionText = language === 'en' ? item.questionEn : item.questionId;
              const answerText = language === 'en' ? item.answerEn : item.answerId;

              return (
                <div
                  key={item.id}
                  className="bg-[#121212]/95 hover:bg-[#181818] border border-white/[0.08] hover:border-white/[0.18] rounded-xl overflow-hidden transition-all duration-200 shadow-md"
                >
                  <button
                    type="button"
                    onClick={() => toggleAccordion(itemIndex)}
                    onMouseEnter={playHover}
                    className="w-full px-5 py-4 sm:px-6 sm:py-4.5 flex items-center justify-between text-left cursor-pointer group select-none"
                  >
                    <span className="text-xs sm:text-sm md:text-base font-semibold text-slate-200 group-hover:text-white transition-colors pr-4">
                      {questionText}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-hover:text-white shrink-0 transition-transform duration-300 ${
                        isOpen ? 'rotate-180 text-amber-400' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 sm:px-6 sm:pb-5 pt-1 text-xs sm:text-sm text-slate-400 font-light leading-relaxed border-t border-white/[0.04] animate-fadeIn">
                      {answerText}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
