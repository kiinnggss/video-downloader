import React, { useState, useEffect, useCallback } from 'react';
import {
  Play,
  Download,
  Film,
  Music,
  Trash2,
  Loader2,
  AlertCircle,
  LayoutGrid,
  List,
  Shield,
  Check,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { ActiveDownloadCard } from './ActiveDownloadCard';
import { MediaPlayerModal } from './MediaPlayerModal';

export function FilesView({ activeTask }) {
  const [tab, setTab] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const [files, setFiles] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [movingId, setMovingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const loadFiles = useCallback(async () => {
    try {
      const data = await apiClient.getFiles(tab);
      setFiles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to load media files');
    }
  }, [tab]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles, activeTask?.status]);

  // Auto-reset 2-tap inline delete confirmation after 3 seconds
  useEffect(() => {
    if (!confirmDeleteId) return undefined;
    const timer = setTimeout(() => setConfirmDeleteId(null), 3000);
    return () => clearTimeout(timer);
  }, [confirmDeleteId]);

  const handleDelete = async (e, fileId) => {
    e.stopPropagation();
    if (confirmDeleteId !== fileId) {
      setConfirmDeleteId(fileId);
      return;
    }
    setConfirmDeleteId(null);
    setDeletingId(fileId);
    setErrorMessage('');
    try {
      await apiClient.deleteFile(fileId);
      await loadFiles();
      setToastMessage('Deleted from device');
      setTimeout(() => setToastMessage(''), 2500);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to delete file');
    } finally {
      setDeletingId(null);
    }
  };

  const handleMoveToVault = async (e, fileId) => {
    e.stopPropagation();
    setMovingId(fileId);
    setErrorMessage('');
    try {
      await apiClient.moveFileToVault(fileId);
      await loadFiles();
      setToastMessage('Moved to Private Vault');
      setTimeout(() => setToastMessage(''), 3000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to move file to vault');
    } finally {
      setMovingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-5 w-full max-w-2xl mx-auto px-4 sm:px-6 pt-5 pb-28 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1
              className="font-display text-xl font-extrabold tracking-tight truncate"
              style={{ color: 'var(--canvas-text)' }}
            >
              Library
            </h1>
            <span
              className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex-shrink-0"
              style={{
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--accent-text)',
                border: '1px solid var(--border-color)',
              }}
            >
              {files.length}
            </span>
          </div>
          <p className="text-xs pt-0.5" style={{ color: 'var(--canvas-text-muted)' }}>
            Offline media storage & direct playback
          </p>
        </div>

        {/* View Toggle & Appearance */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div
            className="flex items-center p-0.5 rounded-xl"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="p-1.5 rounded-lg transition-all"
              style={
                viewMode === 'list'
                  ? { backgroundColor: 'var(--accent)', color: 'var(--text-on-accent)' }
                  : { color: 'var(--text-muted)' }
              }
              title="List view"
              aria-label="List view"
            >
              <List size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className="p-1.5 rounded-lg transition-all"
              style={
                viewMode === 'grid'
                  ? { backgroundColor: 'var(--accent)', color: 'var(--text-on-accent)' }
                  : { color: 'var(--text-muted)' }
              }
              title="Grid view"
              aria-label="Grid view"
            >
              <LayoutGrid size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Segmented Bar */}
      <div
        className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl surface-muted"
        style={{ borderRadius: 'var(--radius-button)' }}
      >
        {[
          { id: 'all', label: 'All Media' },
          { id: 'video', label: 'Videos' },
          { id: 'music', label: 'Audio' },
        ].map((t) => {
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className="py-2 rounded-xl text-xs font-bold capitalize transition-all spring-press"
              style={
                isActive
                  ? {
                      backgroundColor: 'var(--accent)',
                      color: 'var(--text-on-accent)',
                      boxShadow: 'var(--shadow-button)',
                    }
                  : { color: 'var(--text-secondary)' }
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {toastMessage && (
        <div
          className="flex items-center gap-2 p-3 surface-card text-xs font-bold animate-fade-in"
          style={{ color: 'var(--accent-text)' }}
        >
          <Check size={14} />
          <span>{toastMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 p-3 surface-error text-xs font-semibold">
          <AlertCircle size={14} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Active Download Progress Card */}
      {activeTask && <ActiveDownloadCard task={activeTask} onStatusChange={loadFiles} />}

      {/* Files List / Grid */}
      {files.length === 0 ? (
        <div className="surface-card p-10 text-center text-xs flex flex-col items-center gap-2">
          <Film size={28} style={{ color: 'var(--text-muted)' }} className="mb-1" />
          <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
            No media stored yet
          </span>
          <span className="text-[11px] max-w-xs" style={{ color: 'var(--text-muted)' }}>
            Downloaded videos and audio appear here for instant offline playback or vault protection.
          </span>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 gap-3">
          {files.map((file) => {
            const isConfirming = confirmDeleteId === file.file_id;
            return (
              <div
                key={file.file_id}
                onClick={() => setSelectedMedia(file)}
                className="surface-card overflow-hidden flex flex-col cursor-pointer spring-press"
              >
                <div className="relative w-full aspect-video bg-slate-900 flex items-center justify-center">
                  {file.thumbnail ? (
                    <img src={file.thumbnail} alt={file.title} className="w-full h-full object-cover" />
                  ) : file.category === 'music' ? (
                    <Music size={22} className="text-white/80" />
                  ) : (
                    <Film size={22} className="text-white/80" />
                  )}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shadow-md"
                      style={{
                        backgroundColor: 'var(--accent)',
                        color: 'var(--text-on-accent)',
                      }}
                    >
                      <Play size={13} fill="currentColor" />
                    </div>
                  </div>
                </div>

                <div className="p-3 flex flex-col gap-2 flex-1 justify-between">
                  <div>
                    <h4 className="font-bold text-xs line-clamp-2 leading-snug" style={{ color: 'var(--text-primary)' }}>
                      {file.title}
                    </h4>
                    <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                      {((file.filesize || 0) / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-1 pt-1 border-t" style={{ borderColor: 'var(--border-color)' }}>
                    <a
                      href={`/api/files/${file.file_id}/download`}
                      download={file.filename}
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{
                        backgroundColor: 'var(--bg-surface-muted)',
                        color: 'var(--text-primary)',
                      }}
                      title="Save to Phone"
                      aria-label="Save to Phone"
                    >
                      <Download size={12} />
                    </a>

                    <button
                      type="button"
                      onClick={(e) => handleMoveToVault(e, file.file_id)}
                      disabled={movingId === file.file_id}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{
                        backgroundColor: 'var(--accent-vault-soft)',
                        color: 'var(--accent-vault-text)',
                      }}
                      title="Move to Private Vault"
                      aria-label="Move to Vault"
                    >
                      {movingId === file.file_id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Shield size={12} />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, file.file_id)}
                      disabled={deletingId === file.file_id}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                        isConfirming ? 'bg-rose-600 text-white' : ''
                      }`}
                      style={
                        !isConfirming
                          ? { backgroundColor: 'var(--bg-surface-muted)', color: 'var(--text-muted)' }
                          : undefined
                      }
                      title={isConfirming ? 'Tap again to confirm delete' : 'Delete file'}
                      aria-label="Delete File"
                    >
                      {deletingId === file.file_id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : isConfirming ? (
                        'Confirm'
                      ) : (
                        <Trash2 size={12} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {files.map((file) => {
            const isConfirming = confirmDeleteId === file.file_id;
            return (
              <div
                key={file.file_id}
                className="flex items-center justify-between p-3.5 surface-card group spring-press gap-2"
              >
                <div
                  onClick={() => setSelectedMedia(file)}
                  className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                >
                  <div
                    className="w-12 h-12 rounded-xl bg-slate-900 overflow-hidden flex-shrink-0 relative flex items-center justify-center text-white"
                    style={{ border: '1px solid var(--border-color)' }}
                  >
                    {file.thumbnail ? (
                      <img src={file.thumbnail} alt={file.title} className="w-full h-full object-cover" />
                    ) : file.category === 'music' ? (
                      <Music size={18} className="text-white/80" />
                    ) : (
                      <Film size={18} className="text-white/80" />
                    )}
                    <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                      <Play size={14} fill="white" className="text-white" />
                    </div>
                  </div>

                  <div className="min-w-0 pr-1">
                    <h4 className="font-bold text-xs truncate leading-snug" style={{ color: 'var(--text-primary)' }}>
                      {file.title}
                    </h4>
                    <div className="flex items-center gap-2 pt-1">
                      <span
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded-md font-bold"
                        style={{
                          backgroundColor: 'var(--bg-surface-muted)',
                          color: 'var(--accent-text)',
                        }}
                      >
                        {((file.filesize || 0) / (1024 * 1024)).toFixed(2)} MB
                      </span>
                      <span className="text-[10px] uppercase font-mono" style={{ color: 'var(--text-muted)' }}>
                        {file.category || 'media'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Row Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedMedia(file)}
                    className="p-2 rounded-xl transition-colors spring-press"
                    style={{
                      backgroundColor: 'var(--accent-soft)',
                      color: 'var(--accent-text)',
                    }}
                    title="Play"
                    aria-label="Play media"
                  >
                    <Play size={13} fill="currentColor" />
                  </button>

                  <a
                    href={`/api/files/${file.file_id}/download`}
                    download={file.filename}
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 rounded-xl transition-all spring-press"
                    style={{
                      backgroundColor: 'var(--bg-surface-muted)',
                      color: 'var(--text-primary)',
                    }}
                    title="Save to Phone / Device"
                    aria-label="Save to Phone"
                  >
                    <Download size={13} />
                  </a>

                  <button
                    type="button"
                    onClick={(e) => handleMoveToVault(e, file.file_id)}
                    disabled={movingId === file.file_id}
                    className="p-2 rounded-xl transition-all spring-press"
                    style={{
                      backgroundColor: 'var(--accent-vault-soft)',
                      color: 'var(--accent-vault-text)',
                    }}
                    title="Move to Private Vault"
                    aria-label="Move to Vault"
                  >
                    {movingId === file.file_id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Shield size={13} />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, file.file_id)}
                    disabled={deletingId === file.file_id}
                    className={`px-2 py-2 rounded-xl text-[11px] font-bold transition-all spring-press ${
                      isConfirming ? 'bg-rose-600 text-white' : ''
                    }`}
                    style={
                      !isConfirming
                        ? { backgroundColor: 'var(--bg-surface-muted)', color: 'var(--text-muted)' }
                        : undefined
                    }
                    title={isConfirming ? 'Tap again to delete' : 'Delete file'}
                    aria-label="Delete File"
                  >
                    {deletingId === file.file_id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : isConfirming ? (
                      'Confirm'
                    ) : (
                      <Trash2 size={13} />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <MediaPlayerModal
        media={selectedMedia}
        isOpen={Boolean(selectedMedia)}
        onClose={() => setSelectedMedia(null)}
      />
    </div>
  );
}

export default FilesView;
