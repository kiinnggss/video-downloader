import React, { useState } from 'react';
import { Search, X, Download, Compass, Loader2, Settings, Smartphone, Sparkles } from 'lucide-react';
import { apiClient, getDeviceId } from '../api/client';
import { FormatPickerModal } from './FormatPickerModal';
import { CookieSettingsModal } from './CookieSettingsModal';

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
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto px-4 pt-5 pb-28">
      {/* Top Header */}
      <div className="flex items-center justify-between w-full px-1">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-cyan-400 animate-ping absolute opacity-75" />
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 relative z-10" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1">
              Crystal
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                PRO
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Universal cyber glass downloader</p>
          </div>
        </div>

        {/* Action cluster */}
        <div className="flex items-center gap-2">
          {onOpenInstallModal && (
            <button
              type="button"
              onClick={onOpenInstallModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-cyber text-xs font-semibold text-cyan-300 hover:text-white hover:border-cyan-400/60 transition-all shadow-sm active:scale-95 border border-cyan-500/30"
              title="Download app to your phone"
            >
              <Smartphone size={13} className="text-cyan-400" />
              <span>Get App</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCookieModalOpen(true)}
            className="p-2 rounded-full glass-cyber text-slate-400 hover:text-white transition-all active:scale-95 border border-cyan-500/20"
            title="Session settings"
            aria-label="Session settings"
          >
            <Settings size={15} />
          </button>
        </div>
      </div>

      {/* Futuristic Search / Address Pill */}
      <form onSubmit={handleInspect} className="relative w-full">
        <div className="flex items-center w-full glass-cyber-input rounded-full px-4 py-2.5 shadow-lg border border-cyan-500/30 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-500/20 transition-all">
          <Search size={18} className="text-cyan-400/70 mr-2 flex-shrink-0" />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste video link from YouTube, TikTok, X..."
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none font-medium"
          />
          {url && (
            <button
              type="button"
              onClick={() => setUrl('')}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              aria-label="Clear URL input"
            >
              <X size={16} />
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !url}
            className="ml-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 hover:from-cyan-300 hover:via-blue-400 hover:to-indigo-500 disabled:opacity-40 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/25 transition-all flex items-center gap-1.5 active:scale-95"
          >
            {loading ? <Loader2 size={14} className="animate-spin text-slate-950" /> : 'Inspect'}
          </button>
        </div>
      </form>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs text-center flex flex-col items-center gap-2 backdrop-blur-md">
          <span>{errorMsg}</span>
          {(errorMsg.toLowerCase().includes('sign in') || errorMsg.toLowerCase().includes('age') || errorMsg.toLowerCase().includes('restricted') || errorMsg.toLowerCase().includes('private') || errorMsg.toLowerCase().includes('bot')) && (
            <button
              type="button"
              onClick={() => setIsCookieModalOpen(true)}
              className="text-[11px] underline font-semibold text-cyan-300 hover:text-white"
            >
              Sign-in required? Add session cookies
            </button>
          )}
        </div>
      )}

      {toastMsg && (
        <div className="p-3.5 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-200 text-xs text-center font-medium animate-fade-in flex items-center justify-center gap-2 backdrop-blur-md shadow-lg shadow-cyan-950/40">
          <Download size={15} className="text-cyan-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Video Preview Card */}
      {inspectData ? (
        <div className="glass-cyber-active rounded-3xl overflow-hidden flex flex-col gap-4 p-4 animate-fade-in">
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-white/10 shadow-inner">
            <img 
              src={inspectData.thumbnail} 
              alt={inspectData.title} 
              className="w-full h-full object-cover" 
            />
            <span className="absolute bottom-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-cyan-300 text-[11px] font-mono">
              {Math.floor((inspectData.duration || 0) / 60)}:{String((inspectData.duration || 0) % 60).padStart(2, '0')}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <h2 className="font-bold text-base text-white line-clamp-2 leading-tight">
              {inspectData.title}
            </h2>
            <p className="text-xs text-slate-400">
              from <span className="font-semibold text-cyan-400">{inspectData.author}</span>
            </p>
          </div>
        </div>
      ) : (
        /* Empty state helper */
        <div className="flex flex-col items-center justify-center p-10 text-center glass-cyber rounded-3xl gap-3 border border-cyan-500/20 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500/20 via-blue-600/20 to-indigo-600/30 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shadow-inner">
            <Compass size={32} />
          </div>
          <h3 className="font-bold text-white text-sm">Paste any link to begin</h3>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
            Fast multi-threaded extraction for YouTube, TikTok, X (Twitter), Instagram, and direct MP4 streams.
          </p>
        </div>
      )}

      {/* 3D Floating Action Button */}
      {inspectData && (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-400 via-blue-600 to-indigo-600 text-white shadow-cyber-fab transition-transform duration-200 z-40 flex items-center justify-center active:scale-90 border border-white/30"
          title="Download Video"
          aria-label="Download Video"
        >
          <Download size={24} strokeWidth={2.6} className="drop-shadow-sm" />
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
