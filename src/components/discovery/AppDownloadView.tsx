import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Smartphone,
  Download,
  Tv,
  Apple,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Zap,
  Users,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Cpu,
  ArrowLeft,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useSound } from '../../context/SoundContext';
import { APP_VERSION } from '../../utils/pwaUpdate';

interface AppDownloadViewProps {
  onBackToHome?: () => void;
}

export const AppDownloadView: React.FC<AppDownloadViewProps> = ({ onBackToHome }) => {
  const { language } = useLanguage();
  const { playClick, playHover, playSuccess } = useSound();

  const [activeGuideTab, setActiveGuideTab] = useState<'android' | 'tv' | 'ios'>('android');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const guideSectionRef = useRef<HTMLDivElement>(null);

  // Download URLs
  const apkDownloadUrl = '/Cinestream.apk';
  const githubReleaseUrl = 'https://github.com/RedLineBoomBoom/Cinestream/releases';
  const githubMirrorUrl = 'https://github.com/RedLineBoomBoom/Cinestream/releases/latest/download/app-debug.apk';

  // Generate QR code for the current URL
  useEffect(() => {
    const currentUrl = typeof window !== 'undefined' ? `${window.location.origin}/app` : 'https://cinestream.app/app';
    QRCode.toDataURL(currentUrl, {
      width: 260,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.warn('Failed to render QR Code:', err));
  }, []);

  const handleDownloadApk = () => {
    playClick();
    setDownloadStarted(true);

    // Trigger download anchor
    const a = document.createElement('a');
    a.href = apkDownloadUrl;
    a.download = `Cinestream-v${APP_VERSION}.apk`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      setDownloadStarted(false);
    }, 6000);
  };

  const handleCopyLink = () => {
    playClick();
    const url = typeof window !== 'undefined' ? `${window.location.origin}/app` : 'https://cinestream.app/app';
    navigator.clipboard.writeText(url).then(() => {
      playSuccess();
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  const handleTriggerPwaInstall = () => {
    playClick();
    const promptEvent = (window as any).__cinestreamDeferredPrompt;
    if (promptEvent && typeof promptEvent.prompt === 'function') {
      promptEvent.prompt();
    } else {
      setActiveGuideTab('ios');
      guideSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const toggleFaq = (index: number) => {
    playClick();
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const features = [
    {
      icon: ShieldCheck,
      color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
      title: language === 'en' ? '100% Ad-Free Streaming' : '100% Bebas Iklan Pop-up',
      desc:
        language === 'en'
          ? 'Zero disruptive advertisements, gambling pop-ups, or spam redirects. Just click and stream immediately.'
          : 'Tanpa gangguan iklan pop-up, link redirect mencurigakan, atau spam. Klik dan langsung tonton saat itu juga.',
    },
    {
      icon: Tv,
      color: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
      title: language === 'en' ? 'Android TV & Remote Control' : 'Android TV & Remote Control',
      desc:
        language === 'en'
          ? 'Optimized for big screens, Smart TVs, Mi Box, and TV Boxes with smooth D-pad remote navigation.'
          : 'Didesain optimal untuk layar lebar Smart TV, Android Box, Mi Box dengan navigasi remote D-pad yang nyaman.',
    },
    {
      icon: Zap,
      color: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
      title: language === 'en' ? 'Multi-Server Auto Failover' : 'Multi-Server Auto Failover',
      desc:
        language === 'en'
          ? 'Intelligent multi-server streaming that automatically switches backup nodes if playback buffers.'
          : 'Sistem multi-server cerdas yang otomatis pulih dan beralih server jika pemutar mengalami kendala jaringan.',
    },
    {
      icon: MessageSquare,
      color: 'text-rose-400 bg-rose-500/15 border-rose-500/30',
      title: language === 'en' ? 'Danmaku Bullet Comments' : 'Komentar Melayang Danmaku',
      desc:
        language === 'en'
          ? 'Real-time floating timed comments synced with playback across the community.'
          : 'Komentar melayang real-time yang tersinkronisasi tepat dengan menit tayang video bareng penonton lain.',
    },
    {
      icon: Users,
      color: 'text-purple-400 bg-purple-500/15 border-purple-500/30',
      title: language === 'en' ? 'Serverless Watch Party' : 'Nobar Online Watch Party',
      desc:
        language === 'en'
          ? 'Watch together in real-time with friends via WebRTC with synced playback and in-player chat.'
          : 'Nonton bareng teman jarak jauh lewat WebRTC dengan sinkronisasi putar/jeda dan ruang obrolan langsung.',
    },
    {
      icon: Cpu,
      color: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',
      title: language === 'en' ? 'Lightweight & Battery Saver' : 'Ringan & Hemat Baterai',
      desc:
        language === 'en'
          ? 'Small install footprint (<20MB) with GPU hardware acceleration for smooth 60fps rendering.'
          : 'Ukuran instalasi sangat kecil (<20MB) dengan akselerasi GPU perangkat untuk konsumsi baterai yang hemat.',
    },
  ];

  const faqs = [
    {
      q:
        language === 'en'
          ? 'Why is Cinestream not on Google Play Store?'
          : 'Mengapa Cinestream tidak ada di Google Play Store?',
      a:
        language === 'en'
          ? 'Cinestream is an independent cinematic platform. Providing the APK directly allows us to ship instant updates, avoid third-party store restrictions, and deliver an ad-free experience without commercial trackers.'
          : 'Cinestream adalah platform kurasi sinema independen. Distribusi APK langsung memungkinkan kami merilis pembaruan fitur lebih cepat, menghindari batasan toko pihak ketiga, dan menjamin pengalaman bebas iklan tanpa pelacak komersial.',
    },
    {
      q:
        language === 'en'
          ? 'Is the APK file safe to install on my device?'
          : 'Apakah file APK ini aman dipasang di HP / TV?',
      a:
        language === 'en'
          ? 'Yes, 100% safe. Our APK is built directly from the official open repository without any spyware, adware, or sensitive permission requests. The "File might be harmful" warning is standard Android notice for all sideloaded apps.'
          : 'Ya, 100% aman. APK Cinestream dikompilasi langsung dari kode resmi repositori tanpa spyware, adware, atau permintaan izin privasi berbahaya. Peringatan "File mungkin berbahaya" adalah notifikasi standar Android untuk semua unduhan di luar Play Store.',
    },
    {
      q:
        language === 'en'
          ? 'Can I install this on Android TV, Google TV, or Fire TV?'
          : 'Apakah bisa dipasang di Android TV, Google TV, atau Fire TV?',
      a:
        language === 'en'
          ? 'Yes! Cinestream APK is fully compatible with Android TV, Mi Box, Google TV, and Fire TV. Simply copy the APK to a USB flash drive or transfer it via "Send Files to TV", then install using any TV file manager.'
          : 'Bisa! APK Cinestream sepenuhnya kompatibel dengan Android TV, Mi Box, Google TV, dan Fire TV. Cukup pindahkan APK ke flashdisk atau kirim via aplikasi "Send Files to TV", lalu pasang lewat File Manager di TV Anda.',
    },
    {
      q:
        language === 'en'
          ? 'How do app updates work?'
          : 'Bagaimana cara update aplikasi saat ada versi baru?',
      a:
        language === 'en'
          ? 'Cinestream includes an automated update notifier. When a new version is released, the app will notify you with a direct 1-click update prompt, or you can re-download the latest APK anytime from this page.'
          : 'Cinestream dilengkapi detektor pembaruan otomatis. Saat versi baru rilis, aplikasi akan menampilkan notifikasi pembaruan 1-klik, atau Anda dapat mengunduh versi terbaru kapan saja dari halaman ini.',
    },
  ];

  return (
    <div className="w-full min-h-screen bg-[#0A0A0A] text-slate-100 overflow-x-hidden animate-in fade-in duration-300">
      {/* ── FULL-BLEED HERO BANNER SECTION ──────────────────────── */}
      <section className="relative w-full overflow-hidden bg-gradient-to-b from-[#2a070a] via-[#160608] via-45% to-[#0A0A0A] pt-24 sm:pt-28 pb-16 sm:pb-24 border-b border-white/[0.06]">
        {/* Cinematic glow ambient background elements spanning full width */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] sm:w-[1500px] h-[500px] bg-red-600/15 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-20 left-0 w-[450px] h-[450px] bg-rose-900/15 rounded-full blur-[110px] pointer-events-none" />

        {/* Content Container (Centered, responsive width) */}
        <div className="max-w-[1440px] 2xl:max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 w-full relative z-10">
          {/* Top Breadcrumb / Back Button */}
          {onBackToHome && (
            <button
              onClick={() => {
                playClick();
                onBackToHome();
              }}
              onMouseEnter={playHover}
              className="inline-flex items-center gap-2 mb-8 px-3.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>{language === 'en' ? 'Back to Home' : 'Kembali ke Beranda'}</span>
            </button>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
            {/* Left Column: Headline & Actions */}
            <div className="lg:col-span-7 space-y-6">
              {/* Release Status Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold tracking-wide">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>OFFICIAL FULL RELEASE • v{APP_VERSION}</span>
              </div>

              {/* Headline */}
              <div className="space-y-3">
                <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl text-white tracking-wide uppercase leading-[1.05]">
                  {language === 'en' ? (
                    <>
                      Stream Freely. <br />
                      <span className="bg-gradient-to-r from-[#E50914] via-rose-500 to-amber-400 bg-clip-text text-transparent">
                        Get Cinestream App.
                      </span>
                    </>
                  ) : (
                    <>
                      Nonton Bebas Iklan. <br />
                      <span className="bg-gradient-to-r from-[#E50914] via-rose-500 to-amber-400 bg-clip-text text-transparent">
                        Download Cinestream App.
                      </span>
                    </>
                  )}
                </h1>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-light max-w-xl">
                  {language === 'en'
                    ? 'Experience movies, Asian dramas, and anime with multi-server automated failover, live Danmaku floating comments, and remote-friendly navigation on your smartphone and Android TV.'
                    : 'Nikmati ribuan film, serial drama, dan anime dengan multi-server otomatis, komentar melayang Danmaku, serta kendali remote di smartphone, tablet, dan Android TV / Smart TV Anda.'}
                </p>
              </div>

              {/* Spec Highlights Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div className="p-3 rounded-xl bg-black/40 backdrop-blur-md border border-white/[0.08] text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">{language === 'en' ? 'Platform' : 'Sistem'}</div>
                  <div className="text-xs font-bold text-white mt-0.5">Android 5.0+</div>
                </div>
                <div className="p-3 rounded-xl bg-black/40 backdrop-blur-md border border-white/[0.08] text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">{language === 'en' ? 'Version' : 'Versi'}</div>
                  <div className="text-xs font-bold text-emerald-400 mt-0.5">v{APP_VERSION} (Full)</div>
                </div>
                <div className="p-3 rounded-xl bg-black/40 backdrop-blur-md border border-white/[0.08] text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">{language === 'en' ? 'Size' : 'Ukuran'}</div>
                  <div className="text-xs font-bold text-white mt-0.5">~18.5 MB</div>
                </div>
                <div className="p-3 rounded-xl bg-black/40 backdrop-blur-md border border-white/[0.08] text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">{language === 'en' ? 'Security' : 'Keamanan'}</div>
                  <div className="text-xs font-bold text-emerald-400 mt-0.5 flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>{language === 'en' ? 'Safe' : 'Bebas Virus'}</span>
                  </div>
                </div>
              </div>

              {/* Main Action Buttons */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Primary APK Download Button */}
                  <button
                    onClick={handleDownloadApk}
                    onMouseEnter={playHover}
                    className="flex-1 flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#E50914] via-red-600 to-rose-600 hover:from-red-600 hover:to-rose-500 text-white font-bold text-sm tracking-wide shadow-xl shadow-red-950/60 hover:shadow-red-900/80 transition-all transform active:scale-98 cursor-pointer group"
                  >
                    <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                    <div className="text-left">
                      <div className="leading-tight">
                        {language === 'en' ? 'Download Cinestream APK' : 'Download Cinestream APK'}
                      </div>
                      <div className="text-[10px] text-red-200 font-mono font-normal">
                        {language === 'en' ? `Direct Download (v${APP_VERSION})` : `Unduh Langsung (v${APP_VERSION})`}
                      </div>
                    </div>
                  </button>

                  {/* Instant PWA Install Button */}
                  <button
                    onClick={handleTriggerPwaInstall}
                    onMouseEnter={playHover}
                    className="flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/12 text-slate-200 hover:text-white font-semibold text-xs tracking-wide transition-all cursor-pointer"
                    title={language === 'en' ? 'Install directly in browser as PWA' : 'Pasang langsung di browser via PWA'}
                  >
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>{language === 'en' ? 'Instant PWA Install' : 'Pasang Versi PWA'}</span>
                  </button>
                </div>

                {/* GitHub Official Mirror Links */}
                <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-slate-400 pt-1">
                  <div className="flex items-center gap-3">
                    <a
                      href={githubMirrorUrl}
                      download={`Cinestream-v${APP_VERSION}.apk`}
                      className="inline-flex items-center gap-1.5 text-slate-300 hover:text-emerald-400 font-medium transition-colors no-underline"
                      title="Direct APK Mirror from GitHub Releases"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{language === 'en' ? 'Server Mirror (GitHub)' : 'Server Mirror (GitHub)'}</span>
                    </a>
                    <span className="text-white/20">•</span>
                    <a
                      href={githubReleaseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-slate-400 hover:text-red-400 transition-colors no-underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{language === 'en' ? 'All Releases' : 'Semua Rilis'}</span>
                    </a>
                  </div>

                  <button
                    onClick={() => {
                      guideSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-slate-400 hover:text-white transition-colors underline cursor-pointer text-[11px]"
                  >
                    {language === 'en' ? 'View Installation Guide ↓' : 'Lihat Panduan Pasang ↓'}
                  </button>
                </div>

                {/* Download Feedback Banner */}
                {downloadStarted && (
                  <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      {language === 'en'
                        ? 'Download starting! Check your notification bar or downloads folder.'
                        : 'Download dimulai! Periksa bilah notifikasi atau folder download perangkat Anda.'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: QR Code & Mobile Mockup Card */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center">
              <div className="w-full max-w-sm rounded-2xl bg-black/70 backdrop-blur-xl border border-white/12 p-6 shadow-2xl shadow-black/80 text-center space-y-4">
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
                  <Smartphone className="w-4 h-4 text-[#E50914]" />
                  <span>{language === 'en' ? 'Scan to Download on Phone' : 'Scan untuk Download di HP'}</span>
                </div>

                {/* Live QR Code Canvas */}
                <div className="relative mx-auto w-48 h-48 bg-white p-2.5 rounded-xl shadow-lg flex items-center justify-center">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="Cinestream App Download QR Code"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                      Generating QR...
                    </div>
                  )}
                  {/* Logo badge in center of QR */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-8 h-8 rounded-full bg-[#E50914] border-2 border-white shadow-md flex items-center justify-center">
                      <span className="font-display font-black text-white text-[10px]">C</span>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {language === 'en'
                    ? 'Point your phone camera to download the APK directly onto your Android device or Smart TV.'
                    : 'Arahkan kamera HP Anda untuk langsung mendownload APK di smartphone atau tablet.'}
                </p>

                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">{language === 'en' ? 'Link Copied!' : 'Link Tersalin!'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{language === 'en' ? 'Copy Download Link' : 'Salin Link Download'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── LOWER SECTIONS WRAPPER (CONTAINED) ──────────────────── */}
      <div className="max-w-[1440px] 2xl:max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 w-full py-16 space-y-16 sm:space-y-20">
        {/* ── KEY FEATURES OVERVIEW ──────────────────────────────── */}
        <div>
        <div className="text-center max-w-2xl mx-auto space-y-2 mb-8">
          <h2 className="font-display font-black text-2xl sm:text-3xl text-white tracking-wide uppercase">
            {language === 'en' ? 'Why Choose Cinestream App?' : 'Mengapa Harus Cinestream App?'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-light">
            {language === 'en'
              ? 'Engineered specifically for film lovers and binge-watchers who demand pure cinematic quality.'
              : 'Dibuat khusus untuk pecinta film dan anime yang mengutamakan kenyamanan dan kualitas streaming terbaik.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {features.map((f, idx) => {
            const Icon = f.icon;
            return (
              <div
                key={idx}
                className="p-5 sm:p-6 rounded-2xl bg-[#141414] border border-white/[0.08] hover:border-white/[0.18] transition-all hover:-translate-y-0.5 group space-y-3"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${f.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-sans font-bold text-white text-base group-hover:text-red-400 transition-colors">
                  {f.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed font-light">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── STEP-BY-STEP INSTALLATION GUIDE ────────────────────── */}
      <div ref={guideSectionRef} className="mb-14 scroll-mt-24">
        <div className="text-center max-w-2xl mx-auto space-y-2 mb-8">
          <h2 className="font-display font-black text-2xl sm:text-3xl text-white tracking-wide uppercase">
            {language === 'en' ? 'Easy Installation Guide' : 'Panduan Cara Pasang Mudah'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-light">
            {language === 'en'
              ? 'Select your target device type below for straightforward step-by-step instructions.'
              : 'Pilih tipe perangkat Anda di bawah ini untuk panduan langkah demi langkah yang jelas.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center justify-center gap-2 max-w-md mx-auto mb-8 p-1.5 rounded-2xl bg-white/[0.04] border border-white/10">
          <button
            onClick={() => {
              playClick();
              setActiveGuideTab('android');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeGuideTab === 'android'
                ? 'bg-[#E50914] text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Android (APK)</span>
          </button>

          <button
            onClick={() => {
              playClick();
              setActiveGuideTab('tv');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeGuideTab === 'tv'
                ? 'bg-[#E50914] text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>Android TV</span>
          </button>

          <button
            onClick={() => {
              playClick();
              setActiveGuideTab('ios');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeGuideTab === 'ios'
                ? 'bg-[#E50914] text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Apple className="w-4 h-4" />
            <span>iPhone / iPad</span>
          </button>
        </div>

        {/* Guide Content: Android Smartphone & Tablet */}
        {activeGuideTab === 'android' && (
          <div className="max-w-3xl mx-auto rounded-3xl bg-[#141414] border border-white/10 p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-white/[0.08] pb-4">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">
                  {language === 'en' ? 'Installing APK on Android Phone / Tablet' : 'Cara Pasang APK di HP / Tablet Android'}
                </h3>
                <p className="text-xs text-slate-400">
                  {language === 'en' ? 'Compatible with Samsung, Xiaomi, OPPO, Vivo, Realme, Pixel, etc.' : 'Kompatibel dengan semua merk HP Android 5.0 ke atas.'}
                </p>
              </div>
            </div>

            <ol className="space-y-4">
              <li className="flex gap-4 items-start">
                <div className="w-7 h-7 rounded-full bg-[#E50914] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white">
                    {language === 'en' ? 'Download Cinestream APK' : 'Download file Cinestream.apk'}
                  </div>
                  <div className="text-xs text-slate-400 leading-relaxed">
                    {language === 'en'
                      ? 'Tap the "Download Cinestream APK" button above to start downloading the latest package.'
                      : 'Klik tombol "Download Cinestream APK" di atas untuk mengunduh paket instalasi versi terbaru.'}
                  </div>
                </div>
              </li>

              <li className="flex gap-4 items-start">
                <div className="w-7 h-7 rounded-full bg-[#E50914] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white">
                    {language === 'en' ? 'Confirm Download Prompt' : 'Pilih "Tetap Download" (Download Anyway)'}
                  </div>
                  <div className="text-xs text-slate-400 leading-relaxed">
                    {language === 'en'
                      ? 'If your browser shows "File might be harmful", choose "Download anyway". This is Google Android standard security alert for apps downloaded outside the Play Store.'
                      : 'Bila muncul peringatan "File might be harmful / File mungkin berbahaya", pilih "Tetap Download". Ini adalah peringatan standar Android untuk file yang diunduh di luar Google Play Store.'}
                  </div>
                </div>
              </li>

              <li className="flex gap-4 items-start">
                <div className="w-7 h-7 rounded-full bg-[#E50914] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  3
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white">
                    {language === 'en' ? 'Allow Unknown Sources (If Prompted)' : 'Izinkan Sumber Tidak Dikenal (Jika Diminta)'}
                  </div>
                  <div className="text-xs text-slate-400 leading-relaxed">
                    {language === 'en'
                      ? 'Open the downloaded file from your notification bar. If prompted, toggle ON "Allow from this source" in your phone settings.'
                      : 'Buka file dari bilah notifikasi atau folder Download. Jika muncul permintaan izin, aktifkan tombol "Izinkan dari sumber ini".'}
                  </div>
                </div>
              </li>

              <li className="flex gap-4 items-start">
                <div className="w-7 h-7 rounded-full bg-[#E50914] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  4
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white">
                    {language === 'en' ? 'Tap Install and Enjoy!' : 'Tekan Pasang / Install dan Selesai!'}
                  </div>
                  <div className="text-xs text-slate-400 leading-relaxed">
                    {language === 'en'
                      ? 'Tap "Install". Once finished, launch Cinestream directly from your home screen and enjoy unlimited streaming.'
                      : 'Tekan tombol "Install". Setelah selesai, buka Cinestream dari layar utama HP Anda dan selamat menikmati film favorit.'}
                  </div>
                </div>
              </li>
            </ol>
          </div>
        )}

        {/* Guide Content: Android TV */}
        {activeGuideTab === 'tv' && (
          <div className="max-w-3xl mx-auto rounded-3xl bg-[#141414] border border-white/10 p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-white/[0.08] pb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                <Tv className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">
                  {language === 'en' ? 'Installing on Android TV / Smart TV / TV Box' : 'Cara Pasang di Android TV / Smart TV / TV Box'}
                </h3>
                <p className="text-xs text-slate-400">
                  {language === 'en' ? 'Compatible with Mi Box, Google TV, TCL, Sony, Changhong, Fire TV, etc.' : 'Kompatibel dengan Mi Box, Google TV, TCL, Sony, Polytron, dsb.'}
                </p>
              </div>
            </div>

            <ol className="space-y-4">
              <li className="flex gap-4 items-start">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white">
                    {language === 'en' ? 'Download APK to USB Drive' : 'Download file APK ke Flashdisk (USB)'}
                  </div>
                  <div className="text-xs text-slate-400 leading-relaxed">
                    {language === 'en'
                      ? 'Download the Cinestream APK on your PC/laptop and copy it to a USB flash drive (or use "Send Files to TV" app from your phone).'
                      : 'Download file Cinestream.apk ke laptop atau HP Anda, lalu salin ke flashdisk (atau kirim nirkabel via aplikasi "Send Files to TV").'}
                  </div>
                </div>
              </li>

              <li className="flex gap-4 items-start">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white">
                    {language === 'en' ? 'Plug USB into Android TV' : 'Colokkan Flashdisk ke TV'}
                  </div>
                  <div className="text-xs text-slate-400 leading-relaxed">
                    {language === 'en'
                      ? 'Insert the USB drive into the USB port of your Android TV Box or Smart TV.'
                      : 'Tancapkan flashdisk ke port USB di TV atau Android TV Box Anda.'}
                  </div>
                </div>
              </li>

              <li className="flex gap-4 items-start">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  3
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white">
                    {language === 'en' ? 'Open File Manager on TV' : 'Buka File Manager di TV'}
                  </div>
                  <div className="text-xs text-slate-400 leading-relaxed">
                    {language === 'en'
                      ? 'Open any File Manager app on your TV (such as File Commander or X-plore), locate Cinestream.apk, and select Install.'
                      : 'Buka aplikasi File Manager di TV (seperti File Commander / X-plore), cari file Cinestream.apk, lalu klik Pasang.'}
                  </div>
                </div>
              </li>

              <li className="flex gap-4 items-start">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  4
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white">
                    {language === 'en' ? 'Launch on Big Screen' : 'Buka Cinestream di Layar Lebar'}
                  </div>
                  <div className="text-xs text-slate-400 leading-relaxed">
                    {language === 'en'
                      ? 'Open Cinestream from your TV Apps row. Enjoy seamless cinema navigation using your TV remote D-pad.'
                      : 'Cinestream siap digunakan. Navigasi lancar menggunakan tombol panah dan OK pada remote kontrol TV Anda.'}
                  </div>
                </div>
              </li>
            </ol>
          </div>
        )}

        {/* Guide Content: iPhone & iPad */}
        {activeGuideTab === 'ios' && (
          <div className="max-w-3xl mx-auto rounded-3xl bg-[#141414] border border-white/10 p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-white/[0.08] pb-4">
              <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-white/20 flex items-center justify-center">
                <Apple className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">
                  {language === 'en' ? 'Add to Home Screen on iPhone / iPad (PWA)' : 'Pasang di iPhone / iPad (Progressive Web App)'}
                </h3>
                <p className="text-xs text-slate-400">
                  {language === 'en' ? 'Apple iOS does not support APK files. Use 1-tap Safari PWA instead.' : 'Apple iOS tidak memakai file APK, melainkan fitur resmi Safari PWA.'}
                </p>
              </div>
            </div>

            <ol className="space-y-4">
              <li className="flex gap-4 items-start">
                <div className="w-7 h-7 rounded-full bg-white text-black font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white">
                    {language === 'en' ? 'Open in Safari Browser' : 'Buka di Browser Safari'}
                  </div>
                  <div className="text-xs text-slate-400 leading-relaxed">
                    {language === 'en'
                      ? 'Ensure you are browsing Cinestream in the default Apple Safari browser.'
                      : 'Pastikan Anda membuka website Cinestream melalui browser bawaan Apple Safari di iPhone atau iPad.'}
                  </div>
                </div>
              </li>

              <li className="flex gap-4 items-start">
                <div className="w-7 h-7 rounded-full bg-white text-black font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white">
                    {language === 'en' ? 'Tap the Share Button' : 'Tekan Tombol Share (Bagikan)'}
                  </div>
                  <div className="text-xs text-slate-400 leading-relaxed">
                    {language === 'en'
                      ? 'Tap the Share icon (the square with an arrow pointing upward) located at the bottom toolbar.'
                      : 'Tekan ikon kotak dengan panah ke atas (Share) di bilah bawah layar Safari Anda.'}
                  </div>
                </div>
              </li>

              <li className="flex gap-4 items-start">
                <div className="w-7 h-7 rounded-full bg-white text-black font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  3
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white">
                    {language === 'en' ? 'Select "Add to Home Screen"' : 'Pilih "Tambah ke Layar Utama" (Add to Home Screen)'}
                  </div>
                  <div className="text-xs text-slate-400 leading-relaxed">
                    {language === 'en'
                      ? 'Scroll down the menu options and choose "Add to Home Screen".'
                      : 'Gulir ke bawah pada menu opsi, lalu pilih "Add to Home Screen" atau "Tambah ke Layar Utama".'}
                  </div>
                </div>
              </li>

              <li className="flex gap-4 items-start">
                <div className="w-7 h-7 rounded-full bg-white text-black font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  4
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white">
                    {language === 'en' ? 'Tap "Add"' : 'Tekan "Tambah / Add"'}
                  </div>
                  <div className="text-xs text-slate-400 leading-relaxed">
                    {language === 'en'
                      ? 'Tap "Add" in the top-right corner. Cinestream will appear on your iOS home screen as a standalone app with no browser address bar!'
                      : 'Tekan "Add" di pojok kanan atas. Ikon Cinestream akan muncul di Home Screen iPhone Anda dan berjalan layaknya aplikasi native tanpa bar browser!'}
                  </div>
                </div>
              </li>
            </ol>
          </div>
        )}
      </div>

      {/* ── FREQUENTLY ASKED QUESTIONS (FAQ) ───────────────────── */}
      <div className="max-w-3xl mx-auto mb-16 space-y-3">
        <div className="text-center space-y-1 mb-6">
          <h2 className="font-display font-black text-2xl text-white tracking-wide uppercase">
            {language === 'en' ? 'Frequently Asked Questions' : 'Tanya Jawab Seputar Aplikasi (FAQ)'}
          </h2>
          <p className="text-xs text-slate-400">
            {language === 'en' ? 'Common questions about Cinestream APK' : 'Pertanyaan umum mengenai APK Cinestream'}
          </p>
        </div>

        {faqs.map((faq, index) => {
          const isOpen = expandedFaq === index;
          return (
            <div
              key={index}
              className="rounded-2xl bg-[#141414] border border-white/[0.08] overflow-hidden transition-all"
            >
              <button
                onClick={() => toggleFaq(index)}
                className="w-full flex items-center justify-between p-4 sm:p-5 text-left text-xs sm:text-sm font-bold text-white hover:text-red-400 transition-colors cursor-pointer"
              >
                <span>{faq.q}</span>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-red-400 shrink-0 ml-3" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-3" />
                )}
              </button>
              {isOpen && (
                <div className="px-4 pb-5 sm:px-5 sm:pb-5 text-xs text-slate-300 leading-relaxed border-t border-white/[0.04] pt-3 font-light animate-in fade-in duration-200">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  </div>
  );
};
