import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Download,
  Loader2,
  Settings,
  Smartphone,
  Sparkles,
  Clipboard,
  Play,
  Palette,
  Link2,
  Film,
  Music,
  Zap,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { FormatPickerModal } from './FormatPickerModal';
import { CookieSettingsModal } from './CookieSettingsModal';
import { MediaPlayerModal } from './MediaPlayerModal';

const RECENT_URLS_KEY = 'crystal_recent_urls';

function loadRecentUrls() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_URLS_KEY);
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed.slice(0, 4) : [];
  } catch {
    return [];
  }
}

function saveRecentUrl(urlStr, title) {
  if (typeof window === 'undefined' || !urlStr) return [];
  try {
    const existing = loadRecentUrls().filter((item) => item.url !== urlStr);
    const next = [{ url: urlStr, title: title || urlStr }, ...existing].slice(0, 4);
    localStorage.setItem(RECENT_URLS_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [];
  }
}

export function InspectorView({
  sharedUrl = '',
  onConsumeSharedUrl,
  onDownloadStarted,
  onNavigate,
  onOpenInstallModal,
  onOpenThemeModal,
}) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [inspectData, setInspectData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCookieModalOpen, setIsCookieModalOpen] = useState(false);
  const [quickDownloading, setQuickDownloading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [pasteHint, setPasteHint] = useState('');
  const [recentFiles, setRecentFiles] = useState([]);
  const [recentUrls, setRecentUrls] = useState(() => loadRecentUrls());
  const [previewMedia, setPreviewMedia] = useState(null);
  const urlInputRef = useRef(null);

  const runInspect = useCallback(async (targetUrl) => {
    const trimmed = String(targetUrl || '').trim();
    if (!trimmed) return;
    setLoading(true);
    setErrorMsg('');
    setPasteHint('');
    setInspectData(null);
    try {
      const data = await apiClient.inspect(trimmed);
      setInspectData(data);
      setRecentUrls(saveRecentUrl(trimmed, data?.title));
    } catch (err) {
      setErrorMsg(err.message || 'Failed to detect video stream');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    apiClient
      .getFiles('all')
      .then((list) => {
        if (Array.isArray(list)) {
          setRecentFiles(list.slice(-5).reverse());
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (sharedUrl) {
      setUrl(sharedUrl);
      runInspect(sharedUrl);
      if (onConsumeSharedUrl) onConsumeSharedUrl();
    }
  }, [sharedUrl, runInspect, onConsumeSharedUrl]);

  const handleInspectSubmit = async (e) => {
    e?.preventDefault();
    await runInspect(url);
  };

  const handlePaste = async () => {
    setPasteHint('');
    try {
      if (navigator?.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        const trimmed = (text || '').trim();
        if (trimmed) {
          setUrl(trimmed);
          if (/^https?:\/\//i.test(trimmed)) {
            await runInspect(trimmed);
          }
          return;
        }
        setPasteHint('Clipboard is empty. Copy a video link first.');
        urlInputRef.current?.focus();
        return;
      }
      setPasteHint('Clipboard access is unavailable here. Paste manually into the box.');
      urlInputRef.current?.focus();
    } catch {
      setPasteHint('Clipboard permission was blocked. Paste manually with Ctrl+V or long-press.');
      urlInputRef.current?.focus();
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

  const handleQuickBestDownload = async () => {
    if (!inspectData || quickDownloading) return;
    setQuickDownloading(true);
    setErrorMsg('');
    try {
      const bestVideo = (inspectData.formats || []).find((f) => f.resolution !== 'Audio');
      await apiClient.startDownload({
        url: inspectData.url || url.trim(),
        format_id: bestVideo?.format_id || 'best',
        is_audio: false,
        in_vault: false,
      });
      if (onDownloadStarted) {
        onDownloadStarted();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to start quick download');
    } finally {
      setQuickDownloading(false);
    }
  };

  const hasUrl = Boolean(url.trim());

  return (
    <div className="flex flex-col gap-5 w-full max-w-2xl mx-auto px-4 sm:px-6 pt-5 pb-28">
      {/* Top Header */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="relative flex items-center justify-center w-10 h-10 rounded-2xl flex-shrink-0"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--text-on-accent)',
              boxShadow: 'var(--shadow-button)',
              border: 'var(--border-width) solid var(--border-color)',
            }}
          >
            <Download size={19} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <h1
              className="font-display text-lg font-extrabold tracking-tight leading-tight"
              style={{ color: 'var(--canvas-text)' }}
            >
              Crystal
            </h1>
            <p className="text-xs truncate" style={{ color: 'var(--canvas-text-muted)' }}>
              Video & audio downloader
            </p>
          </div>
        </div>

        {/* Utility Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {onOpenThemeModal && (
            <button
              type="button"
              onClick={onOpenThemeModal}
              className="flex items-center gap-1.5 px-2.5 py-2 surface-card text-xs font-semibold spring-press"
              style={{ borderRadius: 'var(--radius-button)' }}
              title="Appearance & Themes"
              aria-label="Open theme switcher"
            >
              <Palette size={15} style={{ color: 'var(--accent-text)' }} />
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: 'var(--accent)' }}
              />
            </button>
          )}

          {onOpenInstallModal && (
            <button
              type="button"
              onClick={onOpenInstallModal}
              className="p-2.5 surface-card spring-press"
              style={{ borderRadius: 'var(--radius-button)', color: 'var(--text-primary)' }}
              title="Install web app"
              aria-label="Install app"
            >
              <Smartphone size={15} />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCookieModalOpen(true)}
            className="p-2.5 surface-card spring-press"
            style={{ borderRadius: 'var(--radius-button)', color: 'var(--text-primary)' }}
            title="Session cookies & settings"
            aria-label="Session settings"
          >
            <Settings size={15} />
          </button>
        </div>
      </div>

      {/* Primary URL Input Card */}
      <form
        onSubmit={handleInspectSubmit}
        className="surface-hero p-4 sm:p-5 flex flex-col gap-3.5"
      >
        <div className="flex flex-col gap-0.5">
          <h2
            className="text-sm font-bold"
            style={{ color: 'var(--text-on-hero)' }}
          >
            Paste a link to download
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-on-hero-muted)' }}>
            Supports YouTube, TikTok, Instagram, HLS, and direct media links.
          </p>
        </div>

        {/* Input Row */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div
            className="flex items-center gap-2 p-1.5 pl-3 surface-input flex-1 transition-all"
            style={{ borderRadius: 'var(--radius-button)' }}
          >
            <Link2 size={16} style={{ color: 'var(--text-muted)' }} className="flex-shrink-0" />
            <input
              ref={urlInputRef}
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (pasteHint) setPasteHint('');
              }}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full bg-transparent text-sm font-medium focus:outline-none py-1.5"
              style={{ color: 'var(--text-primary)' }}
            />
            {url ? (
              <button
                type="button"
                onClick={() => {
                  setUrl('');
                  setInspectData(null);
                  setErrorMsg('');
                  setPasteHint('');
                }}
                className="p-1.5 rounded-lg transition-colors flex-shrink-0"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Clear URL input"
              >
                <X size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePaste}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl flex-shrink-0 spring-press"
                style={{
                  backgroundColor: 'var(--bg-surface-muted)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
                title="Paste link from clipboard and inspect"
              >
                <Clipboard size={13} style={{ color: 'var(--accent-text)' }} />
                <span>Paste</span>
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !hasUrl}
            className="px-5 py-2.5 text-xs font-bold tracking-wide flex items-center justify-center gap-2 spring-press theme-btn-primary flex-shrink-0"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Scanning...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>Inspect</span>
              </>
            )}
          </button>
        </div>

        {pasteHint && (
          <p className="text-xs font-medium" style={{ color: 'var(--text-on-hero-muted)' }}>
            {pasteHint}
          </p>
        )}
      </form>

      {/* Recent Inspected URLs Quick Chips */}
      {!inspectData && !loading && recentUrls.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-0.5">
          <span
            className="flex items-center gap-1 text-xs font-semibold flex-shrink-0"
            style={{ color: 'var(--canvas-text-muted)' }}
          >
            <Clock size={12} />
            <span>Recent:</span>
          </span>
          {recentUrls.map((item) => (
            <button
              key={item.url}
              type="button"
              onClick={() => {
                setUrl(item.url);
                runInspect(item.url);
              }}
              className="px-2.5 py-1 rounded-full text-xs font-medium truncate max-w-[180px] spring-press"
              style={{
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
              }}
              title={item.url}
            >
              {item.title}
            </button>
          ))}
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="p-4 surface-error text-xs text-center flex flex-col items-center gap-2">
          <span className="font-semibold">{errorMsg}</span>
          {(errorMsg.toLowerCase().includes('sign in') ||
            errorMsg.toLowerCase().includes('age') ||
            errorMsg.toLowerCase().includes('restricted') ||
            errorMsg.toLowerCase().includes('private') ||
            errorMsg.toLowerCase().includes('bot') ||
            errorMsg.toLowerCase().includes('cookie') ||
            errorMsg.toLowerCase().includes('429') ||
            errorMsg.toLowerCase().includes('403')) && (
            <button
              type="button"
              onClick={() => setIsCookieModalOpen(true)}
              className="text-xs underline font-bold"
              style={{ color: 'var(--error-text)' }}
            >
              Add session cookies in Settings
            </button>
          )}
        </div>
      )}

      {/* Skeleton Loading State */}
      {loading && (
        <div className="surface-card p-4 flex flex-col gap-3 animate-fade-in">
          <div className="w-full aspect-video rounded-2xl skeleton-shimmer" />
          <div className="flex items-center justify-between gap-2">
            <div className="h-4 w-24 rounded-lg skeleton-shimmer" />
            <div className="h-4 w-20 rounded-lg skeleton-shimmer" />
          </div>
          <div className="h-5 w-4/5 rounded-lg skeleton-shimmer" />
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="h-10 rounded-xl skeleton-shimmer" />
            <div className="h-10 rounded-xl skeleton-shimmer" />
          </div>
        </div>
      )}

      {/* Inspected Media Result Card */}
      {inspectData && !loading && (
        <div className="surface-card-active overflow-hidden flex flex-col gap-4 p-4 sm:p-5 animate-fade-in">
          <div
            className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-950 group"
            style={{ border: '1px solid var(--border-color)' }}
          >
            {inspectData.thumbnail ? (
              <img
                src={inspectData.thumbnail}
                alt={inspectData.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/60">
                <Film size={32} />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20 pointer-events-none" />

            <span className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md text-white text-xs font-mono font-bold">
              {Math.floor((inspectData.duration || 0) / 60)}:
              {String((inspectData.duration || 0) % 60).padStart(2, '0')}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span
                className="text-xs px-2.5 py-0.5 rounded-lg font-semibold truncate"
                style={{
                  backgroundColor: 'var(--bg-surface-muted)',
                  color: 'var(--text-secondary)',
                }}
              >
                {inspectData.author || 'Direct Stream'}
              </span>
              <span className="text-xs font-semibold" style={{ color: 'var(--accent-text)' }}>
                {(inspectData.formats || []).length} formats
              </span>
            </div>
            <h2 className="font-display font-extrabold text-base line-clamp-2 leading-snug">
              {inspectData.title}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleQuickBestDownload}
              disabled={quickDownloading}
              className="py-3 px-4 font-bold text-xs tracking-wide flex items-center justify-center gap-1.5 spring-press theme-btn-primary"
            >
              {quickDownloading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Zap size={14} strokeWidth={2.4} />
              )}
              <span>Download Best MP4</span>
            </button>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="py-3 px-4 text-xs font-bold flex items-center justify-center gap-1.5 spring-press"
              style={{
                backgroundColor: 'var(--bg-surface-muted)',
                color: 'var(--text-primary)',
                borderRadius: 'var(--radius-button)',
                border: '1px solid var(--border-color)',
              }}
            >
              <Download size={14} />
              <span>Format & Vault Options</span>
            </button>
          </div>
        </div>
      )}

      {/* Recent Downloads Strip */}
      {!inspectData && !loading && recentFiles.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-0.5">
            <h3
              className="font-display text-sm font-extrabold"
              style={{ color: 'var(--canvas-text)' }}
            >
              Recent Downloads
            </h3>
            <button
              type="button"
              onClick={() => onNavigate?.('files')}
              className="text-xs font-bold flex items-center gap-0.5 spring-press"
              style={{ color: 'var(--canvas-text-muted)' }}
            >
              <span>See All</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {recentFiles.map((file) => (
              <div
                key={file.file_id}
                onClick={() => setPreviewMedia(file)}
                className="surface-card p-3 flex items-center justify-between gap-3 cursor-pointer spring-press"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-10 rounded-xl bg-slate-900 overflow-hidden relative flex items-center justify-center flex-shrink-0">
                    {file.thumbnail ? (
                      <img src={file.thumbnail} alt={file.title} className="w-full h-full object-cover" />
                    ) : file.category === 'music' ? (
                      <Music size={16} className="text-white" />
                    ) : (
                      <Film size={16} className="text-white" />
                    )}
                    <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                      <Play size={12} fill="white" className="text-white" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                      {file.title}
                    </p>
                    <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                      {((file.filesize || 0) / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                </div>

                <a
                  href={`/api/files/${file.file_id}/download`}
                  download={file.filename}
                  onClick={(e) => e.stopPropagation()}
                  className="p-2 rounded-xl flex-shrink-0"
                  style={{
                    backgroundColor: 'var(--bg-surface-muted)',
                    color: 'var(--accent-text)',
                  }}
                  title="Save to device"
                  aria-label="Save to device"
                >
                  <Download size={14} />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Format Modal */}
      <FormatPickerModal
        inspectData={inspectData}
        isOpen={isModalOpen}
        defaultInVault={false}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmDownload}
      />

      {/* Cookie / Session Settings Modal */}
      <CookieSettingsModal
        isOpen={isCookieModalOpen}
        onClose={() => setIsCookieModalOpen(false)}
      />

      {/* Inline Media Player for Recent Downloads */}
      <MediaPlayerModal
        media={previewMedia}
        isOpen={Boolean(previewMedia)}
        onClose={() => setPreviewMedia(null)}
      />
    </div>
  );
}

export default InspectorView;
