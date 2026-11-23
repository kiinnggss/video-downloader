import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowDownCircle,
  CheckCircle,
  Sparkles,
  Folder,
  ArrowRight,
  Palette,
  RotateCw,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { ActiveDownloadCard } from './ActiveDownloadCard';

export function DownloadsView({ activeTask, onGoToHome, onGoToFiles, onOpenThemeModal }) {
  const [historyTasks, setHistoryTasks] = useState([]);
  const [retryingId, setRetryingId] = useState(null);
  const [retryError, setRetryError] = useState('');

  const loadHistory = useCallback(async () => {
    const items = await apiClient.getDownloadsHistory();
    setHistoryTasks(items);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory, activeTask?.status, activeTask?.task_id]);

  const isTaskActive =
    activeTask &&
    (activeTask.status === 'downloading' ||
      activeTask.status === 'paused' ||
      activeTask.status === 'queued');
  const isTaskFinished = activeTask && activeTask.status === 'finished' && activeTask.file_id;

  const pastTasks = historyTasks.filter((t) => !activeTask || t.task_id !== activeTask.task_id);

  const handleRetry = async (task) => {
    if (!task?.url || retryingId) return;
    setRetryingId(task.task_id);
    setRetryError('');
    try {
      await apiClient.startDownload({
        url: task.url,
        format_id: 'best',
        is_audio: false,
        in_vault: Boolean(task.in_vault),
      });
      await loadHistory();
    } catch (err) {
      setRetryError(err.message || 'Retry failed');
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-5 w-full max-w-md mx-auto px-4 pt-5 pb-28 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="font-display text-xl font-extrabold tracking-tight"
            style={{ color: 'var(--canvas-text)' }}
          >
            Downloads
          </h2>
          <p className="text-xs" style={{ color: 'var(--canvas-text-muted)' }}>
            In-progress queue & transfer history
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenThemeModal && (
            <button
              type="button"
              onClick={onOpenThemeModal}
              className="p-2.5 surface-card spring-press"
              style={{ borderRadius: 'var(--radius-button)', color: 'var(--accent-text)' }}
              aria-label="Open theme switcher"
              title="Appearance"
            >
              <Palette size={16} />
            </button>
          )}
          <div
            className="w-10 h-10 surface-card flex items-center justify-center"
            style={{
              borderRadius: 'var(--radius-button)',
              color: 'var(--accent-secondary-text)',
            }}
          >
            <ArrowDownCircle size={20} />
          </div>
        </div>
      </div>

      {/* In Progress Section */}
      {isTaskActive && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs font-bold px-1">
            <span style={{ color: 'var(--canvas-text)' }}>In progress</span>
            <span
              className="font-mono font-bold flex items-center gap-1.5"
              style={{ color: 'var(--canvas-text-muted)' }}
            >
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: 'var(--accent)' }}
              />
              <span>Live Stream</span>
            </span>
          </div>
          <ActiveDownloadCard task={activeTask} onStatusChange={loadHistory} />
        </div>
      )}

      {/* Newly Finished Active Card */}
      {isTaskFinished && (
        <div className="surface-card-active p-4 flex flex-col gap-3.5 animate-fade-in">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: 'var(--accent-soft)',
                  color: 'var(--accent-text)',
                }}
              >
                <CheckCircle size={20} />
              </div>
              <div className="min-w-0">
                <h4 className="font-extrabold text-sm" style={{ color: 'var(--text-primary)' }}>
                  Download Complete
                </h4>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                  {activeTask.title}
                </p>
              </div>
            </div>
            <span
              className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold flex-shrink-0"
              style={{
                backgroundColor: 'var(--accent-soft)',
                color: 'var(--accent-text)',
              }}
            >
              Ready
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`/api/files/${activeTask.file_id}/download`}
              download={activeTask.filename}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wide spring-press theme-btn-primary"
            >
              <ArrowDownCircle size={15} strokeWidth={2.5} />
              <span>Save to Device</span>
            </a>
            <button
              type="button"
              onClick={onGoToFiles}
              className="px-4 py-3 text-xs font-bold spring-press"
              style={{
                backgroundColor: 'var(--bg-surface-muted)',
                color: 'var(--text-primary)',
                borderRadius: 'var(--radius-button)',
                border: '1px solid var(--border-color)',
              }}
            >
              Library
            </button>
          </div>
        </div>
      )}

      {/* Empty State when nothing active and no history */}
      {!isTaskActive && !isTaskFinished && pastTasks.length === 0 && (
        <div className="flex flex-col items-center justify-center p-9 text-center surface-card gap-3.5">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              backgroundColor: 'var(--bg-surface-muted)',
              color: 'var(--accent-text)',
            }}
          >
            <CheckCircle size={26} />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="font-display font-extrabold text-base" style={{ color: 'var(--text-primary)' }}>
              No active transfers
            </h3>
            <p className="text-xs max-w-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Paste a video link in the Inspect tab to start downloading. Completed media saves directly to your device or vault.
            </p>
          </div>
          <button
            type="button"
            onClick={onGoToHome}
            className="mt-1 px-5 py-3 font-bold text-xs flex items-center gap-2 spring-press theme-btn-primary"
          >
            <Sparkles size={14} />
            <span>Inspect a Video</span>
            <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* Transfer History List */}
      {pastTasks.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-display text-sm font-extrabold" style={{ color: 'var(--canvas-text)' }}>
              Transfer History
            </h3>
            <span className="text-[11px] font-mono" style={{ color: 'var(--canvas-text-muted)' }}>
              {pastTasks.length} recent
            </span>
          </div>

          {retryError && (
            <div className="p-3 surface-card border-rose-400/70 text-xs text-rose-500 flex items-center gap-2">
              <AlertCircle size={14} />
              <span>{retryError}</span>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {pastTasks.map((task) => {
              const isDone = task.status === 'finished' && task.file_id;
              const isFailed = task.status === 'error' || task.status === 'cancelled';
              const sizeMb = ((task.total_bytes || task.downloaded_bytes || 0) / (1024 * 1024)).toFixed(1);

              return (
                <div
                  key={task.task_id}
                  className="surface-card p-3.5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: isDone
                          ? 'var(--accent-soft)'
                          : isFailed
                          ? 'rgba(244, 63, 94, 0.14)'
                          : 'var(--bg-surface-muted)',
                        color: isDone
                          ? 'var(--accent-text)'
                          : isFailed
                          ? '#E11D48'
                          : 'var(--text-muted)',
                      }}
                    >
                      {isDone ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                        {task.title || 'Media Download'}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                        <span className="uppercase font-bold">{task.status}</span>
                        {Number(sizeMb) > 0 && <span>{sizeMb} MB</span>}
                      </div>
                    </div>
                  </div>

                  {isDone ? (
                    <a
                      href={`/api/files/${task.file_id}/download`}
                      download={task.filename}
                      className="px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 flex-shrink-0 spring-press"
                      style={{
                        backgroundColor: 'var(--bg-surface-muted)',
                        color: 'var(--accent-text)',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      <ArrowDownCircle size={13} />
                      <span>Save</span>
                    </a>
                  ) : isFailed ? (
                    <button
                      type="button"
                      onClick={() => handleRetry(task)}
                      disabled={retryingId === task.task_id}
                      className="px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 flex-shrink-0 spring-press theme-btn-primary"
                    >
                      {retryingId === task.task_id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <RotateCw size={12} />
                      )}
                      <span>Retry</span>
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick link to completed media */}
      <div className="p-4 surface-card flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-extrabold" style={{ color: 'var(--text-primary)' }}>
            Completed Media
          </span>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Browse and play your saved files
          </span>
        </div>
        <button
          type="button"
          onClick={onGoToFiles}
          className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 spring-press"
          style={{
            backgroundColor: 'var(--bg-surface-muted)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
          }}
        >
          <Folder size={13} style={{ color: 'var(--accent-text)' }} />
          <span>View Library</span>
        </button>
      </div>
    </div>
  );
}

export default DownloadsView;
