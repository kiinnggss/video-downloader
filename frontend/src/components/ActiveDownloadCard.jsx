import React, { useState } from 'react';
import { Pause, Play, X, Loader2, AlertCircle, Clock, ArrowDownCircle } from 'lucide-react';
import { apiClient } from '../api/client';

export function ActiveDownloadCard({ task, onStatusChange }) {
  const [loadingAction, setLoadingAction] = useState(false);
  const [actionError, setActionError] = useState('');

  if (!task || task.status === 'finished') return null;

  const isPaused = task.status === 'paused';
  const isCancelled = task.status === 'cancelled';
  const downloadedMb = ((task.downloaded_bytes || 0) / (1024 * 1024)).toFixed(2);
  const totalMb =
    task.total_bytes && task.total_bytes > 0
      ? (task.total_bytes / (1024 * 1024)).toFixed(2)
      : null;

  const handleTogglePause = async () => {
    if (loadingAction || !task.task_id) return;
    setLoadingAction(true);
    setActionError('');
    try {
      if (isPaused) {
        await apiClient.resumeDownload(task.task_id);
      } else {
        await apiClient.pauseDownload(task.task_id);
      }
      if (onStatusChange) onStatusChange();
    } catch (err) {
      setActionError(err.message || 'Action failed');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCancel = async () => {
    if (loadingAction || !task.task_id) return;
    setLoadingAction(true);
    setActionError('');
    try {
      await apiClient.cancelDownload(task.task_id);
      if (onStatusChange) onStatusChange();
    } catch (err) {
      setActionError(err.message || 'Cancellation failed');
    } finally {
      setLoadingAction(false);
    }
  };

  if (isCancelled) {
    return (
      <div className="surface-card p-4 border-rose-400/70 animate-fade-in flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center flex-shrink-0">
            <X size={18} />
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
              Transfer Cancelled
            </h4>
            <span className="text-[11px] font-mono truncate block" style={{ color: 'var(--text-muted)' }}>
              {task.title}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-card-active p-4 animate-fade-in flex flex-col gap-3">
      {/* Row 1: Artwork / Icon + Title + Controls */}
      <div className="flex items-center gap-3">
        <div
          className="relative w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: isPaused ? 'var(--accent-vault-soft)' : 'var(--accent-soft)',
            color: isPaused ? 'var(--accent-vault-text)' : 'var(--accent-text)',
          }}
        >
          {!isPaused && (
            <span
              className="absolute w-9 h-9 rounded-full radar-ping"
              style={{ backgroundColor: 'var(--accent-soft)' }}
            />
          )}
          <ArrowDownCircle size={22} className="relative z-10" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
              {task.title || 'Downloading stream...'}
            </h4>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={handleCancel}
                disabled={loadingAction}
                className="text-xs font-semibold hover:text-rose-500 transition-colors"
                style={{ color: 'var(--text-muted)' }}
                title="Cancel download"
                aria-label="Cancel Download"
              >
                cancel
              </button>

              <button
                type="button"
                onClick={handleTogglePause}
                disabled={loadingAction}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all spring-press"
                style={{
                  backgroundColor: isPaused ? 'var(--accent-vault)' : 'var(--accent)',
                  color: 'var(--text-on-accent)',
                  border: '1px solid var(--border-color)',
                }}
                title={isPaused ? 'Resume transfer' : 'Pause transfer'}
                aria-label={isPaused ? 'Resume Transfer' : 'Pause Transfer'}
              >
                {loadingAction ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : isPaused ? (
                  <Play size={14} strokeWidth={2.6} />
                ) : (
                  <Pause size={14} strokeWidth={2.6} />
                )}
              </button>
            </div>
          </div>

          {/* Linear Sleek Progress Bar */}
          <div
            className="w-full h-2 rounded-full overflow-hidden mt-2.5"
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

          {/* Telemetry Meta Row: Speed on left, Percentage & MB on right */}
          <div
            className="flex items-center justify-between text-[11px] font-mono pt-1.5"
            style={{ color: 'var(--text-muted)' }}
          >
            <span className="font-bold" style={{ color: isPaused ? 'var(--accent-vault-text)' : 'var(--accent-text)' }}>
              {isPaused ? 'Paused' : task.speed || 'Initializing...'}
            </span>

            <div className="flex items-center gap-2">
              {task.eta_seconds && !isPaused ? (
                <span className="flex items-center gap-0.5">
                  <Clock size={10} />
                  <span>{task.eta_seconds}s</span>
                </span>
              ) : null}
              <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
                {task.progress}%{totalMb ? ` of ${totalMb} MB` : ` (${downloadedMb} MB)`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="flex items-center gap-1.5 text-[11px] text-rose-500 bg-rose-500/10 p-2 rounded-xl border border-rose-500/20">
          <AlertCircle size={13} />
          <span>{actionError}</span>
        </div>
      )}
    </div>
  );
}

export default ActiveDownloadCard;
