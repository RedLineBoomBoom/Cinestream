import React from 'react';
import { Play, Shield, Lock, FileText, Smartphone } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { APP_VERSION, checkForAppUpdate } from '../../utils/pwaUpdate';

interface FooterProps {
  onOpenLegal?: (tab: 'privacy' | 'terms') => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenLegal }) => {
  const { t, language } = useLanguage();

  return (
    <footer className="relative bg-[#0c0c0c] border-t border-white/[0.08] pt-16 pb-24 sm:pb-16 text-slate-400 text-xs mt-0">
      <div className="max-w-[1720px] 2xl:max-w-[1880px] 3xl:max-w-[2200px] 4xl:max-w-[2600px] mx-auto px-4 sm:px-8 lg:px-12 3xl:px-16 space-y-12">
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-md bg-[#E50914] flex items-center justify-center shadow-lg shadow-[#E50914]/20">
                <Play className="w-3.5 h-3.5 text-white ml-0.5 fill-white" />
              </div>
              <span className="font-display font-black text-white text-lg tracking-wider uppercase">
                CINE<span className="text-[#E50914]">STREAM</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 font-normal leading-relaxed max-w-md">
              {t('footerDesc')}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium tracking-wide">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{t('encryptedStream')}</span>
            </div>
          </div>

          {/* Disclaimer & Legal Links */}
          <div className="space-y-3.5 md:flex md:flex-col md:items-end md:text-right">
            <h5 className="font-sans font-bold text-white text-xs tracking-wider uppercase flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#E50914]" />
              {t('eduNotice')}
            </h5>
            <p className="text-[11px] text-slate-500 leading-relaxed max-w-md">
              {t('eduDesc')}
            </p>

            {/* Privacy Policy & Terms Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href={`/privacy.html?lang=${language}`}
                onClick={(e) => {
                  if (onOpenLegal && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.button !== 1) {
                    e.preventDefault();
                    onOpenLegal('privacy');
                  }
                }}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-[#E50914]/15 hover:border-[#E50914]/50 hover:text-white text-slate-300 border border-white/[0.08] transition-all duration-200 text-[11px] font-medium group no-underline cursor-pointer"
              >
                <Lock className="w-3 h-3 text-[#E50914] group-hover:scale-110 transition-transform" />
                <span>{t('privacyPolicy')}</span>
              </a>

              <a
                href={`/terms.html?lang=${language}`}
                onClick={(e) => {
                  if (onOpenLegal && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.button !== 1) {
                    e.preventDefault();
                    onOpenLegal('terms');
                  }
                }}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] hover:text-white text-slate-300 border border-white/[0.08] transition-all duration-200 text-[11px] font-medium group no-underline cursor-pointer"
              >
                <FileText className="w-3 h-3 text-slate-400 group-hover:text-white group-hover:scale-110 transition-transform" />
                <span>{t('termsOfService')}</span>
              </a>

              <a
                href="/app"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/30 hover:bg-[#E50914]/20 hover:border-[#E50914]/50 hover:text-white text-red-200 border border-red-500/30 transition-all duration-200 text-[11px] font-medium group no-underline cursor-pointer"
              >
                <Smartphone className="w-3 h-3 text-[#E50914] group-hover:scale-110 transition-transform" />
                <span>{language === 'en' ? 'Download App (APK)' : 'Unduh Aplikasi (APK)'}</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div className="pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500 font-normal">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span>{t('copyrightDedication')}</span>
            <span className="hidden sm:inline text-white/10">•</span>
            <a
              href={`/privacy.html?lang=${language}`}
              onClick={(e) => {
                if (onOpenLegal && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.button !== 1) {
                  e.preventDefault();
                  onOpenLegal('privacy');
                }
              }}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-[#E50914] transition-colors cursor-pointer"
            >
              {t('privacyPolicy')}
            </a>
            <span className="text-white/10">•</span>
            <a
              href={`/terms.html?lang=${language}`}
              onClick={(e) => {
                if (onOpenLegal && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.button !== 1) {
                  e.preventDefault();
                  onOpenLegal('terms');
                }
              }}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              {t('termsOfService')}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <span>&copy; {new Date().getFullYear()} CINESTREAM • {t('edition')}</span>
            <span className="text-white/10">•</span>
            <button
              type="button"
              onClick={async () => {
                const res = await checkForAppUpdate();
                alert(res.message);
              }}
              className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.05] hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-400 border border-white/[0.08] transition-colors cursor-pointer"
              title="Cinestream Version - Klik untuk cek pembaruan"
            >
              v{APP_VERSION}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
