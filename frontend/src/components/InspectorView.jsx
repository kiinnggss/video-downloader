import React, { useState } from 'react';
import {
  Search,
  X,
  Download,
  Compass,
  Loader2,
  Settings,
  Smartphone,
  Sparkles,
  Clipboard,
  Play,
  ShieldCheck,
  Layers,
  Code2,
  ArrowRight,
  Link2,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { FormatPickerModal } from './FormatPickerModal';
import { CookieSettingsModal } from './CookieSettingsModal';

const PLATFORMS = [
  { name: 'YouTube', badge: 'YT', color: 'text-rose-700 border-rose-200/90 bg-rose-50/90 hover:bg-rose-100/80' },
  { name: 'TikTok', badge: 'TT', color: 'text-sky-800 border-sky-200/90 bg-sky-50/90 hover:bg-sky-100/80' },
  { name: 'PlayVids', badge: 'PV', color: 'text-emerald-800 border-emerald-200/90 bg-emerald-50/90 hover:bg-emerald-100/80' },
  { name: 'Instagram', badge: 'IG', color: 'text-fuchsia-800 border-fuchsia-200/90 bg-fuchsia-50/90 hover:bg-fuchsia-100/80' },
  { name: 'HLS & DASH', badge: 'M3U8', color: 'text-indigo-800 border-indigo-200/90 bg-indigo-50/90 hover:bg-indigo-100/80' },
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

  const hasUrl = Boolean(url.trim());

  return (
    <div className="flex flex-col gap-5 w-full max-w-md mx-auto px-4 pt-5 pb-28">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-slate-950 text-white shadow-md border border-slate-800">
            <span className="w-2.5 h-2.5 rounded-full bg-lime-neon relative z-10 shadow-[0_0_8px_#ccff00]" />
            <span className="w-4 h-4 rounded-full bg-lime-neon/40 animate-ping absolute" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold tracking-tight text-slate-950">
                Crystal
              </h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-900 text-lime-neon tracking-wider uppercase">
                v4.2
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Universal stream & vault downloader
            </p>
          </div>
        </div>

        {/* Action cluster */}
        <div className="flex items-center gap-2">
          {onOpenInstallModal && (
            <button
              type="button"
              onClick={onOpenInstallModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bento-card text-xs font-bold text-slate-800 hover:text-slate-950 transition-all spring-press"
              title="Install web app"
            >
              <Smartphone size={14} className="text-sky-600" />
              <span>Install</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCookieModalOpen(true)}
            className="p-2.5 rounded-xl bento-card text-slate-600 hover:text-slate-950 transition-all spring-press"
            title="Session settings"
            aria-label="Session settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Two-Tier Command Console */}
      <div className="flex flex-col gap-2.5">
        <form
          onSubmit={handleInspect}
          className="bento-command-bar rounded-3xl p-2.5 flex flex-col gap-2.5 transition-all focus-within:border-sky-500/70 focus-within:ring-4 focus-within:ring-sky-500/10"
        >
          {/* Input Row */}
          <div className="flex items-center gap-2 px-2 pt-1">
            <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-500 flex-shrink-0">
              <Link2 size={16} />
            </div>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste any video or stream link..."
              className="w-full bg-transparent text-sm text-slate-950 placeholder-slate-400 focus:outline-none font-medium py-1.5"
            />
            {url ? (
              <button
                type="button"
                onClick={() => setUrl('')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex-shrink-0"
                aria-label="Clear URL input"
              >
                <X size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePaste}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-950 transition-colors rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200/90 flex-shrink-0 spring-press"
                title="Paste from clipboard"
              >
                <Clipboard size={13} className="text-sky-600" />
                <span>Paste</span>
              </button>
            )}
          </div>

          {/* Action Bar Row */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 px-1">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {PLATFORMS.map((plat) => (
                <button
                  key={plat.name}
                  type="button"
                  onClick={() => {
                    const inputEl = document.querySelector('input[type="url"]');
                    inputEl?.focus();
                  }}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-mono font-bold whitespace-nowrap transition-all spring-press ${plat.color}`}
                >
                  <span className="opacity-75">{plat.badge}</span>
                  <span>{plat.name}</span>
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || !hasUrl}
              className={`px-4 py-2 rounded-xl font-bold text-xs tracking-wide transition-all flex items-center gap-1.5 flex-shrink-0 spring-press ${
                hasUrl
                  ? 'bg-slate-950 hover:bg-slate-800 text-white shadow-md'
                  : 'bg-slate-100 text-slate-400 border border-slate-200/80 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin text-lime-neon" />
                  <span>Scanning</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} className={hasUrl ? 'text-lime-neon' : 'text-slate-400'} />
                  <span>Inspect</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs text-center flex flex-col items-center gap-2 shadow-sm">
          <span className="font-medium">{errorMsg}</span>
          {(errorMsg.toLowerCase().includes('sign in') ||
            errorMsg.toLowerCase().includes('age') ||
            errorMsg.toLowerCase().includes('restricted') ||
            errorMsg.toLowerCase().includes('private') ||
            errorMsg.toLowerCase().includes('bot')) && (
            <button
              type="button"
              onClick={() => setIsCookieModalOpen(true)}
              className="text-[11px] underline font-bold text-sky-800 hover:text-sky-950"
            >
              Sign-in required? Add session cookies
            </button>
          )}
        </div>
      )}

      {toastMsg && (
        <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 text-xs text-center font-semibold flex items-center justify-center gap-2 shadow-sm">
          <Download size={14} className="text-sky-600" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Inspection Result Card */}
      {inspectData ? (
        <div className="bento-card-active rounded-3xl overflow-hidden flex flex-col gap-4 p-4 animate-fade-in">
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-200/80 shadow-sm group">
            <img
              src={inspectData.thumbnail}
              alt={inspectData.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-slate-950/20 pointer-events-none" />

            {/* Live Stream Tag */}
            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/90 backdrop-blur-md border border-white/15 text-[10px] font-mono font-bold text-lime-neon">
              <span className="w-1.5 h-1.5 rounded-full bg-lime-neon animate-pulse" />
              <span>STREAM READY</span>
            </div>

            {/* Duration Tag */}
            <span className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-full bg-slate-950/90 backdrop-blur-md border border-white/15 text-white text-[11px] font-mono font-bold">
              {Math.floor((inspectData.duration || 0) / 60)}:
              {String((inspectData.duration || 0) % 60).padStart(2, '0')}
            </span>
          </div>

          <div className="flex flex-col gap-1.5 px-0.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-lg bg-slate-100 border border-slate-200/90 text-slate-700 font-bold truncate">
                {inspectData.author || 'Direct Stream'}
              </span>
              <span className="text-[11px] font-mono text-sky-700 font-bold">
                {(inspectData.formats || []).length} formats available
              </span>
            </div>
            <h2 className="font-extrabold text-base text-slate-950 line-clamp-2 leading-snug">
              {inspectData.title}
            </h2>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex-1 py-3.5 px-4 rounded-2xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs tracking-wide uppercase flex items-center justify-center gap-2 shadow-md spring-press"
            >
              <Download size={15} className="text-lime-neon" strokeWidth={2.6} />
              <span>Configure Download</span>
              <ArrowRight size={14} className="text-slate-400 ml-0.5" />
            </button>
          </div>
        </div>
      ) : (
        /* Extraction Studio Empty State */
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-col items-center justify-center p-5 text-center bento-card rounded-3xl gap-2.5">
            <div className="w-12 h-12 rounded-2xl bg-slate-950 text-lime-neon flex items-center justify-center shadow-md border border-slate-800">
              <Compass size={22} />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="font-extrabold text-slate-950 text-sm tracking-tight">
                Ready to extract media
              </h3>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                Paste any video page, embedded player, or stream manifest link above to inspect available resolutions and audio tracks.
              </p>
            </div>
            <button
              type="button"
              onClick={handlePaste}
              className="mt-0.5 flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 border border-slate-200/90 text-xs font-bold transition-all spring-press"
            >
              <Clipboard size={13} className="text-sky-600" />
              <span>Paste Link from Clipboard</span>
            </button>
          </div>

          {/* 2x2 Deep Extraction Capabilities Matrix */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bento-card rounded-2xl p-3 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-sky-700 text-xs font-bold">
                <Layers size={13} className="text-sky-600 flex-shrink-0" />
                <span>HLS & DASH</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Parses .m3u8 and .mpd manifests with multi-bitrate video and audio muxing.
              </p>
            </div>

            <div className="bento-card rounded-2xl p-3 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-indigo-700 text-xs font-bold">
                <Code2 size={13} className="text-indigo-600 flex-shrink-0" />
                <span>Iframe & JS Scan</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Follows nested iframe players, unescapes JSON state, and decodes Base64 links.
              </p>
            </div>

            <div className="bento-card rounded-2xl p-3 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold">
                <Play size={13} className="text-emerald-600 flex-shrink-0" />
                <span>PlayVids & Social</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Direct extractor patches for PlayVids, YouTube, TikTok, Instagram, and HTML5 video.
              </p>
            </div>

            <div className="bento-card rounded-2xl p-3 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-amber-700 text-xs font-bold">
                <ShieldCheck size={13} className="text-amber-600 flex-shrink-0" />
                <span>Device Vault</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                PIN-locked local device storage with batch selection and VLC M3U playlist streaming.
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
          className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-slate-950 text-lime-neon shadow-xl transition-transform duration-200 z-40 flex items-center justify-center spring-press border-2 border-white"
          title="Download Video"
          aria-label="Download Video"
        >
          <Download size={22} strokeWidth={2.8} />
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
