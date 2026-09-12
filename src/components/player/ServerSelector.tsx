import React, { useRef, useState } from 'react';
import type { Server, MediaItem } from '../../types/media';
import { Server as ServerIcon, ShieldCheck, Loader2 } from 'lucide-react';
import { useSound } from '../../context/SoundContext';
import { useLanguage } from '../../context/LanguageContext';
import { resolveBestServer } from '../../services/serverResolver';
import { formatServerName, getServerBadgeInfo, getDefaultServer } from '../../utils/formatters';

interface ServerSelectorProps {
  servers: Server[];
  activeServerId: string;
  onSelectServer: (server: Server) => void;
  isLoading?: boolean;
  media?: Partial<MediaItem> | null;
}

export const ServerSelector: React.FC<ServerSelectorProps> = ({
  servers,
  activeServerId,
  onSelectServer,
  isLoading = false,
  media,
}) => {
  const { playClick, playHover } = useSound();
  const { t, language } = useLanguage();
  const [isResolving, setIsResolving] = useState(false);
  const failedServerIdsRef = useRef<Set<string>>(new Set());

  const activeServer = servers.find((s) => s.id === activeServerId) || getDefaultServer(servers);

  const handleSmartFailover = async () => {
    if (servers.length <= 1 || isResolving) return;
    playClick();
    setIsResolving(true);
    failedServerIdsRef.current.add(activeServerId);

    try {
      const result = await resolveBestServer({
        servers,
        currentServerId: activeServerId,
        media,
        failedServerIds: failedServerIdsRef.current,
        lang: language,
      });
      onSelectServer(result.bestServer);
    } catch (err) {
      console.warn('Smart server resolution fallback in ServerSelector:', err);
      const currIdx = servers.findIndex((s) => s.id === activeServerId);
      const nextIdx = (currIdx + 1) % servers.length;
      onSelectServer(servers[nextIdx]);
    } finally {
      setIsResolving(false);
    }
  };

  // If only 1 server exists (Single High-Performance Engine mode requested by user)
  if (servers.length <= 1 && activeServer) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-cinema-900/60 border border-white/[0.06] rounded-2xl px-4 sm:px-6 py-3.5 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center flex-shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="absolute w-4 h-4 rounded-full bg-emerald-400/30 animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-medium text-xs sm:text-sm text-white uppercase tracking-wider">
                {formatServerName(activeServer.name, language)}
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-sans font-medium">
                {t('ultraSmooth')} • {activeServer.quality}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-light mt-0.5">
              {t('singleTransmissionNotice')} {activeServer.speed}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-brand-champagne font-light bg-white/[0.02] px-3.5 py-1.5 rounded-full border border-white/5 self-start sm:self-auto">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-champagne" />
          <span>{t('protectedServerNotice')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#181818]/90 border border-white/10 rounded-xl p-4 sm:p-5 backdrop-blur-xl shadow-xl shadow-black/40">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#E50914]/15 text-[#E50914]">
            <ServerIcon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-sans font-bold text-white text-xs sm:text-sm tracking-wide uppercase flex items-center gap-2">
              {t('serverStreamingRoutes')}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-sans normal-case font-semibold">
                {servers.length} {language === 'en' ? 'Engines Online' : 'Mesin Aktif'}
              </span>
            </h4>
            <p className="text-[11px] text-slate-400 font-normal">
              {t('switchRouteNotice')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleSmartFailover}
            onMouseEnter={playHover}
            disabled={isResolving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 hover:bg-amber-400 text-amber-200 hover:text-black border border-amber-500/30 text-xs font-semibold transition-all shadow-sm cursor-pointer disabled:opacity-60"
            title={language === 'en' ? 'Auto-select verified working server' : 'Otomatis memilih server lancar & aktif'}
          >
            {isResolving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                <span>{t('findingBestServer')}</span>
              </>
            ) : (
              <span>⚡ {t('switchServerIfError')}</span>
            )}
          </button>
          <div className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-400 bg-white/[0.03] px-3.5 py-1.5 rounded-full border border-white/10">
            <ShieldCheck className="w-3.5 h-3.5 text-[#E50914]" />
            <span>{t('encryptedStreamProtected')}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {servers.map((server, idx) => {
          const isActive = server.id === activeServerId;
          const badge = getServerBadgeInfo(server, language);
          return (
            <button
              key={server.id}
              onClick={() => {
                playClick();
                onSelectServer(server);
              }}
              onMouseEnter={playHover}
              disabled={isLoading}
              className={`relative flex items-center justify-between p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-[#E50914]/15 border-[#E50914] text-white shadow-glow-red'
                  : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.07] hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all ${
                    isActive ? 'bg-[#E50914] shadow-glow-red scale-110' : 'bg-slate-600'
                  }`}
                />
                <div className="truncate flex-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-semibold text-xs text-white truncate">
                      {formatServerName(server.name, language)}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-sans border font-semibold whitespace-nowrap ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-1 font-normal">
                    <span className="text-slate-300 font-mono">{server.speed}</span>
                    <span>•</span>
                    <span className="text-slate-400">{server.quality}</span>
                    <span>•</span>
                    <span className="text-slate-400 font-mono">S{idx + 1}</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center gap-2 text-[11px] text-slate-400 font-normal">
        <span className="text-red-400 font-semibold">💡 {t('guide')}:</span>
        <span>{t('guideServerNotice')}</span>
      </div>
    </div>
  );
};
