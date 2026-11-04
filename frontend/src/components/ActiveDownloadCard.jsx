import React, { useState } from 'react';
import { Pause, Play, X, Zap, Loader2, AlertCircle } from 'lucide-react';
import { apiClient } from '../api/client';

export function ActiveDownloadCard({ task, onStatusChange }) {
  const [loadingAction, setLoadingAction] = useState(false);
  const [actionError, setActionError] = useState('');

  if (!task || task.status === 'finished') return null;

  const isPaused = task.status === 'paused';
  const isCancelled = task.status === 'cancelled';
  const downloadedMb = ((task.downloaded_bytes || 0) / (1024 * 1024)).toFixed(2);
  const totalMb = task.total_bytes && task.total_bytes > 0
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
      <div className="crystal-card rounded-3xl p-4 border border-rose-300/40 animate-fade-in flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-400/20 text-rose-600">
            <X size={18} />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-slate-800">Download Cancelled</h4>
            <span className="text-[11px] text-slate-400">{task.title}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`crystal-card rounded-3xl p-4 shadow-crystal-glow transition-all duration-300 border ${
      isPaused ? 'border-amber-300/60 bg-amber-50/30' : 'border-cyan-300/40 bg-white/70'
    } animate-fade-in flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 truncate pr-2">
          <div className={`p-2 rounded-xl flex-shrink-0 transition-colors ${
            isPaused ? 'bg-amber-400/20 text-amber-600' : 'bg-cyan-400/20 text-cyan-600'
          }`}>
            <Zap size={18} />
          </div>
          <div className="truncate">
            <h4 className="font-semibold text-sm text-slate-900 truncate">{task.title}</h4>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-mono font-medium ${isPaused ? 'text-amber-600' : 'text-cyan-600'}`}>
                {isPaused ? 'Paused' : task.speed}
              </span>
              <span className="text-[11px] text-slate-400">•</span>
              <span className="text-[11px] text-slate-500">{task.progress}%</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={handleTogglePause}
            disabled={loadingAction}
            className={`p-2 rounded-full transition-all active:scale-90 ${
              isPaused 
                ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm' 
                : 'bg-slate-200/80 text-slate-700 hover:bg-slate-300'
            }`}
            title={isPaused ? "Resume Download" : "Pause Download"}
            aria-label={isPaused ? "Resume Download" : "Pause Download"}
          >
            {loadingAction ? <Loader2 size={15} className="animate-spin" /> : isPaused ? <Play size={15} /> : <Pause size={15} />}
          </button>

          <button
            type="button"
            onClick={handleCancel}
            disabled={loadingAction}
            className="p-2 rounded-full bg-slate-200/80 text-slate-500 hover:bg-rose-100 hover:text-rose-600 transition-all active:scale-90"
            title="Cancel Download"
            aria-label="Cancel Download"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 rounded-full bg-slate-200/60 overflow-hidden p-0.5">
        <div 
          className={`h-full rounded-full transition-all duration-300 shadow-sm ${
            isPaused ? 'bg-amber-400' : 'bg-cyan-400'
          }`}
          style={{ width: `${task.progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <span>{downloadedMb} MB{totalMb ? ` / ${totalMb} MB` : ''}</span>
        {task.eta_seconds && !isPaused ? <span>ETA: {task.eta_seconds}s</span> : null}
      </div>

      {actionError && (
        <div className="flex items-center gap-1 text-[11px] text-rose-600">
          <AlertCircle size={12} />
          <span>{actionError}</span>
        </div>
      )}
    </div>
  );
}

export default ActiveDownloadCard;
