import React from 'react';
import { Play, Shield } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const Footer: React.FC = () => {
  const { t } = useLanguage();

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

          {/* Disclaimer */}
          <div className="space-y-3 md:flex md:flex-col md:items-end md:text-right">
            <h5 className="font-sans font-bold text-white text-xs tracking-wider uppercase flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#E50914]" />
              {t('eduNotice')}
            </h5>
            <p className="text-[11px] text-slate-500 leading-relaxed max-w-md">
              {t('eduDesc')}
            </p>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div className="pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500 font-normal">
          <div>
            {t('copyrightDedication')}
          </div>
          <div>
            &copy; {new Date().getFullYear()} CINESTREAM • {t('edition')}
          </div>
        </div>
      </div>
    </footer>
  );
};
