import React, { useState } from 'react';
import { Search, X, Download, Compass, Loader2, Key } from 'lucide-react';
import { apiClient, getDeviceId } from '../api/client';
import { FormatPickerModal } from './FormatPickerModal';
import { CookieSettingsModal } from './CookieSettingsModal';

export function InspectorView({ onDownloadStarted }) {
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
      if (!options.in_vault) {
        const params = new URLSearchParams({
          url: options.url,
          format_id: options.format_id || 'best',
          is_audio: options.is_audio ? 'true' : 'false',
          title: inspectData?.title || 'video',
          device_id: getDeviceId(),
        });
        const downloadUrl = `/api/downloads/stream-direct?${params.toString()}`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', `${inspectData?.title || 'video'}.${options.is_audio ? 'mp3' : 'mp4'}`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setToastMsg('Streaming directly to your phone storage!');
        setTimeout(() => setToastMsg(''), 5000);
      } else {
        await apiClient.startDownload(options);
        if (onDownloadStarted) onDownloadStarted();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to start download');
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto px-4 pt-4 pb-28">
      {/* Top Header */}
      <div className="flex items-center justify-between w-full px-1">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Crystal</h1>
          <p className="text-[11px] text-slate-500">Universal mobile media downloader</p>
        </div>
      </div>

      {/* Search / Address Pill */}
      <form onSubmit={handleInspect} className="relative w-full">
        <div className="flex items-center w-full crystal-card rounded-full px-4 py-2.5 shadow-sm">
          <Search size={18} className="text-slate-400 mr-2 flex-shrink-0" />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste video link here..."
            className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
          />
          {url && (
            <button
              type="button"
              onClick={() => setUrl('')}
              className="p-1 text-slate-400 hover:text-slate-600"
              aria-label="Clear URL input"
            >
              <X size={16} />
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !url}
            className="ml-2 px-4 py-1.5 rounded-full bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-1.5"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : 'Inspect'}
          </button>
        </div>
      </form>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 text-xs text-center flex flex-col items-center gap-2">
          <span>{errorMsg}</span>
          {(errorMsg.toLowerCase().includes('sign in') || errorMsg.toLowerCase().includes('age') || errorMsg.toLowerCase().includes('restricted') || errorMsg.toLowerCase().includes('private') || errorMsg.toLowerCase().includes('bot')) && (
            <button
              type="button"
              onClick={() => setIsCookieModalOpen(true)}
              className="text-[11px] underline font-medium text-rose-800 hover:text-rose-950"
            >
              Sign-in required? Add session cookies
            </button>
          )}
        </div>
      )}

      {toastMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-xs text-center font-medium animate-fade-in flex items-center justify-center gap-2">
          <Download size={15} className="text-emerald-600" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Video Preview Card */}
      {inspectData ? (
        <div className="crystal-card rounded-3xl overflow-hidden shadow-crystal flex flex-col gap-4 p-4 animate-fade-in">
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-900 shadow-inner">
            <img 
              src={inspectData.thumbnail} 
              alt={inspectData.title} 
              className="w-full h-full object-cover" 
            />
            <span className="absolute bottom-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-xl text-white text-[11px] font-mono">
              {Math.floor((inspectData.duration || 0) / 60)}:{String((inspectData.duration || 0) % 60).padStart(2, '0')}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <h2 className="font-semibold text-base text-slate-900 line-clamp-2 leading-tight">
              {inspectData.title}
            </h2>
            <p className="text-xs text-slate-500">
              from <span className="font-medium text-slate-700">{inspectData.author}</span>
            </p>
          </div>
        </div>
      ) : (
        /* Empty state helper */
        <div className="flex flex-col items-center justify-center p-12 text-center crystal-card rounded-3xl gap-3">
          <div className="p-4 rounded-full bg-amber-400/10 text-amber-500">
            <Compass size={32} />
          </div>
          <h3 className="font-medium text-slate-800 text-sm">Paste any link to begin</h3>
          <p className="text-xs text-slate-400 max-w-xs">
            Supports YouTube, Vimeo, TikTok, Instagram, Twitter, and direct MP4 streams.
          </p>
        </div>
      )}

      {/* Floating Action Button */}
      {inspectData && (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="fixed bottom-24 right-6 p-4 rounded-full bg-amber-400 hover:bg-amber-500 active:scale-95 text-slate-950 shadow-fab-glow transition-all z-40 flex items-center justify-center"
          title="Download Video"
          aria-label="Download Video"
        >
          <Download size={26} strokeWidth={2.5} />
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
