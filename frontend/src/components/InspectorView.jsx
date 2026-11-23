import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Download,
  Loader2,
  Settings,
  Smartphone,
  Sparkles,
  Clipboard,
  Play,
  Shield,
  Palette,
  ArrowDownCircle,
  Folder,
  Link2,
  Film,
  Music,
  Zap,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useTheme } from '../theme/ThemeContext';
import { FormatPickerModal } from './FormatPickerModal';
import { CookieSettingsModal } from './CookieSettingsModal';
import { MediaPlayerModal } from './MediaPlayerModal';

const PLATFORMS = [
  { name: 'YouTube', badge: 'YT' },
  { name: 'TikTok', badge: 'TT' },
  { name: 'PlayVids', badge: 'PV' },
  { name: 'Instagram', badge: 'IG' },
  { name: 'HLS / DASH', badge: 'M3U8' },
];

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
  const { theme } = useTheme();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [inspectData, setInspectData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCookieModalOpen, setIsCookieModalOpen] = useState(false);
  const [directToVault, setDirectToVault] = useState(false);
  const [quickDownloading, setQuickDownloading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [recentFiles, setRecentFiles] = useState([]);
  const [recentUrls, setRecentUrls] = useState(() => loadRecentUrls());
  const [previewMedia, setPreviewMedia] = useState(null);

  const runInspect = useCallback(async (targetUrl) => {
    const trimmed = String(targetUrl || '').trim();
    if (!trimmed) return;
    setLoading(true);
    setErrorMsg('');
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

  // Load recent saved library files for Home preview strip
  useEffect(() => {
    apiClient
      .getFiles('all')
      .then((list) => {
        if (Array.isArray(list)) {
          setRecentFiles(list.slice(-3).reverse());
        }
      })
      .catch(() => {});
  }, []);

  // Auto-inspect incoming Web Share Target link
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
    try {
      if (navigator?.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        const trimmed = (text || '').trim();
        if (trimmed) {
          setUrl(trimmed);
          if (/^https?:\/\//i.test(trimmed)) {
            await runInspect(trimmed);
          }
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
        in_vault: directToVault,
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
    <div className="flex flex-col gap-5 w-full max-w-md mx-auto px-4 pt-5 pb-28">
      {/* Top Studio Header */}
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
            <Download size={19} strokeWidth={2.6} />
          </div>
          <div className="min-w-0">
            <h1
              className="font-display text-lg font-extrabold tracking-tight leading-tight"
              style={{ color: 'var(--canvas-text)' }}
            >
              Crystal
            </h1>
            <p className="text-[11px] truncate" style={{ color: 'var(--canvas-text-muted)' }}>
              {theme.name} · Media & Vault
            </p>
          </div>
        </div>

        {/* Action Cluster */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {onOpenThemeModal && (
            <button
              type="button"
              onClick={onOpenThemeModal}
              className="flex items-center gap-1.5 px-2.5 py-2 surface-card text-xs font-bold spring-press"
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

      {/* Hero Link Downloader Card */}
      <form
        onSubmit={handleInspectSubmit}
        className="surface-hero p-4 flex flex-col gap-3"
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-xs font-extrabold uppercase tracking-wider font-mono"
            style={{ color: 'var(--text-on-hero)' }}
          >
            Extract video or audio
          </span>
          <span
            className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: 'var(--bg-surface-muted)',
              color: 'var(--accent-text)',
            }}
          >
            HD / MP3 / HLS
          </span>
        </div>

        {/* Input Well */}
        <div
          className="flex items-center gap-2 p-1.5 pl-3 surface-input rounded-2xl transition-all"
          style={{ borderRadius: 'var(--radius-button)' }}
        >
          <Link2 size={16} style={{ color: 'var(--text-muted)' }} className="flex-shrink-0" />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste video or playlist link..."
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
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl flex-shrink-0 spring-press"
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

        {/* Supported Platform Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {PLATFORMS.map((plat) => (
            <button
              key={plat.name}
              type="button"
              onClick={() => {
                const inputEl = document.querySelector('input[type="url"]');
                inputEl?.focus();
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold whitespace-nowrap spring-press"
              style={{
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
              }}
            >
              <span style={{ color: 'var(--accent-text)' }}>{plat.badge}</span>
              <span>{plat.name}</span>
            </button>
          ))}
        </div>

        {/* Direct to Vault Toggle + Primary CTA */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={() => setDirectToVault(!directToVault)}
            className="flex items-center gap-2 text-left spring-press"
            aria-pressed={directToVault}
          >
            <div
              className="w-9 h-5 rounded-full p-0.5 flex items-center transition-colors flex-shrink-0"
              style={{
                backgroundColor: directToVault ? 'var(--accent-vault)' : 'var(--bg-surface-muted)',
                border: '1px solid var(--border-color)',
              }}
            >
              <span
                className={`w-3.5 h-3.5 rounded-full transition-transform ${
                  directToVault ? 'translate-x-4' : 'translate-x-0'
                }`}
                style={{
                  backgroundColor: directToVault ? '#FFFFFF' : 'var(--text-muted)',
                }}
              />
            </div>
            <span className="text-xs font-bold" style={{ color: 'var(--text-on-hero)' }}>
              Save to Vault
            </span>
          </button>

          <button
            type="submit"
            disabled={loading || !hasUrl}
            className="px-5 py-2.5 text-xs font-extrabold tracking-wide flex items-center gap-2 spring-press theme-btn-primary flex-shrink-0"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Scanning...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>Inspect Stream</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Recent Inspected URLs Quick Chips */}
      {!inspectData && !loading && recentUrls.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-0.5">
          <span
            className="flex items-center gap-1 text-[10px] font-mono font-bold flex-shrink-0"
            style={{ color: 'var(--canvas-text-muted)' }}
          >
            <Clock size={11} />
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
              className="px-2.5 py-1 rounded-full text-[11px] font-medium truncate max-w-[140px] spring-press"
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
        <div className="p-4 surface-card border-rose-400/70 text-xs text-center flex flex-col items-center gap-2">
          <span className="font-semibold text-rose-600">{errorMsg}</span>
          {(errorMsg.toLowerCase().includes('sign in') ||
            errorMsg.toLowerCase().includes('age') ||
            errorMsg.toLowerCase().includes('restricted') ||
            errorMsg.toLowerCase().includes('private') ||
            errorMsg.toLowerCase().includes('bot')) && (
            <button
              type="button"
              onClick={() => setIsCookieModalOpen(true)}
              className="text-xs underline font-bold"
              style={{ color: 'var(--accent-text)' }}
            >
              Add session cookies in Settings
            </button>
          )}
        </div>
      )}

      {/* Skeleton Shimmer Loading State */}
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
        <div className="surface-card-active overflow-hidden flex flex-col gap-4 p-4 animate-fade-in">
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

            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md text-[10px] font-mono font-bold text-white">
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: 'var(--accent)' }}
              />
              <span>STREAM READY</span>
            </div>

            <span className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md text-white text-[11px] font-mono font-bold">
              {Math.floor((inspectData.duration || 0) / 60)}:
              {String((inspectData.duration || 0) % 60).padStart(2, '0')}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span
                className="text-[11px] font-mono px-2.5 py-0.5 rounded-lg font-bold truncate"
                style={{
                  backgroundColor: 'var(--bg-surface-muted)',
                  color: 'var(--text-secondary)',
                }}
              >
                {inspectData.author || 'Direct Stream'}
              </span>
              <span className="text-[11px] font-mono font-bold" style={{ color: 'var(--accent-text)' }}>
                {(inspectData.formats || []).length} formats
              </span>
            </div>
            <h2 className="font-display font-extrabold text-base line-clamp-2 leading-snug">
              {inspectData.title}
            </h2>
          </div>

          {/* 1-Tap Download & Format Picker Actions */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleQuickBestDownload}
              disabled={quickDownloading}
              className="py-3 px-3 font-extrabold text-xs tracking-wide flex items-center justify-center gap-1.5 spring-press theme-btn-primary"
            >
              {quickDownloading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Zap size={14} strokeWidth={2.5} />
              )}
              <span>1-Tap Best MP4</span>
            </button>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="py-3 px-3 text-xs font-bold flex items-center justify-center gap-1.5 spring-press"
              style={{
                backgroundColor: 'var(--bg-surface-muted)',
                color: 'var(--text-primary)',
                borderRadius: 'var(--radius-button)',
                border: '1px solid var(--border-color)',
              }}
            >
              <Download size={14} />
              <span>Choose Format</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Feature Hub 2x2 Grid (Shot 1 & Shot 3 inspiration) */}
      {!inspectData && !loading && (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onNavigate?.('downloads')}
            className="surface-card p-4 text-left flex flex-col gap-2.5 spring-press"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: 'var(--accent-secondary-soft)',
                color: 'var(--accent-secondary-text)',
              }}
            >
              <ArrowDownCircle size={20} />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                Transfers
              </h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Live speed & queue
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate?.('files')}
            className="surface-card p-4 text-left flex flex-col gap-2.5 spring-press"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: 'var(--accent-soft)',
                color: 'var(--accent-text)',
              }}
            >
              <Folder size={20} />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                Library
              </h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Saved videos & MP3
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate?.('vault')}
            className="surface-card p-4 text-left flex flex-col gap-2.5 spring-press"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: 'var(--accent-vault-soft)',
                color: 'var(--accent-vault-text)',
              }}
            >
              <Shield size={20} />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                Private Vault
              </h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                PIN lock & VLC stream
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenThemeModal}
            className="surface-card p-4 text-left flex flex-col gap-2.5 spring-press"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--text-on-accent)',
              }}
            >
              <Palette size={20} />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                Themes
              </h3>
              <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                {theme.name}
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Recent Downloads Strip (Shot 1 & Shot 2) */}
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
                    <p className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
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
        defaultInVault={directToVault}
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
