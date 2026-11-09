import React, { useState } from 'react';
import { Search, X, Download, Compass, Loader2, Settings, Smartphone, Sparkles, Clipboard, Play, ExternalLink, ShieldCheck } from 'lucide-react';
import { apiClient } from '../api/client';
import { FormatPickerModal } from './FormatPickerModal';
import { CookieSettingsModal } from './CookieSettingsModal';

const PLATFORMS = [
  { name: 'YouTube', badge: 'YT', color: 'text-red-400 border-red-500/30 bg-red-500/10' },
  { name: 'TikTok', badge: 'TT', color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' },
  { name: 'PlayVids', badge: 'PV', color: 'text-lime-neon border-lime-neon/30 bg-lime-neon/10' },
  { name: 'Instagram', badge: 'IG', color: 'text-pink-400 border-pink-500/30 bg-pink-500/10' },
];

export function InspectorView({ onDownloadStarted, onOpenInstallModal, hasInstallPrompt }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [inspectData, setInspectData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCookieModalOpen, setIsCookieModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const handleInspect = async (e) => {
    e?.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setErrorMsg('');
    setToastMsg('');
    try {
      const data = await apiClient.inspect(url.trim());
      setInspectData(data);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to detect video stream');
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = async () => {
    try {
      if (navigator?.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setUrl(text.trim());
        }
      }
    } catch {
      // Clipboard permission denied or unavailable
    }
  };

  const handleConfirmDownload = async (options) => {
    try {
      await apiClient.startDownload(options);
      if (onDownloadStarted) {
        onDownloadStarted();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to start download');
    }
  };

  return (
    <div className="flex flex-col gap-5 w-full max-w-md mx-auto px-4 pt-5 pb-28">
      {/* Top Header Bento Bar */}
      <div className="flex items-center justify-between w-full px-1">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-obsidian-surface border border-white/10 shadow-inner">
            <span className="w-2.5 h-2.5 rounded-full bg-lime-neon relative z-10" />
            <span className="w-4 h-4 rounded-full bg-lime-neon/40 animate-ping absolute" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-black tracking-tight text-white uppercase font-mono">
                Crystal
              </h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-lime-neon/15 text-lime-neon border border-lime-neon/40 shadow-[0_0_12px_rgba(204,255,0,0.25)]">
                STUDIO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Bento telemetry media engine</p>
          </div>
        </div>

        {/* Action cluster */}
        <div className="flex items-center gap-2">
          {onOpenInstallModal && (
            <button
              type="button"
              onClick={onOpenInstallModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bento-card text-xs font-semibold text-lime-neon hover:text-white hover:border-lime-neon/50 transition-all shadow-sm spring-press border border-lime-neon/30"
              title="Install progressive web app"
            >
              <Smartphone size={13} className="text-lime-neon" />
              <span>Install</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCookieModalOpen(true)}
            className="p-2 rounded-xl bento-card text-slate-400 hover:text-white transition-all spring-press border border-white/10 hover:border-white/20"
            title="Session settings"
            aria-label="Session settings"
          >
            <Settings size={15} />
          </button>
        </div>
      </div>

      {/* Aveniq Floating Command Bar */}
      <div className="flex flex-col gap-2.5">
        <form onSubmit={handleInspect} className="relative w-full">
          <div className="flex items-center w-full bento-command-bar rounded-2xl p-1.5 pl-3.5 shadow-2xl focus-within:border-cyan-cyber focus-within:shadow-cyan-glow transition-all">
            <Search size={17} className="text-slate-400 mr-2 flex-shrink-0" />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste media link to extract..."
              className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none font-medium selection:bg-cyan-500/30"
            />

            {/* Quick Paste or Clear */}
            {url ? (
              <button
                type="button"
                onClick={() => setUrl('')}
                className="p-1.5 text-slate-400 hover:text-white transition-colors mr-1"
                aria-label="Clear URL input"
              >
                <X size={15} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePaste}
                className="flex items-center gap-1 px-2 py-1 mr-1 text-[11px] font-medium text-slate-400 hover:text-cyan-cyber transition-colors rounded-lg bg-white/5 border border-white/5"
                title="Paste from clipboard"
              >
                <Clipboard size={12} />
                <span>Paste</span>
              </button>
            )}

            {/* Inspect Button */}
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="px-4 py-2 rounded-xl bg-lime-neon hover:bg-lime-400 disabled:opacity-30 disabled:hover:bg-lime-neon text-obsidian font-black text-xs uppercase tracking-wider shadow-lime-glow transition-all flex items-center gap-1.5 spring-press"
            >
              {loading ? (
                <Loader2 size={13} className="animate-spin text-obsidian" />
              ) : (
                <>
                  <Sparkles size={13} className="text-obsidian" />
                  <span>Inspect</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Platform suggestion capsules */}
        <div className="flex items-center justify-between px-1 gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {PLATFORMS.map((plat) => (
            <button
              key={plat.name}
              type="button"
              onClick={() => {
                if (!url) {
                  // Focus and offer visual prompt
                  const inputEl = document.querySelector('input[type="url"]');
                  inputEl?.focus();
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono font-semibold transition-all spring-press ${plat.color}`}
            >
              <span className="text-[9px] font-black">{plat.badge}</span>
              <span>{plat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-crimson-tactical/15 border border-crimson-tactical/40 text-rose-200 text-xs text-center flex flex-col items-center gap-2 backdrop-blur-md">
          <span>{errorMsg}</span>
          {(errorMsg.toLowerCase().includes('sign in') ||
            errorMsg.toLowerCase().includes('age') ||
            errorMsg.toLowerCase().includes('restricted') ||
            errorMsg.toLowerCase().includes('private') ||
            errorMsg.toLowerCase().includes('bot')) && (
            <button
              type="button"
              onClick={() => setIsCookieModalOpen(true)}
              className="text-[11px] underline font-semibold text-cyan-cyber hover:text-white"
            >
              Sign-in required? Add session cookies
            </button>
          )}
        </div>
      )}

      {toastMsg && (
        <div className="p-3.5 rounded-2xl bg-cyan-cyber/15 border border-cyan-cyber/30 text-cyan-200 text-xs text-center font-medium flex items-center justify-center gap-2 backdrop-blur-md shadow-lg">
          <Download size={14} className="text-cyan-cyber" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Bento Inspection Result Card */}
      {inspectData ? (
        <div className="bento-card-active rounded-3xl overflow-hidden flex flex-col gap-4 p-4.5 animate-fade-in border border-cyan-cyber/40">
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-obsidian-base border border-white/10 shadow-inner group">
            <img
              src={inspectData.thumbnail}
              alt={inspectData.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* Live Telemetry Tag */}
            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-obsidian-base/80 backdrop-blur-md border border-white/15 text-[10px] font-mono text-lime-neon">
              <span className="w-1.5 h-1.5 rounded-full bg-lime-neon animate-pulse" />
              <span>DETECTED</span>
            </div>

            {/* Duration Tag */}
            <span className="absolute bottom-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-obsidian-base/85 backdrop-blur-md border border-white/20 text-cyan-cyber text-[11px] font-mono font-semibold">
              {Math.floor((inspectData.duration || 0) / 60)}:{String((inspectData.duration || 0) % 60).padStart(2, '0')}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300">
                {inspectData.author || 'Universal Media'}
              </span>
            </div>
            <h2 className="font-bold text-sm text-white line-clamp-2 leading-snug">
              {inspectData.title}
            </h2>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex-1 py-3 px-4 rounded-xl bg-lime-neon hover:bg-lime-400 text-obsidian font-black text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-lime-glow spring-press"
            >
              <Download size={15} strokeWidth={2.8} />
              <span>Configure Download</span>
            </button>
          </div>
        </div>
      ) : (
        /* Empty State Bento Grid */
        <div className="flex flex-col gap-3">
          <div className="flex flex-col items-center justify-center p-8 text-center bento-card rounded-3xl gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-cyber/20 via-blue-600/20 to-lime-neon/20 border border-white/10 flex items-center justify-center text-cyan-cyber shadow-inner">
              <Compass size={28} />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="font-extrabold text-white text-sm">Ready for extraction</h3>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                Paste any video link above to inspect quality streams, bitrates, audio tracks, and private vault options.
              </p>
            </div>
          </div>

          {/* Capabilities feature bento */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bento-card rounded-2xl p-3.5 flex flex-col gap-1.5 border border-white/5">
              <div className="flex items-center gap-1.5 text-lime-neon text-xs font-mono font-bold">
                <Play size={12} />
                <span>PlayVids Native</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Patched direct extractor bypassing PlayVids 404 blocks with auto HLS fallback.
              </p>
            </div>

            <div className="bento-card rounded-2xl p-3.5 flex flex-col gap-1.5 border border-white/5">
              <div className="flex items-center gap-1.5 text-amber-vault text-xs font-mono font-bold">
                <ShieldCheck size={12} />
                <span>Device Vault</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Hardware-isolated PIN, encrypted local storage, and VLC streaming support.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button for active inspected media */}
      {inspectData && (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-lime-neon text-obsidian shadow-lime-glow transition-transform duration-200 z-40 flex items-center justify-center spring-press border-2 border-white/40"
          title="Download Video"
          aria-label="Download Video"
        >
          <Download size={22} strokeWidth={3} className="drop-shadow-sm" />
        </button>
      )}

      {/* Format Modal */}
      <FormatPickerModal
        inspectData={inspectData}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmDownload}
      />

      {/* Cookie / Session Settings Modal */}
      <CookieSettingsModal
        isOpen={isCookieModalOpen}
        onClose={() => setIsCookieModalOpen(false)}
      />
    </div>
  );
}

export default InspectorView;
