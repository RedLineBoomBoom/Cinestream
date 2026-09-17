import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
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
    id: 'what-is-hbo-max',
    questionEn: 'What is HBO Max?',
    questionId: 'Apa itu HBO Max?',
    answerEn:
      'HBO Max is a premier global streaming platform that delivers captivating stories, ranging from the highest quality in scripted programming, movies, documentaries, and true crime, to adult animation. Stream the most talked about series and blockbuster movies featuring the worlds of HBO, the DC Universe, Harry Potter, Discovery and more on HBO Max.',
    answerId:
      'HBO Max adalah platform streaming global terkemuka yang menyajikan kisah-kisah memukau, mulai dari serial berkualitas tertinggi, film layar lebar blockbuster, dokumenter, hingga animasi dewasa. Tonton serial yang paling banyak diperbincangkan dan film blockbuster dari dunia HBO, DC Universe, Harry Potter, Discovery, dan banyak lagi di HBO Max.',
  },
  {
    id: 'what-is-bundle',
    questionEn: 'What is the HBO Max & Viu Bundle?',
    questionId: 'Apa itu Paket Bundle HBO Max & Viu?',
    answerEn:
      'The HBO Max & Viu Bundle brings together the greatest Hollywood blockbusters, award-winning HBO originals, and the best of Asian dramas, anime, and variety shows in one seamless entertainment experience.',
    answerId:
      'Paket Bundle HBO Max & Viu menggabungkan film-film blockbuster Hollywood terhebat, serial orisinal HBO pemenang penghargaan, serta drama Asia, anime, dan variety show terbaik dalam satu pengalaman menonton tanpa batas.',
  },
  {
    id: 'bundle-includes',
    questionEn: 'What does the HBO Max & Viu Bundle include?',
    questionId: 'Apa saja yang termasuk dalam Paket Bundle HBO Max & Viu?',
    answerEn:
      'You get unlimited access to all HBO Max premium movies and series, DC Universe blockbusters, Discovery documentaries, alongside Viu’s vast library of exclusive Korean dramas, anime simulcasts, and local hit productions.',
    answerId:
      'Anda mendapatkan akses tanpa batas ke semua film dan serial premium HBO Max, blockbuster DC Universe, dokumenter Discovery, serta perpustakaan lengkap Viu yang berisi drama Korea eksklusif, tayangan anime terbaru, dan karya lokal terfavorit.',
  },
  {
    id: 'how-get-bundle',
    questionEn: 'How do I get the bundle?',
    questionId: 'Bagaimana cara mendapatkan paket bundle?',
    answerEn:
      'Simply explore the catalog on Cinestream and choose your favorite title to start streaming instantly with our high-speed multi-server network with zero setup required.',
    answerId:
      'Cukup jelajahi katalog di Cinestream dan pilih judul favorit Anda untuk langsung menonton melalui jaringan multi-server berkecepatan tinggi tanpa perlu instalasi rumit.',
  },
  {
    id: 'how-signup',
    questionEn: 'How do I sign up for HBO Max?',
    questionId: 'Bagaimana cara mendaftar ke HBO Max?',
    answerEn:
      'You can stream seamlessly on Cinestream with instant access across all devices. For personal watchlist and history sync, customize your local profile directly from the top navigation bar.',
    answerId:
      'Anda dapat langsung menonton di Cinestream secara instan di semua perangkat. Untuk menyimpan daftar tontonan dan riwayat, Anda dapat mengatur profil lokal langsung dari menu navigasi atas.',
  },
  {
    id: 'where-available',
    questionEn: 'Where is HBO Max available?',
    questionId: 'Di mana saja HBO Max tersedia?',
    answerEn:
      'HBO Max is accessible globally across web browsers, smart TVs, PCs, tablets, and smartphones, optimized for smooth playback with Cloudflare DNS and multi-server redundancy.',
    answerId:
      'HBO Max dapat diakses secara global di peramban web, smart TV, PC, tablet, dan smartphone, dioptimalkan untuk pemutaran lancar dengan dukungan DNS Cloudflare dan server cadangan otomatis.',
  },
  {
    id: 'access-4k',
    questionEn: 'How can I access 4K UHD content on HBO Max?',
    questionId: 'Bagaimana cara mengakses konten 4K UHD di HBO Max?',
    answerEn:
      'Select any title marked with the 4K UHD / Full HD badge. Ensure your display supports 4K and select Server 1 or Server 2 for adaptive high-bitrate streaming with crystal-clear audio.',
    answerId:
      'Pilih judul yang bertanda 4K UHD / Full HD. Pastikan layar perangkat Anda mendukung resolusi tinggi dan pilih Server 1 atau Server 2 untuk streaming adaptif dengan bitrate prima dan audio jernih.',
  },
  {
    id: 'which-devices',
    questionEn: 'Which devices work with HBO Max?',
    questionId: 'Perangkat apa saja yang kompatibel dengan HBO Max?',
    answerEn:
      'HBO Max works seamlessly on desktop browsers (Chrome, Edge, Safari, Firefox), iOS and Android mobile phones and tablets, Android TV, Chromecast, smart TV browsers, and gaming consoles.',
    answerId:
      'HBO Max kompatibel dengan semua peramban desktop (Chrome, Edge, Safari, Firefox), smartphone dan tablet iOS & Android, Android TV, Chromecast, browser smart TV, hingga konsol game.',
  },
];

export const HomeFaqSection: React.FC = () => {
  const { language } = useLanguage();
  const { playClick, playHover } = useSound();

  // Item 0 ("What is HBO Max?") is open by default just like in the HBO Max reference screenshot
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
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-purple-900/10 blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[800px] h-[200px] bg-rose-950/10 blur-[160px] pointer-events-none rounded-full" />

      <div className="relative max-w-3xl lg:max-w-4xl mx-auto space-y-10 sm:space-y-14 z-10">
        {/* Centered HBO Max 3D Metallic Brand Logo */}
        <div className="flex flex-col items-center justify-center text-center space-y-3">
          <div className="relative group select-none">
            <img
              src="/assets/logos/hbo-max-3d.png"
              alt="HBO Max"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/assets/logos/hbo-max-logo.png';
              }}
              className="h-16 sm:h-24 md:h-28 w-auto object-contain filter drop-shadow-[0_4px_30px_rgba(255,255,255,0.18)] group-hover:scale-105 transition-transform duration-500"
            />
          </div>
          <p className="text-[11px] sm:text-xs uppercase tracking-widest text-slate-400 font-mono flex items-center gap-1.5">
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
