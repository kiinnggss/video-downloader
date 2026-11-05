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
      <div className="glass-cyber rounded-3xl p-4 border border-rose-500/30 animate-fade-in flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
            <X size={18} />
          </div>
          <div>
            <h4 className="font-bold text-sm text-white">Download Cancelled</h4>
            <span className="text-[11px] text-slate-400">{task.title}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`glass-cyber rounded-3xl p-4.5 transition-all duration-300 border ${
      isPaused ? 'border-amber-400/40 bg-amber-950/20' : 'border-cyan-400/40 shadow-cyber-card'
    } animate-fade-in flex flex-col gap-3.5`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 truncate pr-2">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors border ${
            isPaused ? 'bg-amber-500/20 text-amber-400 border-amber-400/30' : 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30 shadow-inner'
          }`}>
            <Zap size={18} className="drop-shadow-sm" />
          </div>
          <div className="truncate">
            <h4 className="font-bold text-sm text-white truncate">{task.title}</h4>
            <div className="flex items-center gap-2 text-xs">
              <span className={`font-mono font-semibold ${isPaused ? 'text-amber-400' : 'text-cyan-400'}`}>
                {isPaused ? 'Paused' : task.speed}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-300 font-mono">{task.progress}%</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={handleTogglePause}
            disabled={loadingAction}
            className={`p-2.5 rounded-full transition-all active:scale-90 border ${
              isPaused 
                ? 'bg-amber-400 text-slate-950 border-amber-300 hover:bg-amber-300 font-bold shadow-md' 
                : 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40 hover:bg-cyan-500/30'
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
            className="p-2.5 rounded-full bg-white/5 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 transition-all active:scale-90"
            title="Cancel Download"
            aria-label="Cancel Download"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Futuristic Progress Bar */}
      <div className="w-full h-2.5 rounded-full bg-black/60 border border-white/10 overflow-hidden p-0.5">
        <div 
          className={`h-full rounded-full transition-all duration-300 ${
            isPaused ? 'bg-amber-400' : 'bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 shadow-[0_0_12px_rgba(56,189,248,0.7)]'
          }`}
          style={{ width: `${task.progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
        <span>{downloadedMb} MB{totalMb ? ` / ${totalMb} MB` : ''}</span>
        {task.eta_seconds && !isPaused ? <span className="text-cyan-400">ETA: {task.eta_seconds}s</span> : null}
      </div>

      {actionError && (
        <div className="flex items-center gap-1.5 text-[11px] text-rose-400">
          <AlertCircle size={12} />
          <span>{actionError}</span>
        </div>
      )}
    </div>
  );
}

export default ActiveDownloadCard;
