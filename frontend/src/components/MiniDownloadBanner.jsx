import React, { useState } from 'react';
import { Pause, Play, X, ArrowDownCircle, Loader2 } from 'lucide-react';
import { apiClient } from '../api/client';

export function MiniDownloadBanner({ task, onOpenDownloads }) {
  const [loading, setLoading] = useState(false);

  if (!task || task.status === 'finished' || task.status === 'cancelled') {
    return null;
  }

  const isPaused = task.status === 'paused';

  const handleTogglePause = async (e) => {
    e.stopPropagation();
    if (loading || !task.task_id) return;
    setLoading(true);
    try {
      if (isPaused) {
        await apiClient.resumeDownload(task.task_id);
      } else {
        await apiClient.pauseDownload(task.task_id);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (e) => {
    e.stopPropagation();
    if (loading || !task.task_id) return;
    setLoading(true);
    try {
      await apiClient.cancelDownload(task.task_id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-24 left-4 right-4 z-30 flex justify-center pointer-events-none">
      <div
        onClick={onOpenDownloads}
        className="w-full max-w-md surface-card-active rounded-2xl p-2.5 px-3.5 flex items-center justify-between gap-3 pointer-events-auto cursor-pointer animate-fade-in spring-press"
        title="Tap to inspect active download"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: isPaused ? 'var(--accent-vault-soft)' : 'var(--accent-soft)',
              color: isPaused ? 'var(--accent-vault-text)' : 'var(--accent-text)',
            }}
          >
            <ArrowDownCircle size={16} className={isPaused ? '' : 'animate-pulse'} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h5 className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                {task.title || 'Downloading stream...'}
              </h5>
              <span
                className="text-[11px] font-mono font-black flex-shrink-0"
                style={{ color: isPaused ? 'var(--accent-vault-text)' : 'var(--accent-text)' }}
              >
                {task.progress}%
              </span>
            </div>

            <div
              className="w-full h-1.5 rounded-full overflow-hidden mt-1.5"
              style={{ backgroundColor: 'var(--bg-surface-muted)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.max(3, task.progress || 0)}%`,
                  backgroundColor: isPaused ? 'var(--accent-vault)' : 'var(--accent)',
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={handleTogglePause}
            disabled={loading}
            className="p-1.5 rounded-lg transition-all spring-press"
            style={{
              backgroundColor: isPaused ? 'var(--accent-vault)' : 'var(--accent)',
              color: isPaused ? '#FFFFFF' : 'var(--text-on-accent)',
            }}
            title={isPaused ? 'Resume' : 'Pause'}
          >
            {loading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : isPaused ? (
              <Play size={13} strokeWidth={2.5} />
            ) : (
              <Pause size={13} strokeWidth={2.5} />
            )}
          </button>

          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="p-1.5 rounded-lg transition-all spring-press"
            style={{
              backgroundColor: 'var(--bg-surface-muted)',
              color: 'var(--text-muted)',
            }}
            title="Cancel"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default MiniDownloadBanner;
